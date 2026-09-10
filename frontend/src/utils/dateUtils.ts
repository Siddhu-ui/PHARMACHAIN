/**
 * Centralized Pharmaceutical Expiry Date & Lifecycle Status Engine
 */

export interface ExpiryEvaluation {
  days: number;
  text: string;
  isExpired: boolean;
  isNearExpiry: boolean;
  category: 'expired' | 'expiring_soon' | 'active';
}

/**
 * Calculates days remaining or days elapsed since expiration.
 * Format strictly matches canonical pharmaceutical specifications:
 * - "Expires today"
 * - "Expires in 1 day"
 * - "Expires in X days"
 * - "Expired 1 day ago"
 * - "Expired X days ago"
 */
export function calculateExpiryDays(expiryDateStr: string, fromDate?: Date): ExpiryEvaluation {
  if (!expiryDateStr) {
    return {
      days: 0,
      text: 'No expiry specified',
      isExpired: false,
      isNearExpiry: false,
      category: 'active'
    };
  }

  const today = fromDate ? new Date(fromDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      days: 0,
      text: 'Expires today',
      isExpired: false,
      isNearExpiry: true,
      category: 'expiring_soon'
    };
  }

  if (diffDays === 1) {
    return {
      days: 1,
      text: 'Expires in 1 day',
      isExpired: false,
      isNearExpiry: true,
      category: 'expiring_soon'
    };
  }

  if (diffDays > 1) {
    return {
      days: diffDays,
      text: `Expires in ${diffDays} days`,
      isExpired: false,
      isNearExpiry: diffDays <= 30,
      category: diffDays <= 30 ? 'expiring_soon' : 'active'
    };
  }

  if (diffDays === -1) {
    return {
      days: -1,
      text: 'Expired 1 day ago',
      isExpired: true,
      isNearExpiry: false,
      category: 'expired'
    };
  }

  // diffDays < -1
  const absDays = Math.abs(diffDays);
  return {
    days: diffDays,
    text: `Expired ${absDays} days ago`,
    isExpired: true,
    isNearExpiry: false,
    category: 'expired'
  };
}

/**
 * Standardized Centralized Lifecycle Status Map
 * Backend Canonical Status -> Professional Human Label
 */
export const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  REGISTERED: 'Batch Registered',
  ASSIGNED_TO_RETAILER: 'Assigned to Retailer',
  ACTIVE: 'Active in Pharmacy',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED: 'Expired (Quarantine Required)',
  RETURN_OVERDUE: 'Return Overdue',
  RETURN_REQUESTED: 'Return Requested',
  PICKUP_CONFIRMED: 'Pickup Confirmed',
  IN_TRANSIT: 'In Transit to Hub',
  RECEIVED_BY_MANUFACTURER: 'Quarantine Bay (Manufacturer)',
  AWAITING_DESTRUCTION: 'Awaiting Destruction',
  DESTRUCTION_VERIFIED: 'Destruction Verified (DC-00891)',
  CLOSED: 'Closed (Lifecycle Sealed)',
  SUSPICIOUS: 'Suspicious (Flagged)',
  REENTRY_DETECTED: 'RE-ENTRY FRAUD DETECTED',
  PENDING_PICKUP: 'Awaiting Distributor Pickup',
  PICKED_UP: 'Picked Up by MedLink',
  CANCELLED: 'Return Cancelled',
  CONFIRMED: 'Confirmed Delivery',
  QUANTITY_MISMATCH: 'Quantity Discrepancy Flagged'
};

export function formatLifecycleStatus(status: string): string {
  if (!status) return 'Unknown Status';
  return LIFECYCLE_STATUS_LABELS[status] || status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
