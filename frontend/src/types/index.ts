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
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
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

export interface OCRAnalyzeResponse {
  extracted_batch_number?: string;
  extracted_expiry_date?: string;
  extracted_mfg_date?: string;
  extracted_medicine_name?: string;
  extracted_manufacturer?: string;
  registered_expiry_date?: string;
  is_tampered: boolean;
  tampering_description?: string;
  confidence_score: number;
  bounding_boxes: OCRBoundingBox[];
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
