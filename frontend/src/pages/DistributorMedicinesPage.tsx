import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DistributorAccountingItem } from '../types';
import {
  Truck, Package, ArrowRight, RefreshCw, Send, CheckCircle2,
  Store, AlertCircle, AlertTriangle
} from 'lucide-react';

export const DistributorMedicinesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<DistributorAccountingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<DistributorAccountingItem | null>(null);

  // Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [targetBatch, setTargetBatch] = useState<DistributorAccountingItem | null>(null);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [allocateQty, setAllocateQty] = useState<number>(1);
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [allocateSuccess, setAllocateSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [medData, retData] = await Promise.all([
        api.getDistributorMedicines(),
        api.getDistributorRetailers()
      ]);
      setMedicines(medData);
      setRetailers(retData);
      if (retData.length > 0 && !selectedRetailerId) {
        setSelectedRetailerId(retData[0].id);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAllocateModal = (batch: DistributorAccountingItem) => {
    setTargetBatch(batch);
    setAllocateQty(Math.min(batch.remaining_count, 5) || 1);
    setAllocateError(null);
    setAllocateSuccess(null);
    setShowAllocateModal(true);
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBatch) return;
    setAllocateError(null);
    setAllocateSuccess(null);

    if (allocateQty > targetBatch.remaining_count) {
      setAllocateError(`Cannot allocate more than remaining stock (${targetBatch.remaining_count} units).`);
      return;
    }

    const retObj = retailers.find(r => r.id === selectedRetailerId);
    const retName = retObj?.name || 'Retail Pharmacy';

    setAllocating(true);
    try {
      // Find distributor ID
      const users = await api.getUsers();
      const distUser = users.find(u => u.role === 'DISTRIBUTOR');
      const distId = distUser?.organization_id || 'dist-1';

      await api.allocateSerials({
        distributor_id: distId,
        retailer_id: selectedRetailerId,
        retailer_name: retName,
        batch_number: targetBatch.batch_number,
        quantity: allocateQty
      });

      setAllocateSuccess(`Successfully allocated ${allocateQty} units of ${targetBatch.batch_number} to ${retName}!`);
      loadData();
      setTimeout(() => {
        setShowAllocateModal(false);
      }, 1500);
    } catch (err: any) {
      setAllocateError(err.message || 'Stock allocation failed.');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Distributor Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Received Medicines & Retailer Allocation</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time accounting equation: <strong className="text-white font-mono">RECEIVED - DISTRIBUTED = REMAINING STOCK</strong>
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Accounting Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 px-4 font-bold">Medicine</th>
                <th className="py-3.5 px-4 font-bold">Batch</th>
                <th className="py-3.5 px-4 font-bold">Manufacturer</th>
                <th className="py-3.5 px-4 font-bold">Received (A)</th>
                <th className="py-3.5 px-4 font-bold">Distributed (B)</th>
                <th className="py-3.5 px-4 font-bold">Remaining (A - B)</th>
                <th className="py-3.5 px-4 font-bold">Expiry Date</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {medicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                    {loading ? 'Calculating distributor inventory accounting...' : 'No received medicine batches.'}
                  </td>
                </tr>
              ) : (
                medicines.map((m) => (
                  <tr key={m.batch_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>{m.medicine_name}</div>
                      <div className="text-[10px] text-cyan-400 font-mono">{m.strength}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{m.batch_number}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{m.manufacturer_name}</td>
                    <td className="py-3.5 px-4 font-bold text-white font-mono">{m.received_count} units</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">{m.distributed_count} units</td>
                    <td className="py-3.5 px-4 font-bold font-mono">
                      <span className={`px-2 py-0.5 rounded ${
                        m.remaining_count > 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {m.remaining_count} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {m.expiry_date}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedBatch(selectedBatch?.batch_id === m.batch_id ? null : m)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition"
                      >
                        {selectedBatch?.batch_id === m.batch_id ? 'Hide Serials' : 'View Serials'}
                      </button>

                      <button
                        onClick={() => openAllocateModal(m)}
                        disabled={m.remaining_count <= 0}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-[11px] transition disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Allocate Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Serials & Retailer Distribution Viewer */}
      {selectedBatch && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Serial Breakdown for Batch {selectedBatch.batch_number}</span>
              </h2>
              <div className="text-xs text-slate-400 mt-0.5">
                Received: {selectedBatch.received_count} &bull; Distributed: {selectedBatch.distributed_count} &bull; Remaining: {selectedBatch.remaining_count}
              </div>
            </div>
            <button
              onClick={() => setSelectedBatch(null)}
              className="text-xs text-slate-500 hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Retailers breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {selectedBatch.retailers.map((r) => (
              <div key={r.retailer_name} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    {r.retailer_name}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold text-xs">{r.count} units</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-400">
                  {r.serials.map((s) => (
                    <Link
                      key={s}
                      to={`/manufacturer/products/${s}`}
                      className="block hover:text-emerald-300"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Remaining serials in distributor possession */}
          {selectedBatch.remaining_serials && selectedBatch.remaining_serials.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-blue-500/30 space-y-2">
              <div className="text-xs font-mono font-bold text-blue-400 uppercase">
                Stock in Distributor Storage ({selectedBatch.remaining_serials.length} Units)
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                {selectedBatch.remaining_serials.map((s) => (
                  <Link
                    key={s}
                    to={`/manufacturer/products/${s}`}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-blue-300"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocateModal && targetBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <span>Allocate Stock to Retailer</span>
              </h3>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono">
              <div>Batch: <strong className="text-white">{targetBatch.batch_number}</strong> ({targetBatch.medicine_name})</div>
              <div>Available Distributor Stock: <strong className="text-blue-400">{targetBatch.remaining_count} units</strong></div>
            </div>

            {allocateError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{allocateError}</span>
              </div>
            )}

            {allocateSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{allocateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Select Retailer (Pharmacy)
                </label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 outline-none font-mono"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Quantity to Transfer (Max {targetBatch.remaining_count})
                </label>
                <input
                  type="number"
                  min={1}
                  max={targetBatch.remaining_count}
                  value={allocateQty}
                  onChange={(e) => setAllocateQty(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-500 outline-none font-mono text-sm"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                <strong>Chain-of-Custody Invariant:</strong> The first {allocateQty} sequential unallocated serials will transfer atomically from Distributor to Retailer.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocating || targetBatch.remaining_count <= 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {allocating ? 'Transferring...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
