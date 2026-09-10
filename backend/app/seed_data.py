from datetime import datetime, timedelta
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

        # 1. Canonical Organizations
        org_retailer = Organization(
            name="Shree Medicals",
            type="PHARMACY",
            location="Bengaluru, Karnataka"
        )
        org_distributor = Organization(
            name="MedLink Distributors",
            type="DISTRIBUTOR",
            location="Bengaluru Transit Hub, Karnataka"
        )
        org_manufacturer = Organization(
            name="BharatCure Pharma",
            type="MANUFACTURER",
            location="Vadodara, Gujarat"
        )
        org_waste = Organization(
            name="GreenShield Biomedical Waste Services",
            type="WASTE_FACILITY",
            location="Hosur Industrial Zone, Tamil Nadu"
        )
        org_regulator = Organization(
            name="State Drug Controller",
            type="REGULATOR",
            location="Central Regulatory Office, New Delhi"
        )

        db.add_all([
            org_retailer, org_distributor, org_manufacturer,
            org_waste, org_regulator
        ])
        db.commit()

        # 2. Canonical Users (The 5 Personas)
        users = [
            User(
                name="Guna",
                email="guna@shreemedicals.com",
                role="RETAILER",
                organization="Shree Medicals",
                organization_id=org_retailer.id,
                location="Bengaluru, Karnataka"
            ),
            User(
                name="Senthil",
                email="senthil@medlink.com",
                role="DISTRIBUTOR",
                organization="MedLink Distributors",
                organization_id=org_distributor.id,
                location="Bengaluru Transit Hub, Karnataka"
            ),
            User(
                name="Rajan",
                email="rajan@bharatcure.com",
                role="MANUFACTURER",
                organization="BharatCure Pharma",
                organization_id=org_manufacturer.id,
                location="Vadodara, Gujarat"
            ),
            User(
                name="Anbu",
                email="anbu@greenshield.com",
                role="WASTE_FACILITY",
                organization="GreenShield Biomedical Waste Services",
                organization_id=org_waste.id,
                location="Hosur Industrial Zone, Tamil Nadu"
            ),
            User(
                name="Chandra",
                email="chandra@statedrugcontroller.gov.in",
                role="REGULATOR",
                organization="State Drug Controller",
                organization_id=org_regulator.id,
                location="Central Office, New Delhi"
            )
        ]
        db.add_all(users)
        db.commit()

        # 3. Canonical Medicines
        med_cardio = Medicine(
            name="CardioSafe 10 mg Tablets",
            generic_name="Atorvastatin IP",
            brand_name="CardioSafe 10mg",
            manufacturer="BharatCure Pharma",
            dosage="10mg",
            form="Tablet"
        )
        med_glyco = Medicine(
            name="GlycoNorm 500 mg Tablets",
            generic_name="Metformin Hydrochloride IP",
            brand_name="GlycoNorm 500",
            manufacturer="BharatCure Pharma",
            dosage="500mg",
            form="Tablet"
        )
        med_respi = Medicine(
            name="RespiClear 250 mg Capsules",
            generic_name="Azithromycin IP",
            brand_name="RespiClear 250",
            manufacturer="BharatCure Pharma",
            dosage="250mg",
            form="Capsule"
        )
        med_gastro = Medicine(
            name="GastroShield 40 mg Tablets",
            generic_name="Pantoprazole Sodium IP",
            brand_name="GastroShield 40",
            manufacturer="BharatCure Pharma",
            dosage="40mg",
            form="Tablet"
        )
        med_pcm = Medicine(
            name="Paracetamol 500mg Tablets",
            generic_name="Paracetamol IP",
            brand_name="Calpol 500",
            manufacturer="BharatCure Pharma",
            dosage="500mg",
            form="Tablet"
        )
        db.add_all([med_cardio, med_glyco, med_respi, med_gastro, med_pcm])
        db.commit()

        now = datetime.utcnow()

        # 4. Canonical Batches
        # Primary Demo Batch: CS10-A23-2507 (Expired, initiates return)
        batch_cs10 = Batch(
            batch_number="CS10-A23-2507",
            product_id="PG-CS10-2026-A232507",
            qr_payload="PG-CS10-2026-A232507",
            medicine_id=med_cardio.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=datetime(2025, 7, 15),
            expiry_date=datetime(2026, 7, 15), # Expired on 15 Jul 2026
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.EXPIRED,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="10mg",
            manufacturer_name="BharatCure Pharma",
            current_location="Shree Medicals, Bengaluru"
        )

        # Batch Safe: CS10-SAFE (Valid shelf life: expires in ~142 days)
        batch_safe = Batch(
            batch_number="CS10-SAFE",
            product_id="PG-CS10-2027-009841",
            qr_payload="PG-CS10-2027-009841",
            medicine_id=med_cardio.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=now - timedelta(days=200),
            expiry_date=now + timedelta(days=142), # Expires in 142 days
            quantity=150,
            unit="STRIPS",
            status=BatchStatus.ACTIVE,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="10mg",
            manufacturer_name="BharatCure Pharma",
            current_location="Shree Medicals, Bengaluru"
        )

        # Batch Expiring Soon: CS10-EXP18 (Expires in 18 days)
        batch_expiring = Batch(
            batch_number="CS10-EXP18",
            product_id="PG-CS10-2026-004412",
            qr_payload="PG-CS10-2026-004412",
            medicine_id=med_cardio.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=now - timedelta(days=340),
            expiry_date=now + timedelta(days=18), # Expires in 18 days
            quantity=80,
            unit="STRIPS",
            status=BatchStatus.EXPIRING_SOON,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="10mg",
            manufacturer_name="BharatCure Pharma",
            current_location="Shree Medicals, Bengaluru"
        )

        # Batch In Transit: CS10-B14-9921
        batch_transit = Batch(
            batch_number="CS10-B14-9921",
            product_id="PG-CS10-2026-003319",
            qr_payload="PG-CS10-2026-003319",
            medicine_id=med_glyco.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=now - timedelta(days=400),
            expiry_date=now - timedelta(days=12),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.IN_TRANSIT,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="500mg",
            manufacturer_name="BharatCure Pharma",
            current_location="In Transit - MedLink Fleet Van KA-04-E-8821"
        )

        # Batch in Quarantine: CS10-C32-8812
        batch_quarantine = Batch(
            batch_number="CS10-C32-8812",
            product_id="PG-CS10-2026-007721",
            qr_payload="PG-CS10-2026-007721",
            medicine_id=med_respi.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=now - timedelta(days=500),
            expiry_date=now - timedelta(days=20),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.RECEIVED_BY_MANUFACTURER,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="250mg",
            manufacturer_name="BharatCure Pharma",
            current_location="BharatCure Pharma - Quarantine Bay 2"
        )

        # Batch Destroyed (For Re-Entry Fraud Demo): CS10-D99-0089 and PCM999888 alias
        batch_destroyed = Batch(
            batch_number="CS10-D99-0089",
            product_id="PG-CS10-2026-009988",
            qr_payload="PG-CS10-2026-009988",
            medicine_id=med_cardio.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=datetime(2024, 6, 10),
            expiry_date=datetime(2026, 6, 10),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.DESTRUCTION_VERIFIED,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="10mg",
            manufacturer_name="BharatCure Pharma",
            current_location="GreenShield Biomedical Waste Services - Incinerator Chamber"
        )

        # Backward compatibility alias for PCM500123
        batch_pcm = Batch(
            batch_number="PCM500123",
            product_id="PG-PCM-2026-500123",
            qr_payload="PG-PCM-2026-500123",
            medicine_id=med_pcm.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=datetime(2023, 8, 15),
            expiry_date=datetime(2026, 8, 15),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.EXPIRED,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="500mg",
            manufacturer_name="BharatCure Pharma",
            current_location="Shree Medicals, Bengaluru"
        )

        # Backward compatibility alias for PCM999888
        batch_pcm_dest = Batch(
            batch_number="PCM999888",
            product_id="PG-PCM-2026-999888",
            qr_payload="PG-PCM-2026-999888",
            medicine_id=med_pcm.id,
            manufacturer_id=org_manufacturer.id,
            manufacturing_date=now - timedelta(days=900),
            expiry_date=now - timedelta(days=180),
            quantity=100,
            unit="STRIPS",
            status=BatchStatus.DESTRUCTION_VERIFIED,
            original_retailer_id=org_retailer.id,
            assigned_retailer_name="Shree Medicals",
            dosage_strength="500mg",
            manufacturer_name="BharatCure Pharma",
            current_location="GreenShield Biomedical Waste Services"
        )

        db.add_all([
            batch_cs10, batch_safe, batch_expiring, batch_transit,
            batch_quarantine, batch_destroyed, batch_pcm, batch_pcm_dest
        ])
        db.commit()

        # 5. Seed Lifecycle Events for CS10-A23-2507
        events_cs10 = [
            BatchEvent(
                batch_id=batch_cs10.id,
                event_type="BATCH_REGISTERED",
                actor_id=users[2].id,
                actor_name="Rajan (BharatCure QA)",
                organization_id=org_manufacturer.id,
                organization_name="BharatCure Pharma",
                location="Vadodara Plant, Gujarat",
                quantity=100,
                timestamp=now - timedelta(days=400),
                metadata_json=json.dumps({"lot": "CS10-L45", "release_tested": True})
            ),
            BatchEvent(
                batch_id=batch_cs10.id,
                event_type="DISTRIBUTED_TO_RETAILER",
                actor_id=users[1].id,
                actor_name="Senthil (MedLink Logistics)",
                organization_id=org_distributor.id,
                organization_name="MedLink Distributors",
                location="Bengaluru Transit Hub, Karnataka",
                quantity=100,
                timestamp=now - timedelta(days=385),
                metadata_json=json.dumps({"manifest_id": "MLD-88219"})
            ),
            BatchEvent(
                batch_id=batch_cs10.id,
                event_type="RECEIVED_AT_PHARMACY",
                actor_id=users[0].id,
                actor_name="Guna (Pharmacist)",
                organization_id=org_retailer.id,
                organization_name="Shree Medicals",
                location="Bengaluru, Karnataka",
                quantity=100,
                timestamp=now - timedelta(days=380)
            ),
            BatchEvent(
                batch_id=batch_cs10.id,
                event_type="EXPIRED_MARKED",
                actor_id=users[0].id,
                actor_name="PharmaGuard Compliance Monitor",
                organization_id=org_retailer.id,
                organization_name="Shree Medicals",
                location="Shree Medicals, Bengaluru",
                quantity=100,
                timestamp=now - timedelta(days=27),
                metadata_json=json.dumps({"reason": "Expiry date reached. Return mandatory under Section 18-B."})
            )
        ]
        db.add_all(events_cs10)

        # 6. Seed Lifecycle Events & Destruction for CS10-D99-0089 (Certificate DC-00891)
        events_destroyed = [
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="BATCH_REGISTERED",
                actor_name="Rajan",
                organization_name="BharatCure Pharma",
                location="Vadodara, Gujarat",
                quantity=100,
                timestamp=now - timedelta(days=300)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="RETURN_REQUESTED",
                actor_name="Guna",
                organization_name="Shree Medicals",
                location="Bengaluru",
                quantity=100,
                timestamp=now - timedelta(days=90)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="PICKUP_CONFIRMED",
                actor_name="Senthil",
                organization_name="MedLink Distributors",
                location="Bengaluru Transit Hub",
                quantity=100,
                weight=4.8,
                timestamp=now - timedelta(days=80)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="RECEIVED_BY_MANUFACTURER",
                actor_name="Rajan",
                organization_name="BharatCure Pharma",
                location="Vadodara Quarantine Bay",
                quantity=100,
                timestamp=now - timedelta(days=70)
            ),
            BatchEvent(
                batch_id=batch_destroyed.id,
                event_type="DESTRUCTION_VERIFIED",
                actor_name="Anbu",
                organization_name="GreenShield Biomedical Waste Services",
                location="Hosur Industrial Zone, Tamil Nadu",
                quantity=100,
                timestamp=now - timedelta(days=60),
                metadata_json=json.dumps({
                    "certificate_number": "DC-00891",
                    "method": "HIGH_TEMP_INCINERATION_VERIFIED",
                    "facility": "GreenShield Biomedical Waste Services"
                })
            )
        ]
        db.add_all(events_destroyed)

        # 7. Destruction Record for DC-00891
        dest_record = DestructionRecord(
            batch_id=batch_destroyed.id,
            manufacturer_id=org_manufacturer.id,
            waste_facility_id=org_waste.id,
            waste_facility_name="GreenShield Biomedical Waste Services",
            certificate_number="DC-00891",
            destruction_date=now - timedelta(days=60),
            destroyed_quantity=100,
            certificate_url="/certificates/DC-00891.pdf",
            verification_status="VERIFIED"
        )
        db.add(dest_record)

        # 8. Seed Pending Return Request (RET-00125)
        return_req_125 = ReturnRequest(
            id="RET-00125",
            batch_id=batch_cs10.id,
            retailer_id=users[0].id,
            retailer_name="Shree Medicals",
            quantity=100,
            reason="Expired stock",
            status="PENDING_PICKUP",
            created_at=now - timedelta(hours=2)
        )
        db.add(return_req_125)

        # Return request in transit with MedLink
        return_req_transit = ReturnRequest(
            id="RET-00124",
            batch_id=batch_transit.id,
            retailer_id=users[0].id,
            retailer_name="Shree Medicals",
            quantity=100,
            reason="Expired stock",
            status="PICKED_UP",
            created_at=now - timedelta(days=2)
        )
        db.add(return_req_transit)

        # Seed Pickup Record for RET-00124
        pickup_transit = Pickup(
            return_request_id=return_req_transit.id,
            distributor_id=users[1].id,
            distributor_name="MedLink Distributors",
            expected_quantity=100,
            actual_quantity=100,
            actual_weight=4.8,
            pickup_time=now - timedelta(days=1),
            status="CONFIRMED"
        )
        db.add(pickup_transit)

        # 9. Seed Critical Fraud Incident for Re-entry
        incident_reentry = FraudIncident(
            batch_id=batch_destroyed.id,
            incident_type="REENTRY_FRAUD",
            risk_score=98,
            severity="CRITICAL",
            description="RE-ENTRY DETECTED: Batch CS10-A23-2507 / CS10-D99-0089 (CardioSafe 10 mg Tablets), verified destroyed at GreenShield Biomedical Waste Services under Certificate DC-00891, re-scanned at pharmacy retail counter.",
            detected_at=now - timedelta(hours=1),
            detected_by="PharmaGuard Compliance Engine",
            status="OPEN",
            evidence=json.dumps({
                "batch_number": "CS10-A23-2507",
                "lifecycle_status": "DESTROYED",
                "facility": "GreenShield Biomedical Waste Services",
                "certificate_number": "DC-00891",
                "current_location": "Unauthorized Retail Counter",
                "action": "DO_NOT_DISPENSE"
            }),
            assigned_to="Chandra (State Drug Controller)"
        )
        db.add(incident_reentry)
        db.commit()

        # Seed Alerts
        alert_regulator = Alert(
            incident_id=incident_reentry.id,
            recipient_role="REGULATOR",
            severity="CRITICAL",
            message="CRITICAL COMPLIANCE ALERT: Destroyed Batch CS10-A23-2507 scanned in distribution. Lifecycle Certificate DC-00891 violated. Immediate interception required.",
            read=False,
            created_at=now - timedelta(hours=1)
        )
        alert_mfg = Alert(
            incident_id=incident_reentry.id,
            recipient_role="MANUFACTURER",
            severity="CRITICAL",
            message="FRAUD ALERT: Batch CS10-A23-2507 destroyed under Certificate DC-00891 has re-entered the reverse supply chain.",
            read=False,
            created_at=now - timedelta(hours=1)
        )
        alert_retailer = Alert(
            incident_id=incident_reentry.id,
            recipient_role="RETAILER",
            severity="CRITICAL",
            message="WARNING: Batch CS10-A23-2507 flagged for illicit re-entry. DO NOT DISPENSE. Quarantine stock immediately.",
            read=False,
            created_at=now - timedelta(hours=1)
        )
        db.add_all([alert_regulator, alert_mfg, alert_retailer])
        db.commit()

        print("PharmaGuard authoritative compliance database seeded successfully.")
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
