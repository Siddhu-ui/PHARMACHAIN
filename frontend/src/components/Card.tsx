import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hover = false,
  title,
  subtitle,
  icon,
  action,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-navy-200 rounded-xl p-5 shadow-xs
        ${hover ? 'hover:shadow-sm hover:border-navy-300 transition-all' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-navy-600 flex items-center">{icon}</span>}
            <div>
              {title && <h3 className="text-sm font-semibold text-navy-900">{title}</h3>}
              {subtitle && <p className="text-xs text-navy-500">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
