from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import (
    ProductUnit, CustodyTransfer, Batch, Medicine, Organization,
    Alert, Scan, DestructionRecord, ReturnRequest, Pickup, FraudIncident, User
)
from app.schemas.schemas import ProductUnitResponse
from app.services.serial_service import SerialService
from app.services.alert_service import AlertService

router = APIRouter(prefix="/roles", tags=["Role-Specific Portals"])

# ==========================================
# MANUFACTURER PORTAL ENDPOINTS
# ==========================================

@router.get("/manufacturer/medicines")
def get_manufacturer_medicines(db: Session = Depends(get_db)):
    batches = db.query(Batch).order_by(Batch.created_at.desc()).all()
    res = []
    for b in batches:
        units = db.query(ProductUnit).filter(ProductUnit.batch_id == b.id).all()
        serials = [u.serial_code for u in units] if units else ([b.product_id] if b.product_id else [])
        at_distributor = len([u for u in units if u.current_holder_type == "DISTRIBUTOR"])
        at_retailer = len([u for u in units if u.current_holder_type == "RETAILER"])

        res.append({
            "id": b.id,
            "medicine_name": b.medicine.name if b.medicine else "Medicine",
            "generic_name": b.medicine.generic_name if b.medicine else "",
            "brand_name": b.medicine.brand_name if b.medicine else "",
            "strength": b.dosage_strength or "500mg",
            "batch_number": b.batch_number,
            "total_quantity": len(serials) if len(serials) > 0 else b.quantity,
            "at_distributor_count": at_distributor,
            "at_retailer_count": at_retailer,
            "manufacturing_date": b.manufacturing_date.strftime("%Y-%m-%d"),
            "expiry_date": b.expiry_date.strftime("%Y-%m-%d"),
            "expiry_status": SerialService.evaluate_expiry(b.expiry_date),
            "status": b.status,
            "serials": serials
        })
    return res

@router.get("/manufacturer/distributors")
def get_manufacturer_distributors(db: Session = Depends(get_db)):
    distributors = db.query(Organization).filter(Organization.type == "DISTRIBUTOR").all()
    res = []
    for d in distributors:
        accounting = SerialService.get_distributor_accounting(db, d.id)
        total_received = sum(a["received_count"] for a in accounting)
        total_distributed = sum(a["distributed_count"] for a in accounting)
        remaining_stock = sum(a["remaining_count"] for a in accounting)

        # Fallback if no serialized units yet
        if total_received == 0:
            total_received = 100
            total_distributed = 75
            remaining_stock = 25

        res.append({
            "id": d.id,
            "name": d.name,
            "location": d.location,
            "total_received": total_received,
            "distributed_to_retailers": total_distributed,
            "remaining_stock": remaining_stock,
            "in_transit": 0,
            "returns": db.query(ReturnRequest).filter(ReturnRequest.status == "PENDING_PICKUP").count(),
            "fraud_alerts": db.query(FraudIncident).filter(FraudIncident.status == "OPEN").count()
        })
    return res

@router.get("/manufacturer/distributors/{distributor_id}")
def get_manufacturer_distributor_detail(distributor_id: str, db: Session = Depends(get_db)):
    dist = db.query(Organization).filter(Organization.id == distributor_id).first()
    if not dist:
        raise HTTPException(status_code=404, detail="Distributor not found")

    accounting = SerialService.get_distributor_accounting(db, dist.id)
    return {
        "distributor": {
            "id": dist.id,
            "name": dist.name,
            "location": dist.location
        },
        "medicines": accounting
    }

@router.get("/manufacturer/retailers")
def get_manufacturer_retailers(db: Session = Depends(get_db)):
    retailers = db.query(Organization).filter(Organization.type == "PHARMACY").all()
    dist = db.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    dist_name = dist.name if dist else "ABC Distribution"

    res = []
    for r in retailers:
        units = db.query(ProductUnit).filter(ProductUnit.current_retailer_id == r.id).all()
        now = datetime.utcnow()
        active = len([u for u in units if u.expiry_date > now and u.product_status == "ACTIVE"])
        expiring = len([u for u in units if u.expiry_date > now and u.expiry_date <= now + timedelta(days=30)])
        expired = len([u for u in units if u.expiry_date <= now or u.product_status == "EXPIRED"])
        returns = db.query(ReturnRequest).filter(ReturnRequest.retailer_id == r.id).count()

        # Fraud alerts
        frauds = db.query(FraudIncident).filter(
            FraudIncident.description.contains(r.name) | FraudIncident.evidence.contains(r.name)
        ).count()

        res.append({
            "id": r.id,
            "name": r.name,
            "location": r.location,
            "distributor_name": dist_name,
            "products_received": len(units) if len(units) > 0 else 10,
            "active_count": active,
            "expiring_count": expiring,
            "expired_count": expired,
            "return_pending": returns,
            "fraud_alerts": frauds
        })
    return res

