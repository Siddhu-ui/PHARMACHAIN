import {
  User, Batch, BatchEvent, ReturnRequest, Pickup,
  DestructionRecord, FraudIncident, Alert, ScanVerifyResponse,
  OCRAnalyzeResponse, DashboardStats, Role,
  Product, ProductRegisterRequest, RetailerVerifyRequest, RetailerVerifyResponse,
  ManufacturerDashboardResponse, RetailerDashboardResponse, DistributorDashboardResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
      throw new Error('Backend unavailable. Please start PharmaGuard using start_pharmaguard.bat.');
    }
    throw new Error('Backend unavailable. Please start PharmaGuard using start_pharmaguard.bat.');
  }

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }

    if (response.status === 404) {
      if (endpoint.includes('/batches')) {
        errorDetail = 'Batch not found.';
      } else if (endpoint.includes('/fraud/incidents')) {
        errorDetail = 'Incident record not found.';
      } else {
        errorDetail = 'Requested resource not found.';
      }
    } else if (response.status === 500) {
      errorDetail = 'Internal server error. Please check backend logs.';
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
  async uploadOCR(file: File, batchNumber?: string): Promise<OCRAnalyzeResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (batchNumber) {
      formData.append('batch_number', batchNumber);
    }
    const response = await fetch(`${API_BASE}/ocr/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      let errText = 'Image upload and OCR analysis failed.';
      try {
        const errJson = await response.json();
        errText = errJson.detail || errText;
      } catch {
        // fallback
      }
      throw new Error(errText);
    }
    return response.json();
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
  async getManufacturerDashboard(): Promise<ManufacturerDashboardResponse> {
    return request('/dashboard/manufacturer');
  },
  async getRetailerDashboard(): Promise<RetailerDashboardResponse> {
    return request('/dashboard/retailer');
  },
  async getDistributorDashboard(): Promise<DistributorDashboardResponse> {
    return request('/dashboard/distributor');
  },

  // Demo Controls
  async resetDemo(): Promise<{ message: string }> {
    return request('/demo/reset', { method: 'POST' });
  },
  async executeDemoStep(stepId: number): Promise<{ step: number; message: string; incident_id?: string }> {
    return request(`/demo/step/${stepId}`, { method: 'POST' });
  },

  // Products & Retailer Verification
  async registerProduct(data: ProductRegisterRequest): Promise<Product> {
    return request('/products/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async getProducts(): Promise<Product[]> {
    return request('/products');
  },
  async getProduct(productId: string): Promise<Product> {
    return request(`/products/${productId}`);
  },
  async assignRetailer(productId: string, retailerName: string, retailerId?: string): Promise<Product> {
    return request(`/products/${productId}/assign-retailer`, {
      method: 'POST',
      body: JSON.stringify({ retailer_name: retailerName, retailer_id: retailerId })
    });
  },
  async getProductQR(productId: string): Promise<{ product_id: string; qr_payload: string }> {
    return request(`/products/${productId}/qr`);
  },
  async verifyRetailerPackage(data: RetailerVerifyRequest): Promise<RetailerVerifyResponse> {
    return request('/products/verify-retailer', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Serialized Products & Chain of Custody
  async getSerials(params: {
    batch_id?: string;
    holder_type?: string;
    retailer_id?: string;
    distributor_id?: string;
    status?: string;
  } = {}): Promise<import('../types').ProductUnit[]> {
    const query = new URLSearchParams();
    if (params.batch_id) query.set('batch_id', params.batch_id);
    if (params.holder_type) query.set('holder_type', params.holder_type);
    if (params.retailer_id) query.set('retailer_id', params.retailer_id);
    if (params.distributor_id) query.set('distributor_id', params.distributor_id);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return request(`/serials${qs ? `?${qs}` : ''}`);
  },
  async getSerialDetail(serialCode: string): Promise<import('../types').SerialDetailResponse> {
    return request(`/serials/${serialCode}`);
  },
  async allocateSerials(data: {
    distributor_id: string;
    retailer_id: string;
    retailer_name: string;
    batch_number: string;
    quantity?: number;
    serial_codes?: string[];
  }): Promise<{ message: string; allocated_count: number; units: import('../types').ProductUnit[] }> {
    return request('/serials/allocate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async dispenseSerial(data: {
    serial_code: string;
    retailer_id?: string;
    retailer_name?: string;
    patient_identifier?: string;
  }): Promise<{ message: string; serial_code: string; product_status: string; timestamp: string }> {
    return request('/serials/dispense', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async getDistributorInventory(distributorId: string): Promise<any> {
    return request(`/serials/distributor/${distributorId}/inventory`);
  },

  // Role Portals
  async getManufacturerMedicines(): Promise<any[]> {
    return request('/roles/manufacturer/medicines');
  },
  async getManufacturerDistributors(): Promise<any[]> {
    return request('/roles/manufacturer/distributors');
  },
  async getManufacturerDistributorDetail(id: string): Promise<any> {
    return request(`/roles/manufacturer/distributors/${id}`);
  },
  async getManufacturerRetailers(): Promise<any[]> {
    return request('/roles/manufacturer/retailers');
  },
  async getManufacturerRetailerDetail(id: string): Promise<any> {
    return request(`/roles/manufacturer/retailers/${id}`);
  },
  async getManufacturerAlerts(): Promise<any[]> {
    return request('/roles/manufacturer/alerts');
  },

  async getDistributorMedicines(): Promise<import('../types').DistributorAccountingItem[]> {
    return request('/roles/distributor/medicines');
  },
  async getDistributorRetailers(): Promise<any[]> {
    return request('/roles/distributor/retailers');
  },
  async getDistributorRetailerDetail(id: string): Promise<any> {
    return request(`/roles/distributor/retailers/${id}`);
  },
  async getDistributorPickups(): Promise<any[]> {
    return request('/roles/distributor/pickups');
  },

  async getRetailerInventory(retailerId?: string): Promise<any[]> {
    return request(`/roles/retailer/inventory${retailerId ? `?retailer_id=${retailerId}` : ''}`);
  },
  async getRetailerAlerts(): Promise<any[]> {
    return request('/roles/retailer/alerts');
  }
};

