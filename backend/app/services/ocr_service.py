import re
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Batch, Medicine

class OCRService:
    @staticmethod
    def parse_date_string(date_str: str) -> Optional[datetime]:
        """
        Parses various date formats commonly seen on pharmaceutical labels:
        e.g., '15/08/2026', '15-08-2026', '08/2026', '2026-08-15'
        """
        if not date_str:
            return None
        cleaned = date_str.strip()
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d",
            "%m/%Y", "%m-%Y", "%b %Y", "%B %Y"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(cleaned, fmt)
            except ValueError:
                continue
        return None

    @classmethod
    def analyze_package_image(
        cls,
        db: Session,
        image_bytes: Optional[bytes] = None,
        image_name: Optional[str] = None,
        override_batch_number: Optional[str] = None,
        printed_expiry_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyzes medicine package imagery.
        Includes demo intelligence with realistic visual bounding boxes and date reconciliation.
        """
        # Default mock extraction for demo robustness
        batch_no = override_batch_number or "PCM500123"
        
        # Check if the query refers to a tampered package demo
        is_tampered_demo = False
        if image_name and ("tamper" in image_name.lower() or "fraud" in image_name.lower()):
            is_tampered_demo = True
        elif printed_expiry_override and "2028" in printed_expiry_override:
            is_tampered_demo = True

        batch = db.query(Batch).filter(Batch.batch_number == batch_no).first()
        
        if batch:
            med_name = batch.medicine.name if batch.medicine else "Paracetamol 500mg"
            mfg_date_str = batch.manufacturing_date.strftime("%d/%m/%Y")
            reg_exp_date_str = batch.expiry_date.strftime("%d/%m/%Y")
            manufacturer_name = batch.medicine.manufacturer if batch.medicine else "Cipla Healthcare Ltd."
        else:
            med_name = "Paracetamol 500mg"
            mfg_date_str = "15/08/2023"
            reg_exp_date_str = "15/08/2026"
            manufacturer_name = "Cipla Healthcare Ltd."

        # In tampered scenario: printed expiry is extended to 2028!
        if is_tampered_demo or (printed_expiry_override and printed_expiry_override != reg_exp_date_str):
            printed_exp_date_str = printed_expiry_override or "15/08/2028"
            is_tampered = True
            tampering_desc = (
                f"Printed expiry date '{printed_exp_date_str}' contradicts manufacturer-registered "
                f"expiry date '{reg_exp_date_str}'. Potential fraudulent shelf-life extension."
            )
        else:
            printed_exp_date_str = printed_expiry_override or reg_exp_date_str
            is_tampered = False
            tampering_desc = None

        bounding_boxes = [
            {
                "label": "MEDICINE_NAME",
                "text": med_name,
                "confidence": 0.98,
                "box": [45, 30, 320, 75]
            },
            {
                "label": "BATCH_NUMBER",
                "text": f"B.No: {batch_no}",
                "confidence": 0.97,
                "box": [50, 110, 240, 145]
            },
            {
                "label": "MFG_DATE",
                "text": f"MFG: {mfg_date_str}",
                "confidence": 0.96,
                "box": [50, 160, 220, 190]
            },
            {
                "label": "EXP_DATE",
                "text": f"EXP: {printed_exp_date_str}",
                "confidence": 0.94 if not is_tampered else 0.89,
                "box": [50, 205, 230, 240],
                "tampered": is_tampered
            },
            {
                "label": "MANUFACTURER",
                "text": f"Mfd by: {manufacturer_name}",
                "confidence": 0.95,
                "box": [50, 260, 350, 290]
            }
        ]

        return {
            "extracted_batch_number": batch_no,
            "extracted_expiry_date": printed_exp_date_str,
            "extracted_mfg_date": mfg_date_str,
            "extracted_medicine_name": med_name,
            "extracted_manufacturer": manufacturer_name,
            "registered_expiry_date": reg_exp_date_str,
            "is_tampered": is_tampered,
            "tampering_description": tampering_desc,
            "confidence_score": 0.96,
            "bounding_boxes": bounding_boxes
        }
