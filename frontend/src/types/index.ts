export type Role = 'RETAILER' | 'DISTRIBUTOR' | 'MANUFACTURER' | 'REGULATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization: string;
  organization_id?: string;
  location: string;
  created_at: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name: string;
  brand_name: string;
  manufacturer: string;
  dosage: string;
  form: string;
  created_at: string;
}

export type BatchStatus =
  | 'REGISTERED'
  | 'ASSIGNED_TO_RETAILER'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'RETURN_OVERDUE'
  | 'RETURN_REQUESTED'
  | 'PICKUP_CONFIRMED'
  | 'IN_TRANSIT'
  | 'RECEIVED_BY_MANUFACTURER'
  | 'AWAITING_DESTRUCTION'
  | 'DESTRUCTION_VERIFIED'
  | 'CLOSED'
  | 'SUSPICIOUS'
  | 'REENTRY_DETECTED';

export interface Batch {
  id: string;
  batch_number: string;
  medicine_id: string;
  manufacturer_id?: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  status: BatchStatus;
  original_retailer_id?: string;
  current_location: string;
  product_id?: string;
  qr_payload?: string;
  assigned_retailer_name?: string;
  dosage_strength?: string;
  manufacturer_name?: string;
  created_at: string;
  updated_at?: string;
  medicine?: Medicine;
}

export interface BatchEvent {
  id: string;
  batch_id: string;
  event_type: string;
  actor_id?: string;
  actor_name?: string;
  organization_id?: string;
  organization_name?: string;
  location: string;
  quantity?: number;
  weight?: number;
  timestamp: string;
  metadata_json?: string;
  evidence_url?: string;
}

export interface ReturnRequest {
  id: string;
  batch_id: string;
  retailer_id: string;
  retailer_name?: string;
  quantity: number;
  reason: string;
  status: string;
  created_at: string;
  batch?: Batch;
}

export interface Pickup {
  id: string;
  return_request_id: string;
  distributor_id: string;
  distributor_name?: string;
  expected_quantity: number;
  actual_quantity: number;
  actual_weight?: number;
  pickup_time: string;
  status: string;
  evidence_url?: string;
}

export interface DestructionRecord {
  id: string;
  batch_id: string;
  manufacturer_id: string;
  waste_facility_id: string;
  waste_facility_name?: string;
  certificate_number: string;
  destruction_date: string;
  destroyed_quantity: number;
  certificate_url?: string;
  verification_status: string;
}

export interface FraudIncident {
  id: string;
  batch_id: string;
  incident_type: string;
  risk_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detected_at: string;
  detected_by: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED';
  evidence?: string;
  assigned_to?: string;
  batch?: Batch;
}

export interface Alert {
  id: string;
  incident_id?: string;
  recipient_role: Role;
  recipient_user_id?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  read: boolean;
  created_at: string;
}

export interface ScanVerifyResponse {
  result: 'VERIFIED' | 'SUSPICIOUS' | 'FRAUD';
  risk_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  batch?: Batch;
  reasons: string[];
  checks: Record<string, boolean>;
  ml_anomaly_score: number;
  is_ml_anomaly: boolean;
  incident_id?: string;
  recommendation: string;
}

export interface OCRBoundingBox {
  label: string;
  text: string;
  confidence: number;
  box: [number, number, number, number];
  tampered?: boolean;
}

export interface OCRComparisonField {
  field_name: string;
  extracted_value: string;
  database_value: string;
  status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND';
  is_discrepancy: boolean;
}

export interface OCRAnalyzeResponse {
  extracted_batch_number?: string;
  extracted_expiry_date?: string;
  extracted_mfg_date?: string;
  extracted_medicine_name?: string;
  extracted_manufacturer?: string;
  registered_expiry_date?: string;
  registered_medicine_name?: string;
  registered_manufacturer?: string;
  batch_status_in_db?: string;
  verdict: 'MATCH' | 'TAMPERING' | 'UNKNOWN';
  risk_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation?: string;
  is_tampered: boolean;
  tampering_description?: string;
  confidence_score: number;
  bounding_boxes: OCRBoundingBox[];
  comparison_table?: OCRComparisonField[];
}

