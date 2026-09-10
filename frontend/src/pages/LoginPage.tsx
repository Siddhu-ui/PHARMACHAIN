import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, CANONICAL_USERS } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, Store, Truck, Factory, Trash2, Shield } from 'lucide-react';
import { User, Role } from '../types';

export const LoginPage: React.FC = () => {
  const { switchUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('guna@shreemedicals.com');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const roleRouteMap: Record<Role, string> = {
    RETAILER: '/retailer',
    DISTRIBUTOR: '/distributor',
    MANUFACTURER: '/manufacturer',
    WASTE_FACILITY: '/waste-facility',
    REGULATOR: '/regulator',
  };

  const roleIconMap: Record<Role, React.ReactNode> = {
    RETAILER: <Store className="w-4 h-4 text-clinical-600" />,
    DISTRIBUTOR: <Truck className="w-4 h-4 text-warning-600" />,
    MANUFACTURER: <Factory className="w-4 h-4 text-clinical-700" />,
    WASTE_FACILITY: <Trash2 className="w-4 h-4 text-success-600" />,
    REGULATOR: <Shield className="w-4 h-4 text-critical-600" />,
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const matched = CANONICAL_USERS.find((u) => u.email === email) || CANONICAL_USERS[0];
    switchUser(matched);
    navigate(roleRouteMap[matched.role] || '/dashboard');
  };

  const handleSelectPersona = (user: User) => {
    switchUser(user);
    navigate(roleRouteMap[user.role] || '/dashboard');
  };

  return (
    <div className="min-h-screen bg-navy-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-clinical-700 text-white flex items-center justify-center mx-auto shadow-sm mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">
            PHARMAGUARD
          </h1>
          <p className="text-xs font-semibold text-clinical-700 uppercase tracking-wider mt-0.5">
            Pharmaceutical Reverse-Chain Compliance Platform
          </p>
          <p className="text-xs text-navy-500 mt-2">
            Track. Return. Destroy. Prevent Re-entry.
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white py-8 px-6 sm:px-10 border border-navy-200 shadow-sm rounded-2xl">
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-700 mb-1">
                Authorized User Email / ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-navy-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full text-xs rounded-lg border border-navy-200 focus:outline-none focus:ring-1 focus:ring-clinical-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-700 mb-1">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-navy-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full text-xs rounded-lg border border-navy-200 focus:outline-none focus:ring-1 focus:ring-clinical-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-xs transition"
            >
              {loading ? 'Authenticating...' : 'SIGN IN TO WORKSPACE'}
            </button>
          </form>

          {/* Quick Evaluation Personas */}
          <div className="mt-6 pt-6 border-t border-navy-100">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-navy-400 mb-2.5 text-center">
              Quick Workspace Access (Evaluation Mode)
            </span>

            <div className="space-y-1.5">
              {CANONICAL_USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectPersona(user)}
                  className="w-full text-left p-2 rounded-lg border border-navy-200 hover:bg-navy-50 hover:border-navy-300 transition flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-navy-100 flex items-center justify-center shrink-0">
                      {roleIconMap[user.role]}
                    </div>
                    <div>
                      <span className="font-bold text-navy-900 group-hover:text-clinical-700">
                        {user.name}
                      </span>
                      <span className="text-navy-500 text-[11px] ml-1.5">
                        • {user.organization} ({user.role})
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-navy-300 group-hover:text-clinical-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-navy-500 mt-6">
          Central Drugs Standard Control Organisation (CDSCO) Compliance Standard Rev 3.2
        </p>
      </div>
    </div>
  );
};
