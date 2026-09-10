# PHARMACHAIN — PharmaGuard AI-Assisted Reverse Logistics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)

PharmaGuard is an enterprise-grade AI-assisted closed-loop pharmaceutical reverse logistics platform. It tracks medicine batches across the reverse supply chain (**Retailer → Distributor → Manufacturer → Authorized Waste Facility → Verified Destruction**), preventing illegal re-entry of expired/destroyed medicines and detecting package label tampering.

---

## 1. Architecture & Reverse Chain State Machine

PharmaGuard maintains a cryptographic, immutable event ledger for every pharmaceutical batch:

```
                                      [ Reverse Logistics Lifecycle ]
  REGISTERED ──> ACTIVE ──> EXPIRED ──> RETURN_REQUESTED ──> PICKUP_CONFIRMED ──> IN_TRANSIT
                                                                                   │
  CLOSED <── DESTRUCTION_VERIFIED <── AWAITING_DESTRUCTION <── RECEIVED_BY_MANUFACTURER
     │
     └──> [ Scanned Again at Pharmacy B ] ──> 🚨 REENTRY_FRAUD DETECTED (Risk: 95/100)
```

- **Deterministic Rule Engine**: Authoritative for statutory decisions.
- **Isolation Forest ML**: Continuous anomaly scoring over reverse chain behavioral metrics.
- **OCR Computer Vision**: Scans printed blister pack dates against registered manufacturer records.
- **Simulated Regulator Alert Gateway**: CDSCO incident notifications, evidence dossier, and PDF exports.

---

## 2. Key Features

1. **Destroyed Batch Re-entry Interception (P0 Hackathon Wow Moment)**:
   - When a batch verified as destroyed (`DESTRUCTION_VERIFIED`) re-enters the retail market, PharmaGuard detects it within milliseconds, calculates risk score 95/100, transitions status to `REENTRY_DETECTED`, and fires alerts.
2. **Expiry-Date Label Tampering Detection (P1 Wow Moment)**:
   - Evaluates medicine blister pack images using OCR. If the printed label displays `15/08/2028` while manufacturer registration specifies `15/08/2026`, it immediately flags `LABEL_TAMPERING`.
3. **Multi-Signal Verification Hub**:
   - Compares QR validity, batch existence, location legitimacy, duplicate scan frequency, and ML isolation score.
4. **Physical Handoff & Weight Reconciliation**:
   - Distributor records physical item count and scale weight (e.g. 5.2 kg) to catch in-transit theft or diversion.
5. **Authorized Waste Certificate Reconciliation**:
   - Validates destruction certificate numbers, state-authorized disposal facilities, and destroyed quantities.
6. **Floating 1-Click Demo Controller**:
   - Persistent quick-action bar enabling instant execution of the 9-step hackathon presentation flow.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, jsPDF, canvas-confetti.
- **Backend**: Python 3.13, FastAPI, Pydantic v2, SQLAlchemy ORM.
- **Database**: PostgreSQL (Supabase compatible) with offline SQLite fallback (`pharmaguard.db`).
- **AI / ML**: scikit-learn `IsolationForest`, OpenCV / OCR date parser with visual bounding box geometry.

---

## 4. Quickstart & Installation

### Prerequisites
- Node.js v18+ & npm
- Python 3.10+

### Backend Setup
```bash
# Navigate to backend
cd backend

# Activate virtual environment (Windows)
.\venv\Scripts\Activate.ps1
# (Linux/macOS: source venv/bin/activate)

# Install dependencies
pip install -r requirements.txt

# Run test suite
pytest tests/test_compliance.py -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend will be live at: `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

### Frontend Setup
```bash
# In a new terminal, navigate to frontend
cd frontend

# Install npm packages
npm install

# Start development server
npm run dev
```
Frontend will be live at: `http://localhost:5173`.

---

## 5. Mandatory Hackathon Demo Scenario (1-Click or Manual)

Use the floating **Hackathon Demo Controller** at the bottom of the screen, or follow these exact steps:

| Step | Actor | Action | Outcome |
|---|---|---|---|
| **Step 1** | **Pharmacy A** | View expired Paracetamol batch `PCM500123` | Shows expired status; click **Create Return Request** |
| **Step 2** | **Distributor** | Switch to Apex Logistics, confirm pickup | Enter expected 100, actual 100, weight 5.2 kg &rarr; status `PICKUP_CONFIRMED` |
| **Step 3** | **Manufacturer** | Switch to Sun Pharma, confirm QA intake | Batch moved to quarantine bay &rarr; status `RECEIVED_BY_MANUFACTURER` |
| **Step 4** | **Manufacturer** | Upload destruction certificate & verify | Certificate validated with EcoSafe Facility &rarr; status `DESTRUCTION_VERIFIED` |
| **Step 5** | **Pharmacy B** | **THE WOW MOMENT**: Scan batch `PCM500123` | 🚨 **RE-ENTRY FRAUD DETECTED** (Risk: 95/100, CRITICAL alert sent to Regulator!) |
| **Step 6** | **Any** | **SECOND WOW MOMENT**: Package OCR Inspection | Upload tampered pack with 2028 expiry &rarr; 🚨 **LABEL TAMPERING DETECTED**! |

---

## 6. Deterministic Risk Scoring Weights

| Violation Type | Added Risk Score |
|---|---|
| Destroyed Batch Re-entry | `+50` |
| Expiry Mismatch (Label Tampering) | `+30` |
| Destruction Certificate Mismatch | `+30` |
| Quantity / Weight Discrepancy | `+20` |
| Duplicate Scan Anomaly | `+20` |
| Unexpected Retailer Node | `+15` |
| Geographic Location Anomaly | `+15` |
| Long Handoff Delay | `+10` |
| ML Isolation Forest Anomaly | `+20` |

---

## 7. Verification Tests

Execute the automated test suite covering all compliance requirements:
```bash
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\python.exe -m pytest backend\tests\test_compliance.py -v
```
All 10 tests pass deterministically.
