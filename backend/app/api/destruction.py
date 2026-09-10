from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.models import Batch, DestructionRecord, Organization
from app.schemas.schemas import (
    ManufacturerReceiptCreate, DestructionCreate, DestructionResponse,
    CertificateVerificationResult, BatchResponse, ScheduleDisposalRequest
)
from app.core.state_machine import BatchStateMachine, BatchStatus
from app.services.ledger_service import LedgerService
from app.services.alert_service import AlertService
from app.services.risk_engine import RiskEngine

router = APIRouter(prefix="/destruction", tags=["Destruction & Manufacturer Receipt"])

@router.post("/receive", response_model=BatchResponse)
def receive_by_manufacturer(
    request: ManufacturerReceiptCreate,
    manufacturer_name: Optional[str] = "BharatCure Pharma QA",
    location: Optional[str] = "Vadodara Quarantine Bay 2, Gujarat",
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter((Batch.id == request.batch_id) | (Batch.batch_number == request.batch_id)).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    try:
        BatchStateMachine.validate_transition(batch.status, BatchStatus.RECEIVED_BY_MANUFACTURER)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    batch.status = BatchStatus.RECEIVED_BY_MANUFACTURER
    batch.current_location = location
    batch.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(batch)

    LedgerService.record_event(
        db=db,
        batch_id=batch.id,
        event_type="RECEIVED_BY_MANUFACTURER",
        actor_name=manufacturer_name,
        organization_name=manufacturer_name,
        location=location,
        quantity=request.received_quantity,
        metadata={"notes": request.notes or "Inspected and transferred to quarantine bay"}
    )

    return batch

@router.post("/schedule-disposal", response_model=BatchResponse)
def schedule_disposal(
    request: ScheduleDisposalRequest,
    manufacturer_name: Optional[str] = "BharatCure Pharma QA",
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter((Batch.id == request.batch_id) | (Batch.batch_number == request.batch_id)).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    try:
        BatchStateMachine.validate_transition(batch.status, BatchStatus.AWAITING_DESTRUCTION)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    facility = request.waste_facility_name or "GreenShield Biomedical Waste Services"
    batch.status = BatchStatus.AWAITING_DESTRUCTION
    batch.current_location = f"{facility} - Incinerator Manifest Queue"
    batch.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(batch)

    LedgerService.record_event(
        db=db,
        batch_id=batch.id,
        event_type="DISPOSAL_SCHEDULED",
        actor_name=manufacturer_name,
        organization_name=manufacturer_name,
        location=facility,
        quantity=batch.quantity,
        metadata={"waste_facility": facility, "notes": request.notes or "Scheduled for high-temperature biomedical incineration"}
    )

    return batch

@router.get("", response_model=List[DestructionResponse])
def get_destruction_records(db: Session = Depends(get_db)):
    return db.query(DestructionRecord).order_by(DestructionRecord.destruction_date.desc()).all()

@router.post("/verify-certificate", response_model=CertificateVerificationResult)
def verify_certificate(
    batch_number: str,
    certificate_number: str,
    facility_name: str,
    quantity: int,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.batch_number == batch_number).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    discrepancies = []
    is_valid = True

    if quantity != batch.quantity:
        is_valid = False
        discrepancies.append(f"Quantity mismatch: Certificate states {quantity}, registered batch has {batch.quantity}.")

    authorized_facility = "GreenShield" in facility_name or "EcoSafe" in facility_name or "Authorized" in facility_name
    if not authorized_facility:
        is_valid = False
        discrepancies.append(f"Facility '{facility_name}' is not an authorized state pollution control board certified facility.")

    if not certificate_number or len(certificate_number) < 5:
        is_valid = False
        discrepancies.append("Invalid certificate serial format.")

    return CertificateVerificationResult(
        is_valid=is_valid,
        certificate_number=certificate_number,
        batch_number=batch.batch_number,
        expected_quantity=batch.quantity,
        certified_quantity=quantity,
        facility_name=facility_name,
        status="VERIFIED" if is_valid else "MISMATCH",
        discrepancies=discrepancies
    )

@router.post("/confirm", response_model=DestructionResponse)
def confirm_destruction(
    request: DestructionCreate,
    manufacturer_id: Optional[str] = "mfg_sunpharma_01",
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter((Batch.id == request.batch_id) | (Batch.batch_number == request.batch_id)).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    try:
        BatchStateMachine.validate_transition(batch.status, BatchStatus.DESTRUCTION_VERIFIED)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    batch.status = BatchStatus.DESTRUCTION_VERIFIED
    batch.current_location = f"{request.waste_facility_name} - Incineration Chamber"
    batch.updated_at = datetime.utcnow()

    record = DestructionRecord(
        batch_id=batch.id,
        manufacturer_id=manufacturer_id,
        waste_facility_id=request.waste_facility_id,
        waste_facility_name=request.waste_facility_name,
        certificate_number=request.certificate_number,
        destruction_date=datetime.utcnow(),
        destroyed_quantity=request.destroyed_quantity,
        certificate_url=request.certificate_url or f"/certificates/{request.certificate_number}.pdf",
        verification_status="VERIFIED"
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Immutable ledger event
    LedgerService.record_event(
        db=db,
        batch_id=batch.id,
        event_type="DESTRUCTION_VERIFIED",
        actor_name=request.waste_facility_name,
        organization_name=request.waste_facility_name,
        location=batch.current_location,
        quantity=request.destroyed_quantity,
        metadata={
            "certificate_number": request.certificate_number,
            "waste_facility": request.waste_facility_name,
            "method": "HIGH_TEMP_INCINERATION_VERIFIED"
        },
        evidence_url=record.certificate_url
    )

    return record
