import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.models import Batch, Scan, BatchEvent, FraudIncident
from app.schemas.schemas import ScanVerifyRequest, ScanVerifyResponse, BatchResponse
from app.services.risk_engine import RiskEngine
from app.services.ledger_service import LedgerService
from app.services.alert_service import AlertService
from app.services.ml_service import ml_detector
from app.services.ocr_service import OCRService
from app.core.state_machine import BatchStatus

router = APIRouter(prefix="/scan", tags=["Scanning & Verification"])

@router.post("/verify", response_model=ScanVerifyResponse)
def verify_scan(request: ScanVerifyRequest, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(
        (Batch.batch_number == request.batch_number) | (Batch.id == request.batch_number)
    ).first()

    now = datetime.utcnow()

    # 1. Check Batch Existence
    if not batch:
        eval_result = RiskEngine.evaluate_signals(
            batch_exists=False,
            is_destroyed_or_closed=False
        )
        scan_record = Scan(
            batch_number=request.batch_number,
            scanner_role=request.scanner_role,
            location=request.location,
            scan_type=request.scan_type,
            verification_result="FRAUD",
            risk_score=eval_result["risk_score"],
            reasons_json=json.dumps(eval_result["reasons"])
        )
        db.add(scan_record)
        db.commit()

        return ScanVerifyResponse(
            result="FRAUD",
            risk_score=eval_result["risk_score"],
            severity="HIGH",
            batch=None,
            reasons=eval_result["reasons"],
            checks=eval_result["checks"],
            ml_anomaly_score=0.9,
            is_ml_anomaly=True,
            recommendation=eval_result["recommendation"]
        )

    # 2. Check Previous Scans for Duplicate / Anomaly tracking
    previous_scans = db.query(Scan).filter(Scan.batch_id == batch.id).all()
    scan_count = len(previous_scans) + 1
    duplicate_scan = False
    
    # Check if scanned recently at a different location
    if previous_scans and previous_scans[-1].location != request.location:
        time_diff = (now - previous_scans[-1].timestamp).total_seconds()
        if time_diff < 3600: # Scanned in 2 different places within an hour
            duplicate_scan = True

    # 3. Check Destroyed Batch Re-entry (P0 WOW MOMENT)
    is_destroyed = (batch.status in [BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED, BatchStatus.REENTRY_DETECTED])
    
    # 4. Check Label Tampering (Expiry Mismatch)
    expiry_mismatch = False
    if request.ocr_printed_expiry:
        parsed_ocr_date = OCRService.parse_date_string(request.ocr_printed_expiry)
        if parsed_ocr_date:
            # Compare month and year
            if (parsed_ocr_date.month != batch.expiry_date.month) or (parsed_ocr_date.year != batch.expiry_date.year):
                expiry_mismatch = True

    # 5. Check Unexpected Retailer
    unexpected_retailer = False
    if request.scanner_role == "RETAILER":
        if batch.original_retailer_id and ("MedPlus" in request.location or "Pharmacy B" in request.location):
            if "Apollo" in (batch.current_location or "") or "Apollo" in str(batch.original_retailer_id):
                unexpected_retailer = True

    # 6. ML Anomaly Score
    ml_res = ml_detector.predict_anomaly(
        quantity_diff=0,
        handoff_delay_hours=48.0,
        scan_count=scan_count,
        location_count=3 if unexpected_retailer else 2,
        duplicate_scan_count=1 if duplicate_scan else 0
    )

    is_expired = batch.expiry_date <= now

    # Evaluate deterministic multi-signal score
    eval_result = RiskEngine.evaluate_signals(
        batch_exists=True,
        is_destroyed_or_closed=is_destroyed,
        expiry_mismatch=expiry_mismatch,
        certificate_mismatch=False,
        quantity_mismatch=False,
        duplicate_scan=duplicate_scan,
        unexpected_retailer=unexpected_retailer,
        unexpected_location=unexpected_retailer,
        long_delay=False,
        ml_anomaly=ml_res["is_anomaly"],
        is_expired=is_expired
    )

    incident_id = None

    # HANDLE P0 CRITICAL FRAUD: REENTRY FRAUD DETECTED
    if is_destroyed:
        # Override risk score to 95 as requested in demo scenario
        eval_result["risk_score"] = 95
        eval_result["severity"] = "CRITICAL"
        eval_result["result"] = "FRAUD"
        
        batch.status = BatchStatus.REENTRY_DETECTED
        batch.current_location = f"{request.location} (UNAUTHORIZED RE-ENTRY)"
        batch.updated_at = now

        # Create Incident & Alerts
        incident = AlertService.create_fraud_incident(
            db=db,
            batch_id=batch.id,
            incident_type="REENTRY_FRAUD",
            risk_score=95,
            severity="CRITICAL",
            description=(
                f"RE-ENTRY FRAUD: Batch {batch.batch_number} ({batch.medicine.name if batch.medicine else 'Medicine'}) "
                f"was verified destroyed at EcoSafe Bio-Medical Facility on 12/05/2025. "
                f"It was just scanned at an unauthorized retail location: '{request.location}'."
            ),
            evidence={
                "batch_number": batch.batch_number,
                "original_status": "DESTRUCTION_VERIFIED",
                "scanned_location": request.location,
                "scanner_role": request.scanner_role,
                "ml_anomaly_score": ml_res["anomaly_score"],
                "reasons": eval_result["reasons"]
            }
        )
        incident_id = incident.id

        # Record Ledger Event
        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="REENTRY_DETECTED",
            actor_name=f"Scanner ({request.scanner_role})",
            location=request.location,
            metadata={
                "incident_id": incident.id,
                "risk_score": 95,
                "reason": "Attempted resale of verified destroyed batch"
            }
        )

    # HANDLE P1: EXPIRY LABEL TAMPERING DETECTED
    elif expiry_mismatch:
        eval_result["risk_score"] = max(eval_result["risk_score"], 85)
        eval_result["severity"] = "CRITICAL"
        eval_result["result"] = "FRAUD"
        
        batch.status = BatchStatus.SUSPICIOUS
        batch.updated_at = now

        incident = AlertService.create_fraud_incident(
            db=db,
            batch_id=batch.id,
            incident_type="LABEL_TAMPERING",
            risk_score=eval_result["risk_score"],
            severity="CRITICAL",
            description=(
                f"LABEL TAMPERING: Package label printed expiry '{request.ocr_printed_expiry}' "
                f"differs from manufacturer-registered expiry '{batch.expiry_date.strftime('%d/%m/%Y')}'. "
                f"Fraudulent extension of expired medicine shelf life."
            ),
            evidence={
                "batch_number": batch.batch_number,
                "registered_expiry": batch.expiry_date.strftime("%d/%m/%Y"),
                "printed_ocr_expiry": request.ocr_printed_expiry,
                "location": request.location
            }
        )
        incident_id = incident.id

        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="LABEL_TAMPERING_FLAGGED",
            actor_name=f"Scanner ({request.scanner_role})",
            location=request.location,
            metadata={
                "incident_id": incident.id,
                "printed_expiry": request.ocr_printed_expiry,
                "registered_expiry": batch.expiry_date.strftime("%d/%m/%Y")
            }
        )

    # Save Scan Record
    scan_record = Scan(
        batch_id=batch.id,
        batch_number=batch.batch_number,
        scanner_role=request.scanner_role,
        location=request.location,
        scan_type=request.scan_type,
        verification_result=eval_result["result"],
        risk_score=eval_result["risk_score"],
        reasons_json=json.dumps(eval_result["reasons"]),
        ocr_data=request.ocr_printed_expiry
    )
    db.add(scan_record)
    db.commit()
    db.refresh(batch)

    return ScanVerifyResponse(
        result=eval_result["result"],
        risk_score=eval_result["risk_score"],
        severity=eval_result["severity"],
        batch=batch,
        reasons=eval_result["reasons"],
        checks=eval_result["checks"],
        ml_anomaly_score=ml_res["anomaly_score"],
        is_ml_anomaly=ml_res["is_anomaly"],
        incident_id=incident_id,
        recommendation=eval_result["recommendation"]
    )
