from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertResponse
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts Gateway"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(role: Optional[str] = None, unread_only: bool = False, db: Session = Depends(get_db)):
    return AlertService.get_alerts(db, role=role, unread_only=unread_only)

@router.get("/unread-count")
def get_unread_count(role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Alert).filter(Alert.read == False)
    if role:
        query = query.filter(Alert.recipient_role == role)
    return {"count": query.count()}

@router.patch("/{alert_id}/read", response_model=AlertResponse)
def mark_read(alert_id: str, db: Session = Depends(get_db)):
    alert = AlertService.mark_alert_read(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
