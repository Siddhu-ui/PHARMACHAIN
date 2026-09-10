import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { ManufacturerDashboardResponse } from '../../types';
import {
  Factory, Package, CheckCircle2, Clock, AlertTriangle,
  Flame, ShieldCheck, AlertOctagon, Plus, List, RotateCcw,
  ShieldAlert, ArrowRight, RefreshCw, Calendar, MapPin
} from 'lucide-react';

export const ManufacturerDashboardPage: React.FC = () => {
  const [data, setData] = useState<ManufacturerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getManufacturerDashboard();
      setData(res);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 12000);
    return () => clearInterval(interval);
  }, []);

  const kpis = data?.kpis || {
    total_registered_products: 0,
    active_products: 0,
    expiring_soon: 0,
    expired_awaiting_return: 0,
    return_overdue: 0,
    awaiting_destruction: 0,
    destruction_verified: 0,
    fraud_incidents: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Manufacturer Dashboard
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Monitor product lifecycle, returns, destruction and compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>Sync Live DB</span>
          </button>
          <Link
            to="/manufacturer/register"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Medicine</span>
          </Link>
        </div>
      </div>

      {/* Demo Flow Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-800/40">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          MANUFACTURER COMPLIANCE FLOW
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-cyan-300 border border-cyan-500/30">1. REGISTER MEDICINE</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700">2. ASSIGN RETAILER</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-amber-300 border border-amber-500/30">3. MONITOR EXPIRY</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-indigo-300 border border-indigo-500/30">4. RECEIVE RETURN</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-300 border border-emerald-500/30">5. VERIFY DESTRUCTION</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700">6. CLOSED</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/50 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            7. DETECT RE-ENTRY
          </span>
        </div>
      </div>

      {/* 8 Live KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {/* 1. Total Registered Products */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Registered</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{kpis.total_registered_products}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Total Products</div>
          </div>
        </div>

        {/* 2. Active Products */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{kpis.active_products}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">In Market</div>
          </div>
        </div>

        {/* 3. Expiring Soon */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Expiring</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{kpis.expiring_soon}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">&lt; 60 Days</div>
          </div>
        </div>

        {/* 4. Expired / Awaiting Return */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Expired</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{kpis.expired_awaiting_return}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Awaiting Return</div>
          </div>
        </div>

        {/* 5. Return Overdue */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-orange-400">{kpis.return_overdue}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">&gt; 7d Expired</div>
          </div>
        </div>

        {/* 6. Awaiting Destruction */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Quarantine</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-300">{kpis.awaiting_destruction}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Awaiting Destruct</div>
          </div>
        </div>

        {/* 7. Destruction Verified */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Destroyed</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-teal-300">{kpis.destruction_verified}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Verified / Closed</div>
          </div>
        </div>

        {/* 8. Fraud Incidents */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Incidents</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{kpis.fraud_incidents}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Compliance Alerts</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/manufacturer/register"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register Medicine</span>
        </Link>
        <Link
          to="/manufacturer/products"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <List className="w-4 h-4 text-slate-400" />
          <span>Registered Products</span>
        </Link>
        <Link
          to="/manufacturer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <RotateCcw className="w-4 h-4 text-indigo-400" />
          <span>View Returns</span>
        </Link>
        <Link
          to="/regulator"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Fraud Alerts</span>
        </Link>
        <Link
          to="/manufacturer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Destruction Tracking</span>
        </Link>
      </div>

      {/* Main Panels Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Products Approaching Expiry */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Products Approaching Expiry
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {data?.approaching_expiry?.length || 0} batches
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.approaching_expiry || data.approaching_expiry.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No products approaching expiry in the next 90 days.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Product ID</th>
                    <th className="pb-2.5 font-medium">Medicine</th>
                    <th className="pb-2.5 font-medium">Batch</th>
                    <th className="pb-2.5 font-medium">Retailer</th>
                    <th className="pb-2.5 font-medium">Expiry</th>
                    <th className="pb-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.approaching_expiry.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-mono text-cyan-300 font-bold">{item.product_id}</td>
                      <td className="py-2.5 text-slate-200 font-semibold">{item.medicine}</td>
                      <td className="py-2.5 font-mono text-slate-400">{item.batch_number}</td>
                      <td className="py-2.5 text-slate-300">{item.retailer}</td>
                      <td className="py-2.5 text-amber-300 font-mono">
                        {item.expiry_date}
                        <span className="text-[10px] text-slate-500 block">({item.days_remaining}d left)</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 2: Overdue Returns */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Overdue Returns
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {data?.overdue_returns?.length || 0} batches
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.overdue_returns || data.overdue_returns.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No overdue returns pending. All expired stock processed.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Product ID</th>
                    <th className="pb-2.5 font-medium">Medicine</th>
                    <th className="pb-2.5 font-medium">Retailer</th>
                    <th className="pb-2.5 font-medium">Expiry</th>
                    <th className="pb-2.5 font-medium">Days Overdue</th>
                    <th className="pb-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.overdue_returns.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-mono text-rose-300 font-bold">{item.product_id}</td>
                      <td className="py-2.5 text-slate-200 font-semibold">{item.medicine}</td>
                      <td className="py-2.5 text-slate-300">{item.retailer}</td>
                      <td className="py-2.5 text-slate-400 font-mono">{item.expiry_date}</td>
                      <td className="py-2.5 font-mono text-rose-400 font-bold">
                        +{item.days_overdue} days
                      </td>
                      <td className="py-2.5">
                        <Link
                          to="/distributor"
                          className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] font-bold transition inline-flex items-center gap-1"
                        >
                          <span>Request Pickup</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 3: Destruction Pending */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Destruction Pending
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {data?.destruction_pending?.length || 0} batches
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.destruction_pending || data.destruction_pending.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No batches currently awaiting destruction verification.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Product ID</th>
                    <th className="pb-2.5 font-medium">Batch</th>
                    <th className="pb-2.5 font-medium">Manufacturer Received</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.destruction_pending.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-mono text-cyan-300 font-bold">{item.product_id}</td>
                      <td className="py-2.5 font-mono text-slate-300">{item.batch_number}</td>
                      <td className="py-2.5 text-slate-400 font-mono">{item.manufacturer_received_date || 'In Quarantine'}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {item.current_status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Link
                          to="/manufacturer"
                          className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold transition inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify Destruction</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 4: Recent Fraud Incidents */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Recent Fraud Incidents
              </h2>
            </div>
            <Link to="/regulator" className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition">
              View All Alerts &rarr;
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.recent_fraud || data.recent_fraud.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No active fraud incidents detected.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Incident</th>
                    <th className="pb-2.5 font-medium">Product / Batch</th>
                    <th className="pb-2.5 font-medium">Risk Score</th>
                    <th className="pb-2.5 font-medium">Severity</th>
                    <th className="pb-2.5 font-medium">Time</th>
                    <th className="pb-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.recent_fraud.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-semibold text-rose-300 flex items-center gap-1.5">
                        <span className="text-sm">🚨</span>
                        <span>{item.incident_type}</span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-200">
                        {item.product_id || item.batch_number}
                      </td>
                      <td className="py-2.5 font-mono font-bold">
                        <span className={item.risk_score >= 80 ? 'text-rose-400' : 'text-amber-400'}>
                          {item.risk_score}/100
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-400 text-[11px]">{item.detected_at}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
