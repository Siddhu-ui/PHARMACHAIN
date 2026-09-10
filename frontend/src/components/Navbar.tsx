import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Alert } from '../types';
import {
  ShieldAlert, ScanLine, LayoutDashboard, Store, Truck,
  Factory, Scale, Bell, Check, UserCheck, ChevronDown, RotateCcw, QrCode
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, allUsers, switchUser } = useAuth();
  const location = useLocation();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const fetchAlerts = async () => {
    try {
      const data = await api.getAlerts(currentRole);
      setAlerts(data);
      setUnreadCount(data.filter(a => !a.read).length);
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [currentRole]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markAlertRead(id);
      fetchAlerts();
    } catch {
      // ignore
    }
  };

  const navLinks = [
    { path: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { path: '/verify', label: 'Verify Medicine', icon: ScanLine, highlight: true },
    { path: '/manufacturer/register', label: 'Register Medicine', icon: QrCode },
    { path: '/retailer', label: 'Pharmacy', icon: Store },
    { path: '/distributor', label: 'Distributor', icon: Truck },
    { path: '/manufacturer', label: 'Manufacturer', icon: Factory },
    { path: '/regulator', label: 'Regulator Hub', icon: Scale, critical: true },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  PHARMAGUARD
                </span>
                <span className="block text-[9px] font-mono tracking-widest text-slate-400 -mt-0.5 uppercase">
                  AI-Assisted Pharma Reverse Chain Compliance
                </span>
              </div>
            </Link>

            {/* Nav items */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? item.critical
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : item.highlight
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : item.critical
                        ? 'text-rose-400 hover:bg-rose-500/10'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Action Icons & Role Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Demo Mode Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              DEMO MODE
            </div>

            {/* Quick Reset Demo Action */}
            <button
              onClick={async () => {
                if (window.confirm("Reset PharmaGuard demo database to clean baseline?")) {
                  try {
                    await api.resetDemo();
                    alert("Demo environment reset successfully.");
                    window.location.reload();
                  } catch (e: any) {
                    alert(`Reset failed: ${e.message}`);
                  }
                }
              }}
              title="Reset demo database to clean baseline"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs font-mono text-slate-300 hover:text-amber-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Demo</span>
            </button>

            {/* Alert Bell Popover */}
            <div className="relative">
              <button
                onClick={() => setShowAlertDropdown(!showAlertDropdown)}
                className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md shadow-rose-500/50">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showAlertDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Compliance Alerts ({currentRole})
                    </span>
                    <span className="text-[11px] text-slate-500">{unreadCount} unread</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {alerts.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">No active alerts.</div>
                    ) : (
                      alerts.slice(0, 5).map((a) => (
                        <div
                          key={a.id}
                          className={`p-2.5 rounded-xl border text-xs transition ${
                            a.read
                              ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                              : a.severity === 'CRITICAL'
                              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                              : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold">{a.message}</span>
                            {!a.read && (
                              <button
                                onClick={() => handleMarkRead(a.id)}
                                className="text-emerald-400 hover:text-emerald-300 shrink-0 p-1"
                                title="Mark read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                            {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="text-left hidden sm:block">
                  <div className="font-bold leading-tight">{currentUser?.name.split('(')[0].trim()}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{currentRole}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Switch Actor Workspace
                  </div>
                  <div className="space-y-1 mt-1">
                    {allUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                          currentUser?.id === u.id
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.organization}</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
