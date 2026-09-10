import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  action,
  children,
}) => {
  return (
    <div className="mb-6 pb-4 border-b border-navy-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-clinical-50 border border-clinical-200 flex items-center justify-center text-clinical-700 shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-navy-900">{title}</h1>
              {badge && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-clinical-50 text-clinical-700 border border-clinical-200">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-navy-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {children}
          {action && (
            <button
              onClick={action.onClick}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-xs
                ${
                  action.variant === 'secondary'
                    ? 'bg-white border border-navy-200 text-navy-800 hover:bg-navy-50'
                    : action.variant === 'danger'
                    ? 'bg-critical-600 text-white hover:bg-critical-700'
                    : 'bg-clinical-600 text-white hover:bg-clinical-700'
                }
              `}
            >
              {action.icon && <span className="shrink-0">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
