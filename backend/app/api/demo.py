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
    return {"message": "PharmaGuard compliance database reset successfully."}

@router.post("/step/{step_id}")
def execute_demo_step(step_id: int, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    batch = db.query(Batch).filter((Batch.batch_number == "CS10-A23-2507") | (Batch.batch_number == "PCM500123")).first()
    if not batch:
        seed_database(db)
        batch = db.query(Batch).filter((Batch.batch_number == "CS10-A23-2507") | (Batch.batch_number == "PCM500123")).first()

    b_no = batch.batch_number

    if step_id == 1:
        # [1] Create/Ensure Expired Batch
        batch.status = BatchStatus.EXPIRED
        batch.expiry_date = datetime(2026, 7, 15)
        batch.current_location = "Shree Medicals, Bengaluru"
        db.commit()
        return {"step": 1, "message": f"Batch {b_no} marked as EXPIRED at Shree Medicals, Bengaluru."}

    elif step_id == 2:
        # [2] Request Return by Shree Medicals (Guna)
        batch.status = BatchStatus.RETURN_REQUESTED
        return_req = db.query(ReturnRequest).filter(ReturnRequest.batch_id == batch.id).first()
        if not return_req:
            return_req = ReturnRequest(
                id="RET-00125",
                batch_id=batch.id,
                retailer_id="guna@shreemedicals.com",
                retailer_name="Shree Medicals",
                quantity=100,
                reason="Expired stock",
                status="PENDING_PICKUP"
            )
            db.add(return_req)
        else:
            return_req.status = "PENDING_PICKUP"
        db.commit()

        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="RETURN_REQUESTED",
            actor_name="Guna (Shree Medicals)",
            location=batch.current_location,
            quantity=100,
            metadata={"return_request_id": return_req.id}
        )
        return {"step": 2, "message": f"Return request RET-00125 created for Batch {b_no} by Shree Medicals."}

    elif step_id == 3:
        # [3] Distributor Pickup (Senthil - MedLink)
        batch.status = BatchStatus.PICKUP_CONFIRMED
        batch.current_location = "In Transit - MedLink Fleet Van KA-04-E-8821"
        return_req = db.query(ReturnRequest).filter(ReturnRequest.batch_id == batch.id).first()
        if return_req:
            return_req.status = "PICKED_UP"
            pickup = db.query(Pickup).filter(Pickup.return_request_id == return_req.id).first()
            if not pickup:
                pickup = Pickup(
                    return_request_id=return_req.id,
                    distributor_id="senthil@medlink.com",
                    distributor_name="MedLink Distributors",
                    expected_quantity=100,
                    actual_quantity=100,
                    actual_weight=4.8,
                    status="CONFIRMED"
                )
                db.add(pickup)
        db.commit()

        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="PICKUP_CONFIRMED",
            actor_name="Senthil (MedLink Distributors)",
            location="Bengaluru Transit Hub",
            quantity=100,
            weight=4.8
        )
        return {"step": 3, "message": f"MedLink Distributors confirmed pickup of 100 units for Batch {b_no}."}

    elif step_id == 4:
        # [4] Manufacturer Receipt (Rajan - BharatCure Pharma)
        batch.status = BatchStatus.RECEIVED_BY_MANUFACTURER
        batch.current_location = "BharatCure Pharma - Vadodara Quarantine Bay 2"
        db.commit()

        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="RECEIVED_BY_MANUFACTURER",
            actor_name="Rajan (BharatCure QA)",
            location="Vadodara Plant, Gujarat",
            quantity=100,
            metadata={"inspected": True, "quarantine_bay": "Bay 2"}
        )
        return {"step": 4, "message": f"Manufacturer BharatCure Pharma received returned Batch {b_no} in Quarantine Bay."}

    elif step_id == 5:
        # [5] Schedule Disposal to GreenShield
        batch.status = BatchStatus.AWAITING_DESTRUCTION
        batch.current_location = "GreenShield Biomedical Waste Services - Incinerator Queue"
        db.commit()

        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="DESTRUCTION_SCHEDULED",
            actor_name="Rajan (BharatCure QA)",
            location="GreenShield Biomedical Waste Services",
            quantity=100
        )
        return {"step": 5, "message": f"Destruction scheduled at GreenShield Biomedical Waste Services for Batch {b_no}."}

    elif step_id == 6:
        # [6] Verify Destruction & Certificate DC-00891
        batch.status = BatchStatus.DESTRUCTION_VERIFIED
        batch.current_location = "GreenShield Biomedical Waste Services - Verified Destroyed"
        record = db.query(DestructionRecord).filter(DestructionRecord.batch_id == batch.id).first()
        if not record:
            record = DestructionRecord(
                batch_id=batch.id,
                manufacturer_id="mfg_bharatcure_01",
                waste_facility_id="waste_greenshield_01",
                waste_facility_name="GreenShield Biomedical Waste Services",
                certificate_number="DC-00891",
                destruction_date=datetime.utcnow(),
                destroyed_quantity=100,
                certificate_url="/certificates/DC-00891.pdf",
                verification_status="VERIFIED"
            )
            db.add(record)
        db.commit()

        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="DESTRUCTION_VERIFIED",
            actor_name="Anbu (GreenShield)",
            location="Hosur Industrial Zone, Tamil Nadu",
            quantity=100,
            metadata={"certificate_number": "DC-00891", "method": "HIGH_TEMP_INCINERATION_VERIFIED"}
        )
        return {"step": 6, "message": f"Destruction certificate DC-00891 verified. Batch {b_no} marked DESTRUCTION_VERIFIED / CLOSED."}

    elif step_id == 7:
        # [7] Simulate Re-entry
        batch.status = BatchStatus.REENTRY_DETECTED
        batch.current_location = "Unauthorized Pharmacy Counter (RE-ENTRY DETECTED)"
        db.commit()

        incident = AlertService.create_fraud_incident(
            db=db,
            batch_id=batch.id,
            incident_type="REENTRY_FRAUD",
            risk_score=98,
            severity="CRITICAL",
            description=f"CRITICAL RE-ENTRY FRAUD: Batch {b_no}, previously certified destroyed at GreenShield Biomedical Waste Services under Certificate DC-00891, re-scanned in active circulation.",
            evidence={
                "batch": b_no,
                "lifecycle_status": "DESTROYED",
                "facility": "GreenShield Biomedical Waste Services",
                "certificate_number": "DC-00891",
                "current_location": "Unauthorized Retail Counter",
                "action": "DO_NOT_DISPENSE"
            }
        )
        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="REENTRY_DETECTED",
            actor_name="PharmaGuard Compliance Node",
            location="Unauthorized Counter",
            metadata={"incident_id": incident.id, "risk_score": 98}
        )
        return {
            "step": 7,
            "message": f"RE-ENTRY FRAUD TRIGGERED! Destroyed Batch {b_no} re-scanned. Regulatory alert dispatched to Chandra.",
            "incident_id": incident.id
        }

    elif step_id == 8:
        # [8] Simulate Label Tampering
        incident = AlertService.create_fraud_incident(
            db=db,
            batch_id=batch.id,
            incident_type="LABEL_TAMPERING",
            risk_score=85,
            severity="CRITICAL",
            description=f"LABEL TAMPERING DETECTED: Printed expiry date '15/07/2028' differs from manufacturer-registered expiry '15/07/2026' on Batch {b_no}.",
            evidence={
                "batch": b_no,
                "registered_expiry": "15/07/2026",
                "printed_expiry": "15/07/2028",
                "tampering_type": "DATE_EXTENSION"
            }
        )
        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="LABEL_TAMPERING_FLAGGED",
            actor_name="OCR Verification Node",
            location="Shree Medicals, Bengaluru",
            metadata={"incident_id": incident.id, "printed_expiry": "15/07/2028"}
        )
        return {
            "step": 8,
            "message": f"LABEL TAMPERING DETECTED! Printed expiry 15/07/2028 contradicted registered 15/07/2026.",
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
            message=f"EMERGENCY REGULATOR DIRECTIVE: Immediate supply chain seizure ordered for Batch {b_no}.",
            read=False,
            created_at=now
        )
        db.add(alert)
        db.commit()
        return {"step": 9, "message": "Emergency regulator alert broadcast across national drug controller network."}

    raise HTTPException(status_code=400, detail=f"Unknown demo step: {step_id}")
