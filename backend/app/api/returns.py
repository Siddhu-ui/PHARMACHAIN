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
    retailer_id: Optional[str] = None,
    retailer_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    actual_retailer_id = request.retailer_id or retailer_id or "guna@shreemedicals.com"
    actual_retailer_name = request.retailer_name or retailer_name or "Shree Medicals"

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
        retailer_id=actual_retailer_id,
        retailer_name=actual_retailer_name,
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
        actor_id=actual_retailer_id,
        actor_name=actual_retailer_name,
        organization_name=actual_retailer_name,
        location=batch.current_location,
        quantity=request.quantity,
        metadata={"reason": request.reason, "return_request_id": return_req.id}
    )

    return return_req

@router.patch("/{return_id}/cancel", response_model=ReturnRequestResponse)
def cancel_return_request(return_id: str, db: Session = Depends(get_db)):
    return_req = db.query(ReturnRequest).filter(ReturnRequest.id == return_id).first()
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")
    if return_req.status not in ["PENDING", "PENDING_PICKUP"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel return with status {return_req.status}")

    return_req.status = "CANCELLED"
    batch = db.query(Batch).filter(Batch.id == return_req.batch_id).first()
    if batch:
        batch.status = BatchStatus.EXPIRED
        batch.updated_at = datetime.utcnow()
        LedgerService.record_event(
            db=db,
            batch_id=batch.id,
            event_type="RETURN_CANCELLED",
            actor_name=return_req.retailer_name or "Retailer",
            location=batch.current_location,
            quantity=return_req.quantity,
            metadata={"return_request_id": return_req.id}
        )
    db.commit()
    db.refresh(return_req)
    return return_req

