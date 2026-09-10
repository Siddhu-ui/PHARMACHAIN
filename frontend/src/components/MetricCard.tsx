import React from 'react';

export type MetricColor = 'clinical' | 'success' | 'warning' | 'critical' | 'navy';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: MetricColor;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
}

const colorMap: Record<MetricColor, { border: string; iconBg: string; iconColor: string; valueColor: string }> = {
  clinical: {
    border: 'border-clinical-200 hover:border-clinical-300',
    iconBg: 'bg-clinical-50',
    iconColor: 'text-clinical-700',
    valueColor: 'text-navy-900'
  },
  success: {
    border: 'border-success-200 hover:border-success-300',
    iconBg: 'bg-success-50',
    iconColor: 'text-success-700',
    valueColor: 'text-navy-900'
  },
  warning: {
    border: 'border-warning-200 hover:border-warning-300',
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-700',
    valueColor: 'text-navy-900'
  },
  critical: {
    border: 'border-critical-200 hover:border-critical-300',
    iconBg: 'bg-critical-50',
    iconColor: 'text-critical-700',
    valueColor: 'text-critical-700'
  },
  navy: {
    border: 'border-navy-200 hover:border-navy-300',
    iconBg: 'bg-navy-50',
    iconColor: 'text-navy-700',
    valueColor: 'text-navy-900'
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  color = 'clinical',
  subtitle,
  badge,
  onClick,
}) => {
  const styles = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`
        p-5 rounded-xl border bg-white shadow-xs transition-all duration-150
        ${styles.border}
        ${onClick ? 'cursor-pointer hover:shadow-sm' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${styles.iconBg} ${styles.iconColor}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-bold tracking-tight ${styles.valueColor}`}>{value}</p>
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-navy-100 text-navy-700">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-navy-500 mt-1">{subtitle}</p>}
    </div>
  );
};
