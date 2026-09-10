import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import (
    Batch, Medicine, Organization, User, ReturnRequest,
    Pickup, DestructionRecord, FraudIncident, Alert, Scan
)
from app.core.state_machine import BatchStateMachine, BatchStatus, StateMachineError
from app.services.risk_engine import RiskEngine
from app.services.ledger_service import LedgerService
from app.services.alert_service import AlertService
from app.services.ml_service import ml_detector
from app.services.ocr_service import OCRService

# In-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    # Seed minimal entities
    mfg_org = Organization(name="Test Pharma", type="MANUFACTURER", location="Vadodara")
    pharm_a = Organization(name="Pharmacy A", type="PHARMACY", location="Bengaluru")
    pharm_b = Organization(name="Pharmacy B", type="PHARMACY", location="Mumbai")
    waste_org = Organization(name="EcoSafe Waste", type="WASTE_FACILITY", location="Hosur")
    session.add_all([mfg_org, pharm_a, pharm_b, waste_org])
    session.commit()

    med = Medicine(
        name="Paracetamol 500mg",
        generic_name="Paracetamol",
        brand_name="Calpol",
        manufacturer="Test Pharma",
        dosage="500mg",
        form="Tablet"
    )
    session.add(med)
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)

# Test 1: Normal Batch Verification
def test_normal_batch_verification(db_session):
    now = datetime.utcnow()
    batch = Batch(
        batch_number="TEST_NORM_01",
        medicine_id=db_session.query(Medicine).first().id,
        manufacturing_date=now - timedelta(days=100),
        expiry_date=now + timedelta(days=400),
        quantity=100,
        status=BatchStatus.ACTIVE,
        current_location="Pharmacy A"
    )
    db_session.add(batch)
    db_session.commit()

    eval_result = RiskEngine.evaluate_signals(
        batch_exists=True,
        is_destroyed_or_closed=False,
        expiry_mismatch=False,
        is_expired=False
    )
    assert eval_result["result"] == "VERIFIED"
    assert eval_result["risk_score"] < 30
    assert eval_result["severity"] == "LOW"

# Test 2: Expired Batch Flagging
def test_expired_batch_flagging(db_session):
    now = datetime.utcnow()
    batch = Batch(
        batch_number="TEST_EXP_01",
        medicine_id=db_session.query(Medicine).first().id,
        manufacturing_date=now - timedelta(days=700),
        expiry_date=now - timedelta(days=10),
        quantity=100,
        status=BatchStatus.EXPIRED,
        current_location="Pharmacy A"
    )
    db_session.add(batch)
    db_session.commit()

    assert BatchStateMachine.is_return_eligible(batch.status) is True
    # Can transition to RETURN_REQUESTED
    assert BatchStateMachine.can_transition(batch.status, BatchStatus.RETURN_REQUESTED) is True

# Test 3: The Most Important Test — Destroyed Batch Re-entry Detection
def test_destroyed_batch_reentry_detection(db_session):
    now = datetime.utcnow()
    med = db_session.query(Medicine).first()
    batch = Batch(
        batch_number="PCM_REENTRY_TEST",
        medicine_id=med.id,
        manufacturing_date=now - timedelta(days=800),
        expiry_date=now - timedelta(days=60),
        quantity=100,
        status=BatchStatus.DESTRUCTION_VERIFIED,
        current_location="EcoSafe Waste Facility"
    )
    db_session.add(batch)
    db_session.commit()

    # Batch is scanned at Pharmacy B
    assert BatchStateMachine.is_destroyed_or_closed(batch.status) is True

    eval_result = RiskEngine.evaluate_signals(
        batch_exists=True,
        is_destroyed_or_closed=True,
        unexpected_retailer=True
    )
    assert eval_result["result"] == "FRAUD"
    assert eval_result["risk_score"] >= 65

    # Create Fraud Incident and check automated alerts
    incident = AlertService.create_fraud_incident(
        db=db_session,
        batch_id=batch.id,
        incident_type="REENTRY_FRAUD",
        risk_score=95,
        severity="CRITICAL",
        description="Destroyed batch re-entry at Pharmacy B"
    )

    assert incident.incident_type == "REENTRY_FRAUD"
    assert incident.severity == "CRITICAL"
    assert incident.risk_score == 95

    alerts = db_session.query(Alert).filter(Alert.incident_id == incident.id).all()
    roles_notified = [a.recipient_role for a in alerts]
    assert "REGULATOR" in roles_notified
    assert "MANUFACTURER" in roles_notified
    assert "RETAILER" in roles_notified

# Test 4: Duplicate Scan Anomaly
def test_duplicate_scan_anomaly():
    eval_result = RiskEngine.evaluate_signals(
        batch_exists=True,
        is_destroyed_or_closed=False,
        duplicate_scan=True
    )
    assert eval_result["checks"]["scan_frequency_normal"] is False
    assert eval_result["risk_score"] >= 20

