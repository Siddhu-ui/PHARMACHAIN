from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.models import Batch, ReturnRequest, User
from app.schemas.schemas import ReturnRequestCreate, ReturnRequestResponse
from app.core.state_machine import BatchStateMachine, BatchStatus
from app.services.ledger_service import LedgerService

router = APIRouter(prefix="/returns", tags=["Returns"])

@router.get("", response_model=List[ReturnRequestResponse])
def get_return_requests(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ReturnRequest)
    if status:
        query = query.filter(ReturnRequest.status == status)
    return query.order_by(ReturnRequest.created_at.desc()).all()

@router.post("", response_model=ReturnRequestResponse)
def create_return_request(
    request: ReturnRequestCreate,
    retailer_id: Optional[str] = "pharmacy_a@pharmaguard.io",
    retailer_name: Optional[str] = "Apollo Pharmacy - Indiranagar",
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == request.batch_id).first()
    if not batch:
        batch = db.query(Batch).filter(Batch.batch_number == request.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Enforce state machine transition
    try:
        BatchStateMachine.validate_transition(batch.status, BatchStatus.RETURN_REQUESTED)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update batch status
    batch.status = BatchStatus.RETURN_REQUESTED
    batch.updated_at = datetime.utcnow()

    # Create return request record
    return_req = ReturnRequest(
        batch_id=batch.id,
        retailer_id=retailer_id,
        retailer_name=retailer_name,
        quantity=request.quantity,
        reason=request.reason,
        status="PENDING_PICKUP"
    )
    db.add(return_req)
    db.commit()
    db.refresh(return_req)

    # Record immutable ledger event
    LedgerService.record_event(
        db=db,
        batch_id=batch.id,
        event_type="RETURN_REQUESTED",
        actor_id=retailer_id,
        actor_name=retailer_name,
        organization_name=retailer_name,
        location=batch.current_location,
        quantity=request.quantity,
        metadata={"reason": request.reason, "return_request_id": return_req.id}
    )

    return return_req
