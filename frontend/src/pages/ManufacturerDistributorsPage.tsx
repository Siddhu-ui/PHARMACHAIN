import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Truck, ArrowLeft, ArrowRight, Package, Store, ShieldAlert, RefreshCw } from 'lucide-react';

export const ManufacturerDistributorsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [distributors, setDistributors] = useState<any[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (id) {
        const res = await api.getManufacturerDistributorDetail(id);
        setDetail(res);
      } else {
        const res = await api.getManufacturerDistributors();
        setDistributors(res);
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
    // Single Distributor Detail View
    if (loading) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400 font-mono">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-cyan-400 mb-2" />
          Loading distributor allocation and serial ledger...
        </div>
      );
    }

    const dist = detail?.distributor;
    const medicines = detail?.medicines || [];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          to="/manufacturer/distributors"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Distributor Directory
        </Link>

        {/* Distributor Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{dist?.name || 'Distributor'}</h1>
              <p className="text-xs text-slate-400">{dist?.location || 'Primary Regional Hub'}</p>
            </div>
          </div>
          <div className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-xl">
            AUTHENTICATED SUPPLY NODE
          </div>
        </div>

        {/* Medicine & Serial Breakdown */}
        <div className="space-y-6">
          {medicines.map((m: any) => (
            <div key={m.batch_id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-cyan-400" />
                    <span>{m.medicine_name} ({m.strength})</span>
                    <span className="text-xs font-mono text-slate-400">Batch: {m.batch_number}</span>
                  </h2>
                  <div className="text-xs text-slate-400 mt-0.5">Expiry: {m.expiry_date}</div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>Received: <strong className="text-white">{m.received_count}</strong></div>
                  <div>Distributed: <strong className="text-emerald-400">{m.distributed_count}</strong></div>
                  <div>Remaining: <strong className="text-blue-400">{m.remaining_count}</strong></div>
                </div>
              </div>

              {/* Retailer allocations */}
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Allocations to Retailers
                </h3>
                {m.retailers && m.retailers.length > 0 ? (
                  <div className="space-y-3">
                    {m.retailers.map((r: any) => (
                      <div key={r.retailer_name} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-emerald-400" />
                            {r.retailer_name}
                          </span>
                          <span className="font-mono font-bold text-emerald-400">{r.count} units delivered</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                          {r.serials.map((s: string) => (
                            <Link
                              key={s}
                              to={`/manufacturer/products/${s}`}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition"
                            >
                              {s}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-mono">All stock currently held in distributor storage.</div>
                )}
              </div>

              {/* Remaining stock serials */}
              {m.remaining_serials && m.remaining_serials.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider mb-2">
                    Remaining Distributor Stock ({m.remaining_serials.length} Serial Units)
                  </h3>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    {m.remaining_serials.map((s: string) => (
                      <Link
                        key={s}
                        to={`/manufacturer/products/${s}`}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-slate-300 hover:text-blue-300 transition"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
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
        <h1 className="text-2xl sm:text-3xl font-black text-white">Distributors Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Track which distributors received manufactured medicines and their downstream delivery performance.
        </p>
      </div>

      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 px-4 font-bold">Distributor</th>
                <th className="py-3.5 px-4 font-bold">Total Received</th>
                <th className="py-3.5 px-4 font-bold">To Retailers</th>
                <th className="py-3.5 px-4 font-bold">Remaining Stock</th>
                <th className="py-3.5 px-4 font-bold">In Transit</th>
                <th className="py-3.5 px-4 font-bold">Returns</th>
                <th className="py-3.5 px-4 font-bold">Fraud Alerts</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {distributors.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-400" />
                      <span>{d.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono ml-6">{d.location}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white font-mono">{d.total_received}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">{d.distributed_to_retailers}</td>
                  <td className="py-3.5 px-4 font-bold text-blue-400 font-mono">{d.remaining_stock}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{d.in_transit}</td>
                  <td className="py-3.5 px-4 font-mono text-amber-400">{d.returns}</td>
                  <td className="py-3.5 px-4 font-mono text-rose-400">{d.fraud_alerts}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={`/manufacturer/distributors/${d.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
                    >
                      <span>View Distributor</span>
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
