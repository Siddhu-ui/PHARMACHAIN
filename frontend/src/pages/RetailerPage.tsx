import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Batch, ReturnRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle, Clock, ArrowRight, CheckCircle2, RotateCcw,
  Package, Plus, Calendar, ShieldCheck, MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RetailerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'expired' | '30days' | '60days'>('expired');
  const [loading, setLoading] = useState(true);

  // Return modal state
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [returnQty, setReturnQty] = useState<number>(100);
  const [returnReason, setReturnReason] = useState<string>('EXPIRED');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [batchList, returns] = await Promise.all([
        api.getBatches(),
        api.getReturns()
      ]);
      setBatches(batchList);
      setReturnRequests(returns);
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();

  const expiredBatches = batches.filter(b => new Date(b.expiry_date) <= now && b.status !== 'DESTRUCTION_VERIFIED');
  const expiring30 = batches.filter(b => {
    const exp = new Date(b.expiry_date);
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 30;
  });
  const expiring60 = batches.filter(b => {
    const exp = new Date(b.expiry_date);
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays > 30 && diffDays <= 60;
  });

  const getFilteredBatches = () => {
    if (selectedCategory === 'expired') return expiredBatches;
    if (selectedCategory === '30days') return expiring30;
    if (selectedCategory === '60days') return expiring60;
    return batches;
  };

  const handleOpenReturnModal = (batch: Batch) => {
    setSelectedBatch(batch);
    setReturnQty(batch.quantity);
  };

  const handleSubmitReturn = async () => {
    if (!selectedBatch) return;
    setSubmitting(true);
    try {
      await api.createReturnRequest(selectedBatch.id, returnQty, returnReason);
      setSuccessMsg(`Return request created successfully for batch ${selectedBatch.batch_number}!`);
      setSelectedBatch(null);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error creating return request: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5" /> {currentUser?.organization || 'Apollo Pharmacy - Indiranagar'}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Pharmacy Expiry & Return Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor shelf expiries, isolate expired medicines, and initiate compliant reverse chain returns.
          </p>
        </div>

        <Link
          to="/retailer/verify"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition self-start sm:self-auto shadow-lg shadow-emerald-600/20"
        >
          <span>Verify Medicine Before Sale</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Expiry Category Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedCategory('expired')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedCategory === 'expired'
              ? 'bg-rose-950/40 border-rose-500 text-rose-300 ring-2 ring-rose-500/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Expired Batches</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-2">{expiredBatches.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Eligible for reverse return</p>
        </button>

        <button
          onClick={() => setSelectedCategory('30days')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedCategory === '30days'
              ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">&lt; 30 Days</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-2">{expiring30.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Flagged for close monitoring</p>
        </button>

        <button
          onClick={() => setSelectedCategory('60days')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedCategory === '60days'
              ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">&lt; 60 Days</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-2">{expiring60.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Upcoming cycle</p>
        </button>

        <button
          onClick={() => setSelectedCategory('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedCategory === 'all'
              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">All Inventory</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-2">{batches.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total registered batches</p>
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden glass-panel">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Medicine Batches ({getFilteredBatches().length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {selectedCategory.toUpperCase()} FILTER ACTIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Batch No</th>
                <th className="px-6 py-3">Medicine</th>
                <th className="px-6 py-3">Manufacturer</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Expiry Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {getFilteredBatches().map((batch) => {
                const isExp = new Date(batch.expiry_date) <= now;
                return (
                  <tr key={batch.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                      <Link to={`/batches/${batch.id}`} className="hover:underline">
                        {batch.batch_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {batch.medicine?.name || 'Paracetamol 500mg'}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {batch.medicine?.dosage} &bull; {batch.medicine?.form}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {batch.medicine?.manufacturer || 'Sun Pharma'}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {batch.quantity} {batch.unit}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className={isExp ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {new Date(batch.expiry_date).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                          batch.status === 'EXPIRED'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : batch.status === 'RETURN_REQUESTED'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : batch.status === 'DESTRUCTION_VERIFIED'
                            ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {batch.status === 'EXPIRED' ? (
                        <button
                          onClick={() => handleOpenReturnModal(batch)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                        >
                          Create Return Request
                        </button>
                      ) : (
                        <Link
                          to={`/batches/${batch.id}`}
                          className="text-xs text-slate-400 hover:text-emerald-400 transition"
                        >
                          View Ledger
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Requests History */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 glass-panel space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-purple-400" />
          Active Reverse Logistics Return Requests
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Request ID</th>
                <th className="px-4 py-2.5">Batch</th>
                <th className="px-4 py-2.5">Quantity</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {returnRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
                    No active return requests.
                  </td>
                </tr>
              ) : (
                returnRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-3 font-mono text-slate-400">{req.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{req.batch?.batch_number || req.batch_id}</td>
                    <td className="px-4 py-3 font-mono">{req.quantity} Units</td>
                    <td className="px-4 py-3">{req.reason}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {new Date(req.created_at).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Request Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Reverse Logistics Return</h3>
            <div className="p-3 bg-slate-950 rounded-xl text-xs space-y-1 font-mono text-slate-300">
              <div><span className="text-slate-500">Batch:</span> {selectedBatch.batch_number}</div>
              <div><span className="text-slate-500">Medicine:</span> {selectedBatch.medicine?.name}</div>
              <div><span className="text-slate-500">Expiry Date:</span> {new Date(selectedBatch.expiry_date).toLocaleDateString()}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Return Quantity (Strips)</label>
                <input
                  type="number"
                  value={returnQty}
                  onChange={(e) => setReturnQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="EXPIRED">Shelf Expiry Reached</option>
                  <option value="DAMAGED_PACKAGE">Damaged Seal / Packaging</option>
                  <option value="BATCH_RECALL">Manufacturer Batch Recall</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition"
              >
                {submitting ? 'Submitting...' : 'Dispatch Return Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
