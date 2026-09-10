import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Store, Package, ArrowRight, RefreshCw, QrCode, Search, ShieldCheck } from 'lucide-react';

export const RetailerMedicinesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await api.getRetailerInventory(currentUser?.organization_id);
      setMedicines(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [currentUser]);

  const filtered = medicines.filter(m =>
    m.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.serial_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Retail Dispensary Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">My Medicine Inventory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical stock authorized and registered for <strong className="text-emerald-400">{currentUser?.organization || 'Pharmacy A'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadInventory}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/retailer/verify"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
          >
            <QrCode className="w-4 h-4" />
            <span>Verify Package Before Sale</span>
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
          placeholder="Search by serial code, medicine or batch..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Inventory Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 px-4 font-bold">Serial Code</th>
                <th className="py-3.5 px-4 font-bold">Medicine</th>
                <th className="py-3.5 px-4 font-bold">Strength</th>
                <th className="py-3.5 px-4 font-bold">Batch Number</th>
                <th className="py-3.5 px-4 font-bold">Manufacturer</th>
                <th className="py-3.5 px-4 font-bold">Supplying Distributor</th>
                <th className="py-3.5 px-4 font-bold">Expiry Date</th>
                <th className="py-3.5 px-4 font-bold">Expiry Status</th>
                <th className="py-3.5 px-4 font-bold">Product Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-mono">
                    {loading ? 'Querying pharmacy shelf inventory...' : 'No medicines currently assigned to this dispensary.'}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isExpired = m.expiry_status === 'EXPIRED';
                  const isExpSoon = m.expiry_status === 'EXPIRING_SOON';

                  return (
                    <tr key={m.serial_code} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        <Link to={`/manufacturer/products/${m.serial_code}`} className="hover:underline">
                          {m.serial_code}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">{m.medicine_name}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400">{m.strength}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{m.batch_number}</td>
                      <td className="py-3.5 px-4 text-slate-400">{m.manufacturer_name}</td>
                      <td className="py-3.5 px-4 font-mono text-blue-400">{m.distributor_name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{m.expiry_date}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isExpired ? 'bg-rose-500/20 text-rose-300' :
                          isExpSoon ? 'bg-amber-500/20 text-amber-300' :
                          'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          {m.expiry_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          m.product_status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {m.product_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/manufacturer/products/${m.serial_code}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition"
                        >
                          <span>View Detail</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
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
