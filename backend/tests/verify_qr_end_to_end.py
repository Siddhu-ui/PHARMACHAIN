import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.seed_data import seed_database
from app.models.models import Batch

client = TestClient(app)

def test_qr_end_to_end_verification():
    # 1. Seed database to have latest state
    db = SessionLocal()
    seed_database(db)
    db.close()

    demo_medicines = [
        {
            "name": "GlycoNorm 500 mg Tablets",
            "batch_number": "CS10-B14-9921",
            "expected_verdict": "VERIFIED",
        },
        {
            "name": "CardioSafe 10 mg Tablets",
            "batch_number": "CS10-SAFE",
            "expected_verdict": "VERIFIED",
        },
        {
            "name": "CardioSafe 10 mg Tablets (Expiring)",
            "batch_number": "CS10-EXP18",
            "expected_verdict": "VERIFIED",
        },
        {
            "name": "CardioSafe 10 mg Tablets (Expired)",
            "batch_number": "CS10-A23-2507",
            "expected_verdict": "EXPIRED",
        },
        {
            "name": "Paracetamol 500mg Tablets",
            "batch_number": "PCM500123",
            "expected_verdict": "EXPIRED",
        }
    ]

    print("\n" + "="*80)
    print("STARTING END-TO-END QR GENERATION & VERIFICATION TEST")
    print("="*80)

    db = SessionLocal()

    for idx, item in enumerate(demo_medicines, start=1):
        batch = db.query(Batch).filter(Batch.batch_number == item["batch_number"]).first()
        assert batch is not None, f"Batch {item['batch_number']} not found in database"

        # 1. Verify QR is generated and present
        assert batch.qr_payload is not None, f"QR payload is None for batch {batch.batch_number}"
        
        # 2. Decode QR Payload (JSON format)
        qr_data = json.loads(batch.qr_payload)
        print(f"\n[{idx}] Testing Medicine: {batch.medicine.name if batch.medicine else item['name']}")
        print(f"    Batch: {batch.batch_number}")
        print(f"    Decoded QR JSON: {json.dumps(qr_data, indent=6)}")

        # 3. Assert all required fields in QR
        assert "product_name" in qr_data, "product_name missing from QR"
        assert "manufacturer" in qr_data, "manufacturer missing from QR"
        assert "batch_number" in qr_data, "batch_number missing from QR"
        assert "serial_number" in qr_data, "serial_number missing from QR"
        assert "manufacturing_date" in qr_data, "manufacturing_date missing from QR"
        assert "expiry_date" in qr_data, "expiry_date missing from QR"
        assert "quantity" in qr_data, "quantity missing from QR"

        # 4. Verify QR contains actual dates
        assert qr_data["manufacturing_date"] != "", "MFG Date cannot be empty"
        assert qr_data["expiry_date"] != "", "EXP Date cannot be empty"

        # 5. Call Backend Retailer Verification API with QR data
        res = client.post(
            "/api/products/verify-retailer",
            json={
                "product_id": batch.product_id,
                "qr_data": batch.qr_payload,
                "qr_detected": True,
                "location": "Shree Medicals, Bengaluru",
                "scanner_role": "RETAILER"
            }
        )
        assert res.status_code == 200, f"Verification failed with status {res.status_code}"
        data = res.json()

        # 6. Verify retailer response fields
        print(f"    --> Response Title: {data['title']}")
        print(f"    --> Status Verdict: {data['status_verdict']}")
        print(f"    --> Medicine Name: {data.get('medicine_name')}")
        print(f"    --> Manufacturer: {data.get('manufacturer')}")
        print(f"    --> Batch Number: {data.get('batch_number')}")
        print(f"    --> Serial Number: {data.get('serial_number')}")
        print(f"    --> Manufacturing Date: {data.get('manufacturing_date')}")
        print(f"    --> Expiry Date: {data.get('expiry_date')}")
        print(f"    --> Quantity: {data.get('quantity')}")
        print(f"    --> Current Expiry Status: {data.get('current_expiry_status')}")
        print(f"    --> Days Remaining: {data.get('days_remaining')}")

        assert data["medicine_name"] is not None
        assert data["manufacturer"] is not None
        assert data["batch_number"] == batch.batch_number
        assert data["manufacturing_date"] is not None
        assert data["expiry_date"] is not None
        assert data["quantity"] is not None
        assert data["current_expiry_status"] is not None
        assert data["days_remaining"] is not None
        assert data["status_verdict"] == item["expected_verdict"]

        # 7. Check dynamic expiry days calculation
        if item["expected_verdict"] == "VERIFIED":
            assert "Expires in" in data["current_expiry_status"]
            assert data["days_remaining"] > 0
        elif item["expected_verdict"] == "EXPIRED":
            assert "Expired" in data["current_expiry_status"]
            assert data["days_remaining"] > 0

    db.close()
    print("\n" + "="*80)
    print("ALL 5 DEMO MEDICINES VERIFIED END-TO-END SUCCESSFULLY!")
    print("="*80 + "\n")

if __name__ == "__main__":
    test_qr_end_to_end_verification()
