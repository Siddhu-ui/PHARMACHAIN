import { calculateExpiryDays, ExpiryEvaluation, formatLifecycleStatus } from './dateUtils';
import { Batch } from '../types';

export interface CanonicalMedicineRecord {
  schema_version: '1.0';
  product_id: string;
  product_name: string;
  manufacturer: string;
  batch_number: string;
  serial_number: string;
  manufacturing_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
  quantity: number;
  pack_size: string;
  status?: string;
  dosage?: string;
}

export interface MedicineVerificationResult {
  productName: string;
  manufacturer: string;
  batchNumber: string;
  serialNumber?: string;
  manufacturingDate: string;
  expiryDate: string;
  daysRemaining: number;
  daysRemainingText: string;
  isExpired: boolean;
  quantity?: number;
  packSize?: string;
  verificationStatus: 'VERIFIED' | 'EXPIRED' | 'TAMPERING' | 'REENTRY_DETECTED' | 'UNKNOWN' | 'MISMATCH';
  verdictTitle: string;
  verdictMessage: string;
  scanSource: 'QR' | 'OCR' | 'PRESET';
  confidenceScore?: number;
  registeredRecord?: Batch | null;
  rawPayload?: CanonicalMedicineRecord | null;
  rawPayloadString?: string;
  checks: {
    productIdentified: boolean;
    batchVerified: boolean;
    manufacturerVerified: boolean;
    expiryVerified: boolean;
  };
  discrepancies?: Array<{ field: string; detected: string; registered: string }>;
  incidentId?: string;
}

/**
 * 7 Controlled Canonical Demo Medicines (Strict Single Source of Truth)
 */
export const CANONICAL_DEMO_MEDICINES: CanonicalMedicineRecord[] = [
  {
    schema_version: '1.0',
    product_id: 'PG-CS10-2026-A232507',
    product_name: 'CardioSafe 10 mg Tablets',
    manufacturer: 'BharatCure Pharma',
    batch_number: 'CS10-A23-2507',
    serial_number: 'PG-CS10-2026-A232507',
    manufacturing_date: '2025-07-15',
    expiry_date: '2026-07-15',
    quantity: 100,
    pack_size: '10 x 10 Tablets',
    status: 'EXPIRED',
    dosage: '10mg'
  },
  {
    schema_version: '1.0',
    product_id: 'PG-CS10-2026-003319',
    product_name: 'GlycoNorm 500 mg Tablets',
    manufacturer: 'BharatCure Pharma',
    batch_number: 'CS10-B14-9921',
    serial_number: 'PG-CS10-2026-003319',
    manufacturing_date: '2025-08-06',
    expiry_date: '2026-08-29',
    quantity: 100,
    pack_size: '10 x 10 Tablets',
    status: 'IN_TRANSIT',
    dosage: '500mg'
  },
  {
    schema_version: '1.0',
    product_id: 'PG-PCM-2026-500123',
    product_name: 'Paracetamol 500 mg Tablets',
    manufacturer: 'BharatCure Pharma',
    batch_number: 'PCM500123',
    serial_number: 'PG-PCM-2026-500123',
    manufacturing_date: '2025-08-15',
    expiry_date: '2026-08-15',
    quantity: 100,
    pack_size: '10 x 10 Tablets',
    status: 'EXPIRED',
    dosage: '500mg'
  },
  {
    schema_version: '1.0',
    product_id: 'PG-RC250-2026-007721',
    product_name: 'RespiClear 250 mg Capsules',
    manufacturer: 'BharatCure Pharma',
    batch_number: 'RC250-C32-8812',
    serial_number: 'PG-RC250-2026-007721',
    manufacturing_date: '2025-08-21',
    expiry_date: '2026-08-21',
    quantity: 100,
    pack_size: '10 x 10 Capsules',
    status: 'RECEIVED_BY_MANUFACTURER',
    dosage: '250mg'
  },
  {
    schema_version: '1.0',
    product_id: 'PG-CS10-2027-009841',
    product_name: 'CardioSafe 10 mg Tablets',
    manufacturer: 'BharatCure Pharma',
    batch_number: 'CS10-SAFE',
    serial_number: 'PG-CS10-2027-009841',
    manufacturing_date: '2026-01-30',
    expiry_date: '2027-01-30',
    quantity: 150,
    pack_size: '10 x 10 Tablets',
    status: 'ACTIVE',
    dosage: '10mg'
  },
  {
    schema_version: '1.0',
    product_id: 'PG-GN500-2027-004200',
    product_name: 'GlycoNorm 500 mg Tablets',
    manufacturer: 'BharatCure Pharma',
    batch_number: 'GN500-2026-0042',
    serial_number: 'PG-GN500-2027-004200',
    manufacturing_date: '2026-02-10',
    expiry_date: '2027-02-10',
    quantity: 120,
    pack_size: '10 x 10 Tablets',
    status: 'ACTIVE',
    dosage: '500mg'
  },
  {
    schema_version: '1.0',
    product_id: 'PG-PCM-2027-008800',
    product_name: 'Paracetamol 500 mg Tablets',
    manufacturer: 'BharatCure Pharma',
    batch_number: 'PCM500-2026-0088',
    serial_number: 'PG-PCM-2027-008800',
    manufacturing_date: '2026-02-20',
    expiry_date: '2027-02-20',
    quantity: 200,
    pack_size: '10 x 10 Tablets',
    status: 'ACTIVE',
    dosage: '500mg'
  }
];

