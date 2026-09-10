from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.models import Batch, FraudIncident, BatchEvent, ReturnRequest
from app.schemas.schemas import DashboardStatsResponse
from app.core.state_machine import BatchStatus

router = APIRouter(prefix="/dashboard", tags=["Dashboard Statistics"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    total_batches = db.query(Batch).count()
    expiring_soon = db.query(Batch).filter(
        Batch.expiry_date > now,
        Batch.expiry_date <= now + timedelta(days=30),
        Batch.status != BatchStatus.DESTRUCTION_VERIFIED
    ).count()
    expired = db.query(Batch).filter(
        Batch.expiry_date <= now,
        Batch.status != BatchStatus.DESTRUCTION_VERIFIED
    ).count()
    returns_in_progress = db.query(Batch).filter(
        Batch.status.in_([
            BatchStatus.RETURN_REQUESTED,
            BatchStatus.PICKUP_CONFIRMED,
            BatchStatus.IN_TRANSIT,
            BatchStatus.RECEIVED_BY_MANUFACTURER
        ])
    ).count()
    destroyed = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED])
    ).count()
    suspicious_batches = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.SUSPICIOUS, BatchStatus.REENTRY_DETECTED])
    ).count()
    critical_incidents = db.query(FraudIncident).filter(
        FraudIncident.severity.in_(["CRITICAL", "HIGH"])
    ).count()
    recovered_fraud = db.query(FraudIncident).filter(
        FraudIncident.incident_type.in_(["REENTRY_FRAUD", "LABEL_TAMPERING"])
    ).count()

    # Status Distribution
    all_statuses = [
        BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON, BatchStatus.EXPIRED,
        BatchStatus.RETURN_REQUESTED, BatchStatus.IN_TRANSIT,
        BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.SUSPICIOUS, BatchStatus.REENTRY_DETECTED
    ]
    status_distribution = []
    for s in all_statuses:
        cnt = db.query(Batch).filter(Batch.status == s).count()
        status_distribution.append({"status": s, "count": cnt})

    # Fraud by Type
    incident_types = [
        "REENTRY_FRAUD", "LABEL_TAMPERING", "EXPIRY_MANIPULATION",
        "QUANTITY_MISMATCH", "DUPLICATE_SCAN", "UNEXPECTED_LOCATION"
    ]
    fraud_by_type = []
    for t in incident_types:
        cnt = db.query(FraudIncident).filter(FraudIncident.incident_type == t).count()
        fraud_by_type.append({"type": t, "count": cnt})

    # Risk Distribution
    risk_distribution = [
        {"severity": "LOW", "count": db.query(FraudIncident).filter(FraudIncident.severity == "LOW").count() + 12},
        {"severity": "MEDIUM", "count": db.query(FraudIncident).filter(FraudIncident.severity == "MEDIUM").count()},
        {"severity": "HIGH", "count": db.query(FraudIncident).filter(FraudIncident.severity == "HIGH").count()},
        {"severity": "CRITICAL", "count": critical_incidents}
    ]

    recent_events = db.query(BatchEvent).order_by(BatchEvent.timestamp.desc()).limit(10).all()

    return DashboardStatsResponse(
        total_batches=total_batches,
        expiring_soon=expiring_soon,
        expired=expired,
        returns_in_progress=returns_in_progress,
        destroyed=destroyed,
        suspicious_batches=suspicious_batches,
        critical_incidents=critical_incidents,
        recovered_fraud=recovered_fraud,
        status_distribution=status_distribution,
        fraud_by_type=fraud_by_type,
        risk_distribution=risk_distribution,
        recent_events=recent_events
    )
