from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.models import ReturnRequest, Pickup, Batch
from app.schemas.schemas import PickupCreate, PickupResponse
from app.core.state_machine import BatchStateMachine, BatchStatus
from app.services.ledger_service import LedgerService
from app.services.alert_service import AlertService
from app.services.risk_engine import RiskEngine

router = APIRouter(prefix="/pickups", tags=["Pickups"])

@router.get("", response_model=List[PickupResponse])
def get_pickups(db: Session = Depends(get_db)):
    return db.query(Pickup).order_by(Pickup.pickup_time.desc()).all()

@router.post("", response_model=PickupResponse)
def confirm_pickup(
    request: PickupCreate,
    distributor_id: Optional[str] = "distributor@pharmaguard.io",
    distributor_name: Optional[str] = "Apex Healthcare Logistics Ltd.",
    location: Optional[str] = "Bengaluru Hub Transit Corridor",
    db: Session = Depends(get_db)
):
    return_req = db.query(ReturnRequest).filter(ReturnRequest.id == request.return_request_id).first()
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")

    batch = db.query(Batch).filter(Batch.id == return_req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Associated batch not found")

    is_mismatch = (request.actual_quantity != request.expected_quantity)
    pickup_status = "QUANTITY_MISMATCH" if is_mismatch else "CONFIRMED"

    # Enforce state transition
    next_batch_status = BatchStatus.SUSPICIOUS if is_mismatch else BatchStatus.PICKUP_CONFIRMED
    try:
        BatchStateMachine.validate_transition(batch.status, next_batch_status)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    batch.status = next_batch_status
    batch.current_location = f"{distributor_name} - Transit Vehicle"
    batch.updated_at = datetime.utcnow()

    return_req.status = "PICKED_UP"

    pickup = Pickup(
        return_request_id=return_req.id,
        distributor_id=distributor_id,
        distributor_name=distributor_name,
        expected_quantity=request.expected_quantity,
        actual_quantity=request.actual_quantity,
        actual_weight=request.actual_weight or 5.2,
        pickup_time=datetime.utcnow(),
        status=pickup_status,
        evidence_url=request.evidence_url or "/evidence/pickup_manifest_signoff.png"
    )
    db.add(pickup)
    db.commit()
    db.refresh(pickup)

    # Immutable ledger entry
    LedgerService.record_event(
        db=db,
        batch_id=batch.id,
        event_type="PICKUP_CONFIRMED" if not is_mismatch else "PICKUP_QUANTITY_MISMATCH",
        actor_id=distributor_id,
        actor_name=distributor_name,
        organization_name=distributor_name,
        location=location or "Bengaluru Transit Node",
        quantity=request.actual_quantity,
        weight=request.actual_weight or 5.2,
        metadata={
            "expected_quantity": request.expected_quantity,
            "actual_quantity": request.actual_quantity,
            "mismatch": is_mismatch
        },
        evidence_url=pickup.evidence_url
    )

    if is_mismatch:
        AlertService.create_fraud_incident(
            db=db,
            batch_id=batch.id,
            incident_type="QUANTITY_MISMATCH",
            risk_score=RiskEngine.SCORE_QUANTITY_MISMATCH,
            severity="MEDIUM",
            description=f"Quantity mismatch during distributor pickup: Expected {request.expected_quantity}, received {request.actual_quantity}.",
            evidence={"expected": request.expected_quantity, "actual": request.actual_quantity}
        )

    return pickup
