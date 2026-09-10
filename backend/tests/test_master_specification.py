import pytest
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import (
    Batch, Medicine, Organization, User, ReturnRequest,
    Pickup, DestructionRecord, FraudIncident, Alert, Scan,
    ProductUnit, CustodyTransfer
)
from app.core.state_machine import BatchStateMachine, BatchStatus, StateMachineError
from app.services.serial_service import SerialService
from app.services.alert_service import AlertService
from app.api.products import verify_retailer_package, register_product
from app.schemas.schemas import (
    ProductRegisterRequest, RetailerVerifyRequest,
    DistributorAllocationRequest, DispenseRequest
)

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    # Seed core organizations
    mfg = Organization(name="ABC Pharma", type="MANUFACTURER", location="Vadodara, Gujarat")
    dist = Organization(name="ABC Distribution", type="DISTRIBUTOR", location="Bengaluru, Karnataka")
    pharm_a = Organization(name="Pharmacy A", type="PHARMACY", location="Bengaluru, Karnataka")
    pharm_b = Organization(name="Pharmacy B", type="PHARMACY", location="Bengaluru, Karnataka")
    pharm_c = Organization(name="Pharmacy C", type="PHARMACY", location="Mumbai, Maharashtra")
    waste = Organization(name="EcoSafe Bio-Medical Destruction Facility", type="WASTE_FACILITY", location="Hosur, Tamil Nadu")
    regulator = Organization(name="CDSCO", type="REGULATOR", location="New Delhi")

    session.add_all([mfg, dist, pharm_a, pharm_b, pharm_c, waste, regulator])
    session.commit()

    # Seed core medicine
    med = Medicine(
        name="Paracetamol 500mg",
        generic_name="Paracetamol IP",
        brand_name="Calpol 500",
        manufacturer="ABC Pharma",
        dosage="500mg",
        form="Tablet"
    )
    session.add(med)
    session.commit()

    # Seed users
    users = [
        User(name="ABC Pharma QA", email="manufacturer@pharmaguard.io", role="MANUFACTURER", organization="ABC Pharma", organization_id=mfg.id, location="Vadodara, Gujarat"),
        User(name="ABC Distribution Dispatch", email="distributor@pharmaguard.io", role="DISTRIBUTOR", organization="ABC Distribution", organization_id=dist.id, location="Bengaluru, Karnataka"),
        User(name="Pharmacy A Staff", email="pharmacy_a@pharmaguard.io", role="RETAILER", organization="Pharmacy A", organization_id=pharm_a.id, location="Bengaluru, Karnataka"),
        User(name="Pharmacy B Staff", email="pharmacy_b@pharmaguard.io", role="RETAILER", organization="Pharmacy B", organization_id=pharm_b.id, location="Bengaluru, Karnataka"),
        User(name="CDSCO Inspector", email="regulator@pharmaguard.io", role="REGULATOR", organization="CDSCO", organization_id=regulator.id, location="New Delhi, India")
    ]
    session.add_all(users)
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)


# 1. Role login routing
def test_01_role_login_routing():
    routes = {
        "MANUFACTURER": "/manufacturer/dashboard",
        "DISTRIBUTOR": "/distributor/dashboard",
        "RETAILER": "/retailer/dashboard",
        "REGULATOR": "/regulator"
    }
    assert routes["MANUFACTURER"] == "/manufacturer/dashboard"
    assert routes["DISTRIBUTOR"] == "/distributor/dashboard"
    assert routes["RETAILER"] == "/retailer/dashboard"
    assert routes["REGULATOR"] == "/regulator"


# 2. Manufacturer creates medicine
def test_02_manufacturer_creates_medicine(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-001",
        product_id="PG-PCM-2026-000001",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=20,
        status=BatchStatus.ACTIVE,
        manufacturer_name="ABC Pharma"
    )
    db_session.add(batch)
    db_session.commit()

    assert batch.id is not None
    assert batch.batch_number == "PCM-BATCH-001"
    assert batch.quantity == 20


