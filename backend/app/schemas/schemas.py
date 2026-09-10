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
    product_id: Optional[str] = None
    qr_payload: Optional[str] = None
    assigned_retailer_name: Optional[str] = None
    dosage_strength: Optional[str] = None
    manufacturer_name: Optional[str] = None
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
    registered_medicine_name: Optional[str] = None
    registered_manufacturer: Optional[str] = None
    batch_status_in_db: Optional[str] = None
    verdict: str = "MATCH" # MATCH, TAMPERING, UNKNOWN
    risk_score: int = 5
    severity: str = "LOW"
    recommendation: Optional[str] = None
    is_tampered: bool = False
    tampering_description: Optional[str] = None
    confidence_score: float = 0.95
    bounding_boxes: List[Dict[str, Any]] = []
    comparison_table: List[Dict[str, Any]] = []

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
    in_transit: Optional[int] = 0
    awaiting_destruction: Optional[int] = 0
    status_distribution: List[Dict[str, Any]]
    fraud_by_type: List[Dict[str, Any]]
    risk_distribution: List[Dict[str, Any]]
    recent_events: List[BatchEventResponse]

# --- Manufacturer Dashboard Schemas ---
class ManufacturerKPIs(BaseModel):
    total_registered_products: int = 0
    active_products: int = 0
    expiring_soon: int = 0
    expired_awaiting_return: int = 0
    return_overdue: int = 0
    awaiting_destruction: int = 0
    destruction_verified: int = 0
    fraud_incidents: int = 0

class ApproachingExpiryItem(BaseModel):
    product_id: str
    medicine: str
    batch_number: str
    retailer: str
    expiry_date: str
    status: str
    days_remaining: int

class OverdueReturnItem(BaseModel):
    product_id: str
    medicine: str
    batch_number: str
    retailer: str
    expiry_date: str
    days_overdue: int
    action: str = "REQUEST_PICKUP"

class DestructionPendingItem(BaseModel):
    product_id: str
    batch_number: str
    medicine: str
    manufacturer_received_date: Optional[str] = None
    current_status: str
    action: str = "VERIFY_DESTRUCTION"

class ManufacturerFraudItem(BaseModel):
    id: str
    incident_type: str
    product_id: Optional[str] = None
    batch_number: str
    risk_score: int
    severity: str
    detected_at: str
    status: str
    description: str

class ManufacturerDashboardResponse(BaseModel):
    kpis: ManufacturerKPIs
    approaching_expiry: List[ApproachingExpiryItem] = []
    overdue_returns: List[OverdueReturnItem] = []
    destruction_pending: List[DestructionPendingItem] = []
    recent_fraud: List[ManufacturerFraudItem] = []

# --- Retailer Dashboard Schemas ---
class RetailerKPIs(BaseModel):
    total_stock: int = 0
    active_stock: int = 0
    expiring_soon: int = 0
    expired_stock: int = 0
    return_pending: int = 0
    products_verified_today: int = 0
    suspicious_scans: int = 0

class RetailerExpiringItem(BaseModel):
    medicine: str
    batch_number: str
    product_id: str
    expiry_date: str
    days_remaining: int
    action: str = "FLAG_FOR_RETURN"

class RetailerExpiredItem(BaseModel):
    medicine: str
    batch_number: str
    product_id: str
    expiry_date: str
    status: str
    lifecycle_status: Optional[str] = None
    warning: str = "DO NOT SELL / RETURN REQUIRED"
    action: str = "INITIATE_RETURN"
    action_label: Optional[str] = "Initiate Return"

class RetailerActivityItem(BaseModel):
    time: str
    product_id: Optional[str] = None
    batch_number: str
    medicine: str
    result: str
    risk_score: int
    severity: str
    action: str = "VIEW_DETAILS"

class RetailerSuspiciousScanItem(BaseModel):
    product_id: Optional[str] = None
    batch_number: str
    incident: str
    risk_score: int
    severity: str
    timestamp: str
    recommendation: Optional[str] = "DO NOT ACCEPT OR DISPENSE"

class RetailerDashboardResponse(BaseModel):
    kpis: RetailerKPIs
    expiring_soon: List[RetailerExpiringItem] = []
    expired_stock: List[RetailerExpiredItem] = []
    recent_activity: List[RetailerActivityItem] = []
    suspicious_scans: List[RetailerSuspiciousScanItem] = []

# --- Distributor Dashboard Schemas ---
class DistributorKPIs(BaseModel):
    pickup_requests: int = 0
    pickups_today: int = 0
    in_transit: int = 0
    delivered_to_manufacturer: int = 0
    delayed_returns: int = 0
    total_weight_collected: float = 0.0

