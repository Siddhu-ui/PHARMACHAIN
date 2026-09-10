import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import FraudIncident, Alert, Batch

class AlertService:
    @staticmethod
    def create_fraud_incident(
        db: Session,
        batch_id: str,
        incident_type: str,
        risk_score: int,
        severity: str,
        description: str,
        evidence: Optional[Dict[str, Any]] = None,
        detected_by: str = "PharmaGuard Automated Compliance Engine",
        assigned_to: Optional[str] = "CDSCO Enforcement Officer"
    ) -> FraudIncident:
        incident = FraudIncident(
            batch_id=batch_id,
            incident_type=incident_type,
            risk_score=risk_score,
            severity=severity,
            description=description,
            detected_at=datetime.utcnow(),
            detected_by=detected_by,
            status="OPEN",
            evidence=json.dumps(evidence) if evidence else None,
            assigned_to=assigned_to
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)

        # Dispatch alerts to key stakeholders: Regulator, Manufacturer, Retailer
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        batch_no = batch.batch_number if batch else batch_id

        # 1. Regulator Alert
        regulator_alert = Alert(
            incident_id=incident.id,
            recipient_role="REGULATOR",
            severity=severity,
            message=f"CRITICAL COMPLIANCE ALERT: {incident_type} detected for batch {batch_no}. Risk Score: {risk_score}/100. {description}",
            read=False,
            created_at=datetime.utcnow()
        )
        db.add(regulator_alert)

        # 2. Manufacturer Alert
        manufacturer_alert = Alert(
            incident_id=incident.id,
            recipient_role="MANUFACTURER",
            severity=severity,
            message=f"BATCH INTEGRITY WARNING: {incident_type} flagged on your manufactured batch {batch_no}. Action required.",
            read=False,
            created_at=datetime.utcnow()
        )
        db.add(manufacturer_alert)

        # 3. Retailer Alert
        retailer_alert = Alert(
            incident_id=incident.id,
            recipient_role="RETAILER",
            severity=severity,
            message=f"SECURITY ALERT: Do not dispense or accept batch {batch_no}. Flagged as {incident_type}.",
            read=False,
            created_at=datetime.utcnow()
        )
        db.add(retailer_alert)

        db.commit()
        return incident

    @staticmethod
    def get_alerts(db: Session, role: Optional[str] = None, unread_only: bool = False):
        query = db.query(Alert)
        if role:
            query = query.filter(Alert.recipient_role == role)
        if unread_only:
            query = query.filter(Alert.read == False)
        return query.order_by(Alert.created_at.desc()).all()

    @staticmethod
    def mark_alert_read(db: Session, alert_id: str) -> Optional[Alert]:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if alert:
            alert.read = True
            db.commit()
            db.refresh(alert)
        return alert