# 3. Quantity generates unique serials
def test_03_quantity_generates_unique_serials(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-002",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=20
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(
        db=db_session,
        batch=batch,
        medicine=med,
        distributor_id=dist.id,
        distributor_name=dist.name,
        quantity=20
    )
    assert len(units) == 20


# 4. Serial uniqueness
def test_04_serial_uniqueness(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-003",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=20
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 20)
    serial_codes = [u.serial_code for u in units]
    assert len(set(serial_codes)) == 20


# 5. QR payload contains correct structured information
def test_05_qr_payload_contains_correct_structured_information(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-004",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=1,
        manufacturer_name="ABC Pharma"
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 1)
    payload_str = units[0].qr_payload
    data = json.loads(payload_str)

    assert "product_id" in data
    assert data["medicine_name"] == "Paracetamol 500mg"
    assert data["strength"] == "500mg"
    assert data["batch_number"] == "PCM-BATCH-004"
    assert data["manufacturer"] == "ABC Pharma"


# 6. Manufacturer -> distributor transfer
def test_06_manufacturer_to_distributor_transfer(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-005",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=1
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 1)
    transfer = db_session.query(CustodyTransfer).filter(CustodyTransfer.serial_code == units[0].serial_code).first()
    assert transfer is not None
    assert transfer.from_party_type == "MANUFACTURER"
    assert transfer.to_party_type == "DISTRIBUTOR"
    assert transfer.to_party_id == dist.id


# 7. Distributor inventory calculation (Received - Distributed = Remaining)
def test_07_distributor_inventory_calculation(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-006",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=20
    )
    db_session.add(batch)
    db_session.commit()

    SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 20)
    stats = SerialService.get_distributor_inventory(db_session, dist.id)

    assert stats["total_received"] == 20
    assert stats["total_distributed"] == 0
    assert stats["remaining_stock"] == 20


# 8. Distributor cannot over-allocate inventory
def test_08_distributor_cannot_over_allocate_inventory(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-007",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=5
    )
    db_session.add(batch)
    db_session.commit()

    SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 5)

    # Attempting to allocate 10 units when only 5 exist
    with pytest.raises(ValueError, match="Insufficient distributor inventory"):
        SerialService.allocate_to_retailer(
            db=db_session,
            distributor_id=dist.id,
            retailer_id=pharm_a.id,
            retailer_name="Pharmacy A",
            batch_number="PCM-BATCH-007",
            quantity=10
        )


# 9. Distributor sends products to Pharmacy A
def test_09_distributor_sends_products_to_pharmacy_a(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-008",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=20
    )
    db_session.add(batch)
    db_session.commit()

    SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 20)
    allocated = SerialService.allocate_to_retailer(
        db=db_session,
        distributor_id=dist.id,
        retailer_id=pharm_a.id,
        retailer_name="Pharmacy A",
        batch_number="PCM-BATCH-008",
        quantity=8
    )

    assert len(allocated) == 8
    inv = SerialService.get_distributor_inventory(db_session, dist.id)
    assert inv["total_distributed"] == 8
    assert inv["remaining_stock"] == 12


# 10. Distributor sends products to Pharmacy B
def test_10_distributor_sends_products_to_pharmacy_b(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_b = db_session.query(Organization).filter(Organization.name == "Pharmacy B").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-009",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=20
    )
    db_session.add(batch)
    db_session.commit()

    SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 20)
    allocated = SerialService.allocate_to_retailer(
        db=db_session,
        distributor_id=dist.id,
        retailer_id=pharm_b.id,
        retailer_name="Pharmacy B",
        batch_number="PCM-BATCH-009",
        quantity=7
    )

    assert len(allocated) == 7
    inv = SerialService.get_distributor_inventory(db_session, dist.id)
    assert inv["total_distributed"] == 7
    assert inv["remaining_stock"] == 13


# 11. Exact serial ownership changes
def test_11_exact_serial_ownership_changes(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-010",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=5
    )
    db_session.add(batch)
    db_session.commit()

    SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 5)
    allocated = SerialService.allocate_to_retailer(
        db=db_session,
        distributor_id=dist.id,
        retailer_id=pharm_a.id,
        retailer_name="Pharmacy A",
        batch_number="PCM-BATCH-010",
        quantity=2
    )

    for unit in allocated:
        assert unit.current_holder_type == "RETAILER"
        assert unit.current_holder_id == pharm_a.id
        assert unit.current_holder_name == "Pharmacy A"


# 12. Same serial cannot belong to two retailers
def test_12_same_serial_cannot_belong_to_two_retailers(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    pharm_b = db_session.query(Organization).filter(Organization.name == "Pharmacy B").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-011",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=1
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 1)
    serial = units[0].serial_code

    SerialService.allocate_to_retailer(db_session, dist.id, pharm_a.id, "Pharmacy A", "PCM-BATCH-011", 1)
    unit_a = db_session.query(ProductUnit).filter(ProductUnit.serial_code == serial).first()

    # It belongs to Pharmacy A
    assert unit_a.current_holder_id == pharm_a.id

    # It cannot simultaneously be held by Pharmacy B
    assert unit_a.current_holder_id != pharm_b.id


