import React from 'react';
import { BatchEvent } from '../types';
import {
  Package, Store, Truck, Building2, Flame,
  FileCheck, AlertOctagon, CheckCircle2, Clock, MapPin, User
} from 'lucide-react';

interface LifecycleTimelineProps {
  events: BatchEvent[];
  batchNumber?: string;
  status?: string;
}

const getEventIcon = (eventType: string) => {
  const type = (eventType || '').toUpperCase();
  if (type.includes('REGISTER')) return <Package className="w-4 h-4 text-clinical-600" />;
  if (type.includes('RETAIL') || type.includes('PHARMACY')) return <Store className="w-4 h-4 text-clinical-700" />;
  if (type.includes('RETURN')) return <Clock className="w-4 h-4 text-warning-600" />;
  if (type.includes('PICKUP') || type.includes('TRANSIT')) return <Truck className="w-4 h-4 text-warning-600" />;
  if (type.includes('MANUFACTURER') || type.includes('QUARANTINE')) return <Building2 className="w-4 h-4 text-clinical-700" />;
  if (type.includes('DESTRUCT') && !type.includes('VERIFIED')) return <Flame className="w-4 h-4 text-warning-600" />;
  if (type.includes('DESTRUCTION_VERIFIED') || type.includes('CLOSED')) return <CheckCircle2 className="w-4 h-4 text-success-600" />;
  if (type.includes('CERTIFICATE')) return <FileCheck className="w-4 h-4 text-success-600" />;
  if (type.includes('REENTRY') || type.includes('FRAUD') || type.includes('TAMPER')) return <AlertOctagon className="w-4 h-4 text-critical-600" />;
  return <Package className="w-4 h-4 text-navy-500" />;
};

const getEventBadge = (eventType: string) => {
  const type = (eventType || '').toUpperCase();
  if (type.includes('DESTRUCTION_VERIFIED') || type.includes('CLOSED')) {
    return 'bg-success-50 text-success-800 border-success-200';
  }
  if (type.includes('REENTRY') || type.includes('TAMPER') || type.includes('FRAUD')) {
    return 'bg-critical-50 text-critical-800 border-critical-200';
  }
  if (type.includes('RETURN') || type.includes('PICKUP') || type.includes('TRANSIT') || type.includes('SCHEDULED')) {
    return 'bg-warning-50 text-warning-800 border-warning-200';
  }
  return 'bg-clinical-50 text-clinical-800 border-clinical-200';
};

export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({
  events = [],
  batchNumber,
  status,
}) => {
  // Sort chronological ascending or descending
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs">
      {batchNumber && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-400">
              Audit Ledger Chain
            </span>
            <h3 className="text-base font-bold text-navy-900 font-mono">{batchNumber}</h3>
          </div>
          {status && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-navy-50 text-navy-800 border-navy-200">
              Status: {status}
            </span>
          )}
        </div>
      )}

      {sortedEvents.length === 0 ? (
        <div className="py-8 text-center text-navy-400 text-xs">
          No audit events recorded for this batch yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-200">
          {sortedEvents.map((event, idx) => {
            let metadataObj: any = null;
            if (event.metadata_json) {
              try {
                metadataObj = typeof event.metadata_json === 'string' ? JSON.parse(event.metadata_json) : event.metadata_json;
              } catch {
                // ignore
              }
            }

            return (
              <div key={event.id || idx} className="relative group">
                {/* Node icon */}
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-navy-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-clinical-500 transition">
                  {getEventIcon(event.event_type)}
                </div>

                <div className="bg-navy-50/50 hover:bg-navy-50 p-3.5 rounded-lg border border-navy-100 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getEventBadge(event.event_type)}`}>
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      {event.quantity && (
                        <span className="text-xs font-semibold text-navy-700">
                          {event.quantity} Strips
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-navy-500 font-mono">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>

                  {/* Actor and Organization info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-navy-700 mt-2">
                    {(event.organization_name || event.actor_name) && (
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-navy-400 shrink-0" />
                        <span className="font-semibold text-navy-900">{event.organization_name || 'Organization'}</span>
                        {event.actor_name && <span className="text-navy-500">({event.actor_name})</span>}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-navy-400 shrink-0" />
                        <span className="text-navy-600 truncate">{event.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata / Certificate info if available */}
                  {metadataObj && Object.keys(metadataObj).length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-navy-200/60 text-[11px] font-mono text-navy-600 flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(metadataObj).map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1">
                          <span className="text-navy-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                          <span className="font-semibold text-navy-800">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
