import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # PHARMACY, DISTRIBUTOR, MANUFACTURER, WASTE_FACILITY, REGULATOR
    location = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="org")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True, default="demo123")
    role = Column(String(50), nullable=False) # RETAILER, DISTRIBUTOR, MANUFACTURER, REGULATOR
    organization = Column(String(255), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    location = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization", back_populates="users")

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    generic_name = Column(String(255), nullable=False)
    brand_name = Column(String(255), nullable=False)
    manufacturer = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    form = Column(String(100), nullable=False) # Tablet, Syrup, Injection, Capsule
    created_at = Column(DateTime, default=datetime.utcnow)

    batches = relationship("Batch", back_populates="medicine")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_number = Column(String(100), unique=True, nullable=False, index=True)
    medicine_id = Column(String, ForeignKey("medicines.id"), nullable=False)
    manufacturer_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    manufacturing_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    quantity = Column(Integer, nullable=False, default=100)
    unit = Column(String(50), default="STRIPS")
    status = Column(String(50), nullable=False, default="REGISTERED") # REGISTERED, ACTIVE, EXPIRING_SOON, EXPIRED, RETURN_REQUESTED, PICKUP_CONFIRMED, IN_TRANSIT, RECEIVED_BY_MANUFACTURER, AWAITING_DESTRUCTION, DESTRUCTION_VERIFIED, CLOSED, SUSPICIOUS, REENTRY_DETECTED
    original_retailer_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    current_location = Column(String(255), nullable=False, default="Production Facility")
    product_id = Column(String(100), unique=True, nullable=True, index=True)
    qr_payload = Column(String(255), nullable=True)
    assigned_retailer_name = Column(String(255), nullable=True)
    dosage_strength = Column(String(100), nullable=True)
    manufacturer_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="batches")
    events = relationship("BatchEvent", back_populates="batch", order_by="BatchEvent.timestamp.asc()")
    return_requests = relationship("ReturnRequest", back_populates="batch")
    destruction_records = relationship("DestructionRecord", back_populates="batch")
    fraud_incidents = relationship("FraudIncident", back_populates="batch")
    product_units = relationship("ProductUnit", back_populates="batch", cascade="all, delete-orphan")

class BatchEvent(Base):
    __tablename__ = "batch_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False) # e.g. BATCH_REGISTERED, DISPATCHED, EXPIRED_FLAGGED, RETURN_REQUESTED, PICKUP_CONFIRMED, RECEIVED_BY_MANUFACTURER, DESTRUCTION_SCHEDULED, DESTRUCTION_VERIFIED, BATCH_CLOSED, REENTRY_DETECTED, LABEL_TAMPERING_FLAGGED
    actor_id = Column(String, nullable=True)
    actor_name = Column(String(255), nullable=True)
    organization_id = Column(String, nullable=True)
    organization_name = Column(String(255), nullable=True)
    location = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(Text, nullable=True) # Serialized JSON with event details
    evidence_url = Column(String(500), nullable=True)

    batch = relationship("Batch", back_populates="events")

class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    retailer_id = Column(String, nullable=False)
    retailer_name = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False, default="EXPIRED")
    status = Column(String(50), nullable=False, default="PENDING_PICKUP") # PENDING_PICKUP, PICKED_UP, COMPLETED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="return_requests")
    pickup = relationship("Pickup", back_populates="return_request", uselist=False)

class Pickup(Base):
    __tablename__ = "pickups"

    id = Column(String, primary_key=True, default=generate_uuid)
    return_request_id = Column(String, ForeignKey("return_requests.id"), nullable=False)
    distributor_id = Column(String, nullable=False)
    distributor_name = Column(String(255), nullable=True)
    expected_quantity = Column(Integer, nullable=False)
    actual_quantity = Column(Integer, nullable=False)
    actual_weight = Column(Float, nullable=True)
    pickup_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), nullable=False, default="CONFIRMED") # CONFIRMED, QUANTITY_MISMATCH, IN_TRANSIT
    evidence_url = Column(String(500), nullable=True)

    return_request = relationship("ReturnRequest", back_populates="pickup")

class DestructionRecord(Base):
    __tablename__ = "destruction_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    manufacturer_id = Column(String, nullable=False)
    waste_facility_id = Column(String, nullable=False)
    waste_facility_name = Column(String(255), nullable=True)
    certificate_number = Column(String(100), nullable=False)
    destruction_date = Column(DateTime, default=datetime.utcnow)
    destroyed_quantity = Column(Integer, nullable=False)
    certificate_url = Column(String(500), nullable=True)
    verification_status = Column(String(50), default="VERIFIED") # VERIFIED, MISMATCH, PENDING

    batch = relationship("Batch", back_populates="destruction_records")