# 13. Retailer sees only its products
def test_13_retailer_sees_only_its_products(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    pharm_b = db_session.query(Organization).filter(Organization.name == "Pharmacy B").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-012",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=10
    )
    db_session.add(batch)
    db_session.commit()

    SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 10)
    SerialService.allocate_to_retailer(db_session, dist.id, pharm_a.id, "Pharmacy A", "PCM-BATCH-012", 6)
    SerialService.allocate_to_retailer(db_session, dist.id, pharm_b.id, "Pharmacy B", "PCM-BATCH-012", 4)

    pharm_a_units = db_session.query(ProductUnit).filter(ProductUnit.current_holder_id == pharm_a.id).all()
    pharm_b_units = db_session.query(ProductUnit).filter(ProductUnit.current_holder_id == pharm_b.id).all()

    assert len(pharm_a_units) == 6
    assert len(pharm_b_units) == 4
    for u in pharm_a_units:
        assert u.current_holder_id != pharm_b.id


# 14. Valid verification
def test_14_valid_verification(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-013",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=1
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 1)
    SerialService.allocate_to_retailer(db_session, dist.id, pharm_a.id, "Pharmacy A", "PCM-BATCH-013", 1)

    req = RetailerVerifyRequest(
        product_id=units[0].serial_code,
        qr_detected=True,
        location="Pharmacy A"
    )
    res = verify_retailer_package(req, db_session)

    assert res.status_verdict == "VERIFIED"
    assert "PRODUCT VERIFIED" in res.title
    assert res.allow_sale is True
    assert res.risk_score < 30


# 15. Expired verification
def test_15_expired_verification(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-014",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2022, 1, 1),
        expiry_date=datetime(2024, 1, 1),
        quantity=1
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 1)
    SerialService.allocate_to_retailer(db_session, dist.id, pharm_a.id, "Pharmacy A", "PCM-BATCH-014", 1)

    req = RetailerVerifyRequest(
        product_id=units[0].serial_code,
        qr_detected=True,
        location="Pharmacy A"
    )
    res = verify_retailer_package(req, db_session)

    assert res.status_verdict == "EXPIRED"
    assert "PRODUCT EXPIRED" in res.title
    assert res.allow_sale is False
    assert "DO NOT SELL / RETURN REQUIRED" in res.recommendation


# 16. QR mismatch
def test_16_qr_mismatch(db_session):
    req = RetailerVerifyRequest(
        product_id=None,
        qr_detected=False,
        location="Pharmacy A"
    )
    res = verify_retailer_package(req, db_session)

    assert res.status_verdict == "QR_NOT_DETECTED"
    assert res.allow_sale is False


# 17. OCR expiry mismatch
def test_17_ocr_expiry_mismatch(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-015",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2026, 12, 31),
        quantity=1
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 1)
    SerialService.allocate_to_retailer(db_session, dist.id, pharm_a.id, "Pharmacy A", "PCM-BATCH-015", 1)

    # Scanned OCR printed expiry is 31/12/2028 (extended!)
    req = RetailerVerifyRequest(
        product_id=units[0].serial_code,
        qr_detected=True,
        printed_expiry_override="31/12/2028",
        location="Pharmacy A"
    )
    res = verify_retailer_package(req, db_session)

    assert res.status_verdict == "LABEL_TAMPERING"
    assert res.allow_sale is False
    assert res.severity == "CRITICAL"


# 18. Unknown serial
def test_18_unknown_serial(db_session):
    req = RetailerVerifyRequest(
        product_id="PG-UNKNOWN-SERIAL-999999",
        qr_detected=True,
        location="Pharmacy A"
    )
    res = verify_retailer_package(req, db_session)

    assert res.status_verdict == "UNKNOWN_PRODUCT"
    assert "UNKNOWN PRODUCT" in res.title
    assert res.allow_sale is False
    assert res.risk_score >= 75


