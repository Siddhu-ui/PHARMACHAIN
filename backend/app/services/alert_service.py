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
    def create_alert(
        db: Session,
        recipient_role: str,
        message: str,
        severity: str = "HIGH",
        incident_id: Optional[str] = None,
        product_id: Optional[str] = None,
        serial_code: Optional[str] = None,
        batch_id: Optional[str] = None,
        batch_number: Optional[str] = None,
        medicine_name: Optional[str] = None,
        alert_type: Optional[str] = None,
        recipient_name: Optional[str] = None,
        action_url: Optional[str] = None
    ) -> Alert:
        alert = Alert(
            incident_id=incident_id,
            product_id=product_id or serial_code,
            serial_code=serial_code,
            batch_number=batch_number,
            medicine_name=medicine_name,
            alert_type=alert_type,
            action_url=action_url,
            recipient_role=recipient_role,
            recipient_name=recipient_name,
            severity=severity,
            message=message,
            read=False,
            created_at=datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    @staticmethod
    def create_expiry_alerts(
        db: Session,
        serial_code: str,
        medicine_name: str,
        batch_number: str,
        expiry_date: datetime,
        is_already_expired: bool = True,
        retailer_name: str = "Pharmacy A",
        distributor_name: Optional[str] = None,
        manufacturer_name: Optional[str] = None,
        is_expired: Optional[bool] = None
    ) -> List[Alert]:
        now = datetime.utcnow()
        exp_str = expiry_date.strftime("%d/%m/%Y")
        alerts = []
        expired_flag = is_expired if is_expired is not None else is_already_expired

        if expired_flag:
            # 1. Retailer Alert
            r_alert = Alert(
                product_id=serial_code,
                serial_code=serial_code,
                batch_number=batch_number,
                medicine_name=medicine_name,
                alert_type="EXPIRED",
                action_url=f"/retailer/medicines/{serial_code}",
                recipient_role="RETAILER",
                recipient_name=retailer_name,
                severity="HIGH",
                message=f"🔴 MEDICINE EXPIRED: {medicine_name} (Serial: {serial_code}, Batch: {batch_number}) has passed shelf-life ({exp_str}). DO NOT SELL / RETURN REQUIRED.",
                read=False,
                created_at=now
            )
            # 2. Manufacturer Alert
            m_alert = Alert(
                product_id=serial_code,
                serial_code=serial_code,
                batch_number=batch_number,
                medicine_name=medicine_name,
                alert_type="EXPIRED",
                action_url=f"/manufacturer/products/{serial_code}",
                recipient_role="MANUFACTURER",
                severity="HIGH",
                message=f"🔴 PRODUCT EXPIRED AT RETAILER: {medicine_name} (Serial: {serial_code}) reached expiry at {retailer_name}. Reverse return expected.",
                read=False,
                created_at=now
            )
            alerts.extend([r_alert, m_alert])
        else:
            # Expiring soon
            r_alert = Alert(
                product_id=serial_code,
                serial_code=serial_code,
                batch_number=batch_number,
                medicine_name=medicine_name,
                alert_type="EXPIRING_SOON",
                action_url=f"/retailer/medicines/{serial_code}",
                recipient_role="RETAILER",
                recipient_name=retailer_name,
                severity="MEDIUM",
                message=f"🟠 MEDICINE EXPIRING SOON: {medicine_name} (Serial: {serial_code}) expires on {exp_str}. Plan reverse return before expiry.",
                read=False,
                created_at=now
            )
            m_alert = Alert(
                product_id=serial_code,
                serial_code=serial_code,
                batch_number=batch_number,
                medicine_name=medicine_name,
                alert_type="EXPIRING_SOON",
                action_url=f"/manufacturer/products/{serial_code}",
                recipient_role="MANUFACTURER",
                severity="MEDIUM",
                message=f"🟠 PRODUCT EXPIRY ALERT: {medicine_name} (Serial: {serial_code}) at {retailer_name} expires on {exp_str}. Stock approaching shelf-life.",
                read=False,
                created_at=now
            )
            alerts.extend([r_alert, m_alert])

        db.add_all(alerts)
        db.commit()
        return alerts

    @staticmethod
    def create_location_mismatch_alerts(
        db: Session,
        serial_code: str,
        medicine_name: str,
        batch_number: str,
        registered_retailer: str,
        scanning_retailer: str
    ) -> List[Alert]:
        now = datetime.utcnow()
        r_alert = Alert(
            product_id=serial_code,
            serial_code=serial_code,
            batch_number=batch_number,
            medicine_name=medicine_name,
            alert_type="LOCATION_MISMATCH",
            recipient_role="RETAILER",
            recipient_name=scanning_retailer,
            severity="HIGH",
            message=f"🚨 DISTRIBUTION MISMATCH: Package {serial_code} was allocated to '{registered_retailer}' but scanned at '{scanning_retailer}'. DO NOT DISPENSE UNTIL INVESTIGATED.",
            read=False,
            created_at=now
        )
        m_alert = Alert(
            product_id=serial_code,
            serial_code=serial_code,
            batch_number=batch_number,
            medicine_name=medicine_name,
            alert_type="LOCATION_MISMATCH",
            recipient_role="MANUFACTURER",
            severity="HIGH",
            message=f"🚨 UNAUTHORIZED RETAIL LOCATION: Serial {serial_code} allocated to '{registered_retailer}' was scanned at '{scanning_retailer}'. Potential diversion anomaly.",
            read=False,
            created_at=now
        )
        reg_alert = Alert(
            product_id=serial_code,
            serial_code=serial_code,
            batch_number=batch_number,
            medicine_name=medicine_name,
            alert_type="LOCATION_MISMATCH",
            recipient_role="REGULATOR",
            severity="HIGH",
            message=f"SUPPLY CHAIN DIVERSION: Package {serial_code} scanned at unauthorized retail counter '{scanning_retailer}' (registered holder: {registered_retailer}).",
            read=False,
            created_at=now
        )
        db.add_all([r_alert, m_alert, reg_alert])
        db.commit()
        return [r_alert, m_alert, reg_alert]

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