/**
 * Finds a matching canonical medicine by product_id, batch_number, or name.
 */
export function findCanonicalMedicine(identifier: string): CanonicalMedicineRecord | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toUpperCase();
  return CANONICAL_DEMO_MEDICINES.find(
    (m) =>
      m.product_id.toUpperCase() === clean ||
      m.batch_number.toUpperCase() === clean ||
      clean.includes(m.batch_number.toUpperCase()) ||
      clean.includes(m.product_id.toUpperCase())
  );
}

/**
 * Formats a Date or date string to standard clinical pharmaceutical display:
 * e.g., "06 Aug 2025", "29 Aug 2026"
 */
export function formatClinicalDate(dateStr?: string | null): string {
  if (!dateStr) return 'Not available';
  const clean = dateStr.trim();
  let date: Date;

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      date = new Date(clean);
    }
  } else {
    date = new Date(clean);
  }

  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Deterministically generates the canonical QR payload string for a medicine record.
 */
export function generateCanonicalQRPayload(record: Partial<CanonicalMedicineRecord>): string {
  const fallback = record.batch_number ? findCanonicalMedicine(record.batch_number) : undefined;

  const payload: CanonicalMedicineRecord = {
    schema_version: '1.0',
    product_id: record.product_id || fallback?.product_id || `PG-MED-${record.batch_number || 'UNKNOWN'}`,
    product_name: record.product_name || fallback?.product_name || 'Pharmaceutical Product',
    manufacturer: record.manufacturer || fallback?.manufacturer || 'BharatCure Pharma',
    batch_number: record.batch_number || fallback?.batch_number || 'UNKNOWN-BATCH',
    serial_number: record.serial_number || record.product_id || fallback?.serial_number || `PG-SN-${record.batch_number || '0000'}`,
    manufacturing_date: record.manufacturing_date || fallback?.manufacturing_date || '2025-07-15',
    expiry_date: record.expiry_date || fallback?.expiry_date || '2026-07-15',
    quantity: record.quantity || fallback?.quantity || 100,
    pack_size: record.pack_size || fallback?.pack_size || '10 x 10 Tablets'
  };

  return JSON.stringify(payload);
}

/**
 * Parses raw text from QR decoder.
 * Supports structured JSON payload with schema 1.0, or legacy product_id strings.
 */
export function parseQRPayload(rawText: string): {
  parsed: CanonicalMedicineRecord | null;
  isStructuredJSON: boolean;
  rawString: string;
} {
  if (!rawText) {
    return { parsed: null, isStructuredJSON: false, rawString: '' };
  }

  const trimmed = rawText.trim();

  // 1. Attempt JSON parse
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj.batch_number || obj.product_id || obj.product_name) {
        return {
          parsed: {
            schema_version: obj.schema_version || '1.0',
            product_id: obj.product_id || obj.serial_number || 'UNKNOWN-PID',
            product_name: obj.product_name || obj.medicine || 'Pharmaceutical Product',
            manufacturer: obj.manufacturer || 'BharatCure Pharma',
            batch_number: obj.batch_number || obj.batch_id || 'UNKNOWN-BATCH',
            serial_number: obj.serial_number || obj.product_id || 'Not available',
            manufacturing_date: obj.manufacturing_date || obj.mfg_date || '2025-07-15',
            expiry_date: obj.expiry_date || obj.exp_date || '2026-07-15',
            quantity: typeof obj.quantity === 'number' ? obj.quantity : 100,
            pack_size: obj.pack_size || '10 x 10 Tablets'
          },
          isStructuredJSON: true,
          rawString: trimmed
        };
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback: match by product ID or batch number in canonical registry
  const matched = findCanonicalMedicine(trimmed);
  if (matched) {
    return {
      parsed: { ...matched },
      isStructuredJSON: false,
      rawString: trimmed
    };
  }

  // 3. Fallback: return a synthetic object if pattern looks like batch number
  return {
    parsed: {
      schema_version: '1.0',
      product_id: trimmed,
      product_name: 'Unregistered Product',
      manufacturer: 'Unverified Manufacturer',
      batch_number: trimmed,
      serial_number: trimmed,
      manufacturing_date: '2025-01-01',
      expiry_date: '2026-01-01',
      quantity: 100,
      pack_size: '10 x 10 Tablets'
    },
    isStructuredJSON: false,
    rawString: trimmed
  };
}

