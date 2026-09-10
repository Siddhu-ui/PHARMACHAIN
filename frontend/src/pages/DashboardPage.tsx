import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats, BatchEvent } from '../types';
import {
  Package, AlertTriangle, ShieldCheck, Flame, Clock,
  Truck, ArrowUpRight, TrendingUp, ShieldAlert, CheckCircle2,
  FileText, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  EXPIRING_SOON: '#f59e0b',
  EXPIRED: '#ef4444',
  RETURN_REQUESTED: '#a855f7',
  IN_TRANSIT: '#3b82f6',
  DESTRUCTION_VERIFIED: '#64748b',
  SUSPICIOUS: '#f97316',
  REENTRY_DETECTED: '#e11d48'
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444'
};

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 6000);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    { label: 'Total Batches', value: stats?.total_batches ?? 0, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Expiring Soon', value: stats?.expiring_soon ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Expired Medicines', value: stats?.expired ?? 0, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Returns In Transit', value: stats?.returns_in_progress ?? 0, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Verified Destroyed', value: stats?.destroyed ?? 0, icon: Flame, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
    { label: 'Suspicious Batches', value: stats?.suspicious_batches ?? 0, icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Critical Incidents', value: stats?.critical_incidents ?? 0, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/20 border-rose-500/40 font-bold' },
    { label: 'Fraud Intercepted', value: stats?.recovered_fraud ?? 0, icon: ShieldCheck, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Reverse Chain Compliance Command Center</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
              LIVE ENGINE
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time closed-loop reverse logistics tracking from Pharmacy expiry to verified destruction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/scan"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition"
          >
            <span>Scan & Verify Batch</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            to="/regulator"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition"
          >
            <span>Regulator Gateway</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border ${kpi.bg} flex flex-col justify-between transition-all hover:scale-105`}
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="line-clamp-1">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color} shrink-0`} />
              </div>
              <div className="text-2xl font-extrabold text-white mt-2 font-mono">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-card-hover">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Batch Status Distribution
            </h2>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.status_distribution || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {(stats?.status_distribution || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] mt-2 font-mono">
            {(stats?.status_distribution || []).slice(0, 6).map((item) => (
              <div key={item.status} className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }}
                />
                <span className="truncate">{item.status.replace(/_/g, ' ')}:</span>
                <span className="font-bold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud Incidents By Type */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-card-hover">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Violations & Incidents by Type
            </h2>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.fraud_by_type || []}
                layout="vertical"
                margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
              >
                <XAxis type="number" stroke="#64748b" />
                <YAxis
                  dataKey="type"
                  type="category"
                  stroke="#94a3b8"
                  tick={{ fontSize: 9 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Bar dataKey="count" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-400 text-center font-mono mt-2">
            Multi-signal AI & deterministic rule detections
          </div>
        </div>

        {/* Risk Severity Breakdown */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-card-hover flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Supply Chain Risk Severity
              </h2>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>

            <div className="space-y-4 my-4">
              {(stats?.risk_distribution || []).map((risk) => {
                const color = SEVERITY_COLORS[risk.severity] || '#10b981';
                return (
                  <div key={risk.severity} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold text-slate-300">{risk.severity} SEVERITY</span>
                      <span className="text-white font-bold">{risk.count} incidents</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, risk.count * 15)}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 text-rose-400" />
            <div>
              <span className="font-bold block">Autonomous Guard Active</span>
              Deterministic rule engine triggers immediate quarantine upon re-entry.
            </div>
          </div>
        </div>
      </div>

      {/* Reverse Chain Process Flow */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Closed-Loop Reverse Logistics Flow Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 relative">
            <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">STAGE 1</span>
            <div className="font-bold text-white text-sm">Retailer / Pharmacy</div>
            <p className="text-slate-400 text-[11px] mt-1">
              Monitors expiration dates, creates return requests for expired batches.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 relative">
            <span className="text-[10px] font-mono text-blue-400 font-bold block mb-1">STAGE 2</span>
            <div className="font-bold text-white text-sm">Distributor Transit</div>
            <p className="text-slate-400 text-[11px] mt-1">
              Confirms pickup, weighs cargo, verifies counts, reconciles manifests.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 relative">
            <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">STAGE 3</span>
            <div className="font-bold text-white text-sm">Manufacturer Bay</div>
            <p className="text-slate-400 text-[11px] mt-1">
              Receives return, quarantine inspection, schedules authorized waste disposal.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 relative">
            <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">STAGE 4</span>
            <div className="font-bold text-white text-sm">Waste Facility</div>
            <p className="text-slate-400 text-[11px] mt-1">
              Incineration / chemical destruction & certificate issuance.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 relative">
            <span className="text-[10px] font-mono text-rose-400 font-bold block mb-1">STAGE 5 (AI GUARD)</span>
            <div className="font-bold text-rose-200 text-sm">Re-entry & Tamper Defense</div>
            <p className="text-slate-300 text-[11px] mt-1">
              If destroyed batch re-appears &rarr; instant REENTRY_FRAUD & alert!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
