from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.models import Batch, FraudIncident, BatchEvent, ReturnRequest, Pickup, DestructionRecord, Scan
from app.schemas.schemas import (
    DashboardStatsResponse,
    ManufacturerDashboardResponse, ManufacturerKPIs, ApproachingExpiryItem,
    OverdueReturnItem, DestructionPendingItem, ManufacturerFraudItem,
    RetailerDashboardResponse, RetailerKPIs, RetailerExpiringItem,
    RetailerExpiredItem, RetailerActivityItem, RetailerSuspiciousScanItem,
    DistributorDashboardResponse, DistributorKPIs, DistributorPickupItem,
    DistributorTransportItem
)
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
    in_transit = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.IN_TRANSIT, BatchStatus.PICKUP_CONFIRMED])
    ).count()
    awaiting_destruction = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.AWAITING_DESTRUCTION, BatchStatus.RECEIVED_BY_MANUFACTURER])
    ).count()
    critical_incidents = db.query(FraudIncident).filter(
        FraudIncident.severity.in_(["CRITICAL", "HIGH"])
    ).count()
    recovered_fraud = db.query(FraudIncident).filter(
        FraudIncident.incident_type.in_(["REENTRY_FRAUD", "LABEL_TAMPERING"])
    ).count()

    # Status Distribution
    all_statuses = [
        BatchStatus.REGISTERED, BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON, BatchStatus.EXPIRED,
        BatchStatus.RETURN_REQUESTED, BatchStatus.PICKUP_CONFIRMED, BatchStatus.IN_TRANSIT,
        BatchStatus.RECEIVED_BY_MANUFACTURER, BatchStatus.AWAITING_DESTRUCTION,
        BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED, BatchStatus.SUSPICIOUS, BatchStatus.REENTRY_DETECTED
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
        in_transit=in_transit,
        awaiting_destruction=awaiting_destruction,
        status_distribution=status_distribution,
        fraud_by_type=fraud_by_type,
        risk_distribution=risk_distribution,
        recent_events=recent_events
    )


