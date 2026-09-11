import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.seed_data import seed_database
from app.core.database import SessionLocal

@pytest.fixture(scope="module")
def client():
    # Seed clean database
    db = SessionLocal()
    seed_database(db)
    db.close()

    with TestClient(app) as c:
        yield c

def test_e2e_complete_story(client):
    # Step 1: Manufacturer registers Paracetamol 500mg
    reg_payload = {
        "medicine_name": "Paracetamol 500mg",
        "strength": "500mg",
        "batch_id": "PCM-BATCH-TEST",
        "manufacturing_date": "2024-08-15T00:00:00",
        "expiry_date": "2026-08-15T00:00:00",
        "manufacturer": "ABC Pharma",
        "assigned_retailer": "Pharmacy A",
        "quantity": 100
    }
    res = client.post("/api/products/register", json=reg_payload)
    assert res.status_code == 200
    prod = res.json()
    assert prod["batch_id"] == "PCM-BATCH-TEST"
    assert prod["medicine"] == "Paracetamol 500mg"
    assert prod["product_id"].startswith("PG-PCM-2026-")
    assert "Paracetamol" in prod["qr_payload"]
    assert "2026-08-15" in prod["qr_payload"]
    assert "PCM-BATCH-TEST" in prod["qr_payload"]

    product_id = prod["product_id"]

    # Step 2: Query product list & QR endpoint
    res_list = client.get("/api/products")
    assert res_list.status_code == 200
    all_prods = res_list.json()
    assert any(p["product_id"] == product_id for p in all_prods)

    res_qr = client.get(f"/api/products/{product_id}/qr")
    assert res_qr.status_code == 200
    assert product_id in res_qr.json()["qr_payload"]

    # Step 3: Retailer Package Verification — Case A: Valid Package
    verify_valid = {
        "product_id": product_id,
        "qr_detected": True,
        "package_image_url": "blister_valid.png",
        "printed_expiry_override": "15/08/2026",
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    }
    res_v1 = client.post("/api/products/verify-retailer", json=verify_valid)
    assert res_v1.status_code == 200
    data_v1 = res_v1.json()
    assert data_v1["status_verdict"] == "VERIFIED"
    assert "VERIFIED" in data_v1["title"]
    assert data_v1["risk_score"] < 30
    assert "Package information matches the registered product record" in data_v1["message"]
    # Verify we do NOT claim "100% authentic" or "Medicine is safe"
    assert "100% authentic" not in data_v1["message"]
    assert "Medicine is safe" not in data_v1["message"]

    # Step 4: Retailer Package Verification — Case B: Label Tampering
    verify_tamper = {
        "product_id": product_id,
        "qr_detected": True,
        "printed_expiry_override": "15/08/2028", # Fraudulent extension
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    }
    res_v2 = client.post("/api/products/verify-retailer", json=verify_tamper)
    assert res_v2.status_code == 200
    data_v2 = res_v2.json()
    assert data_v2["status_verdict"] == "LABEL_TAMPERING"
    assert "LABEL INCONSISTENCY DETECTED" in data_v2["title"]
    assert data_v2["risk_score"] >= 80
    assert data_v2["severity"] == "CRITICAL"
    assert "does not match the registered product record" in data_v2["message"]

    # Step 5: Retailer Package Verification — Case C: Unknown Product
    verify_unknown = {
        "product_id": "PG-UNKNOWN-999999",
        "qr_detected": True,
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    }
    res_v3 = client.post("/api/products/verify-retailer", json=verify_unknown)
    assert res_v3.status_code == 200
    data_v3 = res_v3.json()
    assert data_v3["status_verdict"] == "UNKNOWN_PRODUCT"
    assert "UNKNOWN PRODUCT" in data_v3["title"]
    assert "Product ID is not present in the registered supply-chain database" in data_v3["message"]

    # Step 6: Retailer Package Verification — Case D: Expired Product
    verify_exp = {
        "product_id": "PG-PCM-2026-500123", # Seed expired batch
        "qr_detected": True,
        "location": "Apollo Pharmacy - Indiranagar",
        "scanner_role": "RETAILER"
    }
    res_v4 = client.post("/api/products/verify-retailer", json=verify_exp)
    assert res_v4.status_code == 200
    data_v4 = res_v4.json()
    assert data_v4["status_verdict"] == "EXPIRED"
    assert "PRODUCT EXPIRED" in data_v4["title"]
    assert "DO NOT SELL / RETURN REQUIRED" in data_v4["message"]

    # Step 7: Retailer Package Verification — Case E: Destroyed Re-Entry Fraud (PCM999888)
    verify_reentry = {
        "product_id": "PG-PCM-2026-999888", # PCM999888 verified destroyed
        "qr_detected": True,
        "location": "MedPlus Pharmacy - Koramangala",
        "scanner_role": "RETAILER"
    }
    res_v5 = client.post("/api/products/verify-retailer", json=verify_reentry)
    assert res_v5.status_code == 200
    data_v5 = res_v5.json()
    assert data_v5["status_verdict"] == "REENTRY_FRAUD"
    assert "POTENTIAL RE-ENTRY FRAUD" in data_v5["title"]
    assert data_v5["risk_score"] == 95
    assert data_v5["severity"] == "CRITICAL"
    assert "DO NOT ACCEPT OR DISPENSE" in data_v5["recommendation"]

    # Step 8: Retailer Package Verification — QR Not Detected
    verify_no_qr = {
        "product_id": None,
        "qr_detected": False,
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    }
    res_v6 = client.post("/api/products/verify-retailer", json=verify_no_qr)
    assert res_v6.status_code == 200
    data_v6 = res_v6.json()
    assert data_v6["status_verdict"] == "QR_NOT_DETECTED"
    assert "QR CODE NOT DETECTED" in data_v6["title"]
    assert "Unable to verify Product ID from this image" in data_v6["message"]

    # Step 9: Verify Incidents in Regulator Gateway Feed
    res_incidents = client.get("/api/fraud/incidents")
    assert res_incidents.status_code == 200
    incidents = res_incidents.json()
    types = [inc["incident_type"] for inc in incidents]
    assert "REENTRY_FRAUD" in types
    assert "LABEL_TAMPERING" in types
