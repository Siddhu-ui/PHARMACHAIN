import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { DistributorDashboardResponse } from '../../types';
import {
  Truck, Package, Clock, CheckCircle2, AlertTriangle,
  Scale, ArrowRight, RefreshCw, MapPin, FileCheck, Upload
} from 'lucide-react';

export const DistributorDashboardPage: React.FC = () => {
  const [data, setData] = useState<DistributorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getDistributorDashboard();
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
    const interval = setInterval(() => loadData(), 12000);
    return () => clearInterval(interval);
  }, []);

  const kpis = data?.kpis || {
    pickup_requests: 0,
    pickups_today: 0,
    in_transit: 0,
    delivered_to_manufacturer: 0,
    delayed_returns: 0,
    total_weight_collected: 0.0
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Distributor Dashboard
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Manage medicine pickups, transport and manufacturer deliveries.
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
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
            <span>Sync Live DB</span>
          </button>
          <Link
            to="/distributor"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition"
          >
            <Truck className="w-4 h-4" />
            <span>Record Pickup</span>
          </Link>
        </div>
      </div>

      {/* Demo Flow Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-orange-950/40 border border-amber-800/40">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          REVERSE LOGISTICS PIPELINE
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-rose-300 border border-rose-500/30">1. RETAILER RETURN</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-amber-500/30">2. DISTRIBUTOR PICKUP</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-cyan-500/30">3. IN TRANSIT</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 border border-indigo-500/30">4. MANUFACTURER RECEIVED</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-teal-300 border border-teal-500/30">5. DESTRUCTION PROCESS</span>
        </div>
      </div>

      {/* 6 Live KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Pickup Requests */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Pickup Requests</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{kpis.pickup_requests}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Pending Pickup</div>
          </div>
        </div>

        {/* 2. Pickups Today */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Pickups Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{kpis.pickups_today}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Collected</div>
          </div>
        </div>

        {/* 3. In Transit */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">In Transit</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-400">{kpis.in_transit}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">On Road</div>
          </div>
        </div>

        {/* 4. Delivered to Manufacturer */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-300">{kpis.delivered_to_manufacturer}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">At Manufacturer</div>
          </div>
        </div>

        {/* 5. Delayed Returns */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Delayed</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">{kpis.delayed_returns}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">&gt; 3 Days Pending</div>
          </div>
        </div>

        {/* 6. Total Weight Collected */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold">Weight Collected</span>
            <Scale className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-teal-300">{kpis.total_weight_collected} <span className="text-xs font-normal text-slate-400">kg</span></div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Total Bio-Mass</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/distributor"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition"
        >
          <Package className="w-4 h-4" />
          <span>Pickup Requests</span>
        </Link>
        <Link
          to="/distributor"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <Truck className="w-4 h-4 text-emerald-400" />
          <span>Record Pickup</span>
        </Link>
        <Link
          to="/distributor"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span>Update Transport</span>
        </Link>
        <Link
          to="/distributor"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 text-xs font-semibold transition"
        >
          <FileCheck className="w-4 h-4 text-slate-400" />
          <span>Delivery History</span>
        </Link>
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Panel 1: Pickup Requests */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Pharmacy Pickup Requests
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {data?.pickup_requests?.length || 0} requests
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.pickup_requests || data.pickup_requests.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No pending pharmacy pickup requests found.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Return ID</th>
                    <th className="pb-2.5 font-medium">Batch / Product</th>
                    <th className="pb-2.5 font-medium">Medicine</th>
                    <th className="pb-2.5 font-medium">Retailer</th>
                    <th className="pb-2.5 font-medium">Qty / Wt</th>
                    <th className="pb-2.5 font-medium">Requested</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.pickup_requests.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-mono text-slate-300 font-bold">#{item.return_id}</td>
                      <td className="py-2.5 font-mono text-cyan-300 font-bold">
                        {item.product_id || item.batch_number}
                      </td>
                      <td className="py-2.5 text-slate-200">{item.medicine}</td>
                      <td className="py-2.5 text-slate-300">{item.retailer}</td>
                      <td className="py-2.5 font-mono text-slate-300">
                        {item.quantity} units
                        <span className="text-[10px] text-slate-500 block">({item.weight || 5.2} kg)</span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-400 text-[11px]">{item.requested_date}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.status.includes('PENDING') || item.status.includes('REQUESTED')
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Link
                          to="/distributor"
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition inline-flex items-center gap-1"
                        >
                          <span>{item.action === 'SCHEDULE_PICKUP' ? 'Pickup' : 'Manifest'}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Main Panel 2: Active Transport */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Active Transport &amp; Delivery
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {data?.active_transport?.length || 0} active vehicles
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {(!data?.active_transport || data.active_transport.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No batches currently in transit.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400">
                    <th className="pb-2.5 font-medium">Batch / Product</th>
                    <th className="pb-2.5 font-medium">Route (Origin &rarr; Dest)</th>
                    <th className="pb-2.5 font-medium">Weight</th>
                    <th className="pb-2.5 font-medium">Pickup Time</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.active_transport.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-mono text-cyan-300 font-bold">
                        {item.product_id || item.batch_number}
                        <span className="text-[10px] text-slate-400 block font-normal">{item.medicine}</span>
                      </td>
                      <td className="py-2.5 text-slate-200">
                        <div className="font-semibold text-slate-300">{item.origin}</div>
                        <div className="text-[10px] text-slate-500">&rarr; {item.destination}</div>
                      </td>
                      <td className="py-2.5 font-mono text-teal-300 font-bold">
                        {item.weight || 5.2} kg
                      </td>
                      <td className="py-2.5 font-mono text-slate-400 text-[11px]">
                        {item.pickup_time || 'Just now'}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 animate-pulse">
                          {item.transport_status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Link
                          to="/distributor"
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition inline-flex items-center gap-1"
                        >
                          <span>Confirm Handover</span>
                        </Link>
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
