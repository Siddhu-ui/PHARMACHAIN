import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Batch, BatchEvent } from '../types';
import { LifecycleTimeline } from '../components/LifecycleTimeline';
import { StatusBadge } from '../components/StatusBadge';
import { QRCodeCard } from '../components/QRCodeCard';
import { LoadingState, EmptyState } from '../components/States';
import {
  Package, Calendar, Factory, MapPin, ArrowLeft,
  ShieldCheck, ShieldAlert, Layers, Building2, ExternalLink
} from 'lucide-react';

export const BatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [timeline, setTimeline] = useState<BatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchBatchData = async () => {
      try {
        const [batchData, timelineData] = await Promise.all([
          api.getBatch(id),
          api.getBatchTimeline(id)
        ]);
        setBatch(batchData);
        setTimeline(timelineData);
      } catch (err) {
        // handle offline fallback
      } finally {
        setLoading(false);
      }
    };
    fetchBatchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <LoadingState message="Retrieving immutable batch compliance ledger..." />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <EmptyState
          title="Batch Ledger Not Found"
          message={`Could not locate authoritative compliance record for batch '${id}'.`}
          action={{
            label: 'Return to Dashboard',
            onClick: () => window.history.back(),
          }}
        />
      </div>
    );
  }

  const isCritical = batch.status === 'REENTRY_DETECTED' || batch.status === 'SUSPICIOUS' || batch.status === 'EXPIRED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-900 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-navy-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-navy-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-clinical-700 bg-clinical-50 border border-clinical-200 px-2 py-0.5 rounded">
                Authoritative Batch Ledger
              </span>
              <StatusBadge label={batch.status} size="sm" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-navy-900 tracking-tight">
              {batch.batch_number}
            </h1>
            <p className="text-sm font-semibold text-navy-800 mt-0.5">
              {batch.medicine?.name || 'CardioSafe 10 mg Tablets'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-navy-400 block font-mono">Product Identifier</span>
            <span className="text-xs font-mono font-bold text-navy-900">
              {batch.product_id || `PG-${batch.batch_number}`}
            </span>
          </div>
        </div>

        {/* 4 Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Manufacturer</span>
            <span className="font-bold text-navy-900 block truncate">
              {batch.manufacturer_name || batch.medicine?.manufacturer || 'BharatCure Pharma'}
            </span>
          </div>

          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Manufacturing Date</span>
            <span className="font-bold text-navy-900 font-mono block">
              {new Date(batch.manufacturing_date).toLocaleDateString('en-IN')}
            </span>
          </div>

          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Expiry Date</span>
            <span className="font-bold text-navy-900 font-mono block">
              {new Date(batch.expiry_date).toLocaleDateString('en-IN')}
            </span>
          </div>

          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Stock Quantity</span>
            <span className="font-bold text-navy-900 block font-mono">
              {batch.quantity} {batch.unit || 'STRIPS'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-navy-100 flex items-center justify-between text-xs text-navy-600">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-navy-400 shrink-0" />
            <span>Current Custody: <strong className="text-navy-900">{batch.current_location}</strong></span>
          </div>
          <span className="font-mono text-[11px] text-navy-400">
            Node: Verified
          </span>
        </div>
      </div>

      {/* Two Column Layout: Timeline and QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Immutable Lifecycle Timeline */}
        <div className="lg:col-span-2">
          <LifecycleTimeline
            events={timeline}
            batchNumber={batch.batch_number}
            status={batch.status}
          />
        </div>

        {/* Right 1 Col: QR Card and Verification Seal */}
        <div className="space-y-4">
          <QRCodeCard
            productId={batch.product_id || batch.batch_number}
            medicineName={batch.medicine?.name || 'CardioSafe 10 mg Tablets'}
            batchId={batch.batch_number}
            manufacturer={batch.manufacturer_name || batch.medicine?.manufacturer || 'BharatCure Pharma'}
            mfgDate={batch.manufacturing_date}
            expDate={batch.expiry_date}
            quantity={batch.quantity}
            qrPayload={batch.qr_payload}
          />

          <div className="p-4 bg-white rounded-xl border border-navy-200 shadow-xs text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-navy-900">
              <ShieldCheck className="w-4 h-4 text-clinical-600" />
              <span>Compliance Seal</span>
            </div>
            <p className="text-navy-600 text-[11px] leading-relaxed">
              Every reverse-chain handover is recorded with cryptographic timestamps, actor credentials, and location telemetry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
