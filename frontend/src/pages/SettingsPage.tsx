import React, { useState } from 'react';
import { useAuth, CANONICAL_USERS } from '../context/AuthContext';
import { api } from '../services/api';
import { AlertBanner } from '../components/AlertBanner';
import {
  Settings, RotateCcw, ShieldCheck, Server, Database,
  User, CheckCircle2, AlertTriangle, Key, ExternalLink
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, switchUser } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset PharmaGuard compliance database to clean baseline? This will restore all canonical batches, returns, and clear test incidents.')) {
      return;
    }

    setResetting(true);
    try {
      const res = await api.resetDemo();
      setMsg(res.message || 'Database successfully restored to clean compliance baseline.');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset demo database.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-navy-200">
        <h1 className="text-xl font-bold text-navy-900 tracking-tight">
          System Configuration & Settings
        </h1>
        <p className="text-xs text-navy-500 mt-0.5">
          Compliance engine configuration, gateway connections, and demo controls
        </p>
      </div>

      {msg && (
        <AlertBanner
          type="success"
          title="Baseline Restored"
          message={msg}
          onClose={() => setMsg(null)}
        />
      )}

      {error && (
        <AlertBanner
          type="critical"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Demo Reset Card */}
      <div className="p-6 bg-white rounded-xl border border-navy-200 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-clinical-600" />
              <h3 className="text-sm font-bold text-navy-900">
                Evaluation Demo Reset
              </h3>
            </div>
            <p className="text-xs text-navy-600 leading-relaxed max-w-xl">
              Reseed the pharmaceutical database back to the canonical baseline. Restores batch{' '}
              <code>CS10-A23-2507</code> (*CardioSafe 10 mg Tablets*), clears test returns, and resets destruction certificate records.
            </p>
          </div>

          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="px-4 py-2.5 rounded-lg bg-critical-600 hover:bg-critical-700 text-white font-bold text-xs shadow-xs transition shrink-0 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting Database...' : 'RESET DEMO BASELINE'}</span>
          </button>
        </div>
      </div>

      {/* Node Connection Details */}
      <div className="p-6 bg-white rounded-xl border border-navy-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-navy-900">Compliance Gateway Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-navy-50 rounded-lg border border-navy-100 space-y-1">
            <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block">Backend Node API</span>
            <span className="font-mono font-bold text-navy-900 block">http://127.0.0.1:8000/api</span>
            <span className="text-[11px] text-success-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Operational
            </span>
          </div>

          <div className="p-3 bg-navy-50 rounded-lg border border-navy-100 space-y-1">
            <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block">Cryptographic Ledger</span>
            <span className="font-mono font-bold text-navy-900 block">SHA-256 Merkle Chain (SQLite)</span>
            <span className="text-[11px] text-clinical-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Seeded & Persistent
            </span>
          </div>

          <div className="p-3 bg-navy-50 rounded-lg border border-navy-100 space-y-1">
            <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block">Connected Persona</span>
            <span className="font-bold text-navy-900 block">{currentUser?.name} ({currentUser?.role})</span>
            <span className="text-[11px] text-navy-600">{currentUser?.organization}</span>
          </div>

          <div className="p-3 bg-navy-50 rounded-lg border border-navy-100 space-y-1">
            <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block">Statutory Standard</span>
            <span className="font-bold text-navy-900 block">CDSCO Rev 3.2 / Schedule M</span>
            <span className="text-[11px] text-navy-600">Drugs and Cosmetics Act, 1940</span>
          </div>
        </div>
      </div>
    </div>
  );
};
