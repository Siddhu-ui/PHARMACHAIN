import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { RetailerDashboardResponse } from '../../types';
import {
  Store, ScanLine, Search, AlertTriangle,
  CheckCircle2, Clock, RotateCcw, AlertOctagon,
  ArrowRight, RefreshCw, PackageCheck, ShieldAlert
} from 'lucide-react';

export const RetailerDashboardPage: React.FC = () => {
  const [data, setData] = useState<RetailerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getRetailerDashboard();
      setData(res);
    } catch {
      // Graceful offline fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 10000);
    return () => clearInterval(interval);
  }, []);

  const kpis = data?.kpis || {
    total_stock: 0,
    active_stock: 0,
    expiring_soon: 0,
    expired_stock: 0,
    return_pending: 0,
    products_verified_today: 0,
    suspicious_scans: 0
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase().trim();

    if (s.includes('REENTRY') || s.includes('RE-ENTRY')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold bg-red-950/90 text-red-300 border border-red-500 shadow-sm shadow-red-900/50">
          <span className="text-xs">🚨</span>
          <span>REENTRY DETECTED</span>
        </span>
      );
    }
    if (s.includes('LABEL_TAMPERING') || s.includes('TAMPERING')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-500">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span>🔴 LABEL TAMPERING</span>
        </span>
      );
    }
    if (s.includes('UNKNOWN')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-500">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>🔴 UNKNOWN PRODUCT</span>
        </span>
      );
    }
    if (s.includes('EXPIRED / IN TRANSIT') || s.includes('IN_TRANSIT') || s.includes('IN TRANSIT')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500">
          <span className="text-xs">🚚</span>
          <span>{s.includes('EXPIRED') ? 'EXPIRED (IN TRANSIT)' : 'IN TRANSIT'}</span>
        </span>
      );
    }
    if (s.includes('EXPIRED / RETURN PENDING') || s.includes('RETURN_REQUESTED') || s.includes('RETURN REQUESTED')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-500">
          <span className="text-xs">⏳</span>
          <span>{s.includes('EXPIRED') ? 'EXPIRED (RETURN REQ)' : 'RETURN REQUESTED'}</span>
        </span>
      );
    }
    if (s.includes('EXPIRED')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-500/70">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>🔴 EXPIRED</span>
        </span>
      );
    }
    if (s.includes('EXPIRING') || s.includes('EXPIRING_SOON')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>🟠 EXPIRING SOON</span>
        </span>
      );
    }
    if (s.includes('SUSPICIOUS')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500">
          <span className="text-xs">⚠️</span>
          <span>SUSPICIOUS</span>
        </span>
      );
    }
    if (s.includes('CLOSED') || s.includes('DESTROYED')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>⚫ CLOSED</span>
        </span>
      );
    }
    if (s.includes('ACTIVE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>🟢 ACTIVE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-700">
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Retailer Dashboard
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Verify every package before sale and manage expired stock.
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
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>Sync Live DB</span>
          </button>

          {/* Primary Action Button */}
          <Link
            to="/retailer/verify"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black tracking-wide shadow-xl shadow-emerald-500/25 transition transform hover:-translate-y-0.5"
          >
            <Search className="w-4 h-4" />
            <span>VERIFY MEDICINE BEFORE SALE</span>
          </Link>
        </div>
      </div>

      {/* Prominent Primary Action Callout Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            PHARMAGUARD DISPENSING PROTOCOL
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Verify Every Medicine Package Before Dispensing to Patient
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Scan package QR or upload photo to automatically run OCR tamper inspection, cross-reference manufacturing database, and verify lifecycle status in real time.
          </p>
        </div>

        <Link
          to="/retailer/verify"
          className="shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm tracking-wider shadow-xl shadow-emerald-400/30 transition transform hover:scale-105"
        >
          <Search className="w-5 h-5 text-slate-950" />
          <span>🔍 VERIFY MEDICINE BEFORE SALE</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </Link>
      </div>

      {/* Retailer Demo Flow Breadcrumbs */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          RETAILER VERIFICATION PIPELINE
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 border border-emerald-500/30">1. UPLOAD PACKAGE</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-cyan-500/30">2. QR DETECTION</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">3. PRODUCT ID</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 border border-indigo-500/30">4. OCR EXTRACTION</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-teal-300 border border-teal-500/30">5. DATABASE COMPARISON</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-amber-500/30">6. LIFECYCLE CHECK</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">7. VERDICT</span>
        </div>
      </div>

      {/* 7 Live KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* 1. Total Stock */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Total Stock</span>
            <Store className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{kpis.total_stock}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Batches in Store</div>
          </div>
        </div>

        {/* 2. Active Stock */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Active Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{kpis.active_stock}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Eligible for Sale</div>
          </div>
        </div>

        {/* 3. Expiring Soon */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{kpis.expiring_soon}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Within 30 Days</div>
          </div>
        </div>

        {/* 4. Expired Stock */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Expired Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{kpis.expired_stock}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Do Not Sell</div>
          </div>
        </div>

        {/* 5. Return Pending */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Return Pending</span>
            <RotateCcw className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-300">{kpis.return_pending}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Pickup Needed</div>
          </div>
        </div>

        {/* 6. Products Verified Today */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Verified Today</span>
            <PackageCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-teal-300">{kpis.products_verified_today}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Scanned Packages</div>
          </div>
        </div>

        {/* 7. Suspicious Scans */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Suspicious Scans</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{kpis.suspicious_scans}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Flagged Incidents</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/retailer/verify"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition"
        >
          <Search className="w-4 h-4" />
          <span>Verify Medicine</span>
        </Link>
        <Link
          to="/retailer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Expired Stock</span>
        </Link>
        <Link
          to="/retailer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <RotateCcw className="w-4 h-4 text-indigo-400" />
          <span>Create Return</span>
        </Link>
        <Link
          to="/scan"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Verification History</span>
        </Link>
      </div>

      {/* Main Panels Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Expiring Soon */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Expiring Soon (Next 30 Days)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {data?.expiring_soon?.length || 0} batches
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.expiring_soon || data.expiring_soon.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No stock approaching expiry within the next 30 days.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Medicine</th>
                    <th className="pb-2.5 font-medium">Batch</th>
                    <th className="pb-2.5 font-medium min-w-[170px]">Product ID</th>
                    <th className="pb-2.5 font-medium">Expiry</th>
                    <th className="pb-2.5 font-medium">Days Remaining</th>
                    <th className="pb-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.expiring_soon.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 text-slate-200 font-semibold">{item.medicine}</td>
                      <td className="py-2.5 font-mono text-slate-400">{item.batch_number}</td>
                      <td className="py-2.5 font-mono text-cyan-300 font-bold whitespace-nowrap min-w-[170px]">{item.product_id}</td>
                      <td className="py-2.5 text-amber-300 font-mono">{item.expiry_date}</td>
                      <td className="py-2.5 font-mono font-bold text-amber-400">
                        {item.days_remaining} days
                      </td>
                      <td className="py-2.5">
                        <Link
                          to="/retailer"
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition inline-flex items-center gap-1"
                        >
                          <span>Flag Return</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 2: Expired — Do Not Sell */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Expired — Do Not Sell
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              DO NOT SELL / RETURN REQUIRED
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.expired_stock || data.expired_stock.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No expired stock present at this retailer location.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Medicine</th>
                    <th className="pb-2.5 font-medium">Batch</th>
                    <th className="pb-2.5 font-medium min-w-[170px]">Product ID</th>
                    <th className="pb-2.5 font-medium">Expiry</th>
                    <th className="pb-2.5 font-medium">Lifecycle / Expiry Status</th>
                    <th className="pb-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.expired_stock.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 text-slate-200 font-semibold">{item.medicine}</td>
                      <td className="py-2.5 font-mono text-slate-400">{item.batch_number}</td>
                      <td className="py-2.5 font-mono text-rose-300 font-bold whitespace-nowrap min-w-[170px]">{item.product_id}</td>
                      <td className="py-2.5 text-rose-400 font-mono">{item.expiry_date}</td>
                      <td className="py-2.5">
                        <div className="flex flex-col gap-1">
                          {renderStatusBadge(item.status)}
                          {item.warning && (
                            <span className="text-[10px] text-amber-400/90 font-sans leading-tight">
                              {item.warning}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        {item.action === 'VIEW_INCIDENT' ? (
                          <Link
                            to="/regulator"
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white border border-red-400 text-[11px] font-black transition inline-flex items-center gap-1.5 shadow-lg shadow-red-900/40"
                          >
                            <span>🚨</span>
                            <span>View Incident</span>
                          </Link>
                        ) : item.action === 'VIEW_TRANSPORT' ? (
                          <Link
                            to="/distributor"
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-600 text-[11px] font-bold transition inline-flex items-center gap-1.5"
                          >
                            <span>🚚</span>
                            <span>In Transit</span>
                          </Link>
                        ) : item.action === 'VIEW_RETURN' ? (
                          <Link
                            to="/retailer"
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-600 text-[11px] font-bold transition inline-flex items-center gap-1.5"
                          >
                            <span>⏳</span>
                            <span>Awaiting Pickup</span>
                          </Link>
                        ) : (
                          <Link
                            to="/retailer"
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 text-[11px] font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-rose-950/40"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Initiate Return</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 3: Recent Verification Activity */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ScanLine className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Recent Verification Activity
              </h2>
            </div>
            <Link to="/scan" className="text-[11px] text-teal-400 hover:text-teal-300 font-bold transition">
              Full Scan Log &rarr;
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.recent_activity || data.recent_activity.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No recent scans recorded today.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Time</th>
                    <th className="pb-2.5 font-medium min-w-[170px]">Product ID</th>
                    <th className="pb-2.5 font-medium">Medicine</th>
                    <th className="pb-2.5 font-medium">Result</th>
                    <th className="pb-2.5 font-medium">Risk</th>
                    <th className="pb-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.recent_activity.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-mono text-slate-400 text-[11px]">{item.time}</td>
                      <td className="py-2.5 font-mono text-cyan-300 font-bold whitespace-nowrap min-w-[170px]">{item.product_id || item.batch_number}</td>
                      <td className="py-2.5 text-slate-200">{item.medicine}</td>
                      <td className="py-2.5">
                        {renderStatusBadge(item.result)}
                      </td>
                      <td className="py-2.5 font-mono font-bold">
                        <span className={item.risk_score >= 80 ? 'text-rose-400 font-extrabold' : (item.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400')}>
                          {item.risk_score}/100
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Link
                          to="/scan"
                          className="text-[11px] text-slate-400 hover:text-white font-semibold transition"
                        >
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 4: Suspicious Scans */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Suspicious Scans &amp; Critical Incidents
              </h2>
            </div>
            <span className="text-[11px] font-mono text-rose-400 font-bold">
              {data?.suspicious_scans?.length || 0} flagged
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.suspicious_scans || data.suspicious_scans.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No suspicious scans recorded at this pharmacy.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium min-w-[170px]">Product ID</th>
                    <th className="pb-2.5 font-medium">Incident</th>
                    <th className="pb-2.5 font-medium">Risk Score</th>
                    <th className="pb-2.5 font-medium">Severity</th>
                    <th className="pb-2.5 font-medium">Recommendation</th>
                    <th className="pb-2.5 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.suspicious_scans.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-mono text-rose-300 font-bold whitespace-nowrap min-w-[170px]">{item.product_id || item.batch_number}</td>
                      <td className="py-2.5">
                        {renderStatusBadge(item.incident)}
                      </td>
                      <td className="py-2.5 font-mono text-rose-400 font-bold">{item.risk_score}/100</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          item.severity === 'CRITICAL'
                            ? 'bg-red-950/80 text-red-300 border-red-500 shadow-sm shadow-red-900/50'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="text-[11px] font-bold text-rose-300 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{item.recommendation || 'DO NOT ACCEPT OR DISPENSE'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">{item.timestamp}</td>
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
