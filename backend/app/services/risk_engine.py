from typing import List, Dict, Any, Tuple
from datetime import datetime
from app.core.state_machine import BatchStatus

class RiskEngine:
    # Rule engine scoring constants specified in Section 11
    SCORE_DESTROYED_REENTRY = 50
    SCORE_EXPIRY_MISMATCH = 30
    SCORE_CERTIFICATE_MISMATCH = 30
    SCORE_QUANTITY_MISMATCH = 20
    SCORE_DUPLICATE_SCAN = 20
    SCORE_SUPPLY_CHAIN_ANOMALY = 20
    SCORE_UNEXPECTED_RETAILER = 15
    SCORE_UNEXPECTED_LOCATION = 15
    SCORE_LONG_HANDOFF_DELAY = 10

    @classmethod
    def calculate_severity(cls, score: int) -> str:
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 30:
            return "MEDIUM"
        return "LOW"

    @classmethod
    def evaluate_signals(
        cls,
        batch_exists: bool,
        is_destroyed_or_closed: bool,
        expiry_mismatch: bool = False,
        certificate_mismatch: bool = False,
        quantity_mismatch: bool = False,
        duplicate_scan: bool = False,
        unexpected_retailer: bool = False,
        unexpected_location: bool = False,
        long_delay: bool = False,
        ml_anomaly: bool = False,
        is_expired: bool = False
    ) -> Dict[str, Any]:
        """
        Deterministic multi-signal risk calculation.
        Rule engine is authoritative for compliance decisions.
        """
        score = 0
        reasons: List[str] = []
        checks = {
            "batch_exists": batch_exists,
            "qr_valid": batch_exists,
            "status_valid": not is_destroyed_or_closed,
            "label_integrity": not expiry_mismatch,
            "location_valid": not unexpected_location,
            "retailer_authorized": not unexpected_retailer,
            "quantity_consistent": not quantity_mismatch,
            "scan_frequency_normal": not duplicate_scan
        }

        if not batch_exists:
            score += 50
            reasons.append("Unregistered batch number — counterfeit or untracked medicine")
            checks["qr_valid"] = False

        if is_destroyed_or_closed:
            score += cls.SCORE_DESTROYED_REENTRY
            reasons.append("Destroyed batch re-entry detected — previously verified as destroyed")
            checks["status_valid"] = False

        if expiry_mismatch:
            score += cls.SCORE_EXPIRY_MISMATCH
            reasons.append("Expiry-date label tampering — printed package expiry differs from registered database")
            checks["label_integrity"] = False

        if certificate_mismatch:
            score += cls.SCORE_CERTIFICATE_MISMATCH
            reasons.append("Destruction certificate discrepancy or unauthorized waste facility")

        if quantity_mismatch:
            score += cls.SCORE_QUANTITY_MISMATCH
            reasons.append("Quantity mismatch during supply chain handoff")
            checks["quantity_consistent"] = False

        if duplicate_scan:
            score += cls.SCORE_DUPLICATE_SCAN
            reasons.append("Duplicate scan anomaly at separate geographical nodes")
            checks["scan_frequency_normal"] = False

        if unexpected_retailer:
            score += cls.SCORE_UNEXPECTED_RETAILER
            reasons.append("Batch scanned at an unexpected pharmacy not in original distribution manifest")
            checks["retailer_authorized"] = False

        if unexpected_location:
            score += cls.SCORE_UNEXPECTED_LOCATION
            reasons.append("Geographic anomaly — batch detected outside registered supply corridor")
            checks["location_valid"] = False

        if long_delay:
            score += cls.SCORE_LONG_HANDOFF_DELAY
            reasons.append("Unusual delay in reverse logistics transit")

        if ml_anomaly:
            score += cls.SCORE_SUPPLY_CHAIN_ANOMALY
            reasons.append("ML Isolation Forest flagged reverse logistics behavioral anomaly")

        if is_expired and not is_destroyed_or_closed:
            reasons.append("Batch is past registered expiry date — eligible for reverse return only")

        # Clamp score between 0 and 100
        score = min(100, max(0, score))
        severity = cls.calculate_severity(score)

        if score >= 60 or is_destroyed_or_closed or expiry_mismatch:
            result = "FRAUD"
            recommendation = "🚨 DO NOT ACCEPT OR DISPENSE. Batch flagged for quarantine and regulator investigation."
        elif score >= 30:
            result = "SUSPICIOUS"
            recommendation = "⚠️ HOLD FOR AUDIT. Review chain of custody and package condition before proceeding."
        else:
            result = "VERIFIED"
            recommendation = "✅ VERIFIED. Batch metadata, ledger authenticity, and chain-of-custody validated."

        return {
            "result": result,
            "risk_score": score,
            "severity": severity,
            "reasons": reasons,
            "checks": checks,
            "recommendation": recommendation
        }
