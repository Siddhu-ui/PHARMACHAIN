import {
  User, Batch, BatchEvent, ReturnRequest, Pickup,
  DestructionRecord, FraudIncident, Alert, ScanVerifyResponse,
  OCRAnalyzeResponse, DashboardStats, Role
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  // Auth
  async login(email: string, role?: string): Promise<{ access_token: string; user: User }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, role })
    });
  },
  async getUsers(): Promise<User[]> {
    return request('/auth/users');
  },

  // Batches
  async getBatches(params: { status?: string; expiry_category?: string; retailer_id?: string } = {}): Promise<Batch[]> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.expiry_category) query.set('expiry_category', params.expiry_category);
    if (params.retailer_id) query.set('retailer_id', params.retailer_id);
    const qs = query.toString();
    return request(`/batches${qs ? `?${qs}` : ''}`);
  },
  async getBatch(idOrNumber: string): Promise<Batch> {
    return request(`/batches/${idOrNumber}`);
  },
  async getBatchTimeline(idOrNumber: string): Promise<BatchEvent[]> {
    return request(`/batches/${idOrNumber}/timeline`);
  },

  // Returns
  async getReturns(status?: string): Promise<ReturnRequest[]> {
    return request(`/returns${status ? `?status=${status}` : ''}`);
  },
  async createReturnRequest(batchId: string, quantity: number, reason: string = 'EXPIRED'): Promise<ReturnRequest> {
    return request('/returns', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, quantity, reason })
    });
  },

  // Pickups
  async getPickups(): Promise<Pickup[]> {
    return request('/pickups');
  },
  async confirmPickup(data: {
    return_request_id: string;
    expected_quantity: number;
    actual_quantity: number;
    actual_weight?: number;
    evidence_url?: string;
  }): Promise<Pickup> {
    return request('/pickups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Destruction & Manufacturer
  async receiveByManufacturer(batchId: string, receivedQuantity: number, notes?: string): Promise<Batch> {
    return request('/destruction/receive', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, received_quantity: receivedQuantity, notes })
    });
  },
  async verifyCertificate(data: {
    batch_number: string;
    certificate_number: string;
    facility_name: string;
    quantity: number;
  }): Promise<{ is_valid: boolean; status: string; discrepancies: string[] }> {
    const query = new URLSearchParams({
      batch_number: data.batch_number,
      certificate_number: data.certificate_number,
      facility_name: data.facility_name,
      quantity: data.quantity.toString()
    });
    return request(`/destruction/verify-certificate?${query.toString()}`, { method: 'POST' });
  },
  async confirmDestruction(data: {
    batch_id: string;
    waste_facility_id: string;
    waste_facility_name: string;
    certificate_number: string;
    destroyed_quantity: number;
    certificate_url?: string;
  }): Promise<DestructionRecord> {
    return request('/destruction/confirm', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Scans & Verification
  async verifyScan(data: {
    batch_number: string;
    scan_type?: string;
    location: string;
    scanner_role?: Role;
    ocr_printed_expiry?: string;
  }): Promise<ScanVerifyResponse> {
    return request('/scan/verify', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async analyzeOCR(data: {
    batch_number?: string;
    image_url?: string;
  }): Promise<OCRAnalyzeResponse> {
    return request('/ocr/analyze', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Fraud & Incidents
  async getFraudIncidents(status?: string, severity?: string): Promise<FraudIncident[]> {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (severity) query.set('severity', severity);
    const qs = query.toString();
    return request(`/fraud/incidents${qs ? `?${qs}` : ''}`);
  },
  async getFraudIncident(id: string): Promise<FraudIncident> {
    return request(`/fraud/incidents/${id}`);
  },
  async updateFraudIncident(id: string, status: string, assignedTo?: string): Promise<FraudIncident> {
    return request(`/fraud/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assigned_to: assignedTo })
    });
  },

  // Alerts
  async getAlerts(role?: Role, unreadOnly?: boolean): Promise<Alert[]> {
    const query = new URLSearchParams();
    if (role) query.set('role', role);
    if (unreadOnly) query.set('unread_only', 'true');
    const qs = query.toString();
    return request(`/alerts${qs ? `?${qs}` : ''}`);
  },
  async getUnreadCount(role?: Role): Promise<{ count: number }> {
    return request(`/alerts/unread-count${role ? `?role=${role}` : ''}`);
  },
  async markAlertRead(alertId: string): Promise<Alert> {
    return request(`/alerts/${alertId}/read`, { method: 'PATCH' });
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request('/dashboard/stats');
  },

  // Demo Controls
  async resetDemo(): Promise<{ message: string }> {
    return request('/demo/reset', { method: 'POST' });
  },
  async executeDemoStep(stepId: number): Promise<{ step: number; message: string; incident_id?: string }> {
    return request(`/demo/step/${stepId}`, { method: 'POST' });
  }
};
