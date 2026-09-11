# PHARMAFLOW

> **AI-assisted pharmaceutical reverse-chain compliance and fraud detection platform.**

PharmaGuard provides closed-loop reverse logistics tracking for pharmaceuticals across all handoff stages (**Pharmacy Retailer → Logistics Distributor → Manufacturer Quarantine → State-Authorized Waste Facility → Verified Destruction**). It enforces deterministic statutory compliance, uses computer vision OCR for package label tampering inspection, and applies Isolation Forest machine learning to flag behavioral supply chain anomalies.

---

## Quick Start (One-Command Startup)

1. Open the project root folder in your terminal:
   ```cmd
   cd c:\Users\admin\Documents\pharmathon
   ```
2. Run the Windows one-command startup batch script:
   ```cmd
   start_pharmaguard.bat
   ```
3. Open your browser:
   - **Frontend Application**: [http://localhost:5173](http://localhost:5173)
   - **Backend API Engine**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
   - **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

To safely stop all background processes, run:
```cmd
stop_pharmaguard.bat
```

---

## Demo Reset Instructions

PharmaGuard includes a 1-click safe demo reset that clears test transactions and restores the baseline pharmaceutical batches and custody ledgers in the local canonical SQLite database (`backend/pharmaguard.db`):

- **From the UI**: Click the **Reset Demo** button in the floating bottom controller or the top navigation bar (includes confirmation prompt).
- **Via API**:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/demo/reset
  ```

---

## Demo Users & Roles

PharmaGuard supports instant role switching from the top-right workspace profile switcher (no passwords required for local demo):

| Actor Role | Display Name | Organization | Login Email |
|---|---|---|---|
| **RETAILER** | Dr. Rajesh Sharma | Apollo Pharmacy - Indiranagar, Bengaluru | `pharmacy_a@pharmaguard.io` |
| **RETAILER** | Ananya Iyer | MedPlus Pharmacy - Koramangala, Bengaluru | `pharmacy_b@pharmaguard.io` |
| **DISTRIBUTOR** | Vikram Singh | Apex Healthcare Logistics Ltd., Bengaluru Hub | `distributor@pharmaguard.io` |
| **MANUFACTURER** | Kavita Reddy | Sun Pharma Laboratories Ltd., Vadodara | `manufacturer@pharmaguard.io` |
| **REGULATOR** | Inspector A. K. Verma | CDSCO Central Office, New Delhi | `regulator@pharmaguard.io` |

---

## Important Demo Scenarios

### Scenario A — Expired Medicine Return Workflow
1. Pharmacy A identifies expired Paracetamol batch `PCM500123` (registered expiry: `15/08/2026`).
2. Creates return request (`RETURN_REQUESTED`).
3. Apex Logistics confirms physical pickup, logs quantity 100 strips and scale weight 5.2 kg (`PICKUP_CONFIRMED` → `IN_TRANSIT`).
4. Sun Pharma receives the return in their quarantine bay (`RECEIVED_BY_MANUFACTURER`).
5. Batch is scheduled for disposal at EcoSafe Bio-Medical Facility (`AWAITING_DESTRUCTION`).

### Scenario B — Verified Destruction
1. Sun Pharma links the authorized certificate `CERT-ECO-2026-PCM123` issued by EcoSafe Bio-Medical Facility.
2. The platform reconciles disposal certificate numbers, state waste authorization, and quantities.
3. Batch status securely transitions to `DESTRUCTION_VERIFIED` / `CLOSED`.

### Scenario C — Re-entry Fraud (P0 Hackathon Wow Moment)
1. Using demo batch `PCM999888` (which was previously certified destroyed at EcoSafe):
2. Scan or verify `PCM999888` at unauthorized MedPlus Pharmacy.
3. Multi-signal rule engine detects that a destroyed batch has re-entered the market.
4. Risk score: **95/100**, Severity: **CRITICAL**, Status: `REENTRY_DETECTED`.
5. UI displays:
   - 🚨 **FRAUD DETECTED**
   - **95/100**
   - **CRITICAL**
   - **DO NOT ACCEPT OR DISPENSE**
6. Automated alerts dispatched simultaneously to CDSCO Regulator, Sun Pharma Manufacturer, and Pharmacy Retailers.

### Scenario D — OCR Label Tampering Inspection (P1 Wow Moment)
1. Open the **Verify Batch** page (`/scan`) and select **Package OCR Inspection**.
2. Select **Tampered Package** (preset demo imagery).
3. Registered expiry: `15/08/2026`. Detected printed expiry: `15/08/2028`.
4. OCR detects date extension fraud (`+30` risk score), moves status to `SUSPICIOUS`, logs `LABEL_TAMPERING` incident, and alerts the regulator.

### Scenario E — Regulator Incident Dashboard
1. Navigate to **Regulator Hub** (`/regulator`).
2. Review open fraud incidents, evidence dossiers, chain-of-custody immutable timeline, and geographic node tags.
3. Generate formal PDF Incident Reports with cryptographic evidence hashes for statutory enforcement.

---

## System Architecture & AI Clarification

PharmaGuard implements a tiered compliance architecture and specifically distinguishes:

1. **Deterministic Compliance Rules (Authoritative Decision Layer)**:
   - Statutory compliance rules and finite-state machine transitions govern all authoritative decisions (e.g. destroyed batches cannot be dispensed).
2. **Computer Vision & OCR (Package Inspection)**:
   - Extracts printed batch numbers, manufacturing dates, and expiry dates from packaging to detect label manipulation. Preset blister pack images provide a reliable hackathon demonstration fallback.
3. **Machine Learning Anomaly Detection (Isolation Forest)**:
   - Analyzes multidimensional behavioral features (transit delays, quantity variance, duplicate scan frequencies, route anomalies) to compute an AI-assisted anomaly risk score.

> [!NOTE]
> PharmaGuard uses **AI-assisted risk detection** to alert stakeholders and flag anomalies. Statutory decisions remain rooted in immutable ledgers and deterministic compliance rules.

---

## Automated Verification

```bash
# Run backend pytest compliance suite (10/10 passing):
cd backend
.\venv\Scripts\python.exe -m pytest tests/test_compliance.py -v

# Run full end-to-end integration suite:
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\python.exe backend/tests/e2e_test_runner.py

# Build frontend production bundle:
cd ../frontend
npm run build
```
