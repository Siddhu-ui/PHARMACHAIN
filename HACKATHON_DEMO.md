# PharmaGuard — Official Hackathon Live Demo Script

Follow this exact step-by-step presentation script to demonstrate the PharmaGuard AI-assisted reverse supply chain compliance platform.

---

## START: System Launch & Baseline Reset

1. **Launch Services with 1 Command**:
   - Double-click or run from PowerShell/CMD in the project root:
     ```cmd
     start_pharmaguard.bat
     ```
   - Two terminal windows will open for Backend (`:8000`) and Frontend (`:5173`).
2. **Open the Web Application**:
   - Navigate to: [http://localhost:5173](http://localhost:5173)
3. **Confirm Command Center Loads**:
   - Verify the **Reverse Chain Compliance Command Center** is live with real-time KPI metrics and batch status distribution.
4. **Reset Demo to Clean Starting Baseline**:
   - Click the **Reset Demo** button (in the top navigation bar or floating bottom controller) and confirm the prompt.
   - Confirm the success message: `Demo database successfully reset to clean starting baseline.`

---

## DEMO 1: Normal Reverse Logistics Lifecycle

Demonstrate how expired medicines are systematically tracked through physical handoffs to authorized destruction.

1. **Step 1: Retailer Identifies Expired Medicine**
   - In the top-right actor switcher, select **Dr. Rajesh Sharma (Apollo Pharmacy)**.
   - Click **Pharmacy** in the navigation bar.
   - Locate batch **`PCM500123`** (Paracetamol 500mg, expired on `15/08/2026`).
   - Click **Create Return Request** (quantity: 100 strips, reason: `EXPIRED`).
   - *Result*: Status transitions to `RETURN_REQUESTED`.
2. **Step 2: Distributor Pickup & Physical Weight Reconciliation**
   - Switch actor to **Vikram Singh (Apex Healthcare Logistics)**.
   - Click **Distributor** in the navigation bar.
   - Find the pending return for `PCM500123` and click **Confirm Physical Pickup**.
   - Note the weight recording field (`5.2 kg`) and quantity (`100 strips`). Submit the confirmation.
   - *Result*: Status transitions to `PICKUP_CONFIRMED` → `IN_TRANSIT`.
3. **Step 3: Manufacturer Receipt in Quarantine Bay**
   - Switch actor to **Kavita Reddy (Sun Pharma QA)**.
   - Click **Manufacturer** in the navigation bar.
   - Under *Returned Batches in Transit*, click **Log Receipt in Quarantine Bay**.
   - *Result*: Status transitions to `RECEIVED_BY_MANUFACTURER`.
4. **Step 4: Destruction Certificate Verification & Closing**
   - In the Manufacturer view, click **Schedule & Verify Destruction** for `PCM500123`.
   - Facility: `EcoSafe Bio-Medical Destruction Facility`.
   - Certificate: `CERT-ECO-2026-PCM123`.
   - Click **Verify Certificate** (reconciles against state-authorized waste facility registries).
   - Click **Confirm Destruction**.
   - *Result*: Batch securely transitions to `DESTRUCTION_VERIFIED` / `CLOSED`.

---

## DEMO 2: The P0 Wow Moment — Re-entry Fraud Interception

Demonstrate how PharmaGuard prevents destroyed medicines from being illegally resold.

1. Navigate to **Verify Batch** (`/scan`).
2. In the target batch input, select or type:
   ```
   PCM999888
   ```
   *(This batch was previously certified destroyed at EcoSafe Bio-Medical Facility)*.
3. Keep Scanning Location Node as `MedPlus Pharmacy - Koramangala` and click **Verify**.
4. **Expected Immediate Outcome**:
   - Visual red alert celebration.
   - Banner displays:
     ```
     🚨 FRAUD DETECTED
     95/100
     CRITICAL
     DO NOT ACCEPT OR DISPENSE
     ```
   - Compliance verdict: `Destroyed batch re-entry detected — previously verified as destroyed`.
   - Batch status moves to `REENTRY_DETECTED`.
   - Immediate regulatory enforcement alert dispatched.

---

## DEMO 3: The P1 Wow Moment — Package OCR Label Tampering

Demonstrate computer vision detecting date manipulation on medicine blister packs.

1. Still on the **Verify Batch** (`/scan`) page, switch to the **Package OCR Inspection** tab.
2. Click **Tampered Package** (preset demo imagery).
3. Observe the extracted bounding boxes and date reconciliation:
   - **Registered Manufacturer Expiry**: `15/08/2026`
   - **Detected Printed Package Expiry**: `15/08/2028`
4. **Expected Outcome**:
   - Verdict: **`LABEL TAMPERING`**
   - Finding: *Printed expiry date contradicts registered database. Fraudulent 2-year shelf-life extension detected.*
   - Status changes to **`SUSPICIOUS`**.
   - Incident and high-severity compliance alerts are logged in the database.

---

## DEMO 4: CDSCO Regulator Incident Hub & Enforcement Dossier

Demonstrate how regulatory authorities monitor supply chain integrity and export evidence.

1. Switch actor to **Inspector A. K. Verma (CDSCO Central Office)**.
2. Navigate to **Regulator Hub** (`/regulator`).
3. Point out the real-time incident feed showing:
   - **Incident Type**: `REENTRY_FRAUD` and `LABEL_TAMPERING`
   - **Target Batch**: `PCM999888` / `PCM500123`
   - **Pharmacy Location**: `MedPlus Pharmacy - Koramangala`
   - **Deterministic Risk Score**: `95/100 (CRITICAL)`
   - **Evidence Dossier**: Registered vs. attempted scan timestamps, actor identity, and GPS location.
   - **Immutable Event Timeline**: Cryptographic audit trail from manufacturing to interception.
   - **Alert Dispatches**: Alerts simultaneously delivered to Regulator, Manufacturer, and Retailer nodes.
4. Click **View / Export Incident Report** to preview the formal regulatory enforcement dossier.

---

## CLOSING: Key Takeaways for the Judges

1. **Closing the Reverse Supply Chain Loop**:
   - Most platforms only track medicines from factory to pharmacy. PharmaGuard closes the return loop from expiry back to verified destruction.
2. **Destruction as a Cryptographic Security Boundary**:
   - Once a destruction certificate is linked and verified, that batch's digital identity is locked. Any subsequent scan triggers an autonomous re-entry fraud verdict within milliseconds.
3. **Multi-Signal AI-Assisted Architecture**:
   - Combines deterministic statutory rule compliance (authoritative decision layer), computer vision date OCR (physical label verification), and Isolation Forest anomaly detection (supply chain behavioral anomalies).