class DistributorPickupItem(BaseModel):
    return_id: str
    product_id: Optional[str] = None
    batch_number: str
    medicine: str
    retailer: str
    quantity: int
    weight: Optional[float] = None
    requested_date: str
    status: str
    action: str = "SCHEDULE_PICKUP"

class DistributorTransportItem(BaseModel):
    product_id: Optional[str] = None
    batch_number: str
    medicine: str
    origin: str
    destination: str
    pickup_time: Optional[str] = None
    transport_status: str
    weight: Optional[float] = None
    action: str = "UPDATE_STATUS"

class DistributorDashboardResponse(BaseModel):
    kpis: DistributorKPIs
    pickup_requests: List[DistributorPickupItem] = []
    active_transport: List[DistributorTransportItem] = []


# --- Product Registration & Retailer Package Verification ---
class ProductRegisterRequest(BaseModel):
    medicine_name: str
    strength: Optional[str] = "500mg"
    batch_id: str
    manufacturing_date: datetime
    expiry_date: datetime
    manufacturer: str = "ABC Pharma"
    assigned_retailer: Optional[str] = "Pharmacy A"
    quantity: Optional[int] = 100
    product_id: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    product_id: str
    medicine: str
    dosage: Optional[str] = None
    batch_id: str
    manufacturer: str
    assigned_retailer: Optional[str] = None
    manufacturing_date: datetime
    expiry_date: datetime
    quantity: int = 100
    status: str
    qr_payload: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductAssignRetailerRequest(BaseModel):
    retailer_name: str
    retailer_id: Optional[str] = None

class RetailerVerifyRequest(BaseModel):
    product_id: Optional[str] = None
    qr_detected: bool = True
    package_image_url: Optional[str] = None
    printed_expiry_override: Optional[str] = None
    medicine_name_ocr: Optional[str] = None
    batch_ocr: Optional[str] = None
    expiry_ocr: Optional[str] = None
    manufacturer_ocr: Optional[str] = None
    location: str = "Pharmacy A"
    scanner_role: str = "RETAILER"

class RetailerVerifyResponse(BaseModel):
    status_verdict: str # VERIFIED, LABEL_TAMPERING, UNKNOWN_PRODUCT, EXPIRED, REENTRY_FRAUD, QR_NOT_DETECTED, LOCATION_MISMATCH
    title: str
    product_id: Optional[str] = None
    serial_code: Optional[str] = None
    medicine_name: Optional[str] = None
    dosage_strength: Optional[str] = None
    batch_number: Optional[str] = None
    registered_expiry: Optional[str] = None
    detected_expiry: Optional[str] = None
    manufacturer: Optional[str] = None
    distributor: Optional[str] = None
    assigned_retailer: Optional[str] = None
    scanning_retailer: Optional[str] = None
    lifecycle_status: Optional[str] = None
    expiry_status: Optional[str] = None
    message: str
    risk_score: int = 0
    severity: str = "LOW"
    checks: Dict[str, Any] = {}
    comparison: List[Dict[str, Any]] = []
    incident_id: Optional[str] = None
    recommendation: str
    allow_sale: bool = False

class ProductUnitResponse(BaseModel):
    id: str
    serial_code: str
    medicine_id: str
    batch_id: str
    batch_number: str
    medicine_name: Optional[str] = None
    dosage_strength: Optional[str] = None
    manufacturer_id: Optional[str] = None
    manufacturer_name: Optional[str] = None
    current_distributor_id: Optional[str] = None
    current_distributor_name: Optional[str] = None
    current_retailer_id: Optional[str] = None
    current_retailer_name: Optional[str] = None
    current_holder_type: str
    current_holder_name: Optional[str] = None
    current_location: Optional[str] = None
    qr_payload: Optional[str] = None
    product_status: str
    expiry_status: str
    manufacturing_date: datetime
    expiry_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class CustodyTransferResponse(BaseModel):
    id: str
    serial_code: str
    from_party_type: str
    from_party_name: Optional[str] = None
    to_party_type: str
    to_party_name: Optional[str] = None
    transfer_type: str
    status: str
    notes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class SerialDetailResponse(BaseModel):
    unit: ProductUnitResponse
    transfers: List[CustodyTransferResponse] = []
    alerts: List[Dict[str, Any]] = []
    verification_history: List[Dict[str, Any]] = []
    destruction_record: Optional[Dict[str, Any]] = None

class DistributorAllocationRequest(BaseModel):
    batch_id: str
    retailer_id: str
    quantity: Optional[int] = None
    serial_codes: Optional[List[str]] = None

class DispenseRequest(BaseModel):
    serial_code: str
    retailer_id: Optional[str] = None
    retailer_name: Optional[str] = None
    patient_id: Optional[str] = None
    prescription_ref: Optional[str] = None

class DispenseResponse(BaseModel):
    success: bool
    serial_code: str
    message: str
    dispensed_at: datetime
    retailer_name: str
