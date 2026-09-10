from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.models import Batch, ReturnRequest, Pickup, DestructionRecord, FraudIncident, Alert
from app.seed_data import seed_database
from app.core.state_machine import BatchStatus
from app.services.ledger_service import LedgerService
from app.services.alert_service import AlertService

router = APIRouter(prefix="/demo", tags=["Demo Controller"])

@router.post("/reset")
def reset_demo_database(db: Session = Depends(get_db)):
    seed_database(db)
    return {"message": "Demo database successfully reset to clean starting baseline."}

@router.post("/step/{step_id}")
def execute_demo_step(step_id: int, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    batch_pcm = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
    if not batch_pcm:
        seed_database(db)
        batch_pcm = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()

    if step_id == 1:
        # [1] Create/Ensure Expired Batch
        batch_pcm.status = BatchStatus.EXPIRED
        batch_pcm.expiry_date = datetime(2026, 8, 15)
        batch_pcm.current_location = "Apollo Pharmacy - Indiranagar, Bengaluru"
        db.commit()
        return {"step": 1, "message": "Batch PCM500123 marked as EXPIRED at Apollo Pharmacy Indiranagar."}

    elif step_id == 2:
        # [2] Request Return by Pharmacy A
        batch_pcm.status = BatchStatus.RETURN_REQUESTED
        return_req = ReturnRequest(
            batch_id=batch_pcm.id,
            retailer_id="pharmacy_a@pharmaguard.io",
            retailer_name="Apollo Pharmacy - Indiranagar",
            quantity=100,
            reason="EXPIRED",
            status="PENDING_PICKUP"
        )
        db.add(return_req)
        db.commit()
        LedgerService.record_event(
            db=db,
            batch_id=batch_pcm.id,
            event_type="RETURN_REQUESTED",
            actor_name="Apollo Pharmacy Indiranagar",
            location=batch_pcm.current_location,
            quantity=100,
            metadata={"return_request_id": return_req.id}
        )
        return {"step": 2, "message": "Return requested for Batch PCM500123 by Apollo Pharmacy."}

    elif step_id == 3:
        # [3] Distributor Pickup
        batch_pcm.status = BatchStatus.PICKUP_CONFIRMED
        batch_pcm.current_location = "In Transit - Apex Healthcare Logistics Hub"
        return_req = db.query(ReturnRequest).filter(ReturnRequest.batch_id == batch_pcm.id).first()
        if return_req:
            return_req.status = "PICKED_UP"
            pickup = Pickup(
                return_request_id=return_req.id,
                distributor_id="distributor@pharmaguard.io",
                distributor_name="Apex Healthcare Logistics Ltd.",
                expected_quantity=100,
                actual_quantity=100,
                actual_weight=5.2,
                status="CONFIRMED"
            )
            db.add(pickup)
        db.commit()
        LedgerService.record_event(
            db=db,
            batch_id=batch_pcm.id,
            event_type="PICKUP_CONFIRMED",
            actor_name="Apex Healthcare Logistics",
            location="Bengaluru Hub Transit",
            quantity=100,
            weight=5.2
        )
        return {"step": 3, "message": "Distributor confirmed pickup of 100 units (5.2 kg). Batch in transit."}

    elif step_id == 4:
        # [4] Manufacturer Receipt
        batch_pcm.status = BatchStatus.RECEIVED_BY_MANUFACTURER
        batch_pcm.current_location = "Sun Pharma Laboratories - Vadodara Quarantine Bay"
        db.commit()
        LedgerService.record_event(
            db=db,
            batch_id=batch_pcm.id,
            event_type="RECEIVED_BY_MANUFACTURER",
            actor_name="Sun Pharma QA Division",
            location="Vadodara Plant, Gujarat",
            quantity=100,
            metadata={"inspected": True}
        )
        return {"step": 4, "message": "Manufacturer Sun Pharma received returned batch in quarantine bay."}

    elif step_id == 5:
        # [5] Schedule/Upload Destruction
        batch_pcm.status = BatchStatus.AWAITING_DESTRUCTION
        batch_pcm.current_location = "EcoSafe Bio-Medical Destruction Facility - Incinerator Queue"
        db.commit()
        LedgerService.record_event(
            db=db,
            batch_id=batch_pcm.id,
            event_type="DESTRUCTION_SCHEDULED",
            actor_name="Sun Pharma QA",
            location="EcoSafe Bio-Medical Facility",
            quantity=100
        )
        return {"step": 5, "message": "Destruction scheduled at EcoSafe Bio-Medical Facility."}

    elif step_id == 6:
        # [6] Verify Destruction
        batch_pcm.status = BatchStatus.DESTRUCTION_VERIFIED
        batch_pcm.current_location = "EcoSafe Bio-Medical Facility - Verified Destroyed"
        record = DestructionRecord(
            batch_id=batch_pcm.id,
            manufacturer_id="mfg_sun_01",
            waste_facility_id="waste_eco_01",
            waste_facility_name="EcoSafe Bio-Medical Destruction Facility",
            certificate_number="CERT-ECO-2026-PCM123",
            destruction_date=datetime.utcnow(),
            destroyed_quantity=100,
            certificate_url="/certificates/CERT-ECO-2026-PCM123.pdf",
            verification_status="VERIFIED"
        )
        db.add(record)
        db.commit()
        LedgerService.record_event(
            db=db,
            batch_id=batch_pcm.id,
            event_type="DESTRUCTION_VERIFIED",
            actor_name="EcoSafe Bio-Medical Facility",
            location="EcoSafe Bio-Medical Facility",
            quantity=100,
            metadata={"certificate_number": "CERT-ECO-2026-PCM123", "method": "INCINERATION"}
        )
        return {"step": 6, "message": "Destruction certificate verified. Batch PCM500123 is DESTRUCTION_VERIFIED."}

    elif step_id == 7:
        # [7] Simulate Re-entry at Pharmacy B (The Hackathon WOW Moment!)
        batch_pcm.status = BatchStatus.REENTRY_DETECTED
        batch_pcm.current_location = "MedPlus Pharmacy - Koramangala (UNAUTHORIZED RE-ENTRY)"
        db.commit()

        incident = AlertService.create_fraud_incident(
            db=db,
            batch_id=batch_pcm.id,
            incident_type="REENTRY_FRAUD",
            risk_score=95,
            severity="CRITICAL",
            description="CRITICAL FRAUD: Batch PCM500123, previously certified destroyed at EcoSafe, re-scanned at MedPlus Pharmacy Koramangala.",
            evidence={
                "batch": "PCM500123",
                "registered_status": "DESTRUCTION_VERIFIED",
                "scanned_at": "MedPlus Pharmacy - Koramangala",
                "risk_score": 95
            }
        )
        LedgerService.record_event(
            db=db,
            batch_id=batch_pcm.id,
            event_type="REENTRY_DETECTED",
            actor_name="MedPlus Pharmacy Koramangala",
            location="MedPlus Pharmacy - Koramangala",
            metadata={"incident_id": incident.id, "risk_score": 95}
        )
        return {
            "step": 7,
            "message": "RE-ENTRY FRAUD TRIGGERED! Batch PCM500123 detected at MedPlus Pharmacy. Risk Score: 95/100.",
            "incident_id": incident.id
        }

    elif step_id == 8:
        # [8] Simulate Label Tampering (The Second WOW Moment!)
        incident = AlertService.create_fraud_incident(
            db=db,
            batch_id=batch_pcm.id,
            incident_type="LABEL_TAMPERING",
            risk_score=85,
            severity="CRITICAL",
            description="LABEL TAMPERING DETECTED: Printed expiry date '15/08/2028' differs from manufacturer-registered expiry '15/08/2026'.",
            evidence={
                "batch": "PCM500123",
                "registered_expiry": "15/08/2026",
                "printed_expiry": "15/08/2028",
                "tampering_type": "DATE_EXTENSION"
            }
        )
        LedgerService.record_event(
            db=db,
            batch_id=batch_pcm.id,
            event_type="LABEL_TAMPERING_FLAGGED",
            actor_name="OCR Inspection Node",
            location="Apollo Pharmacy Indiranagar",
            metadata={"incident_id": incident.id, "printed_expiry": "15/08/2028"}
        )
        return {
            "step": 8,
            "message": "LABEL TAMPERING DETECTED! Printed expiry 15/08/2028 contradicted registered 15/08/2026.",
            "incident_id": incident.id
        }

    elif step_id == 9:
        # [9] Generate Fraud Alert
        incident = db.query(FraudIncident).order_by(FraudIncident.detected_at.desc()).first()
        inc_id = incident.id if incident else "INC-DEMO-001"
        alert = Alert(
            incident_id=inc_id,
            recipient_role="REGULATOR",
            severity="CRITICAL",
            message="EMERGENCY CDSCO DIRECTIVE: Supply chain interception required for batch PCM500123.",
            read=False,
            created_at=now
        )
        db.add(alert)
        db.commit()
        return {"step": 9, "message": "Emergency regulator alert generated and broadcast across gateways."}

    raise HTTPException(status_code=400, detail=f"Unknown demo step: {step_id}")
