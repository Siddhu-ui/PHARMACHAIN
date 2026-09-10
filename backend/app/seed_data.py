from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.models import (
    Organization, User, Medicine, Batch, BatchEvent, ReturnRequest,
    Pickup, DestructionRecord, FraudIncident, Alert, Scan
)
from app.core.database import SessionLocal, engine, Base
from app.core.state_machine import BatchStatus
import json

def seed_database(db: Session = None):
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Clear existing records for clean reset
        db.query(Alert).delete()
        db.query(FraudIncident).delete()
        db.query(Scan).delete()
        db.query(DestructionRecord).delete()
        db.query(Pickup).delete()
        db.query(ReturnRequest).delete()
        db.query(BatchEvent).delete()
        db.query(Batch).delete()
        db.query(Medicine).delete()
        db.query(User).delete()
        db.query(Organization).delete()
        db.commit()

        # 1. Organizations
        org_pharm_a = Organization(
            name="Apollo Pharmacy - Indiranagar",
            type="PHARMACY",
            location="Bengaluru, Karnataka"
        )
        org_pharm_b = Organization(
            name="MedPlus Pharmacy - Koramangala",
            type="PHARMACY",
            location="Bengaluru, Karnataka"
        )
        org_pharm_c = Organization(
            name="CareWell Pharmacy - Bandra",
            type="PHARMACY",
            location="Mumbai, Maharashtra"
        )
        org_dist_1 = Organization(
            name="Apex Healthcare Logistics Ltd.",
            type="DISTRIBUTOR",
            location="Bengaluru Hub, Karnataka"
        )
        org_dist_2 = Organization(
            name="BlueDart Healthcare Logistics",
            type="DISTRIBUTOR",
            location="Mumbai Transit Hub, Maharashtra"
        )
        org_mfg_1 = Organization(
            name="Sun Pharma Laboratories Ltd.",
            type="MANUFACTURER",
            location="Vadodara, Gujarat"
        )
        org_mfg_2 = Organization(
            name="Cipla Therapeutics",
            type="MANUFACTURER",
            location="Kurkumbh, Maharashtra"
        )
        org_waste = Organization(
            name="EcoSafe Bio-Medical Destruction Facility",
            type="WASTE_FACILITY",
            location="Hosur Industrial Zone, Tamil Nadu"
        )
        org_regulator = Organization(
            name="CDSCO - Central Drugs Standard Control Organisation",
            type="REGULATOR",
            location="New Delhi, India"
        )

        db.add_all([
            org_pharm_a, org_pharm_b, org_pharm_c,
            org_dist_1, org_dist_2,
            org_mfg_1, org_mfg_2,
            org_waste, org_regulator
        ])
        db.commit()

        # 2. Users
        users = [
            User(
                name="Dr. Rajesh Sharma (Apollo)",
                email="pharmacy_a@pharmaguard.io",
                role="RETAILER",
                organization="Apollo Pharmacy - Indiranagar",
                organization_id=org_pharm_a.id,
                location="Bengaluru, Karnataka"
            ),
            User(
                name="Ananya Iyer (MedPlus)",
                email="pharmacy_b@pharmaguard.io",
                role="RETAILER",
                organization="MedPlus Pharmacy - Koramangala",
                organization_id=org_pharm_b.id,
                location="Bengaluru, Karnataka"
            ),
            User(
                name="Vikram Singh (Apex Logistics)",
                email="distributor@pharmaguard.io",
                role="DISTRIBUTOR",
                organization="Apex Healthcare Logistics Ltd.",
                organization_id=org_dist_1.id,
                location="Bengaluru Hub, Karnataka"
            ),
            User(
                name="Kavita Reddy (Sun Pharma QA)",
                email="manufacturer@pharmaguard.io",
                role="MANUFACTURER",
                organization="Sun Pharma Laboratories Ltd.",
                organization_id=org_mfg_1.id,
                location="Vadodara, Gujarat"
            ),
            User(
                name="Inspector A. K. Verma (CDSCO)",
                email="regulator@pharmaguard.io",
                role="REGULATOR",
                organization="CDSCO Central Office",
                organization_id=org_regulator.id,
                location="New Delhi, India"
            )
        ]
        db.add_all(users)
        db.commit()

        # 3. Medicines
        med_pcm = Medicine(
            name="Paracetamol 500mg",
            generic_name="Paracetamol IP",
            brand_name="Calpol 500",
            manufacturer="Sun Pharma Laboratories Ltd.",
            dosage="500mg",
            form="Tablet"
        )
        med_amx = Medicine(
            name="Amoxicillin 500mg",
            generic_name="Amoxicillin Trihydrate",
            brand_name="Mox 500",
            manufacturer="Sun Pharma Laboratories Ltd.",
            dosage="500mg",
            form="Capsule"
        )
        med_azi = Medicine(
            name="Azithromycin 250mg",
            generic_name="Azithromycin IP",
            brand_name="Azee 250",
            manufacturer="Cipla Therapeutics",
            dosage="250mg",
            form="Tablet"
        )
        med_met = Medicine(
            name="Metformin 500mg",
            generic_name="Metformin Hydrochloride",
            brand_name="Glycomet 500",
            manufacturer="Sun Pharma Laboratories Ltd.",
            dosage="500mg",
            form="Tablet"
        )
        med_pan = Medicine(
            name="Pantoprazole 40mg",
            generic_name="Pantoprazole Sodium",
            brand_name="Pan 40",
            manufacturer="Cipla Therapeutics",
            dosage="40mg",
            form="Tablet"
        )
        db.add_all([med_pcm, med_amx, med_azi, med_met, med_pan])
        db.commit()

        # 4. Batches
        now = datetime.utcnow()
        batch_pcm = Batch(
            batch_number="PCM500123",
            product_id="PG-PCM-2026-500123",
            qr_payload="PG-PCM-2026-500123",
            medicine_id=med_pcm.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=datetime(2023, 8, 15),
            expiry_date=datetime(2026, 8, 15), # Expired on 15/08/2026 (Registered Expiry)
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.EXPIRED,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Apollo Pharmacy - Indiranagar",
            dosage_strength="500mg",
            manufacturer_name="Sun Pharma Laboratories Ltd.",
            current_location="Apollo Pharmacy - Indiranagar, Bengaluru"
        )

        batch_new_pcm = Batch(
            batch_number="PCM-BATCH-001",
            product_id="PG-PCM-2026-000123",
            qr_payload="PG-PCM-2026-000123",
            medicine_id=med_pcm.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=datetime(2024, 8, 15),
            expiry_date=datetime(2026, 8, 15),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.ACTIVE,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Pharmacy A",
            dosage_strength="500mg",
            manufacturer_name="ABC Pharma",
            current_location="Pharmacy A"
        )

        batch_amx = Batch(
            batch_number="AMX202401",
            medicine_id=med_amx.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=now - timedelta(days=365),
            expiry_date=now + timedelta(days=22), # Expiring in 22 days (<30 days)
            quantity=150,
            unit="STRIPS",
            status=BatchStatus.EXPIRING_SOON,
            original_retailer_id=org_pharm_a.id,
            current_location="Apollo Pharmacy - Indiranagar, Bengaluru"
        )

        batch_azi = Batch(
            batch_number="AZI202499",
            medicine_id=med_azi.id,
            manufacturer_id=org_mfg_2.id,
            manufacturing_date=now - timedelta(days=180),
            expiry_date=now + timedelta(days=52), # Expiring in 52 days (<60 days)
            quantity=80,
            unit="STRIPS",
            status=BatchStatus.ACTIVE,
            original_retailer_id=org_pharm_a.id,
            current_location="Apollo Pharmacy - Indiranagar, Bengaluru"
        )

        batch_met = Batch(
            batch_number="MET202388",
            medicine_id=med_met.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=now - timedelta(days=90),
            expiry_date=now + timedelta(days=600), # Valid shelf life
            quantity=200,
            unit="STRIPS",
            status=BatchStatus.ACTIVE,
            original_retailer_id=org_pharm_b.id,
            current_location="MedPlus Pharmacy - Koramangala, Bengaluru"
        )

        batch_pan = Batch(
            batch_number="PAN202377",
            medicine_id=med_pan.id,
            manufacturer_id=org_mfg_2.id,
            manufacturing_date=now - timedelta(days=800),
            expiry_date=now - timedelta(days=45), # Expired 45 days ago
            quantity=120,
            unit="STRIPS",
            status=BatchStatus.EXPIRED,
            original_retailer_id=org_pharm_c.id,
            current_location="CareWell Pharmacy - Bandra, Mumbai"
        )

        batch_destroyed = Batch(
            batch_number="PCM999888",
            product_id="PG-PCM-2026-999888",
            qr_payload="PG-PCM-2026-999888",
            medicine_id=med_pcm.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=now - timedelta(days=900),
            expiry_date=now - timedelta(days=180),
            quantity=250,
            unit="STRIPS",
            status=BatchStatus.DESTRUCTION_VERIFIED,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Apollo Pharmacy - Indiranagar",
            dosage_strength="500mg",
            manufacturer_name="Sun Pharma Laboratories Ltd.",
            current_location="EcoSafe Bio-Medical Destruction Facility"
        )

        batch_mismatch = Batch(
            batch_number="AMX888777",
            medicine_id=med_amx.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=now - timedelta(days=400),
            expiry_date=now - timedelta(days=30),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.SUSPICIOUS,
            original_retailer_id=org_pharm_a.id,
            current_location="Apex Healthcare Logistics Hub"
        )

        batch_reentry = Batch(
            batch_number="AZI777666",
            medicine_id=med_azi.id,
            manufacturer_id=org_mfg_2.id,
            manufacturing_date=now - timedelta(days=850),
            expiry_date=now - timedelta(days=90),
            quantity=180,
            unit="STRIPS",
            status=BatchStatus.REENTRY_DETECTED,
            original_retailer_id=org_pharm_a.id,
            current_location="MedPlus Pharmacy - Koramangala (Unauthorized)"
        )

        batch_return_req = Batch(
            batch_number="MET666555",
            medicine_id=med_met.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=now - timedelta(days=700),
            expiry_date=now - timedelta(days=10),
            quantity=75,
            unit="STRIPS",
            status=BatchStatus.RETURN_REQUESTED,
            original_retailer_id=org_pharm_a.id,
            current_location="Apollo Pharmacy - Indiranagar, Bengaluru"
        )

        batch_transit = Batch(
            batch_number="PAN555444",
            medicine_id=med_pan.id,
            manufacturer_id=org_mfg_2.id,
            manufacturing_date=now - timedelta(days=750),
            expiry_date=now - timedelta(days=20),
            quantity=140,
            unit="STRIPS",
            status=BatchStatus.IN_TRANSIT,
            original_retailer_id=org_pharm_a.id,
            current_location="In Transit - Apex Logistics Van KA-01-EA-9022"
        )

        db.add_all([
            batch_pcm, batch_new_pcm, batch_amx, batch_azi, batch_met, batch_pan,
            batch_destroyed, batch_mismatch, batch_reentry, batch_return_req, batch_transit
        ])
        db.commit()

        # 5. Seed Initial Ledger Events for PCM500123
        events_pcm = [
            BatchEvent(
                batch_id=batch_pcm.id,
                event_type="BATCH_REGISTERED",
                actor_id=users[3].id,
                actor_name="Kavita Reddy (Sun Pharma)",
                organization_id=org_mfg_1.id,
                organization_name="Sun Pharma Laboratories Ltd.",
                location="Vadodara Plant, Gujarat",
                quantity=100,
                timestamp=now - timedelta(days=730),
                metadata_json=json.dumps({"lot": "L-2023-A", "qa_passed": True})
            ),
            BatchEvent(
                batch_id=batch_pcm.id,
                event_type="DISTRIBUTED_TO_RETAILER",
                actor_id=users[2].id,
                actor_name="Vikram Singh (Apex Logistics)",
                organization_id=org_dist_1.id,
                organization_name="Apex Healthcare Logistics Ltd.",
                location="Bengaluru Hub, Karnataka",
                quantity=100,
                timestamp=now - timedelta(days=715),
                metadata_json=json.dumps({"invoice": "INV-78891"})
            ),
            BatchEvent(
                batch_id=batch_pcm.id,
                event_type="RECEIVED_AT_PHARMACY",
                actor_id=users[0].id,
                actor_name="Dr. Rajesh Sharma (Apollo)",
                organization_id=org_pharm_a.id,
                organization_name="Apollo Pharmacy - Indiranagar",
                location="Indiranagar, Bengaluru",
                quantity=100,
                timestamp=now - timedelta(days=714)
            ),
            BatchEvent(
                batch_id=batch_pcm.id,
                event_type="EXPIRED_MARKED",
                actor_id=users[0].id,
                actor_name="PharmaGuard Expiry Monitor",
                organization_id=org_pharm_a.id,
                organization_name="Apollo Pharmacy - Indiranagar",
                location="Apollo Pharmacy - Indiranagar, Bengaluru",
                quantity=100,
                timestamp=now - timedelta(days=15),
                metadata_json=json.dumps({"reason": "Shelf-life expired on 15/08/2026"})
            )
        ]
        db.add_all(events_pcm)

        # 6. Seed Ledger for Destroyed Batch PCM999888
        events_destroyed = [
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="BATCH_REGISTERED",
                actor_name="Sun Pharma QA",
                organization_name="Sun Pharma Laboratories Ltd.",
                location="Vadodara, Gujarat",
                quantity=250,
                timestamp=now - timedelta(days=900)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="RETURN_REQUESTED",
                actor_name="Apollo Pharmacy",
                organization_name="Apollo Pharmacy",
                location="Bengaluru",
                quantity=250,
                timestamp=now - timedelta(days=170)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="PICKUP_CONFIRMED",
                actor_name="Apex Logistics",
                organization_name="Apex Healthcare Logistics Ltd.",
                location="Bengaluru Hub",
                quantity=250,
                weight=12.5,
                timestamp=now - timedelta(days=165)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="RECEIVED_BY_MANUFACTURER",
                actor_name="Sun Pharma QA",
                organization_name="Sun Pharma Laboratories Ltd.",
                location="Vadodara Hub",
                quantity=250,
                timestamp=now - timedelta(days=150)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="DESTRUCTION_VERIFIED",
                actor_name="EcoSafe Bio-Medical Facility",
                organization_name="EcoSafe Bio-Medical",
                location="Hosur Industrial Zone, Tamil Nadu",
                quantity=250,
                timestamp=now - timedelta(days=140),
                metadata_json=json.dumps({"certificate_no": "CERT-ECO-2025-9988", "method": "HIGH_TEMP_INCINERATION"})
            )
        ]
        db.add_all(events_destroyed)

        # 7. Seed Destruction Record for PCM999888
        dest_record = DestructionRecord(
            batch_id=batch_destroyed.id,
            manufacturer_id=org_mfg_1.id,
            waste_facility_id=org_waste.id,
            waste_facility_name="EcoSafe Bio-Medical Destruction Facility",
            certificate_number="CERT-ECO-2025-9988",
            destruction_date=now - timedelta(days=140),
            destroyed_quantity=250,
            certificate_url="/certificates/CERT-ECO-2025-9988.pdf",
            verification_status="VERIFIED"
        )
        db.add(dest_record)

        # 8. Seed Fraud Incidents and Alerts for initial demo state
        incident_reentry = FraudIncident(
            batch_id=batch_reentry.id,
            incident_type="REENTRY_FRAUD",
            risk_score=95,
            severity="CRITICAL",
            description="Batch AZI777666, verified destroyed at EcoSafe on 12/05/2025, re-scanned at MedPlus Pharmacy Koramangala.",
            detected_at=now - timedelta(hours=4),
            detected_by="PharmaGuard Compliance Engine",
            status="OPEN",
            evidence=json.dumps({
                "registered_status": "DESTRUCTION_VERIFIED",
                "attempted_location": "MedPlus Pharmacy - Koramangala",
                "scanner_role": "RETAILER"
            }),
            assigned_to="CDSCO Enforcement Division - South Zone"
        )
        db.add(incident_reentry)
        db.commit()

        alert_1 = Alert(
            incident_id=incident_reentry.id,
            recipient_role="REGULATOR",
            severity="CRITICAL",
            message="CRITICAL RE-ENTRY FRAUD: Destroyed Batch AZI777666 detected at MedPlus Pharmacy Koramangala. Immediate seizure recommended.",
            read=False,
            created_at=now - timedelta(hours=4)
        )
        alert_2 = Alert(
            incident_id=incident_reentry.id,
            recipient_role="MANUFACTURER",
            severity="CRITICAL",
            message="FRAUD ALERT: Destroyed batch AZI777666 re-entered distribution channel. Audit manifest initiated.",
            read=False,
            created_at=now - timedelta(hours=4)
        )
        alert_3 = Alert(
            incident_id=incident_reentry.id,
            recipient_role="RETAILER",
            severity="CRITICAL",
            message="WARNING: Batch AZI777666 is flagged as illegal re-entry. Quarantine immediately.",
            read=False,
            created_at=now - timedelta(hours=4)
        )
        db.add_all([alert_1, alert_2, alert_3])
        db.commit()

        print("Database seeded successfully with realistic Indian pharmaceutical reverse logistics scenario.")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
