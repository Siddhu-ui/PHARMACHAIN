import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Batch, BatchEvent } from '../types';
import { StatusBadge } from './StatusBadge';
import { LifecycleTimeline } from './LifecycleTimeline';
import { calculateExpiryDays, formatLifecycleStatus } from '../utils/dateUtils';
import {
  X, ExternalLink, Calendar, Building2, Package,
  MapPin, ShieldCheck, Clock, History, AlertTriangle, QrCode
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface BatchDetailsDrawerProps {
  batch: Batch | null;
  onClose: () => void;
  onCreateReturn?: (batch: Batch) => void;
}

export const BatchDetailsDrawer: React.FC<BatchDetailsDrawerProps> = ({
  batch,
  onClose,
  onCreateReturn
}) => {
  const [timelineEvents, setTimelineEvents] = useState<BatchEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    if (!batch) return;
    setLoadingTimeline(true);
    api.getBatchTimeline(batch.batch_number)
      .then((events) => setTimelineEvents(events || []))
      .catch(() => setTimelineEvents([]))
      .finally(() => setLoadingTimeline(false));
  }, [batch]);

  if (!batch) return null;

  const expiryEval = calculateExpiryDays(batch.expiry_date);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-navy-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-navy-200 animate-slide-in">
        {/* Header */}
        <div className="p-5 border-b border-navy-100 flex items-center justify-between bg-navy-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-clinical-800 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                {batch.batch_number}
              </span>
              <StatusBadge label={batch.status} size="sm" />
            </div>
            <h2 className="text-base font-bold text-navy-900 mt-1">
              {batch.medicine?.name || 'CardioSafe 10 mg Tablets'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-navy-200/50 text-navy-500 hover:text-navy-900 transition"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Status & Expiry Banner */}
          <div
            className={`p-4 rounded-xl border ${
              expiryEval.isExpired
                ? 'bg-critical-50 border-critical-200 text-critical-900'
                : expiryEval.isNearExpiry
                ? 'bg-warning-50 border-warning-200 text-warning-900'
                : 'bg-success-50 border-success-200 text-success-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                {expiryEval.isExpired ? 'Quarantine Enforced' : 'Expiry Classification'}
              </span>
              <span className="font-mono font-bold text-xs">{expiryEval.text}</span>
            </div>
            <p className="mt-1 text-xs opacity-90">
              Registered Expiry: {new Date(batch.expiry_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </p>
          </div>

          {/* Specification Grid */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-navy-400 mb-2.5">
              Batch Metadata & Custody
            </h3>
            <div className="grid grid-cols-2 gap-2.5 bg-navy-50/50 p-3.5 rounded-xl border border-navy-100">
              <div>
                <span className="text-[10px] text-navy-500 font-semibold uppercase block">Manufacturer</span>
                <span className="font-semibold text-navy-900 block mt-0.5">
                  {batch.manufacturer_name || 'BharatCure Pharma'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-navy-500 font-semibold uppercase block">Registered Strips</span>
                <span className="font-mono font-bold text-navy-900 block mt-0.5">
                  {batch.quantity} {batch.unit || 'STRIPS'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-navy-500 font-semibold uppercase block">Assigned Retailer</span>
                <span className="font-semibold text-navy-800 block mt-0.5">
                  {batch.assigned_retailer_name || 'Shree Medicals'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-navy-500 font-semibold uppercase block">Current Custody</span>
                <span className="font-semibold text-navy-800 block mt-0.5 truncate">
                  {batch.current_location || 'Shree Medicals, Bengaluru'}
                </span>
              </div>
            </div>
          </div>

          {/* Lifecycle State Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-navy-400">
                Reverse Chain Ledger Events ({timelineEvents.length})
              </h3>
              <Link
                to={`/batches/${batch.batch_number}`}
                onClick={onClose}
                className="text-clinical-700 hover:underline text-[11px] font-semibold inline-flex items-center gap-1"
              >
                <span>Full Ledger Page</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {loadingTimeline ? (
              <div className="p-6 text-center text-navy-400 font-medium">
                Loading cryptographic custody ledger...
              </div>
            ) : (
              <LifecycleTimeline events={timelineEvents} />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-navy-100 bg-white flex items-center justify-between gap-3">
          <Link
            to={`/batches/${batch.batch_number}`}
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-semibold text-xs transition"
          >
            Open Audit Trail & QR
          </Link>

          {expiryEval.isExpired && onCreateReturn && (
            <button
              onClick={() => {
                onClose();
                onCreateReturn(batch);
              }}
              className="px-4 py-2 rounded-lg bg-critical-600 hover:bg-critical-700 text-white font-bold text-xs shadow-xs transition"
            >
              Initiate Return Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