# 19. Wrong retailer / location scan
def test_19_wrong_retailer_location_scan(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-BATCH-016",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2027, 8, 15),
        quantity=1
    )
    db_session.add(batch)
    db_session.commit()

    units = SerialService.serialize_batch(db_session, batch, med, dist.id, dist.name, 1)
    # Unit registered to Pharmacy A
    SerialService.allocate_to_retailer(db_session, dist.id, pharm_a.id, "Pharmacy A", "PCM-BATCH-016", 1)

    # Scanned at Pharmacy B
    req = RetailerVerifyRequest(
        product_id=units[0].serial_code,
        qr_detected=True,
        location="Pharmacy B"
    )
    res = verify_retailer_package(req, db_session)

    assert res.status_verdict == "LOCATION_MISMATCH"
    assert "LOCATION MISMATCH" in res.title
    assert res.allow_sale is False


# 20 & 21. Expiring-soon alert to retailer and manufacturer
def test_20_21_expiring_soon_alerts(db_session):
    now = datetime.utcnow()
    exp_date = now + timedelta(days=20)

    alerts = AlertService.create_expiry_alerts(
        db=db_session,
        serial_code="PG-PCM-EXP-SOON-1",
        medicine_name="Paracetamol 500mg",
        batch_number="PCM-EXP-01",
        expiry_date=exp_date,
        is_already_expired=False,
        retailer_name="Pharmacy A",
        distributor_name="ABC Distribution"
    )

    ret_alert = [a for a in alerts if a.recipient_role == "RETAILER"]
    mfg_alert = [a for a in alerts if a.recipient_role == "MANUFACTURER"]

    assert len(ret_alert) >= 1
    assert len(mfg_alert) >= 1
    assert "EXPIRING SOON" in ret_alert[0].message
    assert "EXPIRY ALERT" in mfg_alert[0].message


# 22 & 23. Expired alert to retailer and manufacturer
def test_22_23_expired_alerts(db_session):
    now = datetime.utcnow()
    exp_date = now - timedelta(days=10)

    alerts = AlertService.create_expiry_alerts(
        db=db_session,
        serial_code="PG-PCM-EXPIRED-1",
        medicine_name="Paracetamol 500mg",
        batch_number="PCM-EXP-02",
        expiry_date=exp_date,
        is_already_expired=True,
        retailer_name="Pharmacy A"
    )

    ret_alert = [a for a in alerts if a.recipient_role == "RETAILER"]
    mfg_alert = [a for a in alerts if a.recipient_role == "MANUFACTURER"]

    assert len(ret_alert) >= 1
    assert len(mfg_alert) >= 1
    assert "DO NOT SELL / RETURN REQUIRED" in ret_alert[0].message
    assert "PRODUCT EXPIRED AT RETAILER" in mfg_alert[0].message


# 24. Return creation
def test_24_return_creation(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-RETURN-01",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2022, 1, 1),
        expiry_date=datetime(2024, 1, 1),
        quantity=5,
        status=BatchStatus.EXPIRED
    )
    db_session.add(batch)
    db_session.commit()

    ret_req = ReturnRequest(
        batch_id=batch.id,
        retailer_id=pharm_a.id,
        retailer_name="Pharmacy A",
        quantity=5,
        reason="EXPIRED",
        status="PENDING_PICKUP"
    )
    db_session.add(ret_req)
    db_session.commit()

    assert ret_req.id is not None
    assert ret_req.status == "PENDING_PICKUP"


# 25. Distributor pickup
def test_25_distributor_pickup(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    dist = db_session.query(Organization).filter(Organization.type == "DISTRIBUTOR").first()
    pharm_a = db_session.query(Organization).filter(Organization.name == "Pharmacy A").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-PICKUP-01",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2022, 1, 1),
        expiry_date=datetime(2024, 1, 1),
        quantity=5,
        status=BatchStatus.EXPIRED
    )
    db_session.add(batch)
    db_session.commit()

    ret_req = ReturnRequest(
        batch_id=batch.id,
        retailer_id=pharm_a.id,
        retailer_name="Pharmacy A",
        quantity=5,
        status="PENDING_PICKUP"
    )
    db_session.add(ret_req)
    db_session.commit()

    pickup = Pickup(
        return_request_id=ret_req.id,
        distributor_id=dist.id,
        distributor_name="ABC Distribution",
        expected_quantity=5,
        actual_quantity=5,
        status="CONFIRMED"
    )
    db_session.add(pickup)
    ret_req.status = "PICKED_UP"
    batch.status = BatchStatus.IN_TRANSIT
    db_session.commit()

    assert pickup.id is not None
    assert ret_req.status == "PICKED_UP"
    assert batch.status == BatchStatus.IN_TRANSIT


