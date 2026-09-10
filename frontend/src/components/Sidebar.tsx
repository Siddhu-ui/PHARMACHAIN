import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ScanLine, Package, Undo2, Truck,
  Building2, Flame, ShieldAlert, FileText, History,
  Settings, HelpCircle, ShieldCheck, CheckSquare,
  AlertTriangle, Inbox
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getMenuItems = () => {
    switch (currentUser?.role) {
      case 'RETAILER':
        return [
          { label: 'Dashboard', path: '/retailer', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Scan Medicine', path: '/scan', icon: <ScanLine className="w-4 h-4" />, highlight: true },
          { label: 'Inventory', path: '/retailer/inventory', icon: <Package className="w-4 h-4" /> },
          { label: 'Returns', path: '/retailer/returns', icon: <Undo2 className="w-4 h-4" /> },
          { label: 'Alerts', path: '/retailer/alerts', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'Documents', path: '/retailer/documents', icon: <FileText className="w-4 h-4" /> },
          { label: 'Audit Trail', path: '/batches/CS10-A23-2507', icon: <History className="w-4 h-4" /> },
        ];
      case 'DISTRIBUTOR':
        return [
          { label: 'Dashboard', path: '/distributor', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Scan Medicine', path: '/scan', icon: <ScanLine className="w-4 h-4" />, highlight: true },
          { label: 'Pickup Requests', path: '/distributor/pickups', icon: <Truck className="w-4 h-4" /> },
          { label: 'In Transit', path: '/distributor/transit', icon: <Package className="w-4 h-4" /> },
          { label: 'Discrepancies', path: '/distributor/discrepancies', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'Documents', path: '/distributor/documents', icon: <FileText className="w-4 h-4" /> },
          { label: 'Audit Trail', path: '/batches/CS10-A23-2507', icon: <History className="w-4 h-4" /> },
        ];
      case 'MANUFACTURER':
        return [
          { label: 'Dashboard', path: '/manufacturer', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Scan Medicine', path: '/scan', icon: <ScanLine className="w-4 h-4" />, highlight: true },
          { label: 'Awaiting Intake', path: '/manufacturer/returns', icon: <Inbox className="w-4 h-4" /> },
          { label: 'Quarantine Bay', path: '/manufacturer/quarantine', icon: <Building2 className="w-4 h-4" /> },
          { label: 'Disposal Schedule', path: '/manufacturer/disposal', icon: <Flame className="w-4 h-4" /> },
          { label: 'Certificates', path: '/manufacturer/certificates', icon: <FileText className="w-4 h-4" /> },
          { label: 'Audit Trail', path: '/batches/CS10-A23-2507', icon: <History className="w-4 h-4" /> },
        ];
      case 'WASTE_FACILITY':
        return [
          { label: 'Dashboard', path: '/waste-facility', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Scan Medicine', path: '/scan', icon: <ScanLine className="w-4 h-4" />, highlight: true },
          { label: 'Incoming Receipts', path: '/waste-facility/incoming', icon: <Inbox className="w-4 h-4" /> },
          { label: 'Destruction Chamber', path: '/waste-facility/destruction', icon: <Flame className="w-4 h-4" /> },
          { label: 'Destruction Certs', path: '/waste-facility/certificates', icon: <FileText className="w-4 h-4" /> },
          { label: 'Audit Trail', path: '/batches/CS10-A23-2507', icon: <History className="w-4 h-4" /> },
        ];
      case 'REGULATOR':
      default:
        return [
          { label: 'Dashboard', path: '/regulator', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: 'Scan Medicine', path: '/scan', icon: <ScanLine className="w-4 h-4" />, highlight: true },
          { label: 'Critical Incidents', path: '/regulator/incidents', icon: <ShieldAlert className="w-4 h-4" /> },
          { label: 'Batch Search', path: '/regulator/batches', icon: <Package className="w-4 h-4" /> },
          { label: 'Return Monitoring', path: '/regulator/returns', icon: <Undo2 className="w-4 h-4" /> },
          { label: 'Destruction Ledger', path: '/regulator/destruction', icon: <Flame className="w-4 h-4" /> },
          { label: 'Regulatory Audit', path: '/batches/CS10-A23-2507', icon: <History className="w-4 h-4" /> },
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside
      className={`
        ${isOpen ? 'w-60' : 'w-16'}
        bg-white border-r border-navy-200 transition-all duration-200 flex flex-col shrink-0 select-none
      `}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-navy-100 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-clinical-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
          <ShieldCheck className="w-4 h-4" />
        </div>
        {isOpen && (
          <div className="overflow-hidden leading-tight">
            <p className="text-xs font-extrabold text-navy-900 tracking-tight">PHARMAGUARD</p>
            <p className="text-[10px] text-navy-500 truncate">Reverse-Chain Compliance</p>
          </div>
        )}
      </div>

      {/* Role & Org Pill */}
      {isOpen && currentUser && (
        <div className="p-3 mx-2 mt-2 bg-navy-50 rounded-lg border border-navy-100">
          <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider">
            Active Workspace
          </div>
          <p className="text-xs font-semibold text-navy-900 truncate mt-0.5">{currentUser.organization}</p>
          <span className="inline-block text-[10px] font-medium text-clinical-700 bg-clinical-50 px-1.5 py-0.2 rounded border border-clinical-200 mt-1">
            {currentUser.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.label : ''}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition
                ${
                  item.highlight && !active
                    ? 'text-clinical-700 hover:bg-clinical-50 font-semibold'
                    : ''
                }
                ${
                  active
                    ? 'bg-clinical-50 text-clinical-800 font-semibold border border-clinical-200'
                    : 'text-navy-700 hover:bg-navy-50 hover:text-navy-900'
                }
              `}
            >
              <span className={`shrink-0 ${active ? 'text-clinical-700' : 'text-navy-500'}`}>
                {item.icon}
              </span>
              {isOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Support */}
      <div className="p-2 border-t border-navy-100 space-y-0.5">
        <Link
          to="/help"
          title={!isOpen ? 'Help & Directives' : ''}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-navy-600 hover:bg-navy-50 transition"
        >
          <HelpCircle className="w-4 h-4 shrink-0 text-navy-400" />
          {isOpen && <span>Help & Directives</span>}
        </Link>
        <Link
          to="/settings"
          title={!isOpen ? 'System Settings' : ''}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-navy-600 hover:bg-navy-50 transition"
        >
          <Settings className="w-4 h-4 shrink-0 text-navy-400" />
          {isOpen && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
};
