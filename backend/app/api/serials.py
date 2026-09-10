from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import (
    ProductUnit, CustodyTransfer, Batch, Medicine, Organization,
    Alert, Scan, DestructionRecord, ReturnRequest, Pickup, FraudIncident
)
from app.schemas.schemas import (
    ProductUnitResponse, CustodyTransferResponse, SerialDetailResponse,
    DistributorAllocationRequest, DispenseRequest, DispenseResponse
)
from app.services.serial_service import SerialService
from app.services.alert_service import AlertService

router = APIRouter(prefix="/serials", tags=["Serialized Products & Chain of Custody"])

@router.get("", response_model=List[ProductUnitResponse])
def get_serial_units(
    batch_id: Optional[str] = None,
    holder_type: Optional[str] = None,
    holder_id: Optional[str] = None,
    retailer_id: Optional[str] = None,
    distributor_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProductUnit)
    if batch_id:
        query = query.filter(ProductUnit.batch_id == batch_id)
    if holder_type:
        query = query.filter(ProductUnit.current_holder_type == holder_type)
    if holder_id:
        query = query.filter(ProductUnit.current_holder_id == holder_id)
    if retailer_id:
        query = query.filter(ProductUnit.current_retailer_id == retailer_id)
    if distributor_id:
        query = query.filter(ProductUnit.current_distributor_id == distributor_id)
    if status:
        query = query.filter(ProductUnit.product_status == status)

    units = query.order_by(ProductUnit.serial_code.asc()).all()
    res = []
    for u in units:
        med_name = u.medicine.name if u.medicine else None
        mfg_name = u.batch.manufacturer_name if u.batch else None
        res.append(
            ProductUnitResponse(
                id=u.id,
                serial_code=u.serial_code,
                medicine_id=u.medicine_id,
                batch_id=u.batch_id,
                batch_number=u.batch_number,
                medicine_name=med_name,
                dosage_strength=u.batch.dosage_strength if u.batch else "500mg",
                manufacturer_id=u.manufacturer_id,
                manufacturer_name=mfg_name,
                current_distributor_id=u.current_distributor_id,
                current_distributor_name=u.current_holder_name if u.current_holder_type == "DISTRIBUTOR" else None,
                current_retailer_id=u.current_retailer_id,
                current_retailer_name=u.current_holder_name if u.current_holder_type == "RETAILER" else None,
                current_holder_type=u.current_holder_type,
                current_holder_name=u.current_holder_name,
                current_location=u.current_location,
                qr_payload=u.qr_payload,
                product_status=u.product_status,
                expiry_status=SerialService.evaluate_expiry(u.expiry_date),
                manufacturing_date=u.manufacturing_date,
                expiry_date=u.expiry_date,
                created_at=u.created_at
            )
        )
    return res

