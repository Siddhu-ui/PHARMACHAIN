import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Alert, FraudIncident } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState, LoadingState } from '../components/States';
import { ShieldAlert, AlertTriangle, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AlertsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await api.getAlerts(currentUser?.role);
      setAlerts(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [currentUser]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markAlertRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader title="Compliance Alerts Center" subtitle={currentUser?.organization || 'PharmaGuard'} />
        <LoadingState message="Fetching real-time regulatory compliance alerts..." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-navy-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight">
            Compliance & Statutory Alarms
          </h1>
          <p className="text-xs text-navy-500 mt-0.5">
            Active alerts for {currentUser?.organization} ({currentUser?.role})
          </p>
        </div>
        <button
          onClick={loadAlerts}
          className="px-3 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-800 text-xs font-semibold hover:bg-navy-50"
        >
          Refresh Alerts
        </button>
      </div>

      {error && (
        <AlertBanner
          type="critical"
          title="Alerts Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {alerts.length === 0 ? (
        <EmptyState
          title="All clear"
          message="No active compliance, tampering, or re-entry alarms for your workspace."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition ${
                alert.severity === 'CRITICAL'
                  ? 'bg-critical-50/60 border-critical-200 text-critical-900'
                  : 'bg-warning-50/60 border-warning-200 text-warning-900'
              } ${alert.read ? 'opacity-70' : 'shadow-xs'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      alert.severity === 'CRITICAL' ? 'text-critical-600' : 'text-warning-600'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.2 rounded ${
                          alert.severity === 'CRITICAL' ? 'bg-critical-600 text-white' : 'bg-warning-600 text-white'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] font-mono text-navy-500">
                        {new Date(alert.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-navy-900 mt-1.5">{alert.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/batches/CS10-A23-2507"
                    className="px-2.5 py-1 rounded bg-white border border-navy-200 text-navy-800 font-semibold text-[11px] hover:bg-navy-50 transition inline-flex items-center gap-1"
                  >
                    <span>Audit</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  {!alert.read && (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="px-2.5 py-1 rounded bg-white border border-navy-200 text-navy-600 font-medium text-[11px] hover:bg-navy-50 transition"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
