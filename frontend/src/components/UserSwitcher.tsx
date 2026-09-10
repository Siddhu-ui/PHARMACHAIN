import React from 'react';
import { useAuth, CANONICAL_USERS } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Role } from '../types';
import { Building2, Check, ArrowRight, Shield, Store, Truck, Factory, Trash2 } from 'lucide-react';

interface UserSwitcherProps {
  onClose: () => void;
}

const roleIconMap: Record<Role, React.ReactNode> = {
  RETAILER: <Store className="w-4 h-4 text-clinical-600" />,
  DISTRIBUTOR: <Truck className="w-4 h-4 text-warning-600" />,
  MANUFACTURER: <Factory className="w-4 h-4 text-clinical-700" />,
  WASTE_FACILITY: <Trash2 className="w-4 h-4 text-success-600" />,
  REGULATOR: <Shield className="w-4 h-4 text-critical-600" />,
};

const roleRouteMap: Record<Role, string> = {
  RETAILER: '/retailer',
  DISTRIBUTOR: '/distributor',
  MANUFACTURER: '/manufacturer',
  WASTE_FACILITY: '/waste-facility',
  REGULATOR: '/regulator',
};

export const UserSwitcher: React.FC<UserSwitcherProps> = ({ onClose }) => {
  const { currentUser, switchUser } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (user: User) => {
    switchUser(user);
    onClose();
    navigate(roleRouteMap[user.role] || '/dashboard');
  };

  return (
    <div className="w-80 bg-white border border-navy-200 rounded-xl shadow-lg overflow-hidden z-50">
      {/* Active User Header */}
      <div className="p-4 bg-navy-50 border-b border-navy-100">
        <div className="text-[11px] font-bold uppercase tracking-wider text-navy-500 mb-2">
          Current Active Workspace
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-clinical-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-navy-900 truncate">{currentUser?.name}</p>
            <p className="text-xs text-navy-600 truncate flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-navy-400" />
              <span>{currentUser?.organization}</span>
            </p>
            <span className="inline-block text-[10px] font-semibold text-clinical-700 mt-0.5">
              Role: {currentUser?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Switch Workspace List */}
      <div className="p-2">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
          Switch Operation Persona
        </div>

        <div className="space-y-1 mt-1">
          {CANONICAL_USERS.map((user) => {
            const isSelected = user.email === currentUser?.email;

            return (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                className={`
                  w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between
                  ${
                    isSelected
                      ? 'bg-clinical-50 text-clinical-900 font-semibold border border-clinical-200'
                      : 'hover:bg-navy-50 text-navy-700 border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-navy-100 flex items-center justify-center shrink-0">
                    {roleIconMap[user.role]}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-navy-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-navy-500 truncate">{user.organization}</p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isSelected ? (
                    <Check className="w-4 h-4 text-clinical-600" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-navy-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-navy-50 border-t border-navy-100 flex items-center justify-between text-xs text-navy-500">
        <span>Standard Indian Reverse Chain</span>
        <button
          onClick={onClose}
          className="text-navy-600 hover:text-navy-900 font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
};