# Test 5: Expiry Mismatch (Label Tampering)
def test_expiry_mismatch_label_tampering(db_session):
    now = datetime.utcnow()
    batch = Batch(
        batch_number="TEST_TAMPER_01",
        medicine_id=db_session.query(Medicine).first().id,
        manufacturing_date=now - timedelta(days=700),
        expiry_date=datetime(2026, 8, 15), # Registered: 15/08/2026
        quantity=100,
        status=BatchStatus.ACTIVE,
        current_location="Pharmacy A"
    )
    db_session.add(batch)
    db_session.commit()

    # Fraudster altered label to 15/08/2028
    printed_expiry = "15/08/2028"
    parsed_date = OCRService.parse_date_string(printed_expiry)
    assert parsed_date is not None
    assert (parsed_date.year != batch.expiry_date.year) or (parsed_date.month != batch.expiry_date.month)

    eval_result = RiskEngine.evaluate_signals(
        batch_exists=True,
        is_destroyed_or_closed=False,
        expiry_mismatch=True
    )
    assert eval_result["result"] in ["FRAUD", "SUSPICIOUS"]
    assert eval_result["risk_score"] >= 30
    assert eval_result["checks"]["label_integrity"] is False

# Test 6: Quantity Mismatch Detection
def test_quantity_mismatch_detection():
    eval_result = RiskEngine.evaluate_signals(
        batch_exists=True,
        is_destroyed_or_closed=False,
        quantity_mismatch=True
    )
    assert eval_result["checks"]["quantity_consistent"] is False
    assert eval_result["risk_score"] >= 20

# Test 7: Certificate Mismatch
def test_certificate_mismatch_detection():
    eval_result = RiskEngine.evaluate_signals(
        batch_exists=True,
        is_destroyed_or_closed=False,
        certificate_mismatch=True
    )
    assert eval_result["risk_score"] >= 30
    assert any("Destruction certificate discrepancy" in r for r in eval_result["reasons"])

# Test 8: Risk Scoring Severity Thresholds
def test_risk_scoring_thresholds():
    assert RiskEngine.calculate_severity(15) == "LOW"
    assert RiskEngine.calculate_severity(35) == "MEDIUM"
    assert RiskEngine.calculate_severity(65) == "HIGH"
    assert RiskEngine.calculate_severity(90) == "CRITICAL"

# Test 9: State Transition Enforcement
def test_state_transition_enforcement():
    # Valid transitions
    assert BatchStateMachine.can_transition(BatchStatus.EXPIRED, BatchStatus.RETURN_REQUESTED) is True
    assert BatchStateMachine.can_transition(BatchStatus.RETURN_REQUESTED, BatchStatus.PICKUP_CONFIRMED) is True
    assert BatchStateMachine.can_transition(BatchStatus.PICKUP_CONFIRMED, BatchStatus.RECEIVED_BY_MANUFACTURER) is True
    assert BatchStateMachine.can_transition(BatchStatus.RECEIVED_BY_MANUFACTURER, BatchStatus.DESTRUCTION_VERIFIED) is True

    # Illegal transition: EXPIRED cannot directly jump to CLOSED
    assert BatchStateMachine.can_transition(BatchStatus.EXPIRED, BatchStatus.CLOSED) is False
    with pytest.raises(StateMachineError):
        BatchStateMachine.validate_transition(BatchStatus.EXPIRED, BatchStatus.CLOSED)

# Test 10: Immutable Event Ledger & ML Detector
def test_immutable_ledger_and_ml(db_session):
    now = datetime.utcnow()
    batch = Batch(
        batch_number="TEST_LEDGER_01",
        medicine_id=db_session.query(Medicine).first().id,
        manufacturing_date=now - timedelta(days=100),
        expiry_date=now + timedelta(days=300),
        quantity=100,
        status=BatchStatus.ACTIVE,
        current_location="Plant"
    )
    db_session.add(batch)
    db_session.commit()

    # Record events
    LedgerService.record_event(
        db=db_session,
        batch_id=batch.id,
        event_type="BATCH_REGISTERED",
        location="Plant",
        quantity=100
    )
    LedgerService.record_event(
        db=db_session,
        batch_id=batch.id,
        event_type="DISTRIBUTED",
        location="Hub",
        quantity=100
    )

    timeline = LedgerService.get_timeline(db_session, batch.id)
    assert len(timeline) == 2
    assert timeline[0].event_type == "BATCH_REGISTERED"
    assert timeline[1].event_type == "DISTRIBUTED"

    # ML Anomaly detector test
    normal_res = ml_detector.predict_anomaly(quantity_diff=0, handoff_delay_hours=24, scan_count=2, location_count=2)
    assert normal_res["is_anomaly"] is False

    anom_res = ml_detector.predict_anomaly(quantity_diff=75, handoff_delay_hours=200, scan_count=10, location_count=7, duplicate_scan_count=3)
    assert anom_res["is_anomaly"] is True
