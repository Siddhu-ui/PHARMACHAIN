from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.models import Batch, BatchEvent, Medicine
from app.schemas.schemas import BatchResponse, BatchEventResponse, BatchCreate
from app.services.ledger_service import LedgerService
from app.core.state_machine import BatchStatus

router = APIRouter(prefix="/batches", tags=["Batches"])

@router.get("", response_model=List[BatchResponse])
def get_batches(
    status: Optional[str] = None,
    expiry_category: Optional[str] = None,
    retailer_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    now = datetime.utcnow()

    if status:
        query = query.filter(Batch.status == status)
    
    if retailer_id:
        query = query.filter(Batch.original_retailer_id == retailer_id)

    if expiry_category == "expired":
        query = query.filter(Batch.expiry_date <= now)
    elif expiry_category == "within_30_days":
        query = query.filter(Batch.expiry_date > now, Batch.expiry_date <= now + timedelta(days=30))
    elif expiry_category == "within_60_days":
        query = query.filter(Batch.expiry_date > now + timedelta(days=30), Batch.expiry_date <= now + timedelta(days=60))

    return query.order_by(Batch.expiry_date.asc()).all()

@router.get("/{id_or_number}", response_model=BatchResponse)
def get_batch(id_or_number: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(
        (Batch.id == id_or_number) | (Batch.batch_number == id_or_number)
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{id_or_number}' not found")
    return batch

@router.get("/{id_or_number}/timeline", response_model=List[BatchEventResponse])
def get_batch_timeline(id_or_number: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(
        (Batch.id == id_or_number) | (Batch.batch_number == id_or_number)
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{id_or_number}' not found")
    
    events = LedgerService.get_timeline(db, batch.id)
    return events
