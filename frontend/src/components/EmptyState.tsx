import React from 'react';
import { Inbox } from 'lucide-react';

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
    <div className="py-10 px-4 text-center max-w-sm mx-auto">
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
