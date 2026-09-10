import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Factory, Package, ArrowRight, RefreshCw, QrCode, Search, ShieldCheck } from 'lucide-react';

export const ManufacturerMedicinesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const data = await api.getManufacturerMedicines();
      setMedicines(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const filtered = medicines.filter(m =>
    m.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.serials && m.serials.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Manufacturer Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Registered Medicines & Serials</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete inventory overview with batch serialization and distribution breakdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMedicines}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/manufacturer/register"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-500/20"
          >
            + Register New Medicine
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by medicine, batch, or serial code (e.g. PG-PCM-2026-000001)..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
        />
      </div>

      {/* Medicines Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 px-4 font-bold">Medicine</th>
                <th className="py-3.5 px-4 font-bold">Strength</th>
                <th className="py-3.5 px-4 font-bold">Batch</th>
                <th className="py-3.5 px-4 font-bold">Total Qty</th>
                <th className="py-3.5 px-4 font-bold">Distributor Stock</th>
                <th className="py-3.5 px-4 font-bold">Retailer Stock</th>
                <th className="py-3.5 px-4 font-bold">Expiry Date</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono">
                    {loading ? 'Loading registered medicines...' : 'No medicines found matching criteria.'}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isExpanded = expandedBatch === m.id;
                  const isExpired = m.expiry_status === 'EXPIRED';
                  const isExpSoon = m.expiry_status === 'EXPIRING_SOON';

                  return (
                    <React.Fragment key={m.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div>{m.medicine_name}</div>
                          {m.brand_name && <div className="text-[10px] text-slate-400">{m.brand_name}</div>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">{m.strength}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{m.batch_number}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{m.total_quantity} units</td>
                        <td className="py-3.5 px-4 font-bold text-blue-400">{m.at_distributor_count} units</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">{m.at_retailer_count} units</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {m.expiry_date}
                          {isExpired && <span className="ml-1.5 text-[10px] text-rose-400 font-bold">(EXPIRED)</span>}
                          {isExpSoon && <span className="ml-1.5 text-[10px] text-amber-400 font-bold">(EXPIRING)</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setExpandedBatch(isExpanded ? null : m.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition"
                          >
                            {isExpanded ? 'Hide Serials' : `Serials (${m.serials?.length || 0})`}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Serial List */}
                      {isExpanded && m.serials && (
                        <tr className="bg-slate-950/60 border-y border-slate-800">
                          <td colSpan={9} className="p-4">
                            <div className="text-[11px] font-mono font-bold text-cyan-400 mb-2 uppercase flex items-center gap-2">
                              <Package className="w-3.5 h-3.5" />
                              <span>Serialized Package Units ({m.serials.length} Individual Codes)</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 font-mono text-[11px]">
                              {m.serials.map((s: string) => (
                                <Link
                                  key={s}
                                  to={`/manufacturer/products/${s}`}
                                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between transition group"
                                >
                                  <span className="truncate">{s}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 shrink-0" />
                                </Link>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
