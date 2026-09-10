import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Product } from '../types';
import { QRCodeCard } from '../components/QRCodeCard';
import {
  Package, QrCode, Search, Plus, Eye, X, Download,
  CheckCircle2, AlertTriangle, Filter, Factory, ArrowRight
} from 'lucide-react';

export const RegisteredProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductQR, setSelectedProductQR] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.product_id.toLowerCase().includes(q) ||
      p.medicine.toLowerCase().includes(q) ||
      p.batch_id.toLowerCase().includes(q) ||
      (p.assigned_retailer || '').toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            🟢 ACTIVE
          </span>
        );
      case 'ASSIGNED_TO_RETAILER':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            🔵 ASSIGNED
          </span>
        );
      case 'EXPIRING_SOON':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            🟠 EXPIRING
          </span>
        );
      case 'EXPIRED':
      case 'RETURN_OVERDUE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            🟠 EXPIRED
          </span>
        );
      case 'SUSPICIOUS':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            🔴 TAMPERING
          </span>
        );
      case 'DESTRUCTION_VERIFIED':
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
            ⚫ CLOSED
          </span>
        );
      case 'REENTRY_DETECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-500 animate-pulse">
            🚨 RE-ENTRY FRAUD
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <Factory className="w-3.5 h-3.5" /> Manufacturer Portal &bull; Packaging Registry
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Registered Products
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative registry of medicines, unique package product IDs, and QR generation ledgers.
          </p>
        </div>

        <Link
          to="/manufacturer/register"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Medicine</span>
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Total Registered</span>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">{products.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
          <span className="text-[11px] font-mono text-emerald-400 uppercase">Active Packages</span>
          <div className="text-2xl font-extrabold text-emerald-300 mt-1 font-mono">
            {products.filter((p) => p.status === 'ACTIVE' || p.status === 'ASSIGNED_TO_RETAILER').length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
          <span className="text-[11px] font-mono text-amber-400 uppercase">Expired / Returns</span>
          <div className="text-2xl font-extrabold text-amber-300 mt-1 font-mono">
            {products.filter((p) => p.status === 'EXPIRED' || p.status === 'EXPIRING_SOON' || p.status === 'RETURN_REQUESTED').length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30">
          <span className="text-[11px] font-mono text-rose-400 uppercase">Anomalies / Fraud</span>
          <div className="text-2xl font-extrabold text-rose-300 mt-1 font-mono">
            {products.filter((p) => p.status === 'REENTRY_DETECTED' || p.status === 'SUSPICIOUS').length}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Product ID (e.g. PG-PCM-2026-000123), Medicine, Batch, or Retailer..."
          className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Product ID</th>
                <th className="px-6 py-3.5">Medicine</th>
                <th className="px-6 py-3.5">Batch</th>
                <th className="px-6 py-3.5">Assigned Retailer</th>
                <th className="px-6 py-3.5">MFG Date</th>
                <th className="px-6 py-3.5">EXP Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 font-mono">
                    Loading registered packages ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 font-mono">
                    No products found matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                      {p.product_id}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {p.medicine}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {p.batch_id}
                    </td>
                    <td className="px-6 py-4 text-indigo-300">
                      {p.assigned_retailer || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {new Date(p.manufacturing_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-amber-300 font-semibold">
                      {new Date(p.expiry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedProductQR(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 font-bold text-xs transition border border-slate-700"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View QR</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View QR Modal */}
      {selectedProductQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedProductQR(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <h3 className="text-base font-bold text-white">Package QR Code</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Physical package verification identifier
              </p>
            </div>

            <QRCodeCard
              productId={selectedProductQR.product_id}
              medicineName={selectedProductQR.medicine}
              batchId={selectedProductQR.batch_id}
              size={180}
            />
          </div>
        </div>
      )}
    </div>
  );
};
