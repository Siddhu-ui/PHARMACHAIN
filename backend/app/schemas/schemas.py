from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth & Users ---
class UserBase(BaseModel):
    name: str
    email: str
    role: str
    organization: str
    location: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = "demo123"
    role: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Medicine ---
class MedicineBase(BaseModel):
    name: str
    generic_name: str
    brand_name: str
    manufacturer: str
    dosage: str
    form: str

class MedicineResponse(MedicineBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Batch & Events ---
class BatchBase(BaseModel):
    batch_number: str
    medicine_id: str
    manufacturing_date: datetime
    expiry_date: datetime
    quantity: int
    unit: str = "STRIPS"
    current_location: str

class BatchCreate(BatchBase):
    manufacturer_id: Optional[str] = None
    original_retailer_id: Optional[str] = None

class BatchEventResponse(BaseModel):
    id: str
    batch_id: str
    event_type: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    location: str
    quantity: Optional[int] = None
    weight: Optional[float] = None
    timestamp: datetime
    metadata_json: Optional[str] = None
    evidence_url: Optional[str] = None

    class Config:
        from_attributes = True

class BatchResponse(BaseModel):
    id: str
    batch_number: str
    medicine_id: str
    manufacturer_id: Optional[str] = None
    manufacturing_date: datetime
    expiry_date: datetime
    quantity: int
    unit: str
    status: str
    original_retailer_id: Optional[str] = None
    current_location: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    medicine: Optional[MedicineResponse] = None

    class Config:
        from_attributes = True

# --- Return Requests ---
class ReturnRequestCreate(BaseModel):
    batch_id: str
    quantity: int
    reason: str = "EXPIRED"

class ReturnRequestResponse(BaseModel):
    id: str
    batch_id: str
    retailer_id: str
    retailer_name: Optional[str] = None
    quantity: int
    reason: str
    status: str
    created_at: datetime
    batch: Optional[BatchResponse] = None

    class Config:
        from_attributes = True

# --- Pickup ---
class PickupCreate(BaseModel):
    return_request_id: str
    expected_quantity: int
    actual_quantity: int
    actual_weight: Optional[float] = None
    evidence_url: Optional[str] = None

class PickupResponse(BaseModel):
    id: str
    return_request_id: str
    distributor_id: str
    distributor_name: Optional[str] = None
    expected_quantity: int
    actual_quantity: int
    actual_weight: Optional[float] = None
    pickup_time: datetime
    status: str
    evidence_url: Optional[str] = None

    class Config:
        from_attributes = True

# --- Manufacturer Receipt ---
class ManufacturerReceiptCreate(BaseModel):
    batch_id: str
    received_quantity: int
    notes: Optional[str] = None

# --- Destruction ---
class DestructionCreate(BaseModel):
    batch_id: str
    waste_facility_id: str
    waste_facility_name: str
    certificate_number: str
    destroyed_quantity: int
    certificate_url: Optional[str] = None

class DestructionResponse(BaseModel):
    id: str
    batch_id: str
    manufacturer_id: str
    waste_facility_id: str
    waste_facility_name: Optional[str] = None
    certificate_number: str
    destruction_date: datetime
    destroyed_quantity: int
    certificate_url: Optional[str] = None
    verification_status: str

    class Config:
        from_attributes = True

class CertificateVerificationResult(BaseModel):
    is_valid: bool
    certificate_number: str
    batch_number: str
    expected_quantity: int
    certified_quantity: int
    facility_name: str
    status: str
    discrepancies: List[str] = []

# --- Fraud & Alerts ---
class FraudIncidentResponse(BaseModel):
    id: str
    batch_id: str
    incident_type: str
    risk_score: int
    severity: str
    description: str
    detected_at: datetime
    detected_by: str
    status: str
    evidence: Optional[str] = None
    assigned_to: Optional[str] = None
    batch: Optional[BatchResponse] = None

    class Config:
        from_attributes = True

class FraudIncidentUpdate(BaseModel):
    status: str # OPEN, UNDER_INVESTIGATION, RESOLVED
    assigned_to: Optional[str] = None

class AlertResponse(BaseModel):
    id: str
    incident_id: Optional[str] = None
    recipient_role: str
    recipient_user_id: Optional[str] = None
    severity: str
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Scans & Verification ---
class ScanVerifyRequest(BaseModel):
    batch_number: str
    scan_type: str = "QR" # QR, BARCODE, MANUAL, OCR
    location: str
    scanner_role: str = "RETAILER"
    scanner_user_id: Optional[str] = None
    package_image_url: Optional[str] = None
    ocr_printed_expiry: Optional[str] = None

class ScanVerifyResponse(BaseModel):
    result: str # VERIFIED, SUSPICIOUS, FRAUD
    risk_score: int # 0 - 100
    severity: str # LOW, MEDIUM, HIGH, CRITICAL
    batch: Optional[BatchResponse] = None
    reasons: List[str] = []
    checks: Dict[str, bool] = {}
    ml_anomaly_score: float = 0.0
    is_ml_anomaly: bool = False
    incident_id: Optional[str] = None
    recommendation: str

# --- OCR Analysis ---
class OCRAnalyzeRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    batch_number: Optional[str] = None

class OCRAnalyzeResponse(BaseModel):
    extracted_batch_number: Optional[str] = None
    extracted_expiry_date: Optional[str] = None
    extracted_mfg_date: Optional[str] = None
    extracted_medicine_name: Optional[str] = None
    extracted_manufacturer: Optional[str] = None
    registered_expiry_date: Optional[str] = None
    is_tampered: bool = False
    tampering_description: Optional[str] = None
    confidence_score: float = 0.95
    bounding_boxes: List[Dict[str, Any]] = []

# --- Dashboard Stats ---
class DashboardStatsResponse(BaseModel):
    total_batches: int
    expiring_soon: int
    expired: int
    returns_in_progress: int
    destroyed: int
    suspicious_batches: int
    critical_incidents: int
    recovered_fraud: int
    status_distribution: List[Dict[str, Any]]
    fraud_by_type: List[Dict[str, Any]]
    risk_distribution: List[Dict[str, Any]]
    recent_events: List[BatchEventResponse]
