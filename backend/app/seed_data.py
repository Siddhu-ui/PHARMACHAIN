from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    Organization, User, Medicine, Batch, BatchEvent, ReturnRequest,
    Pickup, DestructionRecord, FraudIncident, Alert, Scan,
    ProductUnit, CustodyTransfer
)
from app.core.database import SessionLocal, engine, Base
from app.core.state_machine import BatchStatus
from sqlalchemy import text
import json

def seed_database(db: Session = None):
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        with engine.connect() as conn:
            # product_units
            res = conn.execute(text("PRAGMA table_info(product_units)")).fetchall()
            cols = [r[1] for r in res]
            if "dosage_strength" not in cols:
                conn.execute(text("ALTER TABLE product_units ADD COLUMN dosage_strength VARCHAR(100)"))

            # alerts
            res_a = conn.execute(text("PRAGMA table_info(alerts)")).fetchall()
            cols_a = [r[1] for r in res_a]
            if "product_id" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN product_id VARCHAR(100)"))
            if "serial_code" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN serial_code VARCHAR(100)"))
            if "batch_number" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN batch_number VARCHAR(100)"))
            if "medicine_name" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN medicine_name VARCHAR(255)"))
            if "alert_type" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN alert_type VARCHAR(100)"))
            if "action_url" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN action_url VARCHAR(255)"))
            if "recipient_name" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN recipient_name VARCHAR(255)"))

            # scans
            res_s = conn.execute(text("PRAGMA table_info(scans)")).fetchall()
            cols_s = [r[1] for r in res_s]
            if "product_unit_id" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN product_unit_id VARCHAR(100)"))
            if "serial_code" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN serial_code VARCHAR(100)"))
            if "retailer_id" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN retailer_id VARCHAR(100)"))
            if "retailer_name" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN retailer_name VARCHAR(255)"))
            if "database_result" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN database_result VARCHAR(100)"))
            if "expiry_result" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN expiry_result VARCHAR(100)"))
            if "verdict" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN verdict VARCHAR(100)"))

            conn.commit()
    except Exception as e:
        print(f"Table migration note: {e}")

    try:
        # Clear existing records for clean reset
        db.query(Alert).delete()
        db.query(FraudIncident).delete()
        db.query(Scan).delete()
        db.query(DestructionRecord).delete()
        db.query(Pickup).delete()
        db.query(ReturnRequest).delete()
        db.query(CustodyTransfer).delete()
        db.query(ProductUnit).delete()
        db.query(BatchEvent).delete()
        db.query(Batch).delete()
        db.query(Medicine).delete()
        db.query(User).delete()
        db.query(Organization).delete()
        db.commit()

        # 1. Organizations
        org_mfg_1 = Organization(
            name="ABC Pharma",
            type="MANUFACTURER",
            location="Vadodara, Gujarat"
        )
        org_mfg_2 = Organization(
            name="Cipla Therapeutics",
            type="MANUFACTURER",
            location="Kurkumbh, Maharashtra"
        )
        org_dist_1 = Organization(
            name="ABC Distribution",
            type="DISTRIBUTOR",
            location="Bengaluru Hub, Karnataka"
        )
        org_dist_2 = Organization(
            name="BlueDart Healthcare Logistics",
            type="DISTRIBUTOR",
            location="Mumbai Transit Hub, Maharashtra"
        )
        org_pharm_a = Organization(
            name="Pharmacy A",
            type="PHARMACY",
            location="Bengaluru, Karnataka"
        )
        org_pharm_b = Organization(
            name="Pharmacy B",
            type="PHARMACY",
            location="Bengaluru, Karnataka"
        )
        org_pharm_c = Organization(
            name="Pharmacy C",
            type="PHARMACY",
            location="Mumbai, Maharashtra"
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
            org_mfg_1, org_mfg_2,
            org_dist_1, org_dist_2,
            org_pharm_a, org_pharm_b, org_pharm_c,
            org_waste, org_regulator
        ])
        db.commit()

        # 2. Users (Role demo accounts)
        users = [
            User(
                name="Pharmacy A Staff",
                email="retailer@pharmaguard.io",
                role="RETAILER",
                organization="Pharmacy A",
                organization_id=org_pharm_a.id,
                location="Bengaluru, Karnataka"
            ),
            User(
                name="Pharmacy A Staff",
                email="pharmacy_a@pharmaguard.io",
                role="RETAILER",
                organization="Pharmacy A",
                organization_id=org_pharm_a.id,
                location="Bengaluru, Karnataka"
            ),
            User(
                name="Pharmacy B Staff",
                email="pharmacy_b@pharmaguard.io",
                role="RETAILER",
                organization="Pharmacy B",
                organization_id=org_pharm_b.id,
                location="Bengaluru, Karnataka"
            ),
            User(
                name="Pharmacy C Staff",
                email="pharmacy_c@pharmaguard.io",
                role="RETAILER",
                organization="Pharmacy C",
                organization_id=org_pharm_c.id,
                location="Mumbai, Maharashtra"
            ),
            User(
                name="ABC Distribution Dispatch",
                email="distributor@pharmaguard.io",
                role="DISTRIBUTOR",
                organization="ABC Distribution",
                organization_id=org_dist_1.id,
                location="Bengaluru Hub, Karnataka"
            ),
            User(
                name="ABC Pharma QA",
                email="manufacturer@pharmaguard.io",
                role="MANUFACTURER",
                organization="ABC Pharma",
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
            manufacturer="ABC Pharma",
            dosage="500mg",
            form="Tablet"
        )
        med_amx = Medicine(
            name="Amoxicillin 500mg",
            generic_name="Amoxicillin Trihydrate",
            brand_name="Mox 500",
            manufacturer="ABC Pharma",
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
            manufacturer="ABC Pharma",
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

        now = datetime.utcnow()

        # 4. Canonical Demo Batches
        batch_new_pcm = Batch(
            batch_number="PCM-BATCH-001",
            product_id="PG-PCM-2026-000001",
            qr_payload="PG-PCM-2026-000001",
            medicine_id=med_pcm.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=datetime(2024, 8, 15),
            expiry_date=datetime(2027, 8, 15),
            quantity=20,
            unit="STRIPS",
            status=BatchStatus.ASSIGNED_TO_RETAILER,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Pharmacy A",
            dosage_strength="500mg",
            manufacturer_name="ABC Pharma",
            current_location="Pharmacy A, Bengaluru"
        )

        batch_pcm_legacy = Batch(
            batch_number="PCM500123",
            product_id="PG-PCM-2026-500123",
            qr_payload="PG-PCM-2026-500123",
            medicine_id=med_pcm.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=datetime(2023, 8, 15),
            expiry_date=datetime(2026, 8, 15),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.EXPIRED,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Pharmacy A",
            dosage_strength="500mg",
            manufacturer_name="ABC Pharma",
            current_location="Pharmacy A, Bengaluru"
        )

        batch_amx = Batch(
            batch_number="AMX202401",
            medicine_id=med_amx.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=now - timedelta(days=365),
            expiry_date=now + timedelta(days=22),
            quantity=150,
            unit="STRIPS",
            status=BatchStatus.EXPIRING_SOON,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Pharmacy A",
            dosage_strength="500mg",
            manufacturer_name="ABC Pharma",
            current_location="Pharmacy A, Bengaluru"
        )

        batch_azi = Batch(
            batch_number="AZI202499",
            medicine_id=med_azi.id,
            manufacturer_id=org_mfg_2.id,
            manufacturing_date=now - timedelta(days=180),
            expiry_date=now + timedelta(days=52),
            quantity=80,
            unit="STRIPS",
            status=BatchStatus.ACTIVE,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Pharmacy A",
            dosage_strength="250mg",
            manufacturer_name="Cipla Therapeutics",
            current_location="Pharmacy A, Bengaluru"
        )

        batch_met = Batch(
            batch_number="MET202388",
            medicine_id=med_met.id,
            manufacturer_id=org_mfg_1.id,
            manufacturing_date=now - timedelta(days=90),
            expiry_date=now + timedelta(days=600),
            quantity=200,
            unit="STRIPS",
            status=BatchStatus.ACTIVE,
            original_retailer_id=org_pharm_b.id,
            assigned_retailer_name="Pharmacy B",
            dosage_strength="500mg",
            manufacturer_name="ABC Pharma",
            current_location="Pharmacy B, Bengaluru"
        )

        batch_pan = Batch(
            batch_number="PAN202377",
            medicine_id=med_pan.id,
            manufacturer_id=org_mfg_2.id,
            manufacturing_date=datetime(2023, 1, 1),
            expiry_date=datetime(2026, 8, 15),
            quantity=120,
            unit="STRIPS",
            status=BatchStatus.EXPIRED,
            original_retailer_id=org_pharm_a.id,
            assigned_retailer_name="Pharmacy A",
            dosage_strength="40mg",
            manufacturer_name="Cipla Therapeutics",
            current_location="Pharmacy A, Bengaluru"
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
            assigned_retailer_name="Pharmacy A",
            dosage_strength="500mg",
            manufacturer_name="ABC Pharma",
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
            assigned_retailer_name="Pharmacy A",
            dosage_strength="500mg",
            manufacturer_name="ABC Pharma",
            current_location="Pharmacy A, Bengaluru"
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
            current_location="Pharmacy B (Unauthorized)"
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
            assigned_retailer_name="Pharmacy A",
            current_location="Pharmacy A, Bengaluru"
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
            current_location="In Transit - ABC Distribution Van KA-01-EA-9022"
        )

        db.add_all([
            batch_new_pcm, batch_pcm_legacy, batch_amx, batch_azi, batch_met, batch_pan,
            batch_destroyed, batch_mismatch, batch_reentry, batch_return_req, batch_transit
        ])
        db.commit()

        # 5. Seed Serialized Units for PCM-BATCH-001 (Section AT & AU)
        # ABC Distribution receives 20 units:
        # Pharmacy A: 8 units (PG-PCM-2026-000001 .. 000008)
        # Pharmacy B: 7 units (PG-PCM-2026-000009 .. 000015)
        # Pharmacy C: 5 units (PG-PCM-2026-000016 .. 000020)
        product_units = []
        transfers = []

        for i in range(1, 21):
            s_code = f"PG-PCM-2026-{i:06d}"
            if i <= 8:
                r_id = org_pharm_a.id
                r_name = "Pharmacy A"
                loc = "Pharmacy A, Bengaluru"
            elif i <= 15:
                r_id = org_pharm_b.id
                r_name = "Pharmacy B"
                loc = "Pharmacy B, Bengaluru"
            else:
                r_id = org_pharm_c.id
                r_name = "Pharmacy C"
                loc = "Pharmacy C, Mumbai"

            qr_dict = {
                "product_id": s_code,
                "medicine_name": "Paracetamol",
                "strength": "500mg",
                "batch_number": "PCM-BATCH-001",
                "manufacturing_date": "2024-08-15",
                "expiry_date": "2027-08-15",
                "manufacturer": "ABC Pharma"
            }

            pu = ProductUnit(
                serial_code=s_code,
                medicine_id=med_pcm.id,
                batch_id=batch_new_pcm.id,
                batch_number="PCM-BATCH-001",
                dosage_strength="500mg",
                manufacturer_id=org_mfg_1.id,
                current_distributor_id=org_dist_1.id,
                current_retailer_id=r_id,
                current_holder_type="RETAILER",
                current_holder_id=r_id,
                current_holder_name=r_name,
                current_location=loc,
                qr_payload=json.dumps(qr_dict),
                product_status="ACTIVE",
                expiry_status="VALID",
                manufacturing_date=datetime(2024, 8, 15),
                expiry_date=datetime(2027, 8, 15)
            )
            product_units.append(pu)

            # Record Transfers:
            # Step 1: Manufacturer -> Distributor
            t1 = CustodyTransfer(
                product_unit_id=pu.id,
                serial_code=s_code,
                from_party_type="MANUFACTURER",
                from_party_id=org_mfg_1.id,
                from_party_name="ABC Pharma",
                to_party_type="DISTRIBUTOR",
                to_party_id=org_dist_1.id,
                to_party_name="ABC Distribution",
                transfer_type="DISPATCH",
                status="COMPLETED",
                timestamp=datetime(2024, 8, 16, 10, 0, 0),
                notes="Primary factory dispatch batch release."
            )
            # Step 2: Distributor -> Retailer
            t2 = CustodyTransfer(
                product_unit_id=pu.id,
                serial_code=s_code,
                from_party_type="DISTRIBUTOR",
                from_party_id=org_dist_1.id,
                from_party_name="ABC Distribution",
                to_party_type="RETAILER",
                to_party_id=r_id,
                to_party_name=r_name,
                transfer_type="DELIVERY",
                status="COMPLETED",
                timestamp=datetime(2024, 8, 18, 14, 30, 0),
                notes=f"Delivered to {r_name} in good condition."
            )
            transfers.extend([t1, t2])

        # 6. Additional Demo Product Units
        # Demo 1: Expiring Soon (PG-AMX-2026-000101 at Pharmacy A)
        pu_exp_soon = ProductUnit(
            serial_code="PG-AMX-2026-000101",
            medicine_id=med_amx.id,
            batch_id=batch_amx.id,
            batch_number="AMX202401",
            dosage_strength="500mg",
            manufacturer_id=org_mfg_1.id,
            current_distributor_id=org_dist_1.id,
            current_retailer_id=org_pharm_a.id,
            current_holder_type="RETAILER",
            current_holder_id=org_pharm_a.id,
            current_holder_name="Pharmacy A",
            current_location="Pharmacy A, Bengaluru",
            qr_payload=json.dumps({
                "product_id": "PG-AMX-2026-000101",
                "medicine_name": "Amoxicillin",
                "strength": "500mg",
                "batch_number": "AMX202401",
                "manufacturing_date": (now - timedelta(days=365)).strftime("%Y-%m-%d"),
                "expiry_date": (now + timedelta(days=22)).strftime("%Y-%m-%d"),
                "manufacturer": "ABC Pharma"
            }),
            product_status="ACTIVE",
            expiry_status="EXPIRING_SOON",
            manufacturing_date=now - timedelta(days=365),
            expiry_date=now + timedelta(days=22)
        )
        product_units.append(pu_exp_soon)

        # Demo 2: Expired Product (PG-PAN-2026-000201 at Pharmacy A)
        pu_expired = ProductUnit(
            serial_code="PG-PAN-2026-000201",
            medicine_id=med_pan.id,
            batch_id=batch_pan.id,
            batch_number="PAN202377",
            dosage_strength="40mg",
            manufacturer_id=org_mfg_2.id,
            current_distributor_id=org_dist_1.id,
            current_retailer_id=org_pharm_a.id,
            current_holder_type="RETAILER",
            current_holder_id=org_pharm_a.id,
            current_holder_name="Pharmacy A",
            current_location="Pharmacy A, Bengaluru",
            qr_payload=json.dumps({
                "product_id": "PG-PAN-2026-000201",
                "medicine_name": "Pantoprazole",
                "strength": "40mg",
                "batch_number": "PAN202377",
                "manufacturing_date": "2023-01-01",
                "expiry_date": "2026-08-15",
                "manufacturer": "Cipla Therapeutics"
            }),
            product_status="EXPIRED",
            expiry_status="EXPIRED",
            manufacturing_date=datetime(2023, 1, 1),
            expiry_date=datetime(2026, 8, 15)
        )
        product_units.append(pu_expired)

        # Demo 3: Tampered Label (PG-AMX-2026-888777 at Pharmacy A)
        pu_tampered = ProductUnit(
            serial_code="PG-AMX-2026-888777",
            medicine_id=med_amx.id,
            batch_id=batch_mismatch.id,
            batch_number="AMX888777",
            dosage_strength="500mg",
            manufacturer_id=org_mfg_1.id,
            current_distributor_id=org_dist_1.id,
            current_retailer_id=org_pharm_a.id,
            current_holder_type="RETAILER",
            current_holder_id=org_pharm_a.id,
            current_holder_name="Pharmacy A",
            current_location="Pharmacy A, Bengaluru",
            qr_payload="PG-AMX-2026-888777",
            product_status="SUSPICIOUS",
            expiry_status="TAMPERED",
            manufacturing_date=now - timedelta(days=400),
            expiry_date=now - timedelta(days=30)
        )
        product_units.append(pu_tampered)

        # Demo 4: Destroyed / Closed Serial (PG-PCM-2026-999888 / PCM999888)
        pu_destroyed = ProductUnit(
            serial_code="PG-PCM-2026-999888",
            medicine_id=med_pcm.id,
            batch_id=batch_destroyed.id,
            batch_number="PCM999888",
            dosage_strength="500mg",
            manufacturer_id=org_mfg_1.id,
            current_distributor_id=org_dist_1.id,
            current_retailer_id=org_pharm_a.id,
            current_holder_type="WASTE_FACILITY",
            current_holder_id=org_waste.id,
            current_holder_name="EcoSafe Bio-Medical Destruction Facility",
            current_location="EcoSafe Bio-Medical Destruction Facility",
            qr_payload="PG-PCM-2026-999888",
            product_status="CLOSED",
            expiry_status="EXPIRED",
            manufacturing_date=now - timedelta(days=900),
            expiry_date=now - timedelta(days=180)
        )
        product_units.append(pu_destroyed)

        db.add_all(product_units)
        db.add_all(transfers)
        db.commit()

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
        db.commit()

        # 8. Seed Expiry Dual Alerts for Expiring & Expired items
        alert_exp_ret = Alert(
            product_id=pu_exp_soon.id,
            serial_code=pu_exp_soon.serial_code,
            batch_number=pu_exp_soon.batch_number,
            medicine_name="Amoxicillin 500mg",
            alert_type="EXPIRING_SOON",
            recipient_role="RETAILER",
            recipient_name="Pharmacy A",
            severity="MEDIUM",
            message=f"MEDICINE EXPIRING SOON: Amoxicillin 500mg (Serial: {pu_exp_soon.serial_code}) expires on {pu_exp_soon.expiry_date.strftime('%d/%m/%Y')}. Plan reverse return before shelf-life ends.",
            action_url=f"/retailer/medicines/{pu_exp_soon.serial_code}",
            read=False,
            created_at=now - timedelta(hours=8)
        )
        alert_exp_mfg = Alert(
            product_id=pu_exp_soon.id,
            serial_code=pu_exp_soon.serial_code,
            batch_number=pu_exp_soon.batch_number,
            medicine_name="Amoxicillin 500mg",
            alert_type="EXPIRING_SOON",
            recipient_role="MANUFACTURER",
            recipient_name="ABC Pharma",
            severity="MEDIUM",
            message=f"PRODUCT EXPIRY ALERT: Amoxicillin 500mg (Serial: {pu_exp_soon.serial_code}) approaching expiry at Pharmacy A via ABC Distribution.",
            action_url=f"/manufacturer/products/{pu_exp_soon.serial_code}",
            read=False,
            created_at=now - timedelta(hours=8)
        )

        alert_exp_dead_ret = Alert(
            product_id=pu_expired.id,
            serial_code=pu_expired.serial_code,
            batch_number=pu_expired.batch_number,
            medicine_name="Pantoprazole 40mg",
            alert_type="EXPIRED",
            recipient_role="RETAILER",
            recipient_name="Pharmacy A",
            severity="HIGH",
            message=f"MEDICINE EXPIRED: Pantoprazole 40mg (Serial: {pu_expired.serial_code}) expired on {pu_expired.expiry_date.strftime('%d/%m/%Y')}. DO NOT SELL. RETURN REQUIRED.",
            action_url=f"/retailer/medicines/{pu_expired.serial_code}",
            read=False,
            created_at=now - timedelta(hours=6)
        )
        alert_exp_dead_mfg = Alert(
            product_id=pu_expired.id,
            serial_code=pu_expired.serial_code,
            batch_number=pu_expired.batch_number,
            medicine_name="Pantoprazole 40mg",
            alert_type="EXPIRED",
            recipient_role="MANUFACTURER",
            recipient_name="Cipla Therapeutics",
            severity="HIGH",
            message=f"PRODUCT EXPIRED AT RETAILER: Pantoprazole 40mg (Serial: {pu_expired.serial_code}) expired at Pharmacy A. Reverse return expected.",
            action_url=f"/manufacturer/products/{pu_expired.serial_code}",
            read=False,
            created_at=now - timedelta(hours=6)
        )

        db.add_all([alert_exp_ret, alert_exp_mfg, alert_exp_dead_ret, alert_exp_dead_mfg])
        db.commit()

        # 9. Seed Re-entry Incident & Regulator Alert for PCM999888
        incident_pcm = FraudIncident(
            batch_id=batch_destroyed.id,
            incident_type="REENTRY_FRAUD",
            risk_score=95,
            severity="CRITICAL",
            description="Serial PG-PCM-2026-999888 (Batch PCM999888), certified destroyed at EcoSafe Bio-Medical Facility, scanned at retail counter.",
            detected_at=now - timedelta(hours=2),
            detected_by="PharmaGuard Compliance Engine",
            status="OPEN",
            evidence=json.dumps({
                "serial_code": "PG-PCM-2026-999888",
                "product_id": "PG-PCM-2026-999888",
                "batch_number": "PCM999888",
                "original_status": "DESTRUCTION_VERIFIED",
                "attempted_location": "Pharmacy A",
                "scanner_role": "RETAILER"
            }),
            assigned_to="CDSCO Enforcement Division - South Zone"
        )
        db.add(incident_pcm)
        db.commit()

        alert_pcm_reg = Alert(
            incident_id=incident_pcm.id,
            serial_code="PG-PCM-2026-999888",
            batch_number="PCM999888",
            medicine_name="Paracetamol 500mg",
            alert_type="RE_ENTRY_FRAUD",
            recipient_role="REGULATOR",
            severity="CRITICAL",
            message="CRITICAL RE-ENTRY FRAUD: Destroyed Batch PCM999888 / Serial PG-PCM-2026-999888 scanned at Pharmacy A.",
            read=False,
            created_at=now - timedelta(hours=2)
        )
        alert_pcm_ret = Alert(
            incident_id=incident_pcm.id,
            serial_code="PG-PCM-2026-999888",
            batch_number="PCM999888",
            medicine_name="Paracetamol 500mg",
            alert_type="RE_ENTRY_FRAUD",
            recipient_role="RETAILER",
            recipient_name="Pharmacy A",
            severity="CRITICAL",
            message="🚨 CRITICAL: Serial PG-PCM-2026-999888 was certified destroyed. DO NOT ACCEPT OR DISPENSE.",
            read=False,
            created_at=now - timedelta(hours=2)
        )
        alert_pcm_mfg = Alert(
            incident_id=incident_pcm.id,
            serial_code="PG-PCM-2026-999888",
            batch_number="PCM999888",
            medicine_name="Paracetamol 500mg",
            alert_type="RE_ENTRY_FRAUD",
            recipient_role="MANUFACTURER",
            recipient_name="ABC Pharma",
            severity="CRITICAL",
            message="CRITICAL ALERT: Serial PG-PCM-2026-999888 resurfaced after destruction. Regulatory investigation underway.",
            read=False,
            created_at=now - timedelta(hours=2)
        )
        db.add_all([alert_pcm_reg, alert_pcm_ret, alert_pcm_mfg])
        db.commit()

        # 10. Seed Initial Scans
        scans = [
            Scan(
                batch_id=batch_destroyed.id,
                batch_number="PCM999888",
                serial_code="PG-PCM-2026-999888",
                scanner_role="RETAILER",
                location="Pharmacy A, Bengaluru",
                retailer_name="Pharmacy A",
                scan_type="QR+OCR",
                qr_data="PG-PCM-2026-999888",
                timestamp=now - timedelta(hours=2),
                verification_result="REENTRY_DETECTED",
                risk_score=95,
                reasons_json=json.dumps({
                    "incident_type": "REENTRY_DETECTED",
                    "severity": "CRITICAL",
                    "serial_code": "PG-PCM-2026-999888",
                    "recommendation": "DO NOT ACCEPT OR DISPENSE: Previously destroyed batch re-entry detected."
                })
            ),
            Scan(
                batch_id=batch_new_pcm.id,
                batch_number="PCM-BATCH-001",
                serial_code="PG-PCM-2026-000001",
                scanner_role="RETAILER",
                location="Pharmacy A, Bengaluru",
                retailer_name="Pharmacy A",
                scan_type="QR",
                qr_data="PG-PCM-2026-000001",
                timestamp=now - timedelta(days=1),
                verification_result="VERIFIED",
                risk_score=5,
                reasons_json=json.dumps({
                    "incident_type": "VERIFIED",
                    "severity": "LOW",
                    "serial_code": "PG-PCM-2026-000001",
                    "recommendation": "Package verified and compliant."
                })
            )
        ]
        db.add_all(scans)
        db.commit()

        print("Database seeded successfully with PharmaGuard canonical dataset (20 serialized units for PCM-BATCH-001, demo accounts, alerts, and fraud scenarios).")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
