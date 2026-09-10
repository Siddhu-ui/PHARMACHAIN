import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ReturnRequest, Pickup, Batch } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Truck, CheckCircle2, AlertTriangle, Package, Scale,
  Upload, FileText, ArrowRight, ShieldAlert, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DistributorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [activeReq, setActiveReq] = useState<ReturnRequest | null>(null);
  const [actualQty, setActualQty] = useState<number>(100);
  const [actualWeight, setActualWeight] = useState<number>(5.2);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [reqs, pickupList] = await Promise.all([
        api.getReturns(),
        api.getPickups()
      ]);
      setReturnRequests(reqs);
      setPickups(pickupList);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPickupModal = (req: ReturnRequest) => {
    setActiveReq(req);
    setActualQty(req.quantity);
    setActualWeight(5.2);
  };

  const handleConfirmPickup = async () => {
    if (!activeReq) return;
    setSubmitting(true);
    try {
      const res = await api.confirmPickup({
        return_request_id: activeReq.id,
        expected_quantity: activeReq.quantity,
        actual_quantity: actualQty,
        actual_weight: actualWeight,
        evidence_url: '/evidence/manifest_signoff_apex.pdf'
      });

      if (res.status === 'QUANTITY_MISMATCH') {
        setStatusMsg(`⚠️ Quantity mismatch logged! Expected ${activeReq.quantity}, actual ${actualQty}. Incident created.`);
      } else {
        setStatusMsg(`✅ Pickup confirmed for Batch ${activeReq.batch?.batch_number || activeReq.batch_id}. Status: IN_TRANSIT.`);
      }

      setActiveReq(null);
      await loadData();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      alert(`Error confirming pickup: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider mb-1">
            <Truck className="w-3.5 h-3.5" /> {currentUser?.organization || 'Apex Healthcare Logistics Ltd.'}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Reverse Logistics Transit & Pickup Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure custody handoffs, physical weight & count reconciliation, and tamper-resistant chain-of-custody logging.
          </p>
        </div>

        <Link
          to="/scan"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition self-start sm:self-auto shadow-lg shadow-blue-500/20"
        >
          <span>Scan Batch for Pickup</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Pending Pickups Queue */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden glass-panel">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" />
            Pending Pharmacy Pickup Requests ({returnRequests.filter(r => r.status === 'PENDING_PICKUP').length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Batch Number</th>
                <th className="px-6 py-3">Medicine</th>
                <th className="px-6 py-3">Retail Pharmacy</th>
                <th className="px-6 py-3">Expected Qty</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {returnRequests.filter(r => r.status === 'PENDING_PICKUP').length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No pending pickup requests. Check Hackathon Demo Step 2 to generate a test return!
                  </td>
                </tr>
              ) : (
                returnRequests
                  .filter(r => r.status === 'PENDING_PICKUP')
                  .map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                        {req.batch?.batch_number || req.batch_id}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {req.batch?.medicine?.name || 'Paracetamol 500mg'}
                      </td>
                      <td className="px-6 py-4">
                        {req.retailer_name || req.retailer_id}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {req.quantity} STRIPS
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenPickupModal(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                        >
                          Confirm Pickup
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pickup History & Weight Reconciliations */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 glass-panel space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          Confirmed Pickups & Manifest Ledger
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Pickup ID</th>
                <th className="px-4 py-2.5">Expected Qty</th>
                <th className="px-4 py-2.5">Actual Qty</th>
                <th className="px-4 py-2.5">Actual Weight</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {pickups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500">
                    No confirmed pickups recorded yet.
                  </td>
                </tr>
              ) : (
                pickups.map((p) => {
                  const isMismatch = p.status === 'QUANTITY_MISMATCH';
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-slate-400">{p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-mono">{p.expected_quantity}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">{p.actual_quantity}</td>
                      <td className="px-4 py-3 font-mono">{p.actual_weight || 5.2} kg</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isMismatch
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {new Date(p.pickup_time).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400">
                        Manifest Signed
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pickup Confirmation Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-400" />
              Confirm Reverse Logistics Pickup
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl text-xs space-y-1 font-mono text-slate-300">
              <div><span className="text-slate-500">Batch Number:</span> {activeReq.batch?.batch_number || activeReq.batch_id}</div>
              <div><span className="text-slate-500">Retailer Node:</span> {activeReq.retailer_name}</div>
              <div><span className="text-slate-500">Expected Count:</span> {activeReq.quantity} Strips</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Actual Physical Count Scanned / Counted
                </label>
                <input
                  type="number"
                  value={actualQty}
                  onChange={(e) => setActualQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
                {actualQty !== activeReq.quantity && (
                  <p className="text-[11px] text-rose-400 mt-1 font-semibold">
                    ⚠️ Mismatch detected! Expected {activeReq.quantity} vs entered {actualQty}. Will trigger anomaly flag (+20 risk).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Actual Cargo Scale Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="text-[11px] text-slate-400">
                  <span className="font-bold text-slate-300 block">Digital Manifest Attached</span>
                  GPS waypoint & driver biometric signoff will be logged to immutable ledger.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveReq(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPickup}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
              >
                {submitting ? 'Verifying...' : 'Sign & Handoff Cargo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
