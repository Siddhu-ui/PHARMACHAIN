import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert, Lock, Mail, ArrowRight, Factory, Truck, Store, Scale, AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, allUsers } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please enter your email or select a demo account.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(email);
      if (user.role === 'MANUFACTURER') navigate('/manufacturer/dashboard');
      else if (user.role === 'DISTRIBUTOR') navigate('/distributor/dashboard');
      else if (user.role === 'RETAILER') navigate('/retailer/dashboard');
      else if (user.role === 'REGULATOR') navigate('/regulator');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or user not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo1234');
    setError(null);
    setLoading(true);
    try {
      const user = await login(demoEmail);
      if (user.role === 'MANUFACTURER') navigate('/manufacturer/dashboard');
      else if (user.role === 'DISTRIBUTOR') navigate('/distributor/dashboard');
      else if (user.role === 'RETAILER') navigate('/retailer/dashboard');
      else if (user.role === 'REGULATOR') navigate('/regulator');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/20 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
          PHARMAGUARD
        </h1>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          Pharmaceutical Traceability & Reverse Chain Compliance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@pharmaguard.io"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition duration-150 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'LOGIN'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Header */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 font-mono font-bold text-slate-500 tracking-wider">
                Hackathon Demo Accounts
              </span>
            </div>
          </div>

          {/* 1-Click Role Login Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('manufacturer@pharmaguard.io')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1">
                <Factory className="w-3.5 h-3.5" />
                <span>MANUFACTURER</span>
              </div>
              <div className="text-[11px] text-slate-300 font-semibold truncate">ABC Pharma</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">Vadodara, Gujarat</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('distributor@pharmaguard.io')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-1">
                <Truck className="w-3.5 h-3.5" />
                <span>DISTRIBUTOR</span>
              </div>
              <div className="text-[11px] text-slate-300 font-semibold truncate">ABC Distribution</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">Bengaluru Hub</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('pharmacy_a@pharmaguard.io')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                <Store className="w-3.5 h-3.5" />
                <span>RETAILER</span>
              </div>
              <div className="text-[11px] text-slate-300 font-semibold truncate">Pharmacy A</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">Indiranagar Store</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('regulator@pharmaguard.io')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
                <Scale className="w-3.5 h-3.5" />
                <span>REGULATOR</span>
              </div>
              <div className="text-[11px] text-slate-300 font-semibold truncate">CDSCO Gateway</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">New Delhi Office</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