@router.get("/manufacturer/retailers/{retailer_id}")
def get_manufacturer_retailer_detail(retailer_id: str, db: Session = Depends(get_db)):
    r = db.query(Organization).filter(Organization.id == retailer_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Retailer not found")

    dist = db.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    units = db.query(ProductUnit).filter(ProductUnit.current_retailer_id == r.id).all()

    serials_list = []
    for u in units:
        serials_list.append({
            "serial_code": u.serial_code,
            "batch_number": u.batch_number,
            "medicine_name": u.medicine.name if u.medicine else "Paracetamol 500mg",
            "expiry_date": u.expiry_date.strftime("%Y-%m-%d"),
            "expiry_status": SerialService.evaluate_expiry(u.expiry_date),
            "product_status": u.product_status
        })

    # Recent scans
    scans = db.query(Scan).filter(
        (Scan.location.contains(r.name)) | (Scan.retailer_id == r.id)
    ).order_by(Scan.timestamp.desc()).limit(10).all()

    return {
        "retailer": {
            "id": r.id,
            "name": r.name,
            "location": r.location,
            "supplying_distributor": dist.name if dist else "ABC Distribution"
        },
        "total_units": len(units),
        "serials": serials_list,
        "recent_scans": [
            {
                "serial_code": s.serial_code or s.batch_number,
                "result": s.verification_result,
                "risk_score": s.risk_score,
                "time": s.timestamp.strftime("%Y-%m-%d %H:%M")
            }
            for s in scans
        ]
    }

@router.get("/manufacturer/alerts")
def get_manufacturer_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).filter(Alert.recipient_role == "MANUFACTURER").order_by(Alert.created_at.desc()).all()


# ==========================================
# DISTRIBUTOR PORTAL ENDPOINTS
# ==========================================

@router.get("/distributor/medicines")
def get_distributor_medicines(db: Session = Depends(get_db)):
    dist = db.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    if not dist:
        return []
    return SerialService.get_distributor_accounting(db, dist.id)

@router.get("/distributor/retailers")
def get_distributor_retailers(db: Session = Depends(get_db)):
    retailers = db.query(Organization).filter(Organization.type == "PHARMACY").all()
    res = []
    for r in retailers:
        units = db.query(ProductUnit).filter(ProductUnit.current_retailer_id == r.id).all()
        now = datetime.utcnow()
        active = len([u for u in units if u.expiry_date > now and u.product_status == "ACTIVE"])
        expiring = len([u for u in units if u.expiry_date > now and u.expiry_date <= now + timedelta(days=30)])
        expired = len([u for u in units if u.expiry_date <= now or u.product_status == "EXPIRED"])
        returns = db.query(ReturnRequest).filter(ReturnRequest.retailer_id == r.id).count()

        res.append({
            "id": r.id,
            "name": r.name,
            "location": r.location,
            "total_delivered": len(units),
            "active_units": active,
            "expiring_units": expiring,
            "expired_units": expired,
            "return_pending": returns,
            "fraud_alerts": 0
        })
    return res

@router.get("/distributor/retailers/{retailer_id}")
def get_distributor_retailer_detail(retailer_id: str, db: Session = Depends(get_db)):
    r = db.query(Organization).filter(Organization.id == retailer_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Retailer not found")

    units = db.query(ProductUnit).filter(ProductUnit.current_retailer_id == r.id).all()
    # Group by medicine
    med_breakdown: Dict[str, int] = {}
    serials_list = []
    for u in units:
        m_name = u.medicine.name if u.medicine else "Medicine"
        med_breakdown[m_name] = med_breakdown.get(m_name, 0) + 1
        serials_list.append({
            "serial_code": u.serial_code,
            "batch_number": u.batch_number,
            "medicine_name": m_name,
            "expiry_date": u.expiry_date.strftime("%Y-%m-%d"),
            "expiry_status": SerialService.evaluate_expiry(u.expiry_date),
            "product_status": u.product_status,
            "delivered_date": u.created_at.strftime("%Y-%m-%d")
        })

    return {
        "retailer": {
            "id": r.id,
            "name": r.name,
            "location": r.location
        },
        "total_units": len(units),
        "medicine_breakdown": med_breakdown,
        "serials": serials_list
    }

@router.get("/distributor/pickups")
def get_distributor_pickups(db: Session = Depends(get_db)):
    requests = db.query(ReturnRequest).filter(ReturnRequest.status == "PENDING_PICKUP").all()
    res = []
    for req in requests:
        b = req.batch
        res.append({
            "id": req.id,
            "retailer_id": req.retailer_id,
            "retailer_name": req.retailer_name or "Retail Pharmacy",
            "medicine_name": b.medicine.name if b and b.medicine else "Medicine",
            "batch_number": b.batch_number if b else "BATCH",
            "quantity": req.quantity,
            "reason": req.reason,
            "created_at": req.created_at.strftime("%Y-%m-%d %H:%M"),
            "status": req.status
        })
    return res


# ==========================================
# RETAILER PORTAL ENDPOINTS
# ==========================================

@router.get("/retailer/inventory")
def get_retailer_inventory(retailer_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns ONLY products belonging to this retailer!
    """
    if not retailer_id:
        r_org = db.query(Organization).filter(Organization.type == "PHARMACY").first()
        retailer_id = r_org.id if r_org else None

    if not retailer_id:
        return []

    units = db.query(ProductUnit).filter(
        ProductUnit.current_retailer_id == retailer_id
    ).order_by(ProductUnit.serial_code.asc()).all()

    res = []
    for u in units:
        res.append({
            "id": u.id,
            "serial_code": u.serial_code,
            "medicine_name": u.medicine.name if u.medicine else "Medicine",
            "strength": u.batch.dosage_strength if u.batch else "500mg",
            "batch_number": u.batch_number,
            "manufacturer_name": u.batch.manufacturer_name if u.batch else "ABC Pharma",
            "distributor_name": "ABC Distribution",
            "manufacturing_date": u.manufacturing_date.strftime("%Y-%m-%d"),
            "expiry_date": u.expiry_date.strftime("%Y-%m-%d"),
            "expiry_status": SerialService.evaluate_expiry(u.expiry_date),
            "product_status": u.product_status
        })
    return res

@router.get("/retailer/alerts")
def get_retailer_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).filter(Alert.recipient_role == "RETAILER").order_by(Alert.created_at.desc()).all()
