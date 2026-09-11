import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import Batch, Medicine, Organization, BatchEvent, FraudIncident
from app.core.state_machine import BatchStatus, BatchStateMachine
from app.schemas.schemas import (
    ProductRegisterRequest, ProductAssignRetailerRequest,
    RetailerVerifyRequest
)
from app.api.products import (
    generate_deterministic_product_id, register_product,
    assign_retailer, verify_retailer_package, get_products
)

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    mfg = Organization(name="ABC Pharma", type="MANUFACTURER", location="Vadodara")
    pharm_a = Organization(name="Pharmacy A", type="PHARMACY", location="Bengaluru")
    waste = Organization(name="EcoSafe Bio-Medical Destruction Facility", type="WASTE_FACILITY", location="Hosur")
    session.add_all([mfg, pharm_a, waste])
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)

def test_product_id_deterministic_format():
    pid = generate_deterministic_product_id("Paracetamol 500mg", datetime(2026, 8, 15), 0)
    assert pid.startswith("PG-PCM-2026-")
    assert len(pid) == 18

def test_manufacturer_product_registration(db_session):
    req = ProductRegisterRequest(
        medicine_name="Paracetamol 500mg",
        strength="500mg",
        batch_id="PCM-BATCH-001",
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2026, 8, 15),
        manufacturer="ABC Pharma",
        assigned_retailer="Pharmacy A",
        quantity=100
    )
    product = register_product(req, db_session)

    assert product.batch_id == "PCM-BATCH-001"
    assert product.medicine == "Paracetamol 500mg"
    assert product.assigned_retailer == "Pharmacy A"
    assert product.product_id.startswith("PG-PCM-2026-")

    # Verify complete metadata in QR payload (product_name, dates, batch)
    assert "Paracetamol 500mg" in product.qr_payload
    assert "2026-08-15" in product.qr_payload
    assert "PCM-BATCH-001" in product.qr_payload
    assert "ABC Pharma" in product.qr_payload

    # Check database record
    db_batch = db_session.query(Batch).filter(Batch.batch_number == "PCM-BATCH-001").first()
    assert db_batch is not None
    assert db_batch.product_id == product.product_id
    assert db_batch.assigned_retailer_name == "Pharmacy A"

def test_retailer_verification_valid_package(db_session):
    # Setup registered product
    req = ProductRegisterRequest(
        medicine_name="Paracetamol 500mg",
        strength="500mg",
        batch_id="PCM-BATCH-001",
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2026, 8, 15),
        manufacturer="ABC Pharma",
        assigned_retailer="Pharmacy A",
        quantity=100
    )
    prod = register_product(req, db_session)

    # Retailer uploads valid package
    verify_req = RetailerVerifyRequest(
        product_id=prod.product_id,
        qr_detected=True,
        package_image_url="blister_valid.png",
        printed_expiry_override="15/08/2026",
        location="Pharmacy A"
    )
    res = verify_retailer_package(verify_req, db_session)

    assert res.status_verdict == "VERIFIED"
    assert "VERIFIED" in res.title
    assert res.risk_score < 30
    assert "Package information matches the registered product record" in res.message
    # Check that safety claims are NOT made
    assert "100% authentic" not in res.message
    assert "Medicine is safe" not in res.message

def test_retailer_verification_label_tampering(db_session):
    req = ProductRegisterRequest(
        medicine_name="Paracetamol 500mg",
        strength="500mg",
        batch_id="PCM-BATCH-TAMPER",
        manufacturing_date=datetime(2024, 8, 15),
        expiry_date=datetime(2026, 8, 15), # Registered 2026
        manufacturer="ABC Pharma",
        assigned_retailer="Pharmacy A"
    )
    prod = register_product(req, db_session)

    # Fraudster printed expiry 15/08/2028
    verify_req = RetailerVerifyRequest(
        product_id=prod.product_id,
        qr_detected=True,
        printed_expiry_override="15/08/2028",
        location="Pharmacy A"
    )
    res = verify_retailer_package(verify_req, db_session)

    assert res.status_verdict == "LABEL_TAMPERING"
    assert "LABEL INCONSISTENCY DETECTED" in res.title
    assert res.risk_score >= 80
    assert res.severity == "CRITICAL"
    assert "does not match the registered product record" in res.message

def test_retailer_verification_unknown_product(db_session):
    verify_req = RetailerVerifyRequest(
        product_id="PG-UNKNOWN-999999",
        qr_detected=True,
        location="Pharmacy A"
    )
    res = verify_retailer_package(verify_req, db_session)

    assert res.status_verdict == "UNKNOWN_PRODUCT"
    assert "UNKNOWN PRODUCT" in res.title
    assert res.risk_score >= 75
    assert "Product ID is not present in the registered supply-chain database" in res.message

def test_retailer_verification_expired_product(db_session):
    req = ProductRegisterRequest(
        medicine_name="Paracetamol 500mg",
        strength="500mg",
        batch_id="PCM-BATCH-EXP",
        manufacturing_date=datetime(2022, 1, 1),
        expiry_date=datetime(2024, 1, 1), # Past expiry
        manufacturer="ABC Pharma",
        assigned_retailer="Pharmacy A"
    )
    prod = register_product(req, db_session)

    verify_req = RetailerVerifyRequest(
        product_id=prod.product_id,
        qr_detected=True,
        printed_expiry_override="01/01/2024",
        location="Pharmacy A"
    )
    res = verify_retailer_package(verify_req, db_session)

    assert res.status_verdict == "EXPIRED"
    assert "PRODUCT EXPIRED" in res.title
    assert "DO NOT SELL / RETURN REQUIRED" in res.message

def test_retailer_verification_destroyed_reentry_fraud(db_session):
    now = datetime.utcnow()
    med = Medicine(name="Paracetamol 500mg", generic_name="Paracetamol", brand_name="Calpol", manufacturer="ABC Pharma", dosage="500mg", form="Tablet")
    db_session.add(med)
    db_session.commit()

    destroyed_batch = Batch(
        batch_number="PCM999888",
        product_id="PG-PCM-2026-999888",
        qr_payload="PG-PCM-2026-999888",
        medicine_id=med.id,
        manufacturing_date=now - timedelta(days=900),
        expiry_date=now - timedelta(days=180),
        quantity=250,
        status=BatchStatus.DESTRUCTION_VERIFIED,
        current_location="EcoSafe Bio-Medical Destruction Facility"
    )
    db_session.add(destroyed_batch)
    db_session.commit()

    verify_req = RetailerVerifyRequest(
        product_id="PG-PCM-2026-999888",
        qr_detected=True,
        location="Pharmacy B"
    )
    res = verify_retailer_package(verify_req, db_session)

    assert res.status_verdict == "REENTRY_FRAUD"
    assert "POTENTIAL RE-ENTRY FRAUD" in res.title
    assert res.risk_score == 95
    assert res.severity == "CRITICAL"
    assert "DO NOT ACCEPT OR DISPENSE" in res.recommendation

def test_qr_not_detected_handling(db_session):
    verify_req = RetailerVerifyRequest(
        product_id=None,
        qr_detected=False,
        location="Pharmacy A"
    )
    res = verify_retailer_package(verify_req, db_session)

    assert res.status_verdict == "QR_NOT_DETECTED"
    assert "QR CODE NOT DETECTED" in res.title
    assert "Unable to verify Product ID from this image" in res.message
