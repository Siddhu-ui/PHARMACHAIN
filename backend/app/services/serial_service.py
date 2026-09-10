import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import (
    Batch, Medicine, Organization, User, ProductUnit, CustodyTransfer,
    BatchEvent, Alert, FraudIncident
)
from app.core.state_machine import BatchStatus

class SerialService:
    @staticmethod
    def get_medicine_code(name: str) -> str:
        name_upper = (name or "").strip().upper()
        if "PARACETAMOL" in name_upper:
            return "PCM"
        elif "AMOXICILLIN" in name_upper:
            return "AMX"
        elif "AZITHROMYCIN" in name_upper:
            return "AZI"
        elif "METFORMIN" in name_upper:
            return "MET"
        elif "PANTOPRAZOLE" in name_upper:
            return "PAN"
        letters = re.sub(r'[^A-Z]', '', name_upper)
        return letters[:3] if len(letters) >= 3 else "MED"

    @staticmethod
    def generate_serial_codes(
        medicine_name: str,
        expiry_date: datetime,
        quantity: int,
        start_index: int = 1
    ) -> List[str]:
        code = SerialService.get_medicine_code(medicine_name)
        year = expiry_date.year if expiry_date else datetime.utcnow().year
        serials = []
        for i in range(start_index, start_index + quantity):
            serials.append(f"PG-{code}-{year}-{i:06d}")
        return serials

    @staticmethod
    def evaluate_expiry(expiry_date: datetime) -> str:
        now = datetime.utcnow()
        if now >= expiry_date:
            return "EXPIRED"
        elif expiry_date <= now + timedelta(days=30):
            return "EXPIRING_SOON"
        return "VALID"

    @staticmethod
    def create_batch_serials(
        db: Session,
        batch: Batch,
        quantity: int,
        initial_distributor: Optional[Organization] = None,
        manufacturer: Optional[Organization] = None,
        start_index: int = 1
    ) -> List[ProductUnit]:
        med_name = batch.medicine.name if batch.medicine else (batch.manufacturer_name or "Medicine")
        serials = SerialService.generate_serial_codes(
            medicine_name=med_name,
            expiry_date=batch.expiry_date,
            quantity=quantity,
            start_index=start_index
        )

        mfg_name = manufacturer.name if manufacturer else (batch.manufacturer_name or "Sun Pharma Laboratories Ltd.")
        dist_name = initial_distributor.name if initial_distributor else None
        now = datetime.utcnow()
        exp_status = SerialService.evaluate_expiry(batch.expiry_date)

        units = []
        for s_code in serials:
            # QR payload format as specified in Section H
            qr_dict = {
                "product_id": s_code,
                "medicine_name": med_name,
                "strength": batch.dosage_strength or "500mg",
                "batch_number": batch.batch_number,
                "manufacturing_date": batch.manufacturing_date.strftime("%Y-%m-%d"),
                "expiry_date": batch.expiry_date.strftime("%Y-%m-%d"),
                "manufacturer": mfg_name
            }

            unit = ProductUnit(
                serial_code=s_code,
                medicine_id=batch.medicine_id,
                batch_id=batch.id,
                batch_number=batch.batch_number,
                manufacturer_id=batch.manufacturer_id,
                current_distributor_id=initial_distributor.id if initial_distributor else None,
                current_retailer_id=None,
                current_holder_type="DISTRIBUTOR" if initial_distributor else "MANUFACTURER",
                current_holder_id=initial_distributor.id if initial_distributor else (batch.manufacturer_id),
                current_holder_name=dist_name if initial_distributor else mfg_name,
                current_location=initial_distributor.location if initial_distributor else (manufacturer.location if manufacturer else "Factory Warehouse"),
                qr_payload=json.dumps(qr_dict),
                product_status="ACTIVE",
                expiry_status=exp_status,
                manufacturing_date=batch.manufacturing_date,
                expiry_date=batch.expiry_date,
                created_at=now,
                updated_at=now
            )
            db.add(unit)
            units.append(unit)

            # Record custody transfer: MANUFACTURED / DISPATCH
            transfer = CustodyTransfer(
                product_unit_id=unit.id,
                serial_code=s_code,
                batch_id=batch.id,
                batch_number=batch.batch_number,
                from_party_type="MANUFACTURER",
                from_party_id=batch.manufacturer_id,
                from_party_name=mfg_name,
                to_party_type="DISTRIBUTOR" if initial_distributor else "MANUFACTURER",
                to_party_id=initial_distributor.id if initial_distributor else batch.manufacturer_id,
                to_party_name=dist_name if initial_distributor else mfg_name,
                transfer_type="DISPATCH" if initial_distributor else "MANUFACTURED",
                status="COMPLETED",
                notes=f"Initial serialization and dispatch to {dist_name}" if initial_distributor else "Batch registered and serialized",
                timestamp=now
            )
            db.add(transfer)

        db.commit()
        return units

    @staticmethod
    def serialize_batch(
        db: Session,
        batch: Batch,
        medicine: Optional[Medicine] = None,
        distributor_id: Optional[str] = None,
        distributor_name: Optional[str] = None,
        quantity: Optional[int] = None
    ) -> List[ProductUnit]:
        dist = db.query(Organization).filter(Organization.id == distributor_id).first() if distributor_id else None
        mfg = db.query(Organization).filter(Organization.id == batch.manufacturer_id).first() if batch.manufacturer_id else None
        qty = quantity or batch.quantity
        return SerialService.create_batch_serials(db, batch, qty, initial_distributor=dist, manufacturer=mfg)

    @staticmethod
    def allocate_to_retailer(
        db: Session,
        distributor: Optional[Any] = None,
        retailer: Optional[Any] = None,
        batch_id: Optional[str] = None,
        quantity: Optional[Any] = None,
        serial_codes: Optional[Any] = None,
        distributor_id: Optional[str] = None,
        retailer_id: Optional[str] = None,
        retailer_name: Optional[str] = None,
        batch_number: Optional[str] = None
    ) -> List[ProductUnit]:
        """
        Transfers exact serials from Distributor to Retailer.
        Guarantees:
        1. Only units currently held by distributor are transferred.
        2. Quantity cannot exceed remaining distributor stock.
        3. Serial ownership is atomically updated.
        4. Custody transfer is recorded.
        """
        # Handle positional argument shift if called as:
        # allocate_to_retailer(db, dist_id, ret_id, retailer_name, batch_number, quantity)
        if isinstance(batch_id, str) and isinstance(quantity, str) and isinstance(serial_codes, int):
            retailer_name = retailer_name or batch_id
            batch_target = quantity
            quantity = serial_codes
            serial_codes = None
        else:
            batch_target = batch_id or batch_number

        # Resolve distributor
        if isinstance(distributor, Organization):
            d_id = distributor.id
            dist_obj = distributor
        elif isinstance(distributor, str):
            d_id = distributor
            dist_obj = db.query(Organization).filter((Organization.id == d_id) | (Organization.name == d_id)).first()
        else:
            d_id = distributor_id
            dist_obj = db.query(Organization).filter((Organization.id == d_id) | (Organization.name == d_id)).first() if d_id else None

        # Resolve retailer
        if isinstance(retailer, Organization):
            r_id = retailer.id
            ret_obj = retailer
        elif isinstance(retailer, str):
            r_id = retailer
            ret_obj = db.query(Organization).filter((Organization.id == r_id) | (Organization.name == r_id)).first()
        else:
            r_id = retailer_id
            ret_obj = db.query(Organization).filter((Organization.id == r_id) | (Organization.name == r_id)).first() if r_id else None

        if not ret_obj and retailer_name:
            ret_obj = db.query(Organization).filter(Organization.name == retailer_name).first()
            if not ret_obj:
                ret_obj = Organization(id=r_id or f"ret-{retailer_name.lower().replace(' ', '-')}", name=retailer_name, type="PHARMACY", location=retailer_name)
                db.add(ret_obj)
                db.commit()

        # Resolve batch
        b_obj = db.query(Batch).filter((Batch.id == batch_target) | (Batch.batch_number == batch_target)).first() if batch_target else None
        target_b_id = b_obj.id if b_obj else batch_target

        query = db.query(ProductUnit).filter(
            (ProductUnit.batch_id == target_b_id) | (ProductUnit.batch_number == batch_target),
            ProductUnit.current_holder_type == "DISTRIBUTOR"
        )
        if d_id:
            query = query.filter((ProductUnit.current_holder_id == d_id) | (ProductUnit.current_distributor_id == d_id))

        if serial_codes and isinstance(serial_codes, list) and len(serial_codes) > 0:
            query = query.filter(ProductUnit.serial_code.in_(serial_codes))
            available_units = query.all()
        elif isinstance(quantity, int) and quantity > 0:
            available_units = query.limit(quantity).all()
            if len(available_units) < quantity:
                raise ValueError(
                    f"Insufficient distributor inventory. Requested {quantity}, available {len(available_units)}."
                )
        else:
            raise ValueError("Must specify either quantity or serial_codes to allocate.")

        if not available_units:
            raise ValueError("Insufficient distributor inventory. No available units at distributor matching request.")

        now = datetime.utcnow()
        for unit in available_units:
            unit.current_holder_type = "RETAILER"
            unit.current_retailer_id = ret_obj.id if ret_obj else r_id
            unit.current_holder_id = ret_obj.id if ret_obj else r_id
            unit.current_holder_name = ret_obj.name if ret_obj else (retailer_name or "Pharmacy")
            unit.current_location = ret_obj.location if ret_obj else (retailer_name or "Pharmacy")
            unit.updated_at = now

            transfer = CustodyTransfer(
                product_unit_id=unit.id,
                serial_code=unit.serial_code,
                batch_id=unit.batch_id,
                batch_number=unit.batch_number,
                from_party_type="DISTRIBUTOR",
                from_party_id=d_id,
                from_party_name=dist_obj.name if dist_obj else "Distributor",
                to_party_type="RETAILER",
                to_party_id=ret_obj.id if ret_obj else r_id,
                to_party_name=ret_obj.name if ret_obj else retailer_name,
                transfer_type="DELIVERY",
                status="COMPLETED",
                notes=f"Delivered to {ret_obj.name if ret_obj else retailer_name}",
                timestamp=now
            )
            db.add(transfer)

        db.commit()
        return available_units

    @staticmethod
    def get_distributor_inventory(db: Session, distributor_id: str) -> Dict[str, Any]:
        """
        Returns high-level and detailed inventory accounting for a distributor.
        """
        all_units = db.query(ProductUnit).filter(
            ProductUnit.current_distributor_id == distributor_id
        ).all()
        received = len(all_units)
        distributed = len([u for u in all_units if u.current_holder_type == "RETAILER" or u.current_retailer_id is not None])
        remaining = len([u for u in all_units if u.current_holder_type == "DISTRIBUTOR"])
        batches = SerialService.get_distributor_accounting(db, distributor_id)
        return {
            "distributor_id": distributor_id,
            "total_received": received,
            "total_distributed": distributed,
            "remaining_stock": max(0, remaining),
            "batches": batches
        }

    @staticmethod
    def get_distributor_accounting(db: Session, distributor_id: str) -> List[Dict[str, Any]]:
        """
        Computes exact accounting for every medicine/batch for distributor:
        RECEIVED - DISTRIBUTED = REMAINING.
        Remaining can never be negative.
        """
        all_units = db.query(ProductUnit).filter(
            ProductUnit.current_distributor_id == distributor_id
        ).all()

        # Group by batch_id
        batch_groups: Dict[str, List[ProductUnit]] = {}
        for u in all_units:
            batch_groups.setdefault(u.batch_id, []).append(u)

        result = []
        for b_id, units in batch_groups.items():
            batch = db.query(Batch).filter(Batch.id == b_id).first()
            if not batch:
                continue

            received = len(units)
            distributed_units = [u for u in units if u.current_holder_type == "RETAILER" or u.current_retailer_id is not None]
            remaining_units = [u for u in units if u.current_holder_type == "DISTRIBUTOR"]

            distributed_count = len(distributed_units)
            remaining_count = max(0, received - distributed_count)

            # Retailer breakdown
            retailer_breakdown: Dict[str, Dict[str, Any]] = {}
            for u in distributed_units:
                r_name = u.current_holder_name or "Unknown Pharmacy"
                if r_name not in retailer_breakdown:
                    retailer_breakdown[r_name] = {
                        "retailer_id": u.current_retailer_id,
                        "retailer_name": r_name,
                        "count": 0,
                        "serials": []
                    }
                retailer_breakdown[r_name]["count"] += 1
                retailer_breakdown[r_name]["serials"].append(u.serial_code)

            result.append({
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "medicine_name": batch.medicine.name if batch.medicine else "Medicine",
                "strength": batch.dosage_strength or "500mg",
                "manufacturer_name": batch.manufacturer_name or (batch.medicine.manufacturer if batch.medicine else "ABC Pharma"),
                "expiry_date": batch.expiry_date.strftime("%Y-%m-%d"),
                "expiry_status": SerialService.evaluate_expiry(batch.expiry_date),
                "received_count": received,
                "distributed_count": distributed_count,
                "remaining_count": remaining_count,
                "remaining_serials": [u.serial_code for u in remaining_units],
                "retailers": list(retailer_breakdown.values())
            })

        return result
