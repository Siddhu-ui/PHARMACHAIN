import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading compliance data...' }) => {
  return (
    <div className="py-12 px-4 text-center">
      <div className="flex justify-center mb-3">
        <Loader2 className="w-8 h-8 text-clinical-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-navy-600">{message}</p>
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Data',
  message,
  action,
}) => {
  return (
    <div className="py-12 px-4 text-center max-w-md mx-auto">
      <div className="w-12 h-12 bg-critical-50 rounded-full flex items-center justify-center mx-auto mb-3 text-critical-600">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-navy-900 mb-1">{title}</h3>
      {message && <p className="text-xs text-navy-600 mb-4">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-clinical-600 text-white text-xs font-semibold rounded-lg hover:bg-clinical-700 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
}) => {
  return (
    <div className="py-12 px-4 text-center max-w-sm mx-auto">
      <div className="w-12 h-12 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-3 text-navy-400">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-navy-900 mb-1">{title}</h3>
      {message && <p className="text-xs text-navy-500 mb-4">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-clinical-600 text-white text-xs font-semibold rounded-lg hover:bg-clinical-700 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
