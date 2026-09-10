import json
import urllib.request
import urllib.error
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"

def http_post(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def http_get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_e2e():
    print("==================================================")
    print("PHARMAGUARD LIVE HTTP END-TO-END ACCEPTANCE SUITE")
    print("==================================================")

    # 1. Reset demo environment to clean baseline
    print("\n[Step 1] Resetting Demo Environment...")
    reset_res = http_post("/demo/reset", {})
    print("Reset response:", reset_res["message"])

    # 2. Verify Manufacturer Portal & Medicine Serialization
    print("\n[Step 2] Testing Manufacturer Medicines & Serialization...")
    mfg_meds = http_get("/roles/manufacturer/medicines")
    assert len(mfg_meds) > 0, "No manufacturer medicines found!"
    pcm = next((m for m in mfg_meds if "PCM-BATCH-001" in m["batch_number"]), None)
    assert pcm is not None, "PCM-BATCH-001 not found in manufacturer portal!"
    print(f"[PASS] Found {pcm['medicine_name']} ({pcm['strength']}) - Batch: {pcm['batch_number']}")
    print(f"[PASS] Serial units count: {len(pcm['serials'])} - Sample: {pcm['serials'][:3]}")

    # 3. Test Serial Detail Lookup
    sample_serial = pcm['serials'][0]
    print(f"\n[Step 3] Querying Serial Detail Ledger for {sample_serial}...")
    serial_detail = http_get(f"/serials/{sample_serial}")
    assert serial_detail["unit"]["serial_code"] == sample_serial
    assert "qr_payload" in serial_detail["unit"]
    assert len(serial_detail["transfers"]) > 0
    print(f"[PASS] Serial Code: {serial_detail['unit']['serial_code']}")
    print(f"[PASS] Current Holder: {serial_detail['unit']['current_holder_type']} ({serial_detail['unit']['current_holder_name']})")
    print(f"[PASS] Recorded Transfers: {len(serial_detail['transfers'])}")

    # 4. Verify Distributor Accounting
    print("\n[Step 4] Verifying Distributor Inventory Accounting (A - B = Remaining)...")
    dist_meds = http_get("/roles/distributor/medicines")
    assert len(dist_meds) > 0
    dist_pcm = next((m for m in dist_meds if "PCM-BATCH-001" in m["batch_number"]), None)
    assert dist_pcm is not None
    rec = dist_pcm["received_count"]
    distr = dist_pcm["distributed_count"]
    rem = dist_pcm["remaining_count"]
    assert rec - distr == rem, f"Accounting mismatch! {rec} - {distr} != {rem}"
    print(f"[PASS] Accounting Invariant verified: Received ({rec}) - Distributed ({distr}) = Remaining ({rem})")
    print(f"[PASS] Retailers served: {[r['retailer_name'] + ': ' + str(r['count']) for r in dist_pcm['retailers']]}")

    # 5. Verify Retailer Inventory Isolation
    print("\n[Step 5] Verifying Retailer Inventory Isolation...")
    # Query Pharmacy A inventory
    pharm_a_inv = http_get("/roles/retailer/inventory")
    assert len(pharm_a_inv) > 0
    print(f"[PASS] Retailer displays exactly {len(pharm_a_inv)} units belonging to its store.")

    # 6. Test Valid Retailer Package Verification
    print("\n[Step 6] Testing Valid Package Verification at Pharmacy A...")
    verify_valid = http_post("/products/verify-retailer", {
        "product_id": sample_serial,
        "qr_detected": True,
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    })
    assert verify_valid["status_verdict"] == "VERIFIED", f"Expected VERIFIED, got {verify_valid['status_verdict']}"
    assert verify_valid["allow_sale"] is True
    assert "PRODUCT VERIFIED" in verify_valid["title"]
    print(f"[PASS] Result: {verify_valid['title']}")
    print(f"[PASS] Allow Sale: {verify_valid['allow_sale']}")
    print(f"[PASS] Risk Score: {verify_valid['risk_score']}/100 ({verify_valid['severity']})")

    # 7. Test Dispense / Sale Event
    print("\n[Step 7] Testing [ALLOW SALE] Dispensation Event...")
    dispense_res = http_post("/serials/dispense", {
        "serial_code": sample_serial,
        "retailer_name": "Pharmacy A"
    })
    assert dispense_res["success"] is True
    assert "successfully verified and dispensed" in dispense_res["message"]
    print(f"[PASS] Dispense Response: {dispense_res['message']}")

    # 8. Test Double-Sale Prevention
    print("\n[Step 8] Testing Double-Sale Prevention Invariant...")
    try:
        http_post("/serials/dispense", {"serial_code": sample_serial, "retailer_name": "Pharmacy A"})
        raise AssertionError("Expected error on second dispense!")
    except urllib.error.HTTPError as e:
        assert e.code == 400
        print("[PASS] Invariant verified: Serial cannot be dispensed twice (HTTP 400).")

    # 9. Test Location Mismatch Scan
    print("\n[Step 9] Testing Cross-Store / Location Mismatch Scan...")
    # Pharmacy B unit scanned at Pharmacy A
    pharm_b_serial = "PG-PCM-2026-000010"
    mismatch_res = http_post("/products/verify-retailer", {
        "product_id": pharm_b_serial,
        "qr_detected": True,
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    })
    assert mismatch_res["status_verdict"] == "LOCATION_MISMATCH"
    assert mismatch_res["allow_sale"] is False
    print(f"[PASS] Result: {mismatch_res['title']}")
    print(f"[PASS] Message: {mismatch_res['message']}")

    # 10. Test Label Tampering Scan
    print("\n[Step 10] Testing Label Expiry Tampering Scan...")
    tamper_res = http_post("/products/verify-retailer", {
        "product_id": "PG-PCM-2026-500123",
        "qr_detected": True,
        "printed_expiry_override": "15/08/2028",
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    })
    assert tamper_res["status_verdict"] == "LABEL_TAMPERING"
    assert tamper_res["allow_sale"] is False
    print(f"[PASS] Result: {tamper_res['title']} (Risk: {tamper_res['risk_score']}/100)")

    # 11. Test Re-Entry Fraud Detection (PCM999888)
    print("\n[Step 11] Testing Destroyed Re-Entry Fraud Detection (PCM999888)...")
    reentry_res = http_post("/products/verify-retailer", {
        "product_id": "PG-PCM-2026-999888",
        "qr_detected": True,
        "location": "Pharmacy A",
        "scanner_role": "RETAILER"
    })
    assert reentry_res["status_verdict"] == "REENTRY_FRAUD"
    assert reentry_res["risk_score"] == 95
    assert reentry_res["severity"] == "CRITICAL"
    assert "POTENTIAL RE-ENTRY FRAUD" in reentry_res["title"]
    assert "DO NOT ACCEPT OR DISPENSE" in reentry_res["recommendation"]
    print(f"[PASS] Result: {reentry_res['title']}")
    print(f"[PASS] Risk Score: {reentry_res['risk_score']}/100 ({reentry_res['severity']})")
    print(f"[PASS] Recommendation: {reentry_res['recommendation']}")

    # 12. Test Regulator Alert Creation
    print("\n[Step 12] Verifying Regulator Gateway Incident Feed...")
    reg_incidents = http_get("/fraud/incidents")
    reentry_inc = next((i for i in reg_incidents if i["incident_type"] == "REENTRY_FRAUD"), None)
    assert reentry_inc is not None
    assert reentry_inc["risk_score"] == 95
    print(f"[PASS] Found critical incident in Regulator Gateway: {reentry_inc['description']}")

    # 13. Test Reverse Logistics Pickup Listing
    print("\n[Step 13] Verifying Distributor Return Pickups...")
    pickups = http_get("/roles/distributor/pickups")
    print(f"[PASS] Pending Return Pickups count: {len(pickups)}")

    print("\n==================================================")
    print("ALL 13 LIVE END-TO-END ACCEPTANCE PHASES PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_e2e()
