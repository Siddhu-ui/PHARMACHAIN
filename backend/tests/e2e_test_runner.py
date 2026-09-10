import json
import sys
import os
import urllib.request
import urllib.error
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.models import (
    Batch, FraudIncident, Alert, ReturnRequest,
    Pickup, DestructionRecord, BatchEvent, Scan
)
from app.core.state_machine import BatchStatus

FRONTEND_URL = "http://127.0.0.1:5173"
BACKEND_URL = "http://127.0.0.1:8000"

def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "PharmaGuard-E2E"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        content = resp.read().decode("utf-8")
        try:
            return resp.status, json.loads(content)
        except json.JSONDecodeError:
            return resp.status, content

def http_post(url, data=None):
    body = json.dumps(data).encode("utf-8") if data is not None else b""
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "PharmaGuard-E2E"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        content = resp.read().decode("utf-8")
        try:
            return resp.status, json.loads(content)
        except json.JSONDecodeError:
            return resp.status, content

def run_tests():
    print("=" * 70)
    print("PHARMAGUARD END-TO-END INTEGRATION TEST SUITE")
    print("=" * 70)

    db = SessionLocal()
    results = {}

    try:
        # Baseline Reset
        print("\n[SETUP] Resetting demo database to clean baseline...")
        status, reset_res = http_post(f"{BACKEND_URL}/api/demo/reset")
        assert status == 200, "Initial reset failed"
        print(f"  -> {reset_res['message']}")
        # TEST 1: Frontend Server
        print("\n[TEST 1] Testing Frontend Server (http://localhost:5173/)...")
        status, content = http_get(FRONTEND_URL)
        assert status == 200, f"Frontend returned status {status}"
        assert "<div id=\"root\"></div>" in content or "root" in content, "Root element missing in HTML"
        print("  -> PASS: Frontend server is serving application HTML (HTTP 200)")
        results["FRONTEND"] = "PASS"

        # TEST 2: Backend Health & Status
        print("\n[TEST 2] Testing Backend Health & OpenAPI Docs...")
        status, health = http_get(f"{BACKEND_URL}/health")
        assert status == 200 and health.get("status") == "healthy", "Health check failed"
        status, docs = http_get(f"{BACKEND_URL}/docs")
        assert status == 200, "Backend /docs failed"
        print("  -> PASS: Backend is healthy and /docs is live (HTTP 200)")
        results["BACKEND"] = "PASS"

        # TEST 3: Dashboard Stats vs Database
        print("\n[TEST 3] Testing Dashboard Data vs Actual SQLite Database...")
        status, stats = http_get(f"{BACKEND_URL}/api/dashboard/stats")
        assert status == 200, "Failed to get dashboard stats"
        
        # Verify directly in DB
        db_batch_count = db.query(Batch).count()
        assert stats["total_batches"] == db_batch_count, (
            f"Stats mismatch: API says {stats['total_batches']}, DB has {db_batch_count}"
        )
        print(f"  -> PASS: Dashboard total_batches ({stats['total_batches']}) matches DB count ({db_batch_count})")
        print(f"  -> Stats: Expired={stats['expiring_soon'] + stats['expired']}, Destroyed={stats['destroyed']}, Critical={stats['critical_incidents']}")
        results["DATABASE"] = "PASS"

        # TEST 4: Verify PCM999888 Scan & Destroyed Re-Entry Fraud Detection
        print("\n[TEST 4] Testing Scan of PCM999888 (Destroyed Batch Re-entry Detection)...")
        # Ensure PCM999888 is DESTRUCTION_VERIFIED before scanning
        b_destroyed = db.query(Batch).filter(Batch.batch_number == "PCM999888").first()
        assert b_destroyed is not None, "Batch PCM999888 not found in DB"
        assert b_destroyed.status in [BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.REENTRY_DETECTED], (
            f"Unexpected status: {b_destroyed.status}"
        )

        scan_payload = {
            "batch_number": "PCM999888",
            "scan_type": "QR",
            "location": "MedPlus Pharmacy - Koramangala, Bengaluru",
            "scanner_role": "RETAILER"
        }
        status, scan_res = http_post(f"{BACKEND_URL}/api/scan/verify", scan_payload)
        assert status == 200, f"Scan failed with status {status}"
        assert scan_res["result"] == "FRAUD", f"Expected FRAUD, got {scan_res['result']}"
        assert scan_res["risk_score"] == 95, f"Expected risk_score 95, got {scan_res['risk_score']}"
        assert scan_res["severity"] == "CRITICAL", f"Expected severity CRITICAL, got {scan_res['severity']}"
        print(f"  -> PASS: Re-entry fraud detected! Result={scan_res['result']}, Score={scan_res['risk_score']}/100, Severity={scan_res['severity']}")

        # TEST 5: Verify Fraud Incident & Alerts Created in Database
        print("\n[TEST 5] Confirming Fraud Incident and Alerts in Database...")
        db.expire_all()
        # Refresh batch
        b_refreshed = db.query(Batch).filter(Batch.batch_number == "PCM999888").first()
        assert b_refreshed.status == BatchStatus.REENTRY_DETECTED, (
            f"Batch status did not transition to REENTRY_DETECTED: {b_refreshed.status}"
        )
        print(f"  -> PASS: Batch status in DB successfully transitioned to '{b_refreshed.status}'")

        # Check FraudIncident
        incident = db.query(FraudIncident).filter(
            FraudIncident.batch_id == b_refreshed.id,
            FraudIncident.incident_type == "REENTRY_FRAUD"
        ).order_by(FraudIncident.detected_at.desc()).first()
        assert incident is not None, "FraudIncident REENTRY_FRAUD not found in DB"
        assert incident.risk_score == 95, f"Incident risk score mismatch: {incident.risk_score}"
        print(f"  -> PASS: FraudIncident created in DB: id={incident.id}, type={incident.incident_type}, score={incident.risk_score}")

        # Check Alerts for all 3 roles
        alerts = db.query(Alert).filter(Alert.incident_id == incident.id).all()
        alert_roles = {a.recipient_role for a in alerts}
        assert "REGULATOR" in alert_roles, "REGULATOR alert not generated"
        assert "MANUFACTURER" in alert_roles, "MANUFACTURER alert not generated"
        assert "RETAILER" in alert_roles, "RETAILER alert not generated"
        print(f"  -> PASS: Dispatched alerts verified in DB for roles: {sorted(list(alert_roles))}")
        results["RE-ENTRY FRAUD"] = "PASS"
        results["REGULATOR ALERT"] = "PASS"

        # TEST 6: Regulator Page API Verification
        print("\n[TEST 6] Testing /regulator Incident Retrieval API...")
        status, incidents_list = http_get(f"{BACKEND_URL}/api/fraud/incidents")
        assert status == 200, "Failed to get incidents list"
        incident_ids = [i["id"] for i in incidents_list]
        assert incident.id in incident_ids, f"Incident {incident.id} not visible on regulator endpoint"
        print(f"  -> PASS: Incident {incident.id} is visible in Regulator incident feed ({len(incidents_list)} total incidents)")

        # TEST 7: OCR Inspection - Tampered Package Scenario
        print("\n[TEST 7] Testing Package OCR Inspection with Tampered Scenario...")
        ocr_payload = {
            "batch_number": "PCM500123",
            "image_url": "package_tampered_2028.png"
        }
        status, ocr_res = http_post(f"{BACKEND_URL}/api/ocr/analyze", ocr_payload)
        assert status == 200, f"OCR analyze failed with status {status}"
        assert ocr_res["is_tampered"] is True, "OCR did not flag tampered package"
        assert ocr_res["registered_expiry_date"] == "15/08/2026", (
            f"Expected registered expiry 15/08/2026, got {ocr_res['registered_expiry_date']}"
        )
        assert ocr_res["extracted_expiry_date"] == "15/08/2028", (
            f"Expected detected expiry 15/08/2028, got {ocr_res['extracted_expiry_date']}"
        )
        print(f"  -> PASS: OCR Extracted Expiry: {ocr_res['extracted_expiry_date']} vs Registered: {ocr_res['registered_expiry_date']}")
        print(f"  -> Bounding boxes detected: {len(ocr_res['bounding_boxes'])} with confidence {ocr_res['confidence_score']}")

        # Now pass OCR printed expiry to scan verification
        ocr_verify_payload = {
            "batch_number": "PCM500123",
            "scan_type": "OCR",
            "location": "Apollo Pharmacy - Indiranagar, Bengaluru",
            "scanner_role": "RETAILER",
            "ocr_printed_expiry": ocr_res["extracted_expiry_date"]
        }
        status, ocr_verify_res = http_post(f"{BACKEND_URL}/api/scan/verify", ocr_verify_payload)
        assert status == 200, f"OCR scan verification failed: {status}"
        assert ocr_verify_res["result"] == "FRAUD", f"Expected FRAUD, got {ocr_verify_res['result']}"
        assert ocr_verify_res["severity"] == "CRITICAL", f"Expected CRITICAL, got {ocr_verify_res['severity']}"
        
        # Verify LABEL_TAMPERING incident in DB
        db.expire_all()
        tamper_incident = db.query(FraudIncident).filter(
            FraudIncident.batch_id == db.query(Batch).filter(Batch.batch_number == "PCM500123").first().id,
            FraudIncident.incident_type == "LABEL_TAMPERING"
        ).order_by(FraudIncident.detected_at.desc()).first()
        assert tamper_incident is not None, "LABEL_TAMPERING incident not found in DB"
        print(f"  -> PASS: LABEL_TAMPERING incident recorded in DB: id={tamper_incident.id}, score={tamper_incident.risk_score}")
        results["OCR LABEL TAMPERING"] = "PASS"

        # TEST 8: 1-Click Demo Reset
        print("\n[TEST 8] Testing 1-Click Demo Reset (/api/demo/reset)...")
        status, reset_res = http_post(f"{BACKEND_URL}/api/demo/reset")
        assert status == 200, f"Demo reset failed with status {status}"
        print(f"  -> API Response: {reset_res['message']}")

        # Verify DB state after reset
        db.expire_all()
        pcm500 = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
        assert pcm500 is not None, "Batch PCM500123 missing after reset"
        assert pcm500.status == BatchStatus.EXPIRED, f"Expected PCM500123 status EXPIRED, got {pcm500.status}"
        
        pcm999 = db.query(Batch).filter(Batch.batch_number == "PCM999888").first()
        assert pcm999 is not None, "Batch PCM999888 missing after reset"
        assert pcm999.status == BatchStatus.DESTRUCTION_VERIFIED, (
            f"Expected PCM999888 status DESTRUCTION_VERIFIED, got {pcm999.status}"
        )
        
        # In baseline reset, only the 1 historical incident from seed data exists
        active_incidents = db.query(FraudIncident).all()
        assert len(active_incidents) == 1, f"Expected 1 seed incident after reset, found {len(active_incidents)}"
        print(f"  -> PASS: Database successfully reset! PCM500123 is EXPIRED, PCM999888 is DESTRUCTION_VERIFIED, Incidents reset to 1")
        results["DEMO RESET"] = "PASS"

        # TEST 9: Full P0 Demo Flow Execution (Retailer -> Return -> Distributor -> Manufacturer -> Destruction -> Re-entry Fraud -> Regulator)
        print("\n[TEST 9] Executing Complete P0 Hackathon Demo Flow (Steps 1 to 9)...")
        
        for step in range(1, 10):
            status, step_res = http_post(f"{BACKEND_URL}/api/demo/step/{step}")
            assert status == 200, f"Step {step} failed: {status}"
            db.expire_all()
            
            # Step verifications
            if step == 1:
                b = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
                assert b.status == BatchStatus.EXPIRED, f"Step 1 status: {b.status}"
                print(f"  -> Step 1 PASS: Batch PCM500123 marked EXPIRED ({step_res['message']})")
            elif step == 2:
                b = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
                assert b.status == BatchStatus.RETURN_REQUESTED, f"Step 2 status: {b.status}"
                req = db.query(ReturnRequest).filter(ReturnRequest.batch_id == b.id).first()
                assert req is not None, "ReturnRequest not in DB"
                print(f"  -> Step 2 PASS: Return requested by Retailer ({step_res['message']})")
            elif step == 3:
                b = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
                assert b.status == BatchStatus.PICKUP_CONFIRMED, f"Step 3 status: {b.status}"
                pickup = db.query(Pickup).first()
                assert pickup is not None and pickup.actual_weight == 5.2, "Pickup weight mismatch"
                print(f"  -> Step 3 PASS: Distributor pickup confirmed, weight 5.2 kg recorded ({step_res['message']})")
            elif step == 4:
                b = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
                assert b.status == BatchStatus.RECEIVED_BY_MANUFACTURER, f"Step 4 status: {b.status}"
                print(f"  -> Step 4 PASS: Manufacturer received batch in Quarantine Bay ({step_res['message']})")
            elif step == 5:
                b = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
                assert b.status == BatchStatus.AWAITING_DESTRUCTION, f"Step 5 status: {b.status}"
                print(f"  -> Step 5 PASS: Batch routed to EcoSafe Facility ({step_res['message']})")
            elif step == 6:
                b = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
                assert b.status == BatchStatus.DESTRUCTION_VERIFIED, f"Step 6 status: {b.status}"
                rec = db.query(DestructionRecord).filter(DestructionRecord.batch_id == b.id).first()
                assert rec is not None and rec.certificate_number == "CERT-ECO-2026-PCM123", "Certificate missing"
                print(f"  -> Step 6 PASS: Verified destruction certificate CERT-ECO-2026-PCM123 recorded ({step_res['message']})")
            elif step == 7:
                b = db.query(Batch).filter(Batch.batch_number == "PCM500123").first()
                assert b.status == BatchStatus.REENTRY_DETECTED, f"Step 7 status: {b.status}"
                inc = db.query(FraudIncident).filter(
                    FraudIncident.batch_id == b.id,
                    FraudIncident.incident_type == "REENTRY_FRAUD"
                ).first()
                assert inc is not None and inc.risk_score == 95, "Step 7 incident missing or score != 95"
                print(f"  -> Step 7 PASS: Re-entry fraud detected! Risk score 95/100, incident created ({step_res['message']})")
            elif step == 8:
                inc_tamper = db.query(FraudIncident).filter(
                    FraudIncident.incident_type == "LABEL_TAMPERING"
                ).first()
                assert inc_tamper is not None, "Tamper incident missing"
                print(f"  -> Step 8 PASS: Label tampering detected by OCR expiry manipulation ({step_res['message']})")
            elif step == 9:
                alerts_reg = db.query(Alert).filter(Alert.recipient_role == "REGULATOR").all()
                assert len(alerts_reg) >= 2, "Regulator alerts missing"
                print(f"  -> Step 9 PASS: Emergency CDSCO regulator enforcement broadcast dispatched ({step_res['message']})")

        results["P0 DEMO FLOW"] = "PASS"

        print("\n" + "=" * 70)
        print("ALL END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)
        for k, v in results.items():
            print(f"{k}: {v}")
        return 0

    except Exception as e:
        print(f"\n[FAIL] TEST FAILURE: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()

if __name__ == "__main__":
    sys.exit(run_tests())