export interface DashboardStats {
  total_batches: number;
  expiring_soon: number;
  expired: number;
  returns_in_progress: number;
  destroyed: number;
  suspicious_batches: number;
  critical_incidents: number;
  recovered_fraud: number;
  in_transit?: number;
  awaiting_destruction?: number;
  status_distribution: { status: string; count: number }[];
  fraud_by_type: { type: string; count: number }[];
  risk_distribution: { severity: string; count: number }[];
  recent_events: BatchEvent[];
}

export interface Product {
  id: string;
  product_id: string;
  medicine: string;
  dosage?: string;
  batch_id: string;
  manufacturer: string;
  assigned_retailer?: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity: number;
  status: string;
  qr_payload: string;
  created_at: string;
}

export interface ProductRegisterRequest {
  medicine_name: string;
  strength?: string;
  batch_id: string;
  manufacturing_date: string;
  expiry_date: string;
  manufacturer: string;
  assigned_retailer?: string;
  quantity?: number;
  product_id?: string;
}

export interface RetailerVerifyRequest {
  product_id?: string;
  qr_detected: boolean;
  package_image_url?: string;
  printed_expiry_override?: string;
  medicine_name_ocr?: string;
  batch_ocr?: string;
  expiry_ocr?: string;
  manufacturer_ocr?: string;
  location?: string;
  scanner_role?: string;
}

export interface RetailerVerifyResponse {
  status_verdict: 'VERIFIED' | 'LABEL_TAMPERING' | 'UNKNOWN_PRODUCT' | 'EXPIRED' | 'REENTRY_FRAUD' | 'LOCATION_MISMATCH' | 'QR_NOT_DETECTED';
  title: string;
  product_id?: string;
  medicine_name?: string;
  batch_number?: string;
  registered_expiry?: string;
  detected_expiry?: string;
  manufacturer?: string;
  assigned_retailer?: string;
  lifecycle_status?: string;
  message: string;
  risk_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  allow_sale?: boolean;
  checks: Record<string, any>;
  comparison: Array<{
    field: string;
    detected: string;
    registered: string;
    match: boolean;
  }>;
  incident_id?: string;
  recommendation: string;
}

// --- Role Dashboard Types ---
export interface ManufacturerKPIs {
  total_registered_products: number;
  active_products: number;
  expiring_soon: number;
  expired_awaiting_return: number;
  return_overdue: number;
  awaiting_destruction: number;
  destruction_verified: number;
  fraud_incidents: number;
}

export interface ApproachingExpiryItem {
  product_id: string;
  medicine: string;
  batch_number: string;
  retailer: string;
  expiry_date: string;
  status: string;
  days_remaining: number;
}

export interface OverdueReturnItem {
  product_id: string;
  medicine: string;
  batch_number: string;
  retailer: string;
  expiry_date: string;
  days_overdue: number;
  action: string;
}

export interface DestructionPendingItem {
  product_id: string;
  batch_number: string;
  medicine: string;
  manufacturer_received_date?: string | null;
  current_status: string;
  action: string;
}

export interface ManufacturerFraudItem {
  id: string;
  incident_type: string;
  product_id?: string | null;
  batch_number: string;
  risk_score: number;
  severity: string;
  detected_at: string;
  status: string;
  description: string;
}

export interface ManufacturerDashboardResponse {
  kpis: ManufacturerKPIs;
  approaching_expiry: ApproachingExpiryItem[];
  overdue_returns: OverdueReturnItem[];
  destruction_pending: DestructionPendingItem[];
  recent_fraud: ManufacturerFraudItem[];
}

export interface RetailerKPIs {
  total_stock: number;
  active_stock: number;
  expiring_soon: number;
  expired_stock: number;
  return_pending: number;
  products_verified_today: number;
  suspicious_scans: number;
}