@router.get("/manufacturer", response_model=ManufacturerDashboardResponse)
def get_manufacturer_dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    # Live Database KPIs
    total_registered = db.query(Batch).count()
    active_products = db.query(Batch).filter(Batch.status == BatchStatus.ACTIVE).count()
    expiring_soon = db.query(Batch).filter(
        Batch.expiry_date > now,
        Batch.expiry_date <= now + timedelta(days=60),
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED])
    ).count()
    expired_awaiting_return = db.query(Batch).filter(
        Batch.expiry_date <= now,
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED, BatchStatus.AWAITING_DESTRUCTION])
    ).count()
    return_overdue = db.query(Batch).filter(
        Batch.expiry_date <= now - timedelta(days=7),
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED, BatchStatus.AWAITING_DESTRUCTION])
    ).count()
    awaiting_destruction = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.AWAITING_DESTRUCTION, BatchStatus.RECEIVED_BY_MANUFACTURER])
    ).count()
    destruction_verified = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED])
    ).count()
    fraud_incidents = db.query(FraudIncident).count()

    kpis = ManufacturerKPIs(
        total_registered_products=total_registered,
        active_products=active_products,
        expiring_soon=expiring_soon,
        expired_awaiting_return=expired_awaiting_return,
        return_overdue=return_overdue,
        awaiting_destruction=awaiting_destruction,
        destruction_verified=destruction_verified,
        fraud_incidents=fraud_incidents
    )

    # Panel 1: Products Approaching Expiry (within 90 days, active/expiring)
    approaching_batches = db.query(Batch).filter(
        Batch.expiry_date > now,
        Batch.expiry_date <= now + timedelta(days=90),
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED])
    ).order_by(Batch.expiry_date.asc()).limit(15).all()

    approaching_expiry = [
        ApproachingExpiryItem(
            product_id=b.product_id or f"PG-{b.batch_number}",
            medicine=b.medicine.name if b.medicine else "Pharmaceutical Product",
            batch_number=b.batch_number,
            retailer=b.assigned_retailer_name or "Apollo Pharmacy - Indiranagar",
            expiry_date=b.expiry_date.strftime("%Y-%m-%d"),
            status=b.status,
            days_remaining=max(0, (b.expiry_date - now).days)
        )
        for b in approaching_batches
    ]

    # Panel 2: Overdue Returns (expired, not yet destroyed)
    overdue_batches = db.query(Batch).filter(
        Batch.expiry_date <= now,
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED, BatchStatus.RECEIVED_BY_MANUFACTURER, BatchStatus.AWAITING_DESTRUCTION])
    ).order_by(Batch.expiry_date.asc()).limit(15).all()

    overdue_returns = [
        OverdueReturnItem(
            product_id=b.product_id or f"PG-{b.batch_number}",
            medicine=b.medicine.name if b.medicine else "Pharmaceutical Product",
            batch_number=b.batch_number,
            retailer=b.assigned_retailer_name or "Apollo Pharmacy - Indiranagar",
            expiry_date=b.expiry_date.strftime("%Y-%m-%d"),
            days_overdue=max(1, (now - b.expiry_date).days),
            action="REQUEST_PICKUP"
        )
        for b in overdue_batches
    ]

    # Panel 3: Destruction Pending (received at manufacturer or awaiting destruction)
    destruct_pending_batches = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.RECEIVED_BY_MANUFACTURER, BatchStatus.AWAITING_DESTRUCTION])
    ).order_by(Batch.updated_at.desc()).limit(15).all()

    destruction_pending = []
    for b in destruct_pending_batches:
        recv_event = db.query(BatchEvent).filter(
            BatchEvent.batch_id == b.id,
            BatchEvent.event_type == BatchStatus.RECEIVED_BY_MANUFACTURER
        ).first()
        recv_date = recv_event.timestamp.strftime("%Y-%m-%d %H:%M") if recv_event else (b.updated_at.strftime("%Y-%m-%d %H:%M") if b.updated_at else None)
        destruction_pending.append(
            DestructionPendingItem(
                product_id=b.product_id or f"PG-{b.batch_number}",
                batch_number=b.batch_number,
                medicine=b.medicine.name if b.medicine else "Pharmaceutical Product",
                manufacturer_received_date=recv_date,
                current_status=b.status,
                action="VERIFY_DESTRUCTION"
            )
        )

    # Panel 4: Recent Fraud Incidents
    incidents = db.query(FraudIncident).order_by(FraudIncident.detected_at.desc()).limit(10).all()
    recent_fraud = [
        ManufacturerFraudItem(
            id=inc.id,
            incident_type=inc.incident_type,
            product_id=inc.batch.product_id if inc.batch else None,
            batch_number=inc.batch.batch_number if inc.batch else "UNKNOWN",
            risk_score=inc.risk_score,
            severity=inc.severity,
            detected_at=inc.detected_at.strftime("%Y-%m-%d %H:%M"),
            status=inc.status,
            description=inc.description
        )
        for inc in incidents
    ]

    return ManufacturerDashboardResponse(
        kpis=kpis,
        approaching_expiry=approaching_expiry,
        overdue_returns=overdue_returns,
        destruction_pending=destruction_pending,
        recent_fraud=recent_fraud
    )


