import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Alert } from '../types';
import { ShieldAlert, AlertTriangle, Check, ArrowRight, RefreshCw, Bell } from 'lucide-react';

export const ManufacturerAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getManufacturerAlerts();
      setAlerts(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markAlertRead(id);
      loadAlerts();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">Compliance Notification Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Manufacturer Alert Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed of tamper anomalies, expiry warnings, re-entry attempts and recall requests.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-slate-500 font-mono text-xs">
            {loading ? 'Checking compliance gateway...' : 'No active alerts for manufacturer. All batches operating within normal parameters.'}
          </div>
        ) : (
          alerts.map((a) => {
            const isCrit = a.severity === 'CRITICAL' || a.severity === 'HIGH';

            // Extract serial code if in message
            const serialMatch = a.message.match(/PG-[A-Z]+-\d+-\d+/);
            const serialCode = serialMatch ? serialMatch[0] : null;

            return (
              <div
                key={a.id}
                className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  a.read
                    ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                    : isCrit
                    ? 'bg-rose-950/30 border-rose-500/40 text-white shadow-lg shadow-rose-950/30'
                    : 'bg-amber-950/20 border-amber-500/30 text-white shadow-lg shadow-amber-950/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    isCrit ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {isCrit ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        isCrit ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {a.severity}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(a.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-sm font-bold leading-snug">{a.message}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {serialCode && (
                    <Link
                      to={`/manufacturer/products/${serialCode}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 transition flex items-center gap-1.5"
                    >
                      <span>View Product</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {!a.read && (
                    <button
                      onClick={() => handleMarkRead(a.id)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 transition"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
