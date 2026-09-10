import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Alert } from '../types';
import { UserSwitcher } from './UserSwitcher';
import { Menu, Bell, Building2, ChevronDown, ShieldCheck, ExternalLink, ShieldAlert, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { currentUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    api.getAlerts(currentUser.role)
      .then((data) => setAlerts(data || []))
      .catch(() => setAlerts([]));
  }, [currentUser]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.read);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markAlertRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-14 bg-white border-b border-navy-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="p-1.5 hover:bg-navy-50 text-navy-600 rounded-lg transition"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/dashboard" className="flex items-center gap-2 text-decoration-none">
          <div className="w-7 h-7 rounded-lg bg-clinical-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-navy-900 text-sm sm:text-base leading-none">
                PHARMAGUARD
              </span>
              <span className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider text-clinical-700 bg-clinical-50 border border-clinical-200 px-1.5 py-0.2 rounded">
                Compliance
              </span>
            </div>
          </div>
        </Link>

        {/* Current Organization Tag */}
        <div className="hidden lg:flex items-center gap-1.5 pl-4 border-l border-navy-200 text-xs text-navy-600">
          <Building2 className="w-3.5 h-3.5 text-navy-400" />
          <span className="font-semibold text-navy-800">{currentUser?.organization}</span>
        </div>
      </div>

      {/* Right Controls: Notifications & User Workspace Selector */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-navy-50 text-navy-600 rounded-lg transition relative"
            aria-label="Compliance Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded-full bg-critical-500 text-white text-[9px] font-extrabold ring-2 ring-white">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 bg-white border border-navy-200 rounded-xl shadow-xl p-4 z-50 text-xs animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-navy-100 mb-2">
                <span className="font-bold text-navy-900">Compliance Notifications</span>
                <span className="text-[10px] text-clinical-700 font-semibold">
                  {unreadAlerts.length} Unread
                </span>
              </div>

              {alerts.length === 0 ? (
                <p className="text-navy-400 text-center py-4 text-xs">No active alerts for your role.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {alerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2.5 rounded-lg border transition ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-critical-50 border-critical-200 text-critical-900'
                          : 'bg-warning-50 border-warning-200 text-warning-900'
                      } ${alert.read ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-extrabold text-[10px] uppercase tracking-wider">
                          {alert.severity}
                        </span>
                        {!alert.read && (
                          <button
                            onClick={(e) => handleMarkRead(alert.id, e)}
                            className="text-[10px] text-navy-500 hover:text-navy-900 font-semibold"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] font-medium leading-tight mt-1">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to="/alerts"
                onClick={() => setShowNotifications(false)}
                className="block text-center text-[11px] font-semibold text-clinical-700 hover:underline pt-3 border-t border-navy-100 mt-2"
              >
                Open Compliance Alerts Center →
              </Link>
            </div>
          )}
        </div>

        {/* Workspace / Role Switcher */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-navy-200 hover:bg-navy-50 transition"
          >
            <div className="w-7 h-7 rounded-md bg-clinical-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-navy-900 leading-tight flex items-center gap-1">
                <span>{currentUser?.name}</span>
                <span className="text-[10px] font-medium text-clinical-700 bg-clinical-50 px-1 py-0.2 rounded border border-clinical-200">
                  {currentUser?.role}
                </span>
              </div>
              <div className="text-[10px] text-navy-500 truncate max-w-[140px] leading-tight">
                {currentUser?.organization}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-navy-400 shrink-0" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 z-50">
              <UserSwitcher onClose={() => setShowUserMenu(false)} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