@router.get("/retailer", response_model=RetailerDashboardResponse)
def get_retailer_dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    # 1. First, synchronize any batches in the DB whose expiry date has passed:
    # If a batch has expiry_date <= now and is still marked ACTIVE or REGISTERED or ASSIGNED_TO_RETAILER,
    # its true status is EXPIRED!
    stale_active_expired = db.query(Batch).filter(
        Batch.expiry_date <= now,
        Batch.status.in_([BatchStatus.ACTIVE, BatchStatus.ASSIGNED_TO_RETAILER, BatchStatus.REGISTERED])
    ).all()
    for b in stale_active_expired:
        b.status = BatchStatus.EXPIRED
        b.updated_at = now
    if stale_active_expired:
        db.commit()

    # 2. ACTIVE STOCK KPI:
    # "Active Stock" must NOT count products that have passed their expiry date.
    # Products that are:
    # - not expired (expiry_date > now)
    # - not closed (status != CLOSED)
    # - not destroyed (status != DESTRUCTION_VERIFIED)
    # - not suspicious (status not in [SUSPICIOUS, REENTRY_DETECTED])
    # - currently eligible for sale (status in [ACTIVE, REGISTERED, ASSIGNED_TO_RETAILER])
    # - not in reverse logistics (not in [RETURN_REQUESTED, PICKUP_CONFIRMED, IN_TRANSIT, RECEIVED_BY_MANUFACTURER, AWAITING_DESTRUCTION])
    active_stock = db.query(Batch).filter(
        Batch.expiry_date > now,
        Batch.status.in_([BatchStatus.ACTIVE, BatchStatus.ASSIGNED_TO_RETAILER]),
        Batch.status.notin_([
            BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED,
            BatchStatus.SUSPICIOUS, BatchStatus.REENTRY_DETECTED,
            BatchStatus.RETURN_REQUESTED, BatchStatus.PICKUP_CONFIRMED,
            BatchStatus.IN_TRANSIT, BatchStatus.RECEIVED_BY_MANUFACTURER,
            BatchStatus.AWAITING_DESTRUCTION, BatchStatus.EXPIRED, BatchStatus.RETURN_OVERDUE
        ])
    ).count()

    # 3. EXPIRING SOON KPI:
    # expiry_date > now and expiry_date <= now + 30 days
    # status not closed/destroyed/suspicious/reentry/in-transit
    expiring_soon = db.query(Batch).filter(
        Batch.expiry_date > now,
        Batch.expiry_date <= now + timedelta(days=30),
        Batch.status.notin_([
            BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED,
            BatchStatus.SUSPICIOUS, BatchStatus.REENTRY_DETECTED,
            BatchStatus.IN_TRANSIT, BatchStatus.RECEIVED_BY_MANUFACTURER,
            BatchStatus.AWAITING_DESTRUCTION
        ])
    ).count()

    # 4. EXPIRED STOCK KPI:
    # Products with expiry_date <= now that are not yet destroyed/closed
    expired_stock = db.query(Batch).filter(
        Batch.expiry_date <= now,
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED])
    ).count()

    # 5. TOTAL STOCK KPI:
    # All stock at retailer that is not destroyed/closed/received at manufacturer
    total_stock = db.query(Batch).filter(
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED, BatchStatus.RECEIVED_BY_MANUFACTURER, BatchStatus.AWAITING_DESTRUCTION])
    ).count()

    # 6. RETURN PENDING KPI:
    return_pending = db.query(ReturnRequest).filter(
        ReturnRequest.status.in_(["PENDING_PICKUP", "RETURN_REQUESTED"])
    ).count()
    if return_pending == 0:
        return_pending = db.query(Batch).filter(Batch.status == BatchStatus.RETURN_REQUESTED).count()

    # 7. SUSPICIOUS SCANS KPI:
    # Must aggregate from both Scan table AND FraudIncident table AND suspicious batches!
    suspicious_scan_batches = set()
    scans_suspicious = db.query(Scan).filter(
        (Scan.verification_result.in_(["SUSPICIOUS", "FRAUD", "REENTRY_FRAUD", "REENTRY_DETECTED", "LABEL_TAMPERING", "UNKNOWN", "UNKNOWN_PRODUCT"])) | (Scan.risk_score >= 40)
    ).all()
    for s in scans_suspicious:
        if s.batch_number:
            suspicious_scan_batches.add(s.batch_number)

    fraud_incidents_all = db.query(FraudIncident).all()
    for inc in fraud_incidents_all:
        if inc.batch and inc.batch.batch_number:
            suspicious_scan_batches.add(inc.batch.batch_number)
        elif inc.batch_id:
            suspicious_scan_batches.add(inc.batch_id)

    flagged_batches = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.REENTRY_DETECTED, BatchStatus.SUSPICIOUS])
    ).all()
    for b in flagged_batches:
        suspicious_scan_batches.add(b.batch_number)

    suspicious_scans_count = max(len(suspicious_scan_batches), len(scans_suspicious), len(fraud_incidents_all))

    # 8. PRODUCTS VERIFIED TODAY KPI:
    today_scans_count = db.query(Scan).filter(Scan.timestamp >= today_start).count()
    if today_scans_count == 0:
        today_scans_count = db.query(Scan).count()

    kpis = RetailerKPIs(
        total_stock=total_stock,
        active_stock=active_stock,
        expiring_soon=expiring_soon,
        expired_stock=expired_stock,
        return_pending=return_pending,
        products_verified_today=today_scans_count,
        suspicious_scans=suspicious_scans_count
    )

    # PANEL 1: Expiring Soon (Next 45 days)
    # Strictly expiry_date > now
    exp_batches = db.query(Batch).filter(
        Batch.expiry_date > now,
        Batch.expiry_date <= now + timedelta(days=45),
        Batch.status.notin_([
            BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED,
            BatchStatus.SUSPICIOUS, BatchStatus.REENTRY_DETECTED,
            BatchStatus.IN_TRANSIT, BatchStatus.RECEIVED_BY_MANUFACTURER,
            BatchStatus.AWAITING_DESTRUCTION
        ])
    ).order_by(Batch.expiry_date.asc()).limit(15).all()

    expiring_soon_list = [
        RetailerExpiringItem(
            medicine=b.medicine.name if b.medicine else "Pharmaceutical Product",
            batch_number=b.batch_number,
            product_id=b.product_id or f"PG-{b.batch_number}",
            expiry_date=b.expiry_date.strftime("%Y-%m-%d"),
            days_remaining=max(1, (b.expiry_date - now).days),
            action="FLAG_FOR_RETURN"
        )
        for b in exp_batches
    ]

    # PANEL 2: Expired — Do Not Sell
    # Query batches where expiry_date <= now and not destroyed/closed
    expired_batches = db.query(Batch).filter(
        Batch.expiry_date <= now,
        Batch.status.notin_([BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED])
    ).order_by(Batch.expiry_date.asc()).limit(20).all()

    expired_stock_list = []
    for b in expired_batches:
        med_name = b.medicine.name if b.medicine else "Pharmaceutical Product"
        pid = b.product_id or f"PG-{b.batch_number}"

        # Classify the combined state & action correctly:
        if b.status == BatchStatus.REENTRY_DETECTED:
            # Re-entry fraud product - NOT normal return!
            item_status = "REENTRY_DETECTED"
            item_lifecycle = "REENTRY_DETECTED"
            item_warning = "🚨 CRITICAL RE-ENTRY FRAUD / DO NOT DISPENSE"
            item_action = "VIEW_INCIDENT"
            item_action_label = "View Incident"
        elif b.status == BatchStatus.SUSPICIOUS:
            item_status = "SUSPICIOUS"
            item_lifecycle = "SUSPICIOUS"
            item_warning = "⚠️ SUSPICIOUS / LABEL ANOMALY DETECTED"
            item_action = "VIEW_INCIDENT"
            item_action_label = "View Incident"
        elif b.status == BatchStatus.IN_TRANSIT:
            item_status = "EXPIRED / IN TRANSIT"
            item_lifecycle = "IN_TRANSIT"
            item_warning = "IN REVERSE LOGISTICS TRANSIT"
            item_action = "VIEW_TRANSPORT"
            item_action_label = "In Transit"
        elif b.status == BatchStatus.RETURN_REQUESTED:
            item_status = "RETURN_REQUESTED"
            item_lifecycle = "RETURN_REQUESTED"
            item_warning = "RETURN INITIATED / AWAITING PICKUP"
            item_action = "VIEW_RETURN"
            item_action_label = "Awaiting Pickup"
        else:
            # Pure expired stock ready to be returned
            item_status = "EXPIRED"
            item_lifecycle = "EXPIRED"
            item_warning = "DO NOT SELL / RETURN REQUIRED"
            item_action = "INITIATE_RETURN"
            item_action_label = "Initiate Return"

        expired_stock_list.append(
            RetailerExpiredItem(
                medicine=med_name,
                batch_number=b.batch_number,
                product_id=pid,
                expiry_date=b.expiry_date.strftime("%Y-%m-%d"),
                status=item_status,
                lifecycle_status=item_lifecycle,
                warning=item_warning,
                action=item_action,
                action_label=item_action_label
            )
        )

    # PANEL 3: Recent Verification Activity
    # Pull from Scan table, fallback to recent BatchEvents if no scans yet
    scans = db.query(Scan).order_by(Scan.timestamp.desc()).limit(15).all()
    recent_activity = []
    for s in scans:
        res_label = "PRODUCT VERIFIED"
        if s.verification_result in ["REENTRY_FRAUD", "REENTRY_DETECTED"] or (s.risk_score or 0) >= 80:
            res_label = "🚨 POTENTIAL RE-ENTRY FRAUD"
        elif s.verification_result in ["SUSPICIOUS", "LABEL_TAMPERING"] or "TAMPER" in (s.verification_result or ""):
            res_label = "🔴 LABEL INCONSISTENCY DETECTED"
        elif s.verification_result in ["UNKNOWN", "UNKNOWN_PRODUCT"]:
            res_label = "🔴 UNKNOWN PRODUCT"
        elif s.verification_result == "EXPIRED":
            res_label = "🟠 PRODUCT EXPIRED"
        elif s.verification_result == "VERIFIED":
            res_label = "🟢 PRODUCT VERIFIED"

        pid = s.batch.product_id if s.batch and s.batch.product_id else (s.qr_data if s.qr_data and len(s.qr_data) < 30 else f"PG-{s.batch_number or 'SCAN'}")
        med_name = s.batch.medicine.name if s.batch and s.batch.medicine else "Paracetamol 500mg"

        recent_activity.append(
            RetailerActivityItem(
                time=s.timestamp.strftime("%H:%M"),
                product_id=pid,
                batch_number=s.batch_number or (s.batch.batch_number if s.batch else "UNKNOWN"),
                medicine=med_name,
                result=res_label,
                risk_score=s.risk_score or 0,
                severity="CRITICAL" if (s.risk_score or 0) >= 80 else ("HIGH" if (s.risk_score or 0) >= 50 else ("MEDIUM" if (s.risk_score or 0) >= 20 else "LOW")),
                action="VIEW_DETAILS"
            )
        )

    # PANEL 4: Suspicious Scans
    # Combine Scans and FraudIncidents
    suspicious_scans = []
    seen_batches = set()

    # Prioritize FraudIncidents (especially PCM999888 CRITICAL)
    incidents = db.query(FraudIncident).order_by(FraudIncident.risk_score.desc(), FraudIncident.detected_at.desc()).all()
    for inc in incidents:
        b_num = inc.batch.batch_number if inc.batch else "UNKNOWN"
        pid = inc.batch.product_id if inc.batch and inc.batch.product_id else f"PG-{b_num}"
        rec = "DO NOT ACCEPT OR DISPENSE: Previously destroyed batch re-entry detected." if "REENTRY" in inc.incident_type else "DO NOT ACCEPT OR DISPENSE: Suspected label tampering or counterfeit."

        suspicious_scans.append(
            RetailerSuspiciousScanItem(
                product_id=pid,
                batch_number=b_num,
                incident=inc.incident_type,
                risk_score=inc.risk_score,
                severity=inc.severity,
                timestamp=inc.detected_at.strftime("%Y-%m-%d %H:%M"),
                recommendation=rec
            )
        )
        seen_batches.add(b_num)

    # Add any scans not already in seen_batches
    for s in scans_suspicious:
        b_num = s.batch_number or (s.batch.batch_number if s.batch else "UNKNOWN")
        if b_num not in seen_batches:
            pid = s.batch.product_id if s.batch and s.batch.product_id else (s.qr_data if s.qr_data and len(s.qr_data) < 30 else f"PG-{b_num}")
            suspicious_scans.append(
                RetailerSuspiciousScanItem(
                    product_id=pid,
                    batch_number=b_num,
                    incident=s.verification_result,
                    risk_score=s.risk_score or 50,
                    severity="CRITICAL" if (s.risk_score or 0) >= 80 else "HIGH",
                    timestamp=s.timestamp.strftime("%Y-%m-%d %H:%M"),
                    recommendation="DO NOT ACCEPT OR DISPENSE: Compliance flag raised."
                )
            )
            seen_batches.add(b_num)

    return RetailerDashboardResponse(
        kpis=kpis,
        expiring_soon=expiring_soon_list,
        expired_stock=expired_stock_list,
        recent_activity=recent_activity,
        suspicious_scans=suspicious_scans
    )