export interface RetailerExpiringItem {
  medicine: string;
  batch_number: string;
  product_id: string;
  expiry_date: string;
  days_remaining: number;
  action: string;
}

export interface RetailerExpiredItem {
  medicine: string;
  batch_number: string;
  product_id: string;
  expiry_date: string;
  status: string;
  lifecycle_status?: string;
  warning: string;
  action: string;
  action_label?: string;
}

export interface RetailerActivityItem {
  time: string;
  product_id?: string | null;
  batch_number: string;
  medicine: string;
  result: string;
  risk_score: number;
  severity: string;
  action: string;
}

export interface RetailerSuspiciousScanItem {
  product_id?: string | null;
  batch_number: string;
  incident: string;
  risk_score: number;
  severity: string;
  timestamp: string;
  recommendation?: string;
}

export interface RetailerDashboardResponse {
  kpis: RetailerKPIs;
  expiring_soon: RetailerExpiringItem[];
  expired_stock: RetailerExpiredItem[];
  recent_activity: RetailerActivityItem[];
  suspicious_scans: RetailerSuspiciousScanItem[];
}

export interface DistributorKPIs {
  pickup_requests: number;
  pickups_today: number;
  in_transit: number;
  delivered_to_manufacturer: number;
  delayed_returns: number;
  total_weight_collected: number;
}

export interface DistributorPickupItem {
  return_id: string;
  product_id?: string | null;
  batch_number: string;
  medicine: string;
  retailer: string;
  quantity: number;
  weight?: number | null;
  requested_date: string;
  status: string;
  action: string;
}

export interface DistributorTransportItem {
  product_id?: string | null;
  batch_number: string;
  medicine: string;
  origin: string;
  destination: string;
  pickup_time?: string | null;
  transport_status: string;
  weight?: number | null;
  action: string;
}

export interface DistributorDashboardResponse {
  kpis: DistributorKPIs;
  pickup_requests: DistributorPickupItem[];
  active_transport: DistributorTransportItem[];
}

export interface ProductUnit {
  id: string;
  serial_code: string;
  medicine_id?: string;
  batch_id?: string;
  batch_number: string;
  medicine_name?: string;
  dosage_strength?: string;
  manufacturer_id?: string;
  manufacturer_name?: string;
  current_distributor_id?: string;
  current_distributor_name?: string;
  current_retailer_id?: string;
  current_retailer_name?: string;
  current_holder_type: string;
  current_holder_name?: string;
  current_location?: string;
  qr_payload?: string;
  product_status: string;
  expiry_status: string;
  manufacturing_date: string;
  expiry_date: string;
  created_at: string;
}

export interface CustodyTransfer {
  id: string;
  serial_code: string;
  batch_id?: string;
  batch_number?: string;
  from_party_type: string;
  from_party_name?: string;
  to_party_type: string;
  to_party_name?: string;
  transfer_type: string;
  status: string;
  notes?: string;
  timestamp: string;
}

export interface SerialDetailResponse {
  unit: ProductUnit;
  custody_transfers: CustodyTransfer[];
  alerts: Array<{
    id: string;
    message: string;
    severity: string;
    recipient_role: string;
    created_at: string;
  }>;
  scans: Array<{
    id: string;
    verification_result: string;
    risk_score: number;
    location: string;
    timestamp: string;
  }>;
  return_info?: {
    return_id: string;
    status: string;
    reason: string;
    quantity: number;
    pickup_status?: string;
  } | null;
  destruction_info?: {
    destruction_id: string;
    facility_name: string;
    certificate_number: string;
    destruction_date: string;
    status: string;
  } | null;
}

export interface DistributorAccountingItem {
  batch_id: string;
  batch_number: string;
  medicine_name: string;
  strength: string;
  manufacturer_name: string;
  expiry_date: string;
  expiry_status: string;
  received_count: number;
  distributed_count: number;
  remaining_count: number;
  remaining_serials: string[];
  retailers: Array<{
    retailer_id: string;
    retailer_name: string;
    count: number;
    serials: string[];
  }>;
}


