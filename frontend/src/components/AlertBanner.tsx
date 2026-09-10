import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'warning' | 'critical' | 'info';

interface AlertBannerProps {
  type: AlertType;
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  compact?: boolean;
}

const alertStyles: Record<AlertType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-success-50',
    border: 'border-success-300',
    text: 'text-success-900',
    icon: <CheckCircle2 className="w-5 h-5 text-success-700" />,
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-300',
    text: 'text-warning-900',
    icon: <AlertTriangle className="w-5 h-5 text-warning-700" />,
  },
  critical: {
    bg: 'bg-critical-50',
    border: 'border-critical-300',
    text: 'text-critical-900',
    icon: <AlertOctagon className="w-5 h-5 text-critical-700" />,
  },
  info: {
    bg: 'bg-clinical-50',
    border: 'border-clinical-300',
    text: 'text-clinical-900',
    icon: <Info className="w-5 h-5 text-clinical-700" />,
  },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  icon,
  action,
  onClose,
  compact = false,
}) => {
  const styles = alertStyles[type];

  return (
    <div
      className={`${styles.bg} border ${styles.border} rounded-xl p-4 shadow-xs`}
    >
      <div className={`flex items-start gap-3.5 ${compact ? 'items-center' : ''}`}>
        <div className="shrink-0 mt-0.5">
          {icon || styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${styles.text}`}>{title}</h4>
          {message && <p className={`text-xs mt-0.5 ${styles.text} opacity-90 leading-relaxed`}>{message}</p>}
        </div>
        {(action || onClose) && (
          <div className="flex items-center gap-2 shrink-0">
            {action && (
              <button
                onClick={action.onClick}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-navy-200 text-navy-800 hover:bg-navy-50 shadow-xs transition`}
              >
                {action.label}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md text-navy-500 hover:text-navy-900 hover:bg-navy-100 transition"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