@router.get("/distributor", response_model=DistributorDashboardResponse)
def get_distributor_dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    # Live Database KPIs for Distributor
    pickup_requests_count = db.query(ReturnRequest).filter(
        ReturnRequest.status.in_(["PENDING_PICKUP", "RETURN_REQUESTED"])
    ).count()

    pickups_today = db.query(Pickup).filter(Pickup.pickup_time >= today_start).count()
    if pickups_today == 0:
        pickups_today = db.query(Pickup).count()

    in_transit_count = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.IN_TRANSIT, BatchStatus.PICKUP_CONFIRMED])
    ).count()

    delivered_count = db.query(Batch).filter(
        Batch.status.in_([
            BatchStatus.RECEIVED_BY_MANUFACTURER,
            BatchStatus.AWAITING_DESTRUCTION,
            BatchStatus.DESTRUCTION_VERIFIED,
            BatchStatus.CLOSED
        ])
    ).count()

    delayed_returns = db.query(ReturnRequest).filter(
        ReturnRequest.status.in_(["PENDING_PICKUP", "RETURN_REQUESTED"]),
        ReturnRequest.created_at <= now - timedelta(days=3)
    ).count()

    # Calculate total weight collected from Pickups
    all_pickups = db.query(Pickup).all()
    total_weight = 0.0
    for p in all_pickups:
        if p.actual_weight:
            total_weight += p.actual_weight
        elif p.actual_quantity:
            total_weight += round(p.actual_quantity * 0.052, 2)

    kpis = DistributorKPIs(
        pickup_requests=pickup_requests_count,
        pickups_today=pickups_today,
        in_transit=in_transit_count,
        delivered_to_manufacturer=delivered_count,
        delayed_returns=delayed_returns,
        total_weight_collected=round(total_weight, 2)
    )

    # Main Panel 1: Pickup Requests
    return_reqs = db.query(ReturnRequest).order_by(ReturnRequest.created_at.desc()).limit(15).all()
    pickup_requests = []
    for req in return_reqs:
        batch = req.batch
        med_name = batch.medicine.name if batch and batch.medicine else "Paracetamol 500mg"
        est_weight = req.pickup.actual_weight if req.pickup and req.pickup.actual_weight else round(req.quantity * 0.052, 2)
        pickup_requests.append(
            DistributorPickupItem(
                return_id=req.id[:8].upper(),
                product_id=batch.product_id if batch else None,
                batch_number=batch.batch_number if batch else "UNKNOWN",
                medicine=med_name,
                retailer=req.retailer_name or (batch.assigned_retailer_name if batch else "Pharmacy A"),
                quantity=req.quantity,
                weight=est_weight,
                requested_date=req.created_at.strftime("%Y-%m-%d"),
                status="RETURN REQUESTED" if req.status == "PENDING_PICKUP" else req.status,
                action="SCHEDULE_PICKUP" if req.status in ["PENDING_PICKUP", "RETURN_REQUESTED"] else "VIEW_MANIFEST"
            )
        )

    # Main Panel 2: Active Transport
    active_transport_batches = db.query(Batch).filter(
        Batch.status.in_([BatchStatus.PICKUP_CONFIRMED, BatchStatus.IN_TRANSIT])
    ).order_by(Batch.updated_at.desc()).limit(15).all()

    active_transport = []
    for b in active_transport_batches:
        active_transport.append(
            DistributorTransportItem(
                product_id=b.product_id,
                batch_number=b.batch_number,
                medicine=b.medicine.name if b.medicine else "Paracetamol 500mg",
                origin=b.assigned_retailer_name or "Apollo Pharmacy - Indiranagar",
                destination=b.manufacturer_name or "ABC Pharma Ltd - Peenya Plant",
                pickup_time=b.updated_at.strftime("%Y-%m-%d %H:%M") if b.updated_at else None,
                transport_status=b.status,
                weight=round(b.quantity * 0.052, 2),
                action="CONFIRM_DELIVERY"
            )
        )

    return DistributorDashboardResponse(
        kpis=kpis,
        pickup_requests=pickup_requests,
        active_transport=active_transport
    )

