import React from 'react';
import { Check, AlertTriangle, AlertOctagon, Info, Clock, Truck, ShieldCheck, Flame, Ban } from 'lucide-react';

export type StatusCategory = 'verified' | 'warning' | 'critical' | 'info' | 'pending';

interface StatusBadgeProps {
  status?: StatusCategory | string;
  label: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon,
  size = 'md',
}) => {
  const normalized = (label || status || '').toUpperCase();

  // Color & icon mapping per prompt requirements
  let category: StatusCategory = 'info';
  let defaultIcon: React.ReactNode = <Info className="w-3 h-3" />;

  // GREEN: Verified, Compliant, Safe, Destroyed, Closed, Active
  if (
    normalized.includes('VERIFIED') ||
    normalized.includes('COMPLIANT') ||
    normalized.includes('SAFE') ||
    normalized.includes('DESTROYED') ||
    normalized.includes('CLOSED') ||
    normalized.includes('ACTIVE') ||
    normalized.includes('MATCH') ||
    normalized.includes('SUCCESS') ||
    status === 'verified'
  ) {
    category = 'verified';
    defaultIcon = normalized.includes('DESTROYED') ? <Flame className="w-3 h-3" /> : <Check className="w-3 h-3" />;
  }
  // RED: Expired, Fraud, Re-entry Detected, Label Tampering, Critical, Quantity Discrepancy, Rejected
  else if (
    normalized.includes('EXPIRED') ||
    normalized.includes('FRAUD') ||
    normalized.includes('REENTRY') ||
    normalized.includes('RE-ENTRY') ||
    normalized.includes('TAMPER') ||
    normalized.includes('CRITICAL') ||
    normalized.includes('DISCREPANCY') ||
    normalized.includes('REJECT') ||
    status === 'critical'
  ) {
    category = 'critical';
    defaultIcon = <Ban className="w-3 h-3" />;
  }
  // AMBER: Expiring Soon, Pending, Awaiting Pickup, Awaiting Verification, In Transit, Suspicious
  else if (
    normalized.includes('EXPIRING') ||
    normalized.includes('PENDING') ||
    normalized.includes('AWAITING') ||
    normalized.includes('TRANSIT') ||
    normalized.includes('SUSPICIOUS') ||
    normalized.includes('WARNING') ||
    status === 'warning'
  ) {
    category = 'warning';
    defaultIcon = normalized.includes('TRANSIT') ? <Truck className="w-3 h-3" /> : <Clock className="w-3 h-3" />;
  }
  // BLUE: Information, Under Review, Received, Quarantined
  else {
    category = 'info';
    defaultIcon = <Info className="w-3 h-3" />;
  }

  const styles: Record<StatusCategory, string> = {
    verified: 'bg-success-50 text-success-800 border-success-300',
    warning: 'bg-warning-50 text-warning-800 border-warning-300',
    critical: 'bg-critical-50 text-critical-800 border-critical-300',
    info: 'bg-clinical-50 text-clinical-800 border-clinical-300',
    pending: 'bg-navy-50 text-navy-700 border-navy-300'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shrink-0 ${styles[category]} ${sizeClasses[size]}`}
    >
      <span className="shrink-0 flex items-center">{icon || defaultIcon}</span>
      <span>{label}</span>
    </span>
  );
};