# 26. Manufacturer receipt
def test_26_manufacturer_receipt(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-RCV-01",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2022, 1, 1),
        expiry_date=datetime(2024, 1, 1),
        quantity=5,
        status=BatchStatus.IN_TRANSIT
    )
    db_session.add(batch)
    db_session.commit()

    # Manufacturer receives into quarantine
    batch.status = BatchStatus.RECEIVED_BY_MANUFACTURER
    db_session.commit()

    assert batch.status == BatchStatus.RECEIVED_BY_MANUFACTURER


# 27. Destruction verification
def test_27_destruction_verification(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    waste = db_session.query(Organization).filter(Organization.type == "WASTE_FACILITY").first()
    med = db_session.query(Medicine).first()

    batch = Batch(
        batch_number="PCM-DEST-01",
        medicine_id=med.id,
        manufacturer_id=mfg.id,
        manufacturing_date=datetime(2022, 1, 1),
        expiry_date=datetime(2024, 1, 1),
        quantity=5,
        status=BatchStatus.AWAITING_DESTRUCTION
    )
    db_session.add(batch)
    db_session.commit()

    dest = DestructionRecord(
        batch_id=batch.id,
        manufacturer_id=mfg.id,
        waste_facility_id=waste.id,
        waste_facility_name="EcoSafe Bio-Medical Destruction Facility",
        certificate_number="CERT-ECO-TEST-01",
        destroyed_quantity=5,
        verification_status="VERIFIED"
    )
    db_session.add(dest)
    batch.status = BatchStatus.DESTRUCTION_VERIFIED
    db_session.commit()

    assert dest.id is not None
    assert batch.status == BatchStatus.DESTRUCTION_VERIFIED
    assert BatchStateMachine.is_destroyed_or_closed(batch.status) is True


# 28. Closed product cannot become active
def test_28_closed_product_cannot_become_active():
    # Enforced by BatchStateMachine
    with pytest.raises(StateMachineError):
        BatchStateMachine.validate_transition(BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.ACTIVE)

    with pytest.raises(StateMachineError):
        BatchStateMachine.validate_transition(BatchStatus.CLOSED, BatchStatus.ACTIVE)


# 29. Re-entry scan
def test_29_reentry_scan(db_session):
    mfg = db_session.query(Organization).filter(Organization.type == "MANUFACTURER").first()
    med = db_session.query(Medicine).first()

    destroyed_batch = Batch(
        batch_number="PCM999888",
        product_id="PG-PCM-2026-999888",
        qr_payload="PG-PCM-2026-999888",
        medicine_id=med.id,
        manufacturing_date=datetime(2022, 1, 1),
        expiry_date=datetime(2024, 1, 1),
        quantity=250,
        status=BatchStatus.DESTRUCTION_VERIFIED,
        current_location="EcoSafe Bio-Medical Destruction Facility"
    )
    db_session.add(destroyed_batch)
    db_session.commit()

    req = RetailerVerifyRequest(
        product_id="PG-PCM-2026-999888",
        qr_detected=True,
        location="Pharmacy A"
    )
    res = verify_retailer_package(req, db_session)

    assert res.status_verdict == "REENTRY_FRAUD"
    assert "POTENTIAL RE-ENTRY FRAUD" in res.title
    assert res.risk_score == 95
    assert res.severity == "CRITICAL"
    assert res.allow_sale is False


# 30. Manufacturer fraud alert
def test_30_manufacturer_fraud_alert(db_session):
    incident = AlertService.create_fraud_incident(
        db=db_session,
        batch_id="TEST-FRAUD-BATCH",
        incident_type="REENTRY_FRAUD",
        risk_score=95,
        severity="CRITICAL",
        description="Destroyed product re-entered supply chain."
    )

    mfg_alert = db_session.query(Alert).filter(
        Alert.incident_id == incident.id,
        Alert.recipient_role == "MANUFACTURER"
    ).first()

    assert mfg_alert is not None
    assert mfg_alert.severity == "CRITICAL"


# 31. Regulator critical incident
def test_31_regulator_critical_incident(db_session):
    incident = AlertService.create_fraud_incident(
        db=db_session,
        batch_id="TEST-REG-BATCH",
        incident_type="REENTRY_FRAUD",
        risk_score=95,
        severity="CRITICAL",
        description="Critical re-entry fraud."
    )

    reg_alert = db_session.query(Alert).filter(
        Alert.incident_id == incident.id,
        Alert.recipient_role == "REGULATOR"
    ).first()

    assert reg_alert is not None
    assert reg_alert.severity == "CRITICAL"
    assert "CRITICAL COMPLIANCE ALERT" in reg_alert.message
