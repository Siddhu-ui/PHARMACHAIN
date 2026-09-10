import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  Package, AlertTriangle, ShieldCheck, Flame, Clock,
  Truck, ArrowUpRight, TrendingUp, ShieldAlert, CheckCircle2,
  Activity, Shield, ArrowRight, QrCode, Eye, Cpu, Database
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: '#3b82f6',
  ACTIVE: '#10b981',
  EXPIRING_SOON: '#f59e0b',
  EXPIRED: '#ef4444',
  RETURN_REQUESTED: '#a855f7',
  PICKUP_CONFIRMED: '#6366f1',
  IN_TRANSIT: '#0284c7',
  RECEIVED_BY_MANUFACTURER: '#8b5cf6',
  AWAITING_DESTRUCTION: '#eab308',
  DESTRUCTION_VERIFIED: '#64748b',
  CLOSED: '#475569',
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
  const [topIncident, setTopIncident] = useState<any | null>(null);
  const [criticalAlertsCount, setCriticalAlertsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const [data, incidents, alerts] = await Promise.all([
        api.getDashboardStats(),
        api.getFraudIncidents(),
        api.getAlerts()
      ]);
      setStats(data);
      if (incidents && incidents.length > 0) {
        const critical = incidents.find(i => i.severity === 'CRITICAL' || i.incident_type === 'REENTRY_FRAUD') || incidents[0];
        setTopIncident(critical);
      } else {
        setTopIncident(null);
      }
      if (alerts) {
        setCriticalAlertsCount(alerts.filter(a => a.severity === 'CRITICAL').length);
      }
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

  // 8 Exact Dashboard KPIs requested for Hackathon Jury Demo
  const kpis = [
    {
      label: 'Total Batches',
      value: stats?.total_batches ?? 0,
      icon: Package,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      label: 'Expired / Expiring',
      value: (stats?.expired ?? 0) + (stats?.expiring_soon ?? 0),
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    {
      label: 'Pending Returns',
      value: stats?.returns_in_progress ?? 0,
      icon: Truck,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      label: 'In Transit',
      value: stats?.in_transit ?? (stats?.status_distribution?.find(s => s.status === 'IN_TRANSIT')?.count ?? 0),
      icon: Truck,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20'
    },
    {
      label: 'Awaiting Destruction',
      value: stats?.awaiting_destruction ?? (stats?.status_distribution?.find(s => s.status === 'AWAITING_DESTRUCTION')?.count ?? 0),
      icon: Flame,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    {
      label: 'Destruction Verified',
      value: stats?.destroyed ?? 0,
      icon: ShieldCheck,
      color: 'text-slate-300',
      bg: 'bg-slate-500/10 border-slate-500/20'
    },
    {
      label: 'Active Fraud Incidents',
      value: stats?.critical_incidents ?? 0,
      icon: ShieldAlert,
      color: 'text-rose-500',
      bg: 'bg-rose-500/20 border-rose-500/40 font-bold'
    },
    {
      label: 'Critical Alerts',
      value: criticalAlertsCount || (stats?.critical_incidents ?? 0),
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header & Product Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              AI-ASSISTED RISK DETECTION
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Deterministic Security Boundary Active
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            PHARMAGUARD
          </h1>
          <p className="text-base text-slate-300 font-medium">
            AI-Assisted Pharma Reverse Chain Compliance
          </p>
          <p className="text-xs text-emerald-400/90 font-mono mt-0.5">
            &ldquo;Track the medicine. Verify the destruction. Stop re-entry.&rdquo;
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

      {/* Story Banner: What is protected? What does system do? What happens if they re-enter? */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-2">
            <Package className="w-4 h-4" />
            <span>WHAT IS BEING PROTECTED?</span>
          </div>
          <div className="text-white font-extrabold text-base">
            Expired and Returned Medicines
          </div>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Protecting high-risk pharmaceuticals from diversion, label tampering, repackaging, and hazardous black-market leakage.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-xs font-mono text-blue-400 font-bold uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4" />
            <span>WHAT DOES THE SYSTEM DO?</span>
          </div>
          <div className="text-white font-extrabold text-base">
            Reverse Logistics & Verified Destruction
          </div>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Tracks batches custody-by-custody through pharmacy, distributor transit, and manufacturer quarantine until certified waste destruction.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-xs font-mono text-rose-400 font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>WHAT HAPPENS IF THEY RE-ENTER?</span>
          </div>
          <div className="text-rose-200 font-extrabold text-base flex items-center gap-2">
            <span>🚨 FRAUD DETECTED</span>
          </div>
          <p className="text-xs text-rose-300/80 mt-1.5 leading-relaxed">
            Immediate 95/100 critical alert, statutory quarantine directive, and multi-channel broadcast to regulator, manufacturer, and retailer.
          </p>
        </div>
      </div>

      {/* Prominent Active Fraud Incident Hero Banner */}
      {topIncident && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/90 via-rose-900/50 to-slate-900/90 border-2 border-rose-500/80 shadow-2xl shadow-rose-950/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-400 shrink-0">
              <ShieldAlert className="w-8 h-8 text-rose-500 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black tracking-wider uppercase">
                  🚨 ACTIVE FRAUD INCIDENT
                </span>
                <span className="text-xs font-mono text-rose-300 font-bold">
                  Risk: {topIncident.risk_score}/100 — {topIncident.severity}
                </span>
              </div>
              <div className="text-white font-extrabold text-base sm:text-lg mt-1">
                {topIncident.description}
              </div>
              <p className="text-xs text-rose-300/90 mt-0.5 font-medium">
                Mandatory Directive: <strong className="text-white font-black">DO NOT ACCEPT OR DISPENSE</strong>. Regulatory enforcement dossier active.
              </p>
            </div>
          </div>
          <Link
            to="/regulator"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition shrink-0 flex items-center gap-1.5"
          >
            <span>Inspect in Regulator Hub</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border ${kpi.bg} flex flex-col justify-between transition-all hover:scale-105`}
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="line-clamp-1 font-medium">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color} shrink-0`} />
              </div>
              <div className="text-2xl font-extrabold text-white mt-2 font-mono">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Breakdown Section */}
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

        {/* Violations by Type */}
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
            AI-assisted risk detection & rule-based boundary checks
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

      {/* SECTION 9: WHY PHARMAGUARD? — KEY DIFFERENTIATOR */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold mb-2">
          <ShieldCheck className="w-4 h-4" /> Core Innovation & Product Differentiator
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Why PharmaGuard?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-xs font-mono text-slate-400 uppercase font-bold tracking-wider mb-1">
              EXISTING TRACEABILITY
            </div>
            <div className="text-lg font-bold text-slate-300">
              Tracks forward product movement.
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Conventional Track & Trace systems only monitor medicines from factory to pharmacy shelf. Once expired, accountability disappears—creating a massive blind spot where expired pills are routinely diverted, wiped, relabeled, and re-sold.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40">
            <div className="text-xs font-mono text-emerald-400 uppercase font-bold tracking-wider mb-1">
              PHARMAGUARD
            </div>
            <div className="text-lg font-bold text-white">
              Tracks reverse journey after expiry & verifies destruction.
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              PharmaGuard closes the loop by enforcing chain of custody from pharmacy return, distributor transit weight reconciliation, manufacturer quarantine, to authorized high-temperature incineration.
            </p>
          </div>
        </div>

        {/* Security Boundary Highlight Box */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              KEY ARCHITECTURAL DIFFERENTIATOR
            </div>
            <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
              &ldquo;Verified destruction becomes a security boundary.&rdquo;
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Once a batch is destruction-verified, any later appearance of that batch becomes an undeniable, high-confidence fraud signal.
            </p>
          </div>
          <Link
            to="/scan"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shrink-0 transition flex items-center gap-1.5"
          >
            <span>Test Re-entry Signal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* SECTION 8: SYSTEM ARCHITECTURE VIEW */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div>
          <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block mb-1">
            System Architecture
          </span>
          <h2 className="text-xl font-extrabold text-white">
            Dual-Layer Reverse Chain & Verification Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Physical reverse logistics workflow coupled with real-time multi-signal AI & deterministic rule detection.
          </p>
        </div>

        {/* Physical Flow */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Layer 1: Physical Reverse Custody Journey
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">NODE 1</span>
              <div className="font-bold text-white text-sm">PHARMACY</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Monitors expiration; initiates return request upon shelf expiry.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono text-blue-400 font-bold block mb-1">NODE 2</span>
              <div className="font-bold text-white text-sm">DISTRIBUTOR</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Pickup verification, gross weight reconciliation (5.2 kg).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono text-indigo-400 font-bold block mb-1">NODE 3</span>
              <div className="font-bold text-white text-sm">MANUFACTURER</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Quarantine bay intake, physical count & disposal scheduling.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">NODE 4</span>
              <div className="font-bold text-white text-sm">WASTE FACILITY</div>
              <p className="text-slate-400 text-[11px] mt-1">
                Authorized incineration & cryptographic certificate issue.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">NODE 5 (BOUNDARY)</span>
              <div className="font-bold text-emerald-300 text-sm">VERIFIED DESTRUCTION</div>
              <p className="text-slate-300 text-[11px] mt-1">
                Batch marked DESTRUCTION_VERIFIED; immutable state lockdown.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Signal Verification Pipeline */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Layer 2: Multi-Signal Decision & Enforcement Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <QrCode className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="font-bold text-white text-[11px]">QR / Barcode</div>
              <span className="text-[9px] text-slate-500">Physical Token</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <Database className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="font-bold text-white text-[11px]">Batch Identity</div>
              <span className="text-[9px] text-slate-500">Ledger Cross-Check</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <Eye className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <div className="font-bold text-white text-[11px]">OCR / CV</div>
              <span className="text-[9px] text-slate-500">Label Extraction</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <Cpu className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="font-bold text-white text-[11px]">Rule Engine</div>
              <span className="text-[9px] text-slate-500">Deterministic Checks</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <Activity className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="font-bold text-white text-[11px]">ML Anomaly</div>
              <span className="text-[9px] text-slate-500">Isolation Forest</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <ShieldAlert className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <div className="font-bold text-white text-[11px]">Risk Score</div>
              <span className="text-[9px] text-slate-500">0 - 100 Multi-Signal</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40">
              <AlertTriangle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
              <div className="font-bold text-rose-300 text-[11px]">Compliance Alert</div>
              <span className="text-[9px] text-rose-400 font-bold">3-Way Broadcast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
