import React from 'react';
import { BatchEvent } from '../types';
import {
  ShieldCheck, Truck, Clock, AlertTriangle, Flame,
  FileCheck, CheckCircle2, MapPin, User, Package
} from 'lucide-react';

interface Props {
  events: BatchEvent[];
}

export const BatchTimeline: React.FC<Props> = ({ events }) => {
  const getEventIcon = (type: string) => {
    if (type.includes('REENTRY') || type.includes('TAMPERING') || type.includes('MISMATCH')) {
      return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
    if (type.includes('DESTRUCTION')) {
      return <Flame className="w-5 h-5 text-amber-400" />;
    }
    if (type.includes('PICKUP') || type.includes('TRANSIT') || type.includes('DISTRIBUTED')) {
      return <Truck className="w-5 h-5 text-blue-400" />;
    }
    if (type.includes('RETURN')) {
      return <Clock className="w-5 h-5 text-purple-400" />;
    }
    if (type.includes('RECEIVED')) {
      return <FileCheck className="w-5 h-5 text-indigo-400" />;
    }
    return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
  };

  const getEventBadgeColor = (type: string) => {
    if (type.includes('REENTRY') || type.includes('TAMPERING')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (type.includes('DESTRUCTION')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    if (type.includes('PICKUP') || type.includes('TRANSIT')) {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  };

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        No chain of custody events recorded for this batch yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-700">
      {events.map((ev) => {
        let metaObj: any = null;
        if (ev.metadata_json) {
          try {
            metaObj = JSON.parse(ev.metadata_json);
          } catch {
            metaObj = null;
          }
        }

        const isFraudEvent = ev.event_type.includes('REENTRY') || ev.event_type.includes('TAMPERING');

        return (
          <div key={ev.id} className="relative group">
            {/* Timeline Dot/Icon */}
            <div
              className={`absolute -left-[30px] top-1 p-1.5 rounded-full border shadow-lg ${
                isFraudEvent
                  ? 'bg-rose-950 border-rose-500 text-rose-400 ring-4 ring-rose-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              {getEventIcon(ev.event_type)}
            </div>

            {/* Event Content Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isFraudEvent
                  ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border tracking-wide uppercase ${getEventBadgeColor(
                    ev.event_type
                  )}`}
                >
                  {ev.event_type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(ev.timestamp).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Actor & Organization */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mb-2">
                {(ev.actor_name || ev.organization_name) && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {ev.actor_name}
                      {ev.organization_name && ev.actor_name !== ev.organization_name
                        ? ` (${ev.organization_name})`
                        : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ev.location}</span>
                </div>
                {ev.quantity && (
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {ev.quantity} Units {ev.weight ? `(${ev.weight} kg)` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Metadata / Details */}
              {metaObj && (
                <div className="mt-2 text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 font-mono text-slate-300 space-y-1">
                  {Object.entries(metaObj).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-slate-500 uppercase tracking-wider">{k}:</span>
                      <span className={k.toLowerCase().includes('reason') || k.toLowerCase().includes('fraud') ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Evidence Link */}
              {ev.evidence_url && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cryptographic Proof / Manifest Attached: <code className="text-slate-300">{ev.evidence_url}</code></span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
