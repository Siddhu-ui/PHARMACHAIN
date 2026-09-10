import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-clinical-600 text-white hover:bg-clinical-700 active:bg-clinical-800 border border-clinical-700 shadow-xs',
  secondary: 'bg-white text-navy-800 hover:bg-navy-50 active:bg-navy-100 border border-navy-200 shadow-xs',
  danger: 'bg-critical-600 text-white hover:bg-critical-700 active:bg-critical-800 border border-critical-700 shadow-xs',
  outline: 'border border-clinical-600 text-clinical-700 hover:bg-clinical-50 active:bg-clinical-100 bg-white',
  ghost: 'text-navy-700 hover:bg-navy-100 active:bg-navy-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base font-semibold rounded-lg gap-2.5',
  xl: 'px-6 py-3.5 text-lg font-bold rounded-xl gap-3',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center font-medium transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-clinical-500 focus:ring-offset-1
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isLoading ? 'opacity-80' : ''}
        ${className}
      `}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
