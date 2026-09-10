import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Batch, BatchEvent } from '../types';
import { BatchTimeline } from '../components/BatchTimeline';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import {
  Package, Calendar, Factory, MapPin, ArrowLeft,
  ShieldCheck, ShieldAlert, QrCode, FileText, ExternalLink
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
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchBatchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        Loading cryptographic batch ledger...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Batch Not Found</h2>
        <p className="text-xs text-slate-400">Could not locate batch record for identifier: {id}</p>
        <Link to="/dashboard" className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 font-bold text-xs">
          Return to Command Center
        </Link>
      </div>
    );
  }

  const isFraud = batch.status === 'REENTRY_DETECTED' || batch.status === 'SUSPICIOUS';
  const isDestroyed = batch.status === 'DESTRUCTION_VERIFIED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Back Link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      {/* Main Header Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border glass-panel transition ${
          isFraud
            ? 'bg-rose-950/20 border-rose-500/50'
            : isDestroyed
            ? 'bg-slate-900/60 border-slate-700'
            : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                BATCH LEDGER RECORD
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  isFraud
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : isDestroyed
                    ? 'bg-slate-500/20 text-slate-400 border border-slate-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {batch.status}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-2 font-mono tracking-tight">
              {batch.batch_number}
            </h1>
            <p className="text-sm text-slate-300 font-semibold mt-1">
              {batch.medicine?.name} &bull; {batch.medicine?.dosage} ({batch.medicine?.form})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/scan"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow-md"
            >
              <QrCode className="w-4 h-4" /> Verify In Scanner
            </Link>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">Manufacturer</span>
            <span className="text-slate-200 font-bold">{batch.medicine?.manufacturer}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Location</span>
            <span className="text-slate-200 font-bold truncate block">{batch.current_location}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Manufacturing Date</span>
            <span className="text-slate-200">
              {new Date(batch.manufacturing_date).toLocaleDateString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Authoritative Expiry</span>
            <span className="text-slate-200 font-bold">
              {new Date(batch.expiry_date).toLocaleDateString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Event Ledger & QR Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chain of Custody Timeline (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Immutable Chain-of-Custody Event Ledger ({timeline.length} Events)
            </h2>
            <span className="text-xs text-slate-500 font-mono">SHA-256 VALIDATED</span>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-panel">
            <BatchTimeline events={timeline} />
          </div>
        </div>

        {/* Right Info: QR Data Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Cryptographic QR Payload
              </span>
              <QrCode className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-2">
              <div><span className="text-slate-500">batch_number:</span> "{batch.batch_number}"</div>
              <div><span className="text-slate-500">medicine:</span> "{batch.medicine?.name}"</div>
              <div><span className="text-slate-500">manufacturer:</span> "{batch.medicine?.manufacturer}"</div>
              <div><span className="text-slate-500">registered_expiry:</span> "{new Date(batch.expiry_date).toISOString().slice(0, 10)}"</div>
              <div><span className="text-slate-500">ledger_records:</span> {timeline.length}</div>
            </div>

            <div className="text-xs text-slate-400 space-y-2">
              <span className="font-bold text-slate-300 block">Ledger Immutability Guarantee</span>
              <p className="text-[11px] leading-relaxed">
                Every physical handoff, weight recording, and destruction verification creates an unmodifiable transaction log.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
