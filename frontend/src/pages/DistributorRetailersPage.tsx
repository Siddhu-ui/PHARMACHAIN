import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Store, ArrowLeft, ArrowRight, Package, Clock, ShieldAlert, RefreshCw } from 'lucide-react';

export const DistributorRetailersPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [retailers, setRetailers] = useState<any[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (id) {
        const res = await api.getDistributorRetailerDetail(id);
        setDetail(res);
      } else {
        const res = await api.getDistributorRetailers();
        setRetailers(res);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (id) {
    // Single Retailer Detail View
    if (loading) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400 font-mono">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-400 mb-2" />
          Loading retailer delivery ledger...
        </div>
      );
    }

    const ret = detail?.retailer;
    const medBreakdown = detail?.medicine_breakdown || {};
    const serials = detail?.serials || [];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          to="/distributor/retailers"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Retailer List
        </Link>

        {/* Retailer Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{ret?.name || 'Retail Pharmacy'}</h1>
              <p className="text-xs text-slate-400">{ret?.location || 'Store Location'}</p>
            </div>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl font-bold">
            Total Units Delivered: {detail?.total_units || 0}
          </div>
        </div>

        {/* Medicine Breakdown */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Package className="w-4 h-4 text-amber-400" />
            <span>Medicine Breakdown</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(medBreakdown).map(([medName, count]) => (
              <div key={medName} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-white text-xs">{medName}</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{count as number} units</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exact Serials Delivered */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Package className="w-4 h-4 text-cyan-400" />
            <span>Exact Serial Codes Assigned to this Retailer</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {serials.map((s: any) => (
              <div key={s.serial_code} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <Link
                    to={`/manufacturer/products/${s.serial_code}`}
                    className="font-bold text-amber-300 hover:underline"
                  >
                    {s.serial_code}
                  </Link>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    s.expiry_status === 'EXPIRED' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
                  }`}>
                    {s.expiry_status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{s.medicine_name} &bull; Batch: {s.batch_number}</div>
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                  <span>Delivered: {s.delivered_date}</span>
                  <span>Exp: {s.expiry_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Directory View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Distributor Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Retailer Distribution Network</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Retail pharmacies supplied with serialized stock and active delivery logs.
        </p>
      </div>

      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 px-4 font-bold">Retailer</th>
                <th className="py-3.5 px-4 font-bold">Total Delivered</th>
                <th className="py-3.5 px-4 font-bold">Active Units</th>
                <th className="py-3.5 px-4 font-bold">Expiring Units</th>
                <th className="py-3.5 px-4 font-bold">Expired Units</th>
                <th className="py-3.5 px-4 font-bold">Return Pending</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {retailers.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-400" />
                      <span>{r.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono ml-6">{r.location}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white font-mono">{r.total_delivered}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">{r.active_units}</td>
                  <td className="py-3.5 px-4 font-bold text-amber-400 font-mono">{r.expiring_units}</td>
                  <td className="py-3.5 px-4 font-bold text-rose-400 font-mono">{r.expired_units}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{r.return_pending}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/distributor/retailers/${r.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
                    >
                      <span>View Retailer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
