import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Batch, DestructionRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Factory, ShieldCheck, Flame, FileCheck, CheckCircle2,
  AlertTriangle, Upload, Eye, Check, Clock, ArrowRight, MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

export const ManufacturerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Quarantine Receipt modal
  const [receiveBatchTarget, setReceiveBatchTarget] = useState<Batch | null>(null);
  const [receivedCount, setReceivedCount] = useState<number>(100);

  // Destruction Certificate Modal
  const [destructTarget, setDestructTarget] = useState<Batch | null>(null);
  const [facilityName, setFacilityName] = useState('EcoSafe Bio-Medical Destruction Facility');
  const [certNumber, setCertNumber] = useState('CERT-ECO-2026-PCM123');
  const [destroyQty, setDestroyQty] = useState(100);
  const [verificationResult, setVerificationResult] = useState<{ is_valid: boolean; status: string; discrepancies: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBatches = async () => {
    try {
      const data = await api.getBatches();
      setBatches(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleOpenReceive = (batch: Batch) => {
    setReceiveBatchTarget(batch);
    setReceivedCount(batch.quantity);
  };

  const handleConfirmReceive = async () => {
    if (!receiveBatchTarget) return;
    setSubmitting(true);
    try {
      await api.receiveByManufacturer(receiveBatchTarget.id, receivedCount, 'Physical quarantine inspection passed');
      setStatusMsg(`✅ Batch ${receiveBatchTarget.batch_number} received in Quarantine Bay!`);
      setReceiveBatchTarget(null);
      await loadBatches();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      alert(`Error receiving batch: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDestruction = (batch: Batch) => {
    setDestructTarget(batch);
    setDestroyQty(batch.quantity);
    setCertNumber(`CERT-ECO-2026-${batch.batch_number}`);
    setVerificationResult(null);
  };

  const handleVerifyCert = async () => {
    if (!destructTarget) return;
    setSubmitting(true);
    try {
      const res = await api.verifyCertificate({
        batch_number: destructTarget.batch_number,
        certificate_number: certNumber,
        facility_name: facilityName,
        quantity: destroyQty
      });
      setVerificationResult(res);
    } catch (err: any) {
      alert(`Certificate verification failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalConfirmDestruction = async () => {
    if (!destructTarget) return;
    setSubmitting(true);
    try {
      await api.confirmDestruction({
        batch_id: destructTarget.id,
        waste_facility_id: 'waste_eco_01',
        waste_facility_name: facilityName,
        certificate_number: certNumber,
        destroyed_quantity: destroyQty,
        certificate_url: `/certificates/${certNumber}.pdf`
      });

      confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
      setStatusMsg(`🔥 Batch ${destructTarget.batch_number} verified destroyed! Status updated to DESTRUCTION_VERIFIED.`);
      setDestructTarget(null);
      await loadBatches();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      alert(`Destruction confirmation error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const returnsInTransit = batches.filter(b => b.status === 'PICKUP_CONFIRMED' || b.status === 'IN_TRANSIT');
  const inQuarantine = batches.filter(b => b.status === 'RECEIVED_BY_MANUFACTURER');
  const destroyedBatches = batches.filter(b => b.status === 'DESTRUCTION_VERIFIED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">
            <Factory className="w-3.5 h-3.5" /> {currentUser?.organization || 'Sun Pharma Laboratories Ltd. - QA Division'}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Manufacturer QA & Authorized Destruction
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quarantine incoming reverse batches, verify authorized bio-medical waste certificates, and seal destruction ledgers.
          </p>
        </div>

        <Link
          to="/scan"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition self-start sm:self-auto shadow-lg shadow-indigo-500/20"
        >
          <span>Verify Incoming Batch</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-blue-950/20 border border-blue-500/30">
          <div className="flex items-center justify-between text-xs text-blue-400 font-bold uppercase tracking-wider">
            <span>Inbound From Distributors</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">{returnsInTransit.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting physical intake</p>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-bold uppercase tracking-wider">
            <span>In Quarantine Bay</span>
            <Factory className="w-4 h-4" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">{inQuarantine.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for authorized destruction</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Verified Destroyed</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">{destroyedBatches.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Certified sealed ledgers</p>
        </div>
      </div>

      {/* Inbound Returns Awaiting Receipt */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden glass-panel">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Inbound Returns Awaiting QA Receipt ({returnsInTransit.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Batch No</th>
                <th className="px-6 py-3">Medicine</th>
                <th className="px-6 py-3">Current Location</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {returnsInTransit.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No inbound shipments pending intake. Complete distributor pickup first.
                  </td>
                </tr>
              ) : (
                returnsInTransit.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">{b.batch_number}</td>
                    <td className="px-6 py-4 font-semibold text-white">{b.medicine?.name || 'Paracetamol 500mg'}</td>
                    <td className="px-6 py-4 text-slate-300">{b.current_location}</td>
                    <td className="px-6 py-4 font-mono">{b.quantity} {b.unit}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenReceive(b)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
                      >
                        Confirm QA Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarantine Bay & Destruction Scheduler */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden glass-panel">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Quarantine Bay — Pending Bio-Medical Waste Destruction ({inQuarantine.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Batch No</th>
                <th className="px-6 py-3">Medicine</th>
                <th className="px-6 py-3">Bay Location</th>
                <th className="px-6 py-3">Quarantine Qty</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {inQuarantine.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No batches currently residing in quarantine bay.
                  </td>
                </tr>
              ) : (
                inQuarantine.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">{b.batch_number}</td>
                    <td className="px-6 py-4 font-semibold text-white">{b.medicine?.name || 'Paracetamol 500mg'}</td>
                    <td className="px-6 py-4 text-slate-300">{b.current_location}</td>
                    <td className="px-6 py-4 font-mono">{b.quantity} {b.unit}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDestruction(b)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition"
                      >
                        Upload & Verify Destruction Cert
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarantine Receive Modal */}
      {receiveBatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Factory className="w-5 h-5 text-indigo-400" />
              Confirm Quarantine Intake
            </h3>
            <div className="p-3 bg-slate-950 rounded-xl text-xs space-y-1 font-mono text-slate-300">
              <div><span className="text-slate-500">Batch:</span> {receiveBatchTarget.batch_number}</div>
              <div><span className="text-slate-500">Medicine:</span> {receiveBatchTarget.medicine?.name}</div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Received Unit Count</label>
              <input
                type="number"
                value={receivedCount}
                onChange={(e) => setReceivedCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReceiveBatchTarget(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceive}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                {submitting ? 'Logging...' : 'Confirm Quarantine Bay Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Destruction Modal */}
      {destructTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                Destruction Certificate Reconciliation
              </h3>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl text-xs space-y-1 font-mono text-slate-300">
              <div><span className="text-slate-500">Target Batch:</span> {destructTarget.batch_number}</div>
              <div><span className="text-slate-500">Expected Destruction Qty:</span> {destructTarget.quantity} Strips</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Certificate Serial Number</label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Authorized Waste Facility</label>
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Certified Destroyed Quantity</label>
                <input
                  type="number"
                  value={destroyQty}
                  onChange={(e) => setDestroyQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              {verificationResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    verificationResult.is_valid
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {verificationResult.is_valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        CERTIFICATE VALIDATED & MATCHED
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        CERTIFICATE DISCREPANCIES DETECTED
                      </>
                    )}
                  </div>
                  {verificationResult.discrepancies.map((d, i) => (
                    <p key={i}>&bull; {d}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => setDestructTarget(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleVerifyCert}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
                >
                  Verify Certificate
                </button>

                {verificationResult?.is_valid && (
                  <button
                    onClick={handleFinalConfirmDestruction}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    Confirm Destruction (Seal Ledger)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