class FraudIncident(Base):
    __tablename__ = "fraud_incidents"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    incident_type = Column(String(100), nullable=False) # REENTRY_FRAUD, LABEL_TAMPERING, EXPIRY_MANIPULATION, QUANTITY_MISMATCH, DUPLICATE_SCAN, UNEXPECTED_LOCATION, CERTIFICATE_MISMATCH, SUPPLY_CHAIN_ANOMALY
    risk_score = Column(Integer, nullable=False, default=50) # 0 - 100
    severity = Column(String(20), nullable=False, default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    detected_by = Column(String(255), nullable=False, default="PharmaGuard Compliance Engine")
    status = Column(String(50), nullable=False, default="OPEN") # OPEN, UNDER_INVESTIGATION, RESOLVED
    evidence = Column(Text, nullable=True) # JSON summary of evidence
    assigned_to = Column(String(255), nullable=True)

    batch = relationship("Batch", back_populates="fraud_incidents")
    alerts = relationship("Alert", back_populates="incident")

class ProductUnit(Base):
    __tablename__ = "product_units"

    id = Column(String, primary_key=True, default=generate_uuid)
    serial_code = Column(String(100), unique=True, nullable=False, index=True) # e.g. PG-PCM-2026-000001
    medicine_id = Column(String, ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False, index=True)
    batch_number = Column(String(100), nullable=False, index=True)
    dosage_strength = Column(String(100), nullable=True)
    manufacturer_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    current_distributor_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    current_retailer_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    current_holder_type = Column(String(50), nullable=False, default="MANUFACTURER") # MANUFACTURER, DISTRIBUTOR, RETAILER, WASTE_FACILITY, CONSUMER
    current_holder_id = Column(String, nullable=True)
    current_holder_name = Column(String(255), nullable=True)
    current_location = Column(String(255), nullable=True)
    qr_payload = Column(Text, nullable=True)
    product_status = Column(String(50), nullable=False, default="ACTIVE") # ACTIVE, IN_TRANSIT, RETURN_REQUESTED, PICKED_UP, QUARANTINED, DESTRUCTION_VERIFIED, CLOSED, DISPENSED, SUSPICIOUS, REENTRY_DETECTED
    expiry_status = Column(String(50), nullable=False, default="VALID") # VALID, EXPIRING_SOON, EXPIRED
    manufacturing_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    medicine = relationship("Medicine")
    batch = relationship("Batch", back_populates="product_units")
    transfers = relationship("CustodyTransfer", back_populates="product_unit", order_by="CustodyTransfer.timestamp.asc()")

class CustodyTransfer(Base):
    __tablename__ = "custody_transfers"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_unit_id = Column(String, ForeignKey("product_units.id"), nullable=True)
    serial_code = Column(String(100), nullable=False, index=True)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=True)
    batch_number = Column(String(100), nullable=True)
    from_party_type = Column(String(50), nullable=False) # MANUFACTURER, DISTRIBUTOR, RETAILER, WASTE_FACILITY
    from_party_id = Column(String, nullable=True)
    from_party_name = Column(String(255), nullable=True)
    to_party_type = Column(String(50), nullable=False) # DISTRIBUTOR, RETAILER, MANUFACTURER, WASTE_FACILITY, CONSUMER
    to_party_id = Column(String, nullable=True)
    to_party_name = Column(String(255), nullable=True)
    transfer_type = Column(String(50), nullable=False) # DISPATCH, ALLOCATION, DELIVERY, RETURN_REQUEST, PICKUP, RECEIVED_BY_MFG, SENT_TO_WASTE, DESTRUCTION_VERIFIED, DISPENSED
    status = Column(String(50), nullable=False, default="COMPLETED")
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    product_unit = relationship("ProductUnit", back_populates="transfers")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("fraud_incidents.id"), nullable=True)
    product_id = Column(String(100), nullable=True)
    serial_code = Column(String(100), nullable=True, index=True)
    batch_number = Column(String(100), nullable=True)
    medicine_name = Column(String(255), nullable=True)
    alert_type = Column(String(50), nullable=True) # EXPIRING_SOON, EXPIRED, RETURN_OVERDUE, DATA_MISMATCH, OCR_MISMATCH, UNKNOWN_PRODUCT, LOCATION_MISMATCH, REENTRY_FRAUD
    action_url = Column(String(255), nullable=True)
    recipient_role = Column(String(50), nullable=False) # REGULATOR, MANUFACTURER, RETAILER, DISTRIBUTOR
    recipient_user_id = Column(String, nullable=True)
    recipient_name = Column(String(255), nullable=True)
    severity = Column(String(20), nullable=False, default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("FraudIncident", back_populates="alerts")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=True)
    batch_number = Column(String(100), nullable=True)
    product_unit_id = Column(String, ForeignKey("product_units.id"), nullable=True)
    serial_code = Column(String(100), nullable=True, index=True)
    retailer_id = Column(String, nullable=True)
    retailer_name = Column(String(255), nullable=True)
    scanner_user_id = Column(String, nullable=True)
    scanner_role = Column(String(50), nullable=True)
    location = Column(String(255), nullable=False)
    scan_type = Column(String(50), default="QR") # QR, BARCODE, MANUAL, OCR
    qr_data = Column(Text, nullable=True)
    ocr_data = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    verification_result = Column(String(50), nullable=False) # VERIFIED, SUSPICIOUS, FRAUD, EXPIRED, MISMATCH, LOCATION_MISMATCH
    risk_score = Column(Integer, default=0)
    database_result = Column(Text, nullable=True)
    expiry_result = Column(String(50), nullable=True)
    verdict = Column(String(50), nullable=True)
    reasons_json = Column(Text, nullable=True)

    batch = relationship("Batch")
    product_unit = relationship("ProductUnit")
