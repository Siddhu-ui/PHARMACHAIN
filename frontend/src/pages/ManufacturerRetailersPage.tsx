import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Store, ArrowLeft, ArrowRight, Package, Truck, ShieldAlert, RefreshCw, QrCode } from 'lucide-react';

export const ManufacturerRetailersPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [retailers, setRetailers] = useState<any[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (id) {
        const res = await api.getManufacturerRetailerDetail(id);
        setDetail(res);
      } else {
        const res = await api.getManufacturerRetailers();
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
    // Single Retailer Detail
    if (loading) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400 font-mono">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-cyan-400 mb-2" />
          Loading retailer inventory and verification history...
        </div>
      );
    }

    const ret = detail?.retailer;
    const serials = detail?.serials || [];
    const recentScans = detail?.recent_scans || [];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          to="/manufacturer/retailers"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Retailer Directory
        </Link>

        {/* Retailer Info Header */}
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
          <div className="text-xs font-mono text-slate-300 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            Supplying Distributor: <strong className="text-blue-400">{ret?.supplying_distributor}</strong>
          </div>
        </div>

        {/* Serials at Retailer */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Exact Serial Codes in Possession ({detail?.total_units || serials.length} Units)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative serials registered to this retailer.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {serials.map((s: any) => {
              const isExpired = s.expiry_status === 'EXPIRED';
              const isExpSoon = s.expiry_status === 'EXPIRING_SOON';

              return (
                <div key={s.serial_code} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/manufacturer/products/${s.serial_code}`}
                      className="font-mono font-bold text-xs text-emerald-400 hover:underline"
                    >
                      {s.serial_code}
                    </Link>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isExpired ? 'bg-rose-500/20 text-rose-300' :
                      isExpSoon ? 'bg-amber-500/20 text-amber-300' :
                      'bg-emerald-500/10 text-emerald-300'
                    }`}>
                      {s.expiry_status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {s.medicine_name} &bull; Batch: {s.batch_number}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-900">
                    <span>Exp: {s.expiry_date}</span>
                    <span className="uppercase text-slate-400">{s.product_status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Verification Activity */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Recent Verification Activity at Store</span>
          </h2>
          {recentScans.length === 0 ? (
            <div className="text-xs text-slate-500 font-mono py-4 text-center">
              No recent scans recorded for this pharmacy.
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((s: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-bold">{s.serial_code}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    s.result === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {s.result} (Risk: {s.risk_score}/100)
                  </span>
                  <span className="text-slate-500 text-[11px]">{s.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Directory View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Manufacturer Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Retailers Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time visibility into pharmacy inventory, expiry progression, returns, and compliance alerts.
        </p>
      </div>

      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 px-4 font-bold">Retailer</th>
                <th className="py-3.5 px-4 font-bold">Distributor</th>
                <th className="py-3.5 px-4 font-bold">Received</th>
                <th className="py-3.5 px-4 font-bold">Active</th>
                <th className="py-3.5 px-4 font-bold">Expiring Soon</th>
                <th className="py-3.5 px-4 font-bold">Expired</th>
                <th className="py-3.5 px-4 font-bold">Return Pending</th>
                <th className="py-3.5 px-4 font-bold">Fraud Alerts</th>
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
                  <td className="py-3.5 px-4 font-mono text-blue-400">{r.distributor_name}</td>
                  <td className="py-3.5 px-4 font-bold text-white font-mono">{r.products_received}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">{r.active_count}</td>
                  <td className="py-3.5 px-4 font-bold text-amber-400 font-mono">{r.expiring_count}</td>
                  <td className="py-3.5 px-4 font-bold text-rose-400 font-mono">{r.expired_count}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{r.return_pending}</td>
                  <td className="py-3.5 px-4 font-mono text-rose-400 font-bold">{r.fraud_alerts}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/manufacturer/retailers/${r.id}`}
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
