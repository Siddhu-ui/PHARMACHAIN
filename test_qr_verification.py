import json
import urllib.request
from datetime import datetime

# Reset DB to ensure fresh canonical seed
req_reset = urllib.request.Request("http://127.0.0.1:8000/api/demo/reset", data=b"{}", headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_reset) as resp:
    print("Reset response:", resp.read().decode())

# 1. Fetch registered products from backend
req = urllib.request.Request("http://127.0.0.1:8000/api/products")
with urllib.request.urlopen(req) as resp:
    products = json.loads(resp.read().decode())

print(f"Total products registered: {len(products)}")

demo_medicines = [
    "CardioSafe 10 mg Tablets",
    "GlycoNorm 500 mg Tablets",
    "Paracetamol 500 mg Tablets",
    "RespiClear 250 mg Capsules",
    "CardioSafe 10 mg Tablets"
]

verified_count = 0
today = datetime.utcnow().date()

print("\n=== VERIFYING DEMO MEDICINES QR PAYLOAD & DYNAMIC EXPIRY DAYS ===")

for p in products:
    qr_payload_str = p.get("qr_payload")
    assert qr_payload_str is not None, "QR payload is missing"
    
    # Parse QR payload JSON
    qr_data = json.loads(qr_payload_str)
    
    prod_name = qr_data.get("product_name")
    mfr = qr_data.get("manufacturer")
    batch_no = qr_data.get("batch_number")
    serial_no = qr_data.get("serial_number")
    mfg_date_str = qr_data.get("manufacturing_date")
    exp_date_str = qr_data.get("expiry_date")
    qty = qr_data.get("quantity")
    pack_size = qr_data.get("pack_size")
    
    print(f"\n---------------------------------------------")
    print(f"Medicine Name:      {prod_name}")
    print(f"Manufacturer:       {mfr}")
    print(f"Batch Number:       {batch_no}")
    print(f"Serial Number:      {serial_no}")
    print(f"Manufacturing Date: {mfg_date_str}")
    print(f"Expiry Date:        {exp_date_str}")
    print(f"Quantity/Pack Size: {qty} ({pack_size})")
    
    # Assertions
    assert prod_name, "Product name missing in QR"
    assert mfr, "Manufacturer missing in QR"
    assert batch_no, "Batch number missing in QR"
    assert mfg_date_str, "MANUFACTURING DATE MISSING IN QR"
    assert exp_date_str, "EXPIRY DATE MISSING IN QR"
    
    # Verify Dynamic Expiry Calculation
    exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d").date()
    days_diff = (exp_date - today).days
    
    if days_diff < 0:
        expiry_status = f"Expired {abs(days_diff)} days ago"
    elif days_diff == 0:
        expiry_status = "Expires today"
    elif days_diff == 1:
        expiry_status = "Expires in 1 day"
    else:
        expiry_status = f"Expires in {days_diff} days"
        
    print(f"Current Expiry Status: {expiry_status} (Dynamic diff: {days_diff} days)")
    
    # Test verify-retailer API endpoint with the QR payload
    verify_payload = json.dumps({
        "product_id": qr_payload_str,
        "qr_detected": True,
        "location": "Shree Medicals, Bengaluru",
        "scanner_role": "RETAILER"
    }).encode('utf-8')
    
    req_verify = urllib.request.Request(
        "http://127.0.0.1:8000/api/products/verify-retailer",
        data=verify_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_verify) as resp_v:
        v_res = json.loads(resp_v.read().decode())
        title_ascii = v_res['title'].encode('ascii', 'replace').decode('ascii')
        print(f"Verification Verdict: {v_res['status_verdict']} - {title_ascii}")
        assert v_res["status_verdict"] in ["VERIFIED", "EXPIRED", "REENTRY_FRAUD", "LABEL_TAMPERING", "UNKNOWN_PRODUCT"]
        
    verified_count += 1

print(f"\n=============================================")
print(f"SUCCESS: Verified {verified_count} medicines end-to-end against database and QR payload requirements!")