/**
 * Universal verification engine producing the unified MedicineVerificationResult
 * whether scanned via QR, uploaded via packaging image, or run via OCR.
 */
export function verifyScannedMedicine({
  qrData,
  ocrData,
  backendBatch,
  scanSource,
  confidenceScore
}: {
  qrData?: CanonicalMedicineRecord | null;
  ocrData?: {
    medicineName?: string;
    batchNumber?: string;
    manufacturer?: string;
    mfgDate?: string;
    expiryDate?: string;
    isTampered?: boolean;
    tamperingDescription?: string;
    confidenceScore?: number;
  } | null;
  backendBatch?: Batch | null;
  scanSource: 'QR' | 'OCR' | 'PRESET';
  confidenceScore?: number;
}): MedicineVerificationResult {
  // 1. Resolve detected values
  const rawPayload = qrData || null;
  const canonicalFallback = qrData?.batch_number ? findCanonicalMedicine(qrData.batch_number) : (
    ocrData?.batchNumber ? findCanonicalMedicine(ocrData.batchNumber) : undefined
  );

  const detectedMedicine = qrData?.product_name || ocrData?.medicineName || backendBatch?.medicine?.name || canonicalFallback?.product_name || 'CardioSafe 10 mg Tablets';
  const detectedBatch = qrData?.batch_number || ocrData?.batchNumber || backendBatch?.batch_number || canonicalFallback?.batch_number || 'CS10-A23-2507';
  const detectedManufacturer = qrData?.manufacturer || ocrData?.manufacturer || backendBatch?.manufacturer_name || canonicalFallback?.manufacturer || 'BharatCure Pharma';
  const detectedMfg = qrData?.manufacturing_date || ocrData?.mfgDate || (backendBatch?.manufacturing_date ? backendBatch.manufacturing_date.split('T')[0] : canonicalFallback?.manufacturing_date) || '2025-07-15';
  const detectedExpiry = qrData?.expiry_date || ocrData?.expiryDate || (backendBatch?.expiry_date ? backendBatch.expiry_date.split('T')[0] : canonicalFallback?.expiry_date) || '2026-07-15';
  const detectedSerial = qrData?.serial_number || backendBatch?.product_id || canonicalFallback?.serial_number || 'Not available';
  const detectedQty = qrData?.quantity || backendBatch?.quantity || canonicalFallback?.quantity || 100;
  const detectedPack = qrData?.pack_size || canonicalFallback?.pack_size || '10 x 10 Tablets';

  // 2. Dynamic Expiry Evaluation (Central Source of Truth)
  const effectiveExpiryStr = backendBatch?.expiry_date || detectedExpiry;
  const expiryEval: ExpiryEvaluation = calculateExpiryDays(effectiveExpiryStr);

  // 3. Multi-Signal Verification State Machine
  const isUnknown = detectedBatch === 'FAKE-BATCH-999' || (!backendBatch && !canonicalFallback);

  const isDestroyedReentry =
    backendBatch?.status === 'DESTRUCTION_VERIFIED' ||
    backendBatch?.status === 'REENTRY_DETECTED' ||
    detectedBatch === 'CS10-D99-0089' ||
    detectedBatch === 'PCM999888';

  // Check Expiry Date Mismatch (Tampering)
  let isExpiryMismatch = false;
  const registeredExpiryFormatted = backendBatch?.expiry_date ? formatClinicalDate(backendBatch.expiry_date) : formatClinicalDate(canonicalFallback?.expiry_date);
  const detectedExpiryFormatted = formatClinicalDate(detectedExpiry);

  if (backendBatch && detectedExpiry) {
    const regDate = new Date(backendBatch.expiry_date);
    const detDate = new Date(detectedExpiry.includes('/') ? detectedExpiry.split('/').reverse().join('-') : detectedExpiry);
    if (!isNaN(regDate.getTime()) && !isNaN(detDate.getTime())) {
      if (regDate.getFullYear() !== detDate.getFullYear() || regDate.getMonth() !== detDate.getMonth()) {
        isExpiryMismatch = true;
      }
    }
  }

  // Check Batch Mismatch against Registered Product
  let isBatchMismatch = false;
  if (backendBatch && qrData?.batch_number) {
    if (backendBatch.batch_number.toUpperCase() !== qrData.batch_number.toUpperCase()) {
      isBatchMismatch = true;
    }
  }

  // Determine Verification Status
  let verificationStatus: MedicineVerificationResult['verificationStatus'] = 'VERIFIED';
  let verdictTitle = 'MEDICINE VERIFIED';
  let verdictMessage = 'All packaging, batch, and manufacturer attributes conform to registered release standards.';

  if (isUnknown) {
    verificationStatus = 'UNKNOWN';
    verdictTitle = 'PRODUCT NOT VERIFIED';
    verdictMessage = `Batch ${detectedBatch} could not be matched with any registered manufacturer record in PharmaGuard.`;
  } else if (isDestroyedReentry) {
    verificationStatus = 'REENTRY_DETECTED';
    verdictTitle = 'CRITICAL: RE-ENTRY DETECTED';
    verdictMessage = `Batch ${detectedBatch} was recorded as DESTROYED at GreenShield Biomedical Waste Services under Certificate DC-00891. DO NOT DISPENSE.`;
  } else if (isExpiryMismatch || ocrData?.isTampered) {
    verificationStatus = 'TAMPERING';
    verdictTitle = 'EXPIRY DATA MISMATCH';
    verdictMessage = `Scanned expiry (${detectedExpiryFormatted}) contradicts registered release expiry (${registeredExpiryFormatted}). Potential label tampering detected.`;
  } else if (isBatchMismatch) {
    verificationStatus = 'MISMATCH';
    verdictTitle = 'VERIFICATION FAILED';
    verdictMessage = `Batch information ${detectedBatch} does not match the registered product record.`;
  } else if (expiryEval.isExpired || backendBatch?.status === 'EXPIRED') {
    verificationStatus = 'EXPIRED';
    verdictTitle = 'MEDICINE EXPIRED';
    verdictMessage = 'DO NOT DISPENSE. Mandatory reverse quarantine and return workflow must be initiated.';
  }

  const checks = {
    productIdentified: !isUnknown,
    batchVerified: !isUnknown && !isBatchMismatch,
    manufacturerVerified: !isUnknown,
    expiryVerified: !isUnknown && !isExpiryMismatch && !expiryEval.isExpired
  };

  const discrepancies: Array<{ field: string; detected: string; registered: string }> = [];
  if (isExpiryMismatch) {
    discrepancies.push({
      field: 'Expiry Date',
      detected: detectedExpiryFormatted,
      registered: registeredExpiryFormatted
    });
  }
  if (isBatchMismatch && backendBatch) {
    discrepancies.push({
      field: 'Batch Number',
      detected: detectedBatch,
      registered: backendBatch.batch_number
    });
  }

  return {
    productName: detectedMedicine,
    manufacturer: detectedManufacturer,
    batchNumber: detectedBatch,
    serialNumber: detectedSerial,
    manufacturingDate: formatClinicalDate(detectedMfg),
    expiryDate: formatClinicalDate(detectedExpiry),
    daysRemaining: expiryEval.days,
    daysRemainingText: expiryEval.text,
    isExpired: expiryEval.isExpired,
    quantity: detectedQty,
    packSize: detectedPack,
    verificationStatus,
    verdictTitle,
    verdictMessage,
    scanSource,
    confidenceScore: confidenceScore ?? ocrData?.confidenceScore,
    registeredRecord: backendBatch || null,
    rawPayload,
    rawPayloadString: qrData ? JSON.stringify(qrData, null, 2) : undefined,
    checks,
    discrepancies: discrepancies.length > 0 ? discrepancies : undefined
  };
}
