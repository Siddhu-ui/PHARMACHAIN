import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import BatchEvent, Batch

class LedgerService:
    @staticmethod
    def record_event(
        db: Session,
        batch_id: str,
        event_type: str,
        location: str,
        actor_id: Optional[str] = None,
        actor_name: Optional[str] = None,
        organization_id: Optional[str] = None,
        organization_name: Optional[str] = None,
        quantity: Optional[int] = None,
        weight: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
        evidence_url: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> BatchEvent:
        """
        Appends an immutable event entry to the Batch Event Ledger.
        """
        event = BatchEvent(
            batch_id=batch_id,
            event_type=event_type,
            actor_id=actor_id,
            actor_name=actor_name,
            organization_id=organization_id,
            organization_name=organization_name,
            location=location,
            quantity=quantity,
            weight=weight,
            timestamp=timestamp or datetime.utcnow(),
            metadata_json=json.dumps(metadata) if metadata else None,
            evidence_url=evidence_url
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_timeline(db: Session, batch_id: str):
        """
        Retrieves complete chronological event history for a batch.
        """
        return db.query(BatchEvent).filter(BatchEvent.batch_id == batch_id).order_by(BatchEvent.timestamp.asc()).all()
