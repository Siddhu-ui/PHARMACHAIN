from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import FraudIncident, Batch
from app.schemas.schemas import (
    FraudIncidentResponse, FraudIncidentUpdate,
    OCRAnalyzeRequest, OCRAnalyzeResponse
)
from app.services.ocr_service import OCRService

router = APIRouter(prefix="", tags=["Fraud & OCR"])

@router.get("/fraud/incidents", response_model=List[FraudIncidentResponse])
def get_fraud_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(FraudIncident)
    if status:
        query = query.filter(FraudIncident.status == status)
    if severity:
        query = query.filter(FraudIncident.severity == severity)
    return query.order_by(FraudIncident.detected_at.desc()).all()

@router.get("/fraud/incidents/{incident_id}", response_model=FraudIncidentResponse)
def get_fraud_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(FraudIncident).filter(FraudIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/fraud/incidents/{incident_id}", response_model=FraudIncidentResponse)
def update_fraud_incident(
    incident_id: str,
    update_data: FraudIncidentUpdate,
    db: Session = Depends(get_db)
):
    incident = db.query(FraudIncident).filter(FraudIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = update_data.status
    if update_data.assigned_to:
        incident.assigned_to = update_data.assigned_to

    db.commit()
    db.refresh(incident)
    return incident

@router.post("/ocr/analyze", response_model=OCRAnalyzeResponse)
def analyze_ocr(request: OCRAnalyzeRequest, db: Session = Depends(get_db)):
    result = OCRService.analyze_package_image(
        db=db,
        override_batch_number=request.batch_number,
        image_name=request.image_url or "package_sample.png"
    )
    return OCRAnalyzeResponse(**result)