@router.get("/{serial_code}", response_model=SerialDetailResponse)
def get_serial_detail(serial_code: str, db: Session = Depends(get_db)):
    unit = db.query(ProductUnit).filter(ProductUnit.serial_code == serial_code).first()
    if not unit:
        # Fallback to batch if serialized unit doesn't exist yet
        batch = db.query(Batch).filter(
            (Batch.product_id == serial_code) | (Batch.batch_number == serial_code)
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail=f"Serial code '{serial_code}' not found.")

        # Synthesize fallback unit response for legacy batches
        unit_res = ProductUnitResponse(
            id=batch.id,
            serial_code=batch.product_id or serial_code,
            medicine_id=batch.medicine_id,
            batch_id=batch.id,
            batch_number=batch.batch_number,
            medicine_name=batch.medicine.name if batch.medicine else "Medicine",
            dosage_strength=batch.dosage_strength or "500mg",
            manufacturer_id=batch.manufacturer_id,
            manufacturer_name=batch.manufacturer_name or "Sun Pharma Laboratories Ltd.",
            current_distributor_id=None,
            current_distributor_name="Apex Healthcare Logistics Ltd.",
            current_retailer_id=batch.original_retailer_id,
            current_retailer_name=batch.assigned_retailer_name or "Apollo Pharmacy - Indiranagar",
            current_holder_type="RETAILER" if batch.assigned_retailer_name else "DISTRIBUTOR",
            current_holder_name=batch.assigned_retailer_name or "Apex Healthcare Logistics Ltd.",
            current_location=batch.current_location,
            qr_payload=batch.qr_payload,
            product_status=batch.status,
            expiry_status=SerialService.evaluate_expiry(batch.expiry_date),
            manufacturing_date=batch.manufacturing_date,
            expiry_date=batch.expiry_date,
            created_at=batch.created_at
        )

        # Build transfers from BatchEvents
        transfers = []
        for ev in batch.events:
            transfers.append(
                CustodyTransferResponse(
                    id=ev.id,
                    serial_code=batch.product_id or serial_code,
                    from_party_type=ev.organization_name or "SUPPLY_CHAIN",
                    from_party_name=ev.organization_name,
                    to_party_type="LOCATION",
                    to_party_name=ev.location,
                    transfer_type=ev.event_type,
                    status="COMPLETED",
                    notes=ev.metadata_json,
                    timestamp=ev.timestamp
                )
            )

        alerts = [
            {
                "id": a.id,
                "message": a.message,
                "severity": a.severity,
                "recipient_role": a.recipient_role,
                "created_at": a.created_at.strftime("%Y-%m-%d %H:%M")
            }
            for a in db.query(Alert).filter(
                (Alert.product_id == serial_code) | (Alert.serial_code == serial_code)
            ).all()
        ]

        scans = [
            {
                "id": s.id,
                "scanner_role": s.scanner_role,
                "location": s.location,
                "result": s.verification_result,
                "risk_score": s.risk_score,
                "timestamp": s.timestamp.strftime("%Y-%m-%d %H:%M")
            }
            for s in db.query(Scan).filter(
                (Scan.batch_number == batch.batch_number) | (Scan.qr_data.contains(serial_code))
            ).all()
        ]

        dest_rec = None
        if batch.destruction_records:
            d = batch.destruction_records[0]
            dest_rec = {
                "waste_facility": d.waste_facility_name,
                "certificate_number": d.certificate_number,
                "destruction_date": d.destruction_date.strftime("%Y-%m-%d"),
                "status": d.verification_status
            }

        return SerialDetailResponse(
            unit=unit_res,
            transfers=transfers,
            alerts=alerts,
            verification_history=scans,
            destruction_record=dest_rec
        )

    # Unit exists
    med_name = unit.medicine.name if unit.medicine else None
    mfg_name = unit.batch.manufacturer_name if unit.batch else None
    unit_res = ProductUnitResponse(
        id=unit.id,
        serial_code=unit.serial_code,
        medicine_id=unit.medicine_id,
        batch_id=unit.batch_id,
        batch_number=unit.batch_number,
        medicine_name=med_name,
        dosage_strength=unit.batch.dosage_strength if unit.batch else "500mg",
        manufacturer_id=unit.manufacturer_id,
        manufacturer_name=mfg_name,
        current_distributor_id=unit.current_distributor_id,
        current_distributor_name=unit.current_holder_name if unit.current_holder_type == "DISTRIBUTOR" else "ABC Distribution",
        current_retailer_id=unit.current_retailer_id,
        current_retailer_name=unit.current_holder_name if unit.current_holder_type == "RETAILER" else None,
        current_holder_type=unit.current_holder_type,
        current_holder_name=unit.current_holder_name,
        current_location=unit.current_location,
        qr_payload=unit.qr_payload,
        product_status=unit.product_status,
        expiry_status=SerialService.evaluate_expiry(unit.expiry_date),
        manufacturing_date=unit.manufacturing_date,
        expiry_date=unit.expiry_date,
        created_at=unit.created_at
    )

    transfers = [
        CustodyTransferResponse(
            id=t.id,
            serial_code=t.serial_code,
            from_party_type=t.from_party_type,
            from_party_name=t.from_party_name,
            to_party_type=t.to_party_type,
            to_party_name=t.to_party_name,
            transfer_type=t.transfer_type,
            status=t.status,
            notes=t.notes,
            timestamp=t.timestamp
        )
        for t in db.query(CustodyTransfer).filter(
            (CustodyTransfer.serial_code == serial_code) | (CustodyTransfer.product_unit_id == unit.id)
        ).order_by(CustodyTransfer.timestamp.asc()).all()
    ]

    alerts = [
        {
            "id": a.id,
            "message": a.message,
            "severity": a.severity,
            "recipient_role": a.recipient_role,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for a in db.query(Alert).filter(
            (Alert.serial_code == serial_code) | (Alert.product_id == serial_code)
        ).all()
    ]

    scans = [
        {
            "id": s.id,
            "scanner_role": s.scanner_role,
            "location": s.location,
            "result": s.verification_result,
            "risk_score": s.risk_score,
            "timestamp": s.timestamp.strftime("%Y-%m-%d %H:%M")
        }
        for s in db.query(Scan).filter(
            (Scan.serial_code == serial_code) | (Scan.qr_data.contains(serial_code))
        ).all()
    ]

    dest_rec = None
    if unit.batch and unit.batch.destruction_records:
        d = unit.batch.destruction_records[0]
        dest_rec = {
            "waste_facility": d.waste_facility_name,
            "certificate_number": d.certificate_number,
            "destruction_date": d.destruction_date.strftime("%Y-%m-%d"),
            "status": d.verification_status
        }

    return SerialDetailResponse(
        unit=unit_res,
        transfers=transfers,
        alerts=alerts,
        verification_history=scans,
        destruction_record=dest_rec
    )

@router.post("/allocate", response_model=List[ProductUnitResponse])
def allocate_serials(req: DistributorAllocationRequest, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    retailer = db.query(Organization).filter(Organization.id == req.retailer_id).first()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer organization not found")

    # Distributor
    distributor = db.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    if not distributor:
        raise HTTPException(status_code=404, detail="Distributor not found")

    try:
        allocated = SerialService.allocate_to_retailer(
            db=db,
            distributor=distributor,
            retailer=retailer,
            batch_id=batch.id,
            quantity=req.quantity,
            serial_codes=req.serial_codes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    res = []
    for u in allocated:
        res.append(
            ProductUnitResponse(
                id=u.id,
                serial_code=u.serial_code,
                medicine_id=u.medicine_id,
                batch_id=u.batch_id,
                batch_number=u.batch_number,
                medicine_name=u.medicine.name if u.medicine else None,
                dosage_strength=u.batch.dosage_strength if u.batch else "500mg",
                manufacturer_id=u.manufacturer_id,
                manufacturer_name=u.batch.manufacturer_name if u.batch else None,
                current_distributor_id=u.current_distributor_id,
                current_distributor_name=distributor.name,
                current_retailer_id=u.current_retailer_id,
                current_retailer_name=retailer.name,
                current_holder_type=u.current_holder_type,
                current_holder_name=retailer.name,
                current_location=retailer.location,
                qr_payload=u.qr_payload,
                product_status=u.product_status,
                expiry_status=SerialService.evaluate_expiry(u.expiry_date),
                manufacturing_date=u.manufacturing_date,
                expiry_date=u.expiry_date,
                created_at=u.created_at
            )
        )
    return res

@router.post("/dispense", response_model=DispenseResponse)
def dispense_product(req: DispenseRequest, db: Session = Depends(get_db)):
    unit = db.query(ProductUnit).filter(ProductUnit.serial_code == req.serial_code).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"Serial {req.serial_code} not found.")

    if unit.product_status == "DISPENSED":
        raise HTTPException(status_code=400, detail=f"Serial {req.serial_code} has already been dispensed/sold to a patient.")

    if unit.product_status in ["DESTRUCTION_VERIFIED", "CLOSED"]:
        raise HTTPException(status_code=400, detail="CRITICAL: Destroyed or closed product cannot be dispensed.")

    now = datetime.utcnow()
    if now >= unit.expiry_date:
        raise HTTPException(status_code=400, detail="Cannot dispense expired pharmaceutical stock. Return required.")

    retailer = db.query(Organization).filter(Organization.id == req.retailer_id).first()
    retailer_name = retailer.name if retailer else unit.current_holder_name or "Retail Pharmacy"

    unit.product_status = "DISPENSED"
    unit.current_holder_type = "CONSUMER"
    unit.current_location = "Patient Dispensed"
    unit.updated_at = now

    transfer = CustodyTransfer(
        product_unit_id=unit.id,
        serial_code=unit.serial_code,
        batch_id=unit.batch_id,
        batch_number=unit.batch_number,
        from_party_type="RETAILER",
        from_party_id=req.retailer_id,
        from_party_name=retailer_name,
        to_party_type="CONSUMER",
        to_party_name=f"Patient Dispensed (Ref: {req.prescription_ref or 'RX-COUNTER'})",
        transfer_type="DISPENSED",
        status="COMPLETED",
        notes=f"Dispensed at {retailer_name}",
        timestamp=now
    )
    db.add(transfer)
    db.commit()

    return DispenseResponse(
        success=True,
        serial_code=unit.serial_code,
        message=f"Medicine package {unit.serial_code} successfully verified and dispensed.",
        dispensed_at=now,
        retailer_name=retailer_name
    )
