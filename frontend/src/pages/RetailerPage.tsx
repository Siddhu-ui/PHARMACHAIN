import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Batch, ReturnRequest, Alert, FraudIncident } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { AlertBanner } from '../components/AlertBanner';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, LoadingState } from '../components/States';
import { BatchDetailsDrawer } from '../components/BatchDetailsDrawer';
import { calculateExpiryDays, formatLifecycleStatus } from '../utils/dateUtils';
import { generateCompliancePDF } from '../utils/pdfGenerator';
import {
  ScanLine, AlertTriangle, Clock, Undo2,
  Package, ArrowRight, ShieldCheck, Plus, CheckCircle2,
  Calendar, Layers, ExternalLink, Search, Filter,
  FileText, Download, Check, X, ShieldAlert, Eye
} from 'lucide-react';

export const RetailerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Active view: overview, inventory, returns, alerts, documents
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/returns')) return 'returns';
    if (path.includes('/alerts')) return 'alerts';
    if (path.includes('/documents')) return 'documents';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Return modal state
  const [returnBatch, setReturnBatch] = useState<Batch | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(100);
  const [returnReason, setReturnReason] = useState('Expired stock');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Batch details drawer state
  const [selectedDrawerBatch, setSelectedDrawerBatch] = useState<Batch | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, returnsData, alertsData] = await Promise.all([
        api.getBatches(),
        api.getReturns(),
        api.getAlerts('RETAILER').catch(() => []),
      ]);
      setBatches(batchesData || []);
      setReturns(returnsData || []);
      setAlerts(alertsData || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pharmacy compliance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter metrics
  const expiredBatches = batches.filter((b) => calculateExpiryDays(b.expiry_date).isExpired);
  const expiringSoonBatches = batches.filter((b) => calculateExpiryDays(b.expiry_date).isNearExpiry && !calculateExpiryDays(b.expiry_date).isExpired);
  const pendingReturns = returns.filter((r) => r.status === 'PENDING_PICKUP' || r.status === 'PENDING');

  const handleOpenReturnModal = (batch: Batch) => {
    setReturnBatch(batch);
    setReturnQuantity(batch.quantity || 100);
    setReturnReason('Expired stock (Section 18-B compliance)');
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBatch) return;

    setSubmittingReturn(true);
    try {
      const res = await api.createReturnRequest(
        returnBatch.id,
        returnQuantity,
        returnReason,
        currentUser?.id || 'guna@shreemedicals.com',
        currentUser?.organization || 'Shree Medicals'
      );
      setSuccessMsg(`Return request ${res.id} created for ${returnBatch.batch_number}. Reverse logistics dispatch queued for MedLink.`);
      setReturnBatch(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit return request.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleCancelReturn = async (returnId: string) => {
    if (!window.confirm(`Are you sure you want to cancel return request ${returnId}?`)) return;
    try {
      await api.cancelReturnRequest(returnId);
      setSuccessMsg(`Return request ${returnId} has been cancelled.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel return request.');
    }
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await api.markAlertRead(alertId);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
    } catch {
      // ignore
    }
  };

  const handleDownloadReturnManifest = (ret: ReturnRequest) => {
    generateCompliancePDF({
      id: ret.id,
      type: 'RETURN_MANIFEST',
      title: 'Reverse Supply Chain Return Manifest',
      serialNumber: ret.id,
      batchNumber: ret.batch?.batch_number || 'CS10-A23-2507',
      medicineName: ret.batch?.medicine?.name || 'CardioSafe 10 mg Tablets',
      issuer: ret.retailer_name || 'Shree Medicals',
      recipient: 'MedLink Distributors / BharatCure Pharma',
      quantity: ret.quantity,
      date: ret.created_at,
      status: ret.status === 'PICKED_UP' ? 'VERIFIED' : 'PENDING'
    });
  };

  // Filtered inventory
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.medicine?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const evalExp = calculateExpiryDays(b.expiry_date);
    if (statusFilter === 'EXPIRED') return matchesSearch && evalExp.isExpired;
    if (statusFilter === 'EXPIRING_SOON') return matchesSearch && evalExp.isNearExpiry && !evalExp.isExpired;
    if (statusFilter === 'ACTIVE') return matchesSearch && !evalExp.isExpired && !evalExp.isNearExpiry;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader title="Retail Pharmacy Portal" subtitle="Shree Medicals" />
        <LoadingState message="Loading inventory and reverse chain compliance records..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">
              {currentUser?.organization || 'Shree Medicals'}
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-success-50 text-success-800 border border-success-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success-600" />
              CDSCO Compliant
            </span>
          </div>
          <p className="text-xs text-navy-500 mt-0.5">
            Pharmacist: {currentUser?.name || 'Guna'} • License: 20B/21B-KA-BEN-09881 • Malleshwaram, Bengaluru
          </p>
        </div>

        <button
          onClick={() => navigate('/scan')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-xs transition"
        >
          <ScanLine className="w-4 h-4" />
          <span>SCAN MEDICINE</span>
        </button>
      </div>

      {/* View Switcher Tabs (Synchronized with URL) */}
      <div className="flex items-center gap-1 border-b border-navy-200 overflow-x-auto pb-px text-xs font-semibold">
        <button
          onClick={() => navigate('/retailer')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Dashboard Overview
        </button>
        <button
          onClick={() => navigate('/retailer/inventory')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Monitored Inventory</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {batches.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/retailer/returns')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'returns'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Return Orders</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {returns.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/retailer/alerts')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Alerts</span>
          {alerts.filter((a) => !a.read).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-critical-500 text-white text-[10px] font-bold">
              {alerts.filter((a) => !a.read).length}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/retailer/documents')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Documents & Manifests
        </button>
      </div>

      {successMsg && (
        <AlertBanner
          type="success"
          title="Action Completed"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {error && (
        <AlertBanner
          type="critical"
          title="Notice"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* ----------------- TAB: OVERVIEW ----------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hero Scanner Callout */}
          <div className="p-6 bg-gradient-to-r from-clinical-700 to-navy-900 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold uppercase tracking-wider">
                <span>Pharmacy Verification Gateway</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight">Scan Incoming & Dispensing Medicines</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Optical barcode & package scanning detects expired medicines, verifies manufacturer registered parameters, and alerts ground staff instantly.
              </p>
            </div>

            <button
              onClick={() => navigate('/scan')}
              className="px-6 py-3.5 rounded-xl bg-white text-navy-900 hover:bg-slate-100 font-extrabold text-xs shadow-md transition shrink-0 flex items-center justify-center gap-2"
            >
              <ScanLine className="w-4 h-4 text-clinical-600" />
              <span>LAUNCH SCANNER</span>
            </button>
          </div>

          {/* Attention Banner if Expired */}
          {expiredBatches.length > 0 && (
            <div className="p-4 rounded-xl border border-critical-300 bg-critical-50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-critical-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-critical-900">Quarantine Required</h4>
                  <p className="text-xs text-critical-800 mt-0.5">
                    {expiredBatches.length} batch has expired. Under Section 18-B of Drugs & Cosmetics Act, expired medicines must be quarantined and returned to distributor.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenReturnModal(expiredBatches[0])}
                className="px-3.5 py-1.5 rounded-lg bg-critical-600 hover:bg-critical-700 text-white text-xs font-semibold shrink-0 shadow-xs transition"
              >
                Create Return Request
              </button>
            </div>
          )}

          {/* 3 Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Expired Medicines"
              value={expiredBatches.length}
              icon={<AlertTriangle className="w-4 h-4 text-critical-600" />}
              color="critical"
              subtitle="Action required: Return immediately"
            />

            <MetricCard
              label="Expiring Soon (< 30 Days)"
              value={expiringSoonBatches.length}
              icon={<Clock className="w-4 h-4 text-warning-600" />}
              color="warning"
              subtitle="Monitor for shelf clearance"
            />

            <MetricCard
              label="Returns Pending Pickup"
              value={pendingReturns.length}
              icon={<Undo2 className="w-4 h-4 text-clinical-600" />}
              color="clinical"
              subtitle="Awaiting MedLink collection"
            />
          </div>

          {/* Summary Table Preview */}
          <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Active Pharmacy Stock</h3>
                <p className="text-xs text-navy-500">Live monitored batches on pharmacy shelves</p>
              </div>
              <button
                onClick={() => navigate('/retailer/inventory')}
                className="text-xs font-semibold text-clinical-700 hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Medicine</th>
                    <th className="pb-2.5">Batch</th>
                    <th className="pb-2.5">Expiry Date</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Quantity</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {batches.slice(0, 5).map((item) => {
                    const evalExp = calculateExpiryDays(item.expiry_date);
                    return (
                      <tr key={item.id} className="hover:bg-navy-50/50 transition">
                        <td className="py-3 font-semibold text-navy-900">
                          {item.medicine?.name || 'CardioSafe 10 mg Tablets'}
                        </td>
                        <td className="py-3 font-mono font-bold text-navy-800">
                          {item.batch_number}
                        </td>
                        <td className="py-3 font-mono text-navy-600">
                          {new Date(item.expiry_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3">
                          <StatusBadge label={item.status} size="sm" />
                        </td>
                        <td className="py-3 font-mono font-semibold text-navy-900">
                          {item.quantity} strips
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => setSelectedDrawerBatch(item)}
                            className="text-clinical-700 hover:underline font-semibold text-[11px]"
                          >
                            Details
                          </button>
                          {evalExp.isExpired && (
                            <button
                              onClick={() => handleOpenReturnModal(item)}
                              className="px-2 py-0.5 rounded bg-critical-600 hover:bg-critical-700 text-white font-semibold text-[11px]"
                            >
                              Return
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB: INVENTORY ----------------- */}
      {activeTab === 'inventory' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Monitored Pharmacy Inventory</h3>
              <p className="text-xs text-navy-500">All registered drug batches under custody of Shree Medicals</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-navy-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search batch or drug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500 w-48"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-navy-200 text-xs text-navy-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="EXPIRED">Expired Only</option>
                <option value="EXPIRING_SOON">Expiring Soon</option>
                <option value="ACTIVE">Active Shelf Stock</option>
              </select>
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <EmptyState
              title="No batches match filters"
              message="No inventory records matched your current query or filter selection."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Medicine Name</th>
                    <th className="pb-2.5">Batch Number</th>
                    <th className="pb-2.5">Expiry Date</th>
                    <th className="pb-2.5">Days Remaining</th>
                    <th className="pb-2.5">Stock</th>
                    <th className="pb-2.5">Lifecycle Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {filteredBatches.map((item) => {
                    const evalExp = calculateExpiryDays(item.expiry_date);

                    return (
                      <tr key={item.id} className="hover:bg-navy-50/50 transition">
                        <td className="py-3 font-semibold text-navy-900">
                          {item.medicine?.name || 'CardioSafe 10 mg Tablets'}
                        </td>
                        <td className="py-3 font-mono font-bold text-navy-800">
                          {item.batch_number}
                        </td>
                        <td className="py-3 font-mono text-navy-600">
                          {new Date(item.expiry_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-semibold ${
                              evalExp.isExpired
                                ? 'text-critical-700 font-bold'
                                : evalExp.isNearExpiry
                                ? 'text-warning-700 font-bold'
                                : 'text-success-700'
                            }`}
                          >
                            {evalExp.text}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-semibold text-navy-900">
                          {item.quantity} strips
                        </td>
                        <td className="py-3">
                          <StatusBadge label={item.status} size="sm" />
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => setSelectedDrawerBatch(item)}
                            className="px-2.5 py-1 rounded border border-navy-200 hover:bg-navy-50 text-navy-700 font-semibold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-navy-500" />
                            <span>View Details</span>
                          </button>
                          <Link
                            to={`/batches/${item.batch_number}`}
                            className="px-2.5 py-1 rounded bg-clinical-50 hover:bg-clinical-100 text-clinical-800 font-semibold text-[11px] border border-clinical-200 transition inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                          </Link>
                          {evalExp.isExpired && (
                            <button
                              onClick={() => handleOpenReturnModal(item)}
                              className="px-2.5 py-1 rounded bg-critical-600 hover:bg-critical-700 text-white font-semibold text-[11px] shadow-2xs transition"
                            >
                              Create Return
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB: RETURNS ----------------- */}
      {activeTab === 'returns' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Reverse Logistics Return Orders</h3>
              <p className="text-xs text-navy-500">Official return requests initiated by Shree Medicals</p>
            </div>
            <button
              onClick={() => {
                const exp = batches.find((b) => calculateExpiryDays(b.expiry_date).isExpired) || batches[0];
                if (exp) handleOpenReturnModal(exp);
              }}
              className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-semibold text-xs shadow-2xs transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Initiate Return</span>
            </button>
          </div>

          {returns.length === 0 ? (
            <EmptyState
              title="No return requests on record"
              message="No expired or recalled stock has been queued for reverse pickup."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Return ID</th>
                    <th className="pb-2.5">Medicine Product</th>
                    <th className="pb-2.5">Batch</th>
                    <th className="pb-2.5">Quantity</th>
                    <th className="pb-2.5">Reason</th>
                    <th className="pb-2.5">Created Date</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {returns.map((ret) => {
                    const isPending = ret.status === 'PENDING_PICKUP' || ret.status === 'PENDING';

                    return (
                      <tr key={ret.id} className="hover:bg-navy-50/50 transition">
                        <td className="py-3 font-mono font-bold text-clinical-700">
                          {ret.id}
                        </td>
                        <td className="py-3 font-semibold text-navy-900">
                          {ret.batch?.medicine?.name || 'CardioSafe 10 mg Tablets'}
                        </td>
                        <td className="py-3 font-mono text-navy-800">
                          {ret.batch?.batch_number || 'CS10-A23-2507'}
                        </td>
                        <td className="py-3 font-mono font-semibold text-navy-900">
                          {ret.quantity} strips
                        </td>
                        <td className="py-3 text-navy-700">
                          {ret.reason}
                        </td>
                        <td className="py-3 font-mono text-navy-600">
                          {new Date(ret.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3">
                          <StatusBadge label={ret.status} size="sm" />
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => handleDownloadReturnManifest(ret)}
                            className="px-2.5 py-1 rounded border border-navy-200 hover:bg-navy-50 text-navy-700 font-semibold text-[11px] transition inline-flex items-center gap-1"
                            title="Download Return Manifest PDF"
                          >
                            <Download className="w-3 h-3 text-navy-500" />
                            <span>PDF</span>
                          </button>
                          <Link
                            to={`/batches/${ret.batch?.batch_number || 'CS10-A23-2507'}`}
                            className="text-clinical-700 hover:underline font-semibold text-[11px]"
                          >
                            Track
                          </Link>
                          {isPending && (
                            <button
                              onClick={() => handleCancelReturn(ret.id)}
                              className="px-2 py-0.5 rounded border border-critical-200 text-critical-700 hover:bg-critical-50 font-semibold text-[11px] transition"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB: ALERTS ----------------- */}
      {activeTab === 'alerts' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Pharmacy Compliance & Security Alerts</h3>
              <p className="text-xs text-navy-500">Real-time alerts broadcast from CDSCO and BharatCure QA</p>
            </div>
            <span className="text-xs font-semibold text-navy-500">
              {alerts.length} Alerts Dispatched
            </span>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              title="No compliance alerts"
              message="Pharmacy counter is clear. No tampering, re-entry, or statutory alarms active."
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
                              alert.severity === 'CRITICAL'
                                ? 'bg-critical-600 text-white'
                                : 'bg-warning-600 text-white'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-[11px] font-mono text-navy-500">
                            {new Date(alert.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-navy-900 mt-1.5">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/batches/CS10-A23-2507"
                        className="px-2.5 py-1 rounded bg-white border border-navy-200 text-navy-800 font-semibold text-[11px] hover:bg-navy-50 transition"
                      >
                        Investigate Batch
                      </Link>
                      {!alert.read && (
                        <button
                          onClick={() => handleMarkAlertRead(alert.id)}
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
      )}

      {/* ----------------- TAB: DOCUMENTS ----------------- */}
      {activeTab === 'documents' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Regulatory Documents & Invoices</h3>
              <p className="text-xs text-navy-500">Reverse supply chain manifests, pickup receipts, and compliance files</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Document Type</th>
                  <th className="pb-2.5">Reference ID</th>
                  <th className="pb-2.5">Associated Batch</th>
                  <th className="pb-2.5">Issuing Stakeholder</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                <tr className="hover:bg-navy-50/50 transition">
                  <td className="py-3 font-semibold text-navy-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-clinical-600" />
                    <span>Return Manifest Docket</span>
                  </td>
                  <td className="py-3 font-mono font-bold text-navy-800">RET-00125</td>
                  <td className="py-3 font-mono text-navy-700">CS10-A23-2507</td>
                  <td className="py-3 text-navy-700">Shree Medicals</td>
                  <td className="py-3 text-navy-600">12/06/2026</td>
                  <td className="py-3">
                    <StatusBadge label="VERIFIED" size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() =>
                        generateCompliancePDF({
                          id: 'RET-00125',
                          type: 'RETURN_MANIFEST',
                          title: 'Reverse Supply Chain Return Manifest',
                          serialNumber: 'RET-00125',
                          batchNumber: 'CS10-A23-2507',
                          medicineName: 'CardioSafe 10 mg Tablets',
                          issuer: 'Shree Medicals',
                          recipient: 'MedLink Distributors',
                          quantity: 100,
                          date: '2026-06-12',
                          status: 'VERIFIED'
                        })
                      }
                      className="px-2.5 py-1 rounded bg-clinical-600 hover:bg-clinical-700 text-white font-semibold text-[11px] shadow-2xs transition inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-navy-50/50 transition">
                  <td className="py-3 font-semibold text-navy-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-clinical-600" />
                    <span>Logistics Pickup Receipt</span>
                  </td>
                  <td className="py-3 font-mono font-bold text-navy-800">MLD-88219</td>
                  <td className="py-3 font-mono text-navy-700">CS10-A23-2507</td>
                  <td className="py-3 text-navy-700">MedLink Distributors</td>
                  <td className="py-3 text-navy-600">22/06/2026</td>
                  <td className="py-3">
                    <StatusBadge label="VERIFIED" size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() =>
                        generateCompliancePDF({
                          id: 'MLD-88219',
                          type: 'PICKUP_DOCKET',
                          title: 'Reverse Logistics Custody Transfer Docket',
                          serialNumber: 'MLD-88219',
                          batchNumber: 'CS10-A23-2507',
                          medicineName: 'CardioSafe 10 mg Tablets',
                          issuer: 'MedLink Distributors',
                          recipient: 'BharatCure Pharma',
                          quantity: 100,
                          date: '2026-06-22',
                          status: 'VERIFIED'
                        })
                      }
                      className="px-2.5 py-1 rounded bg-clinical-600 hover:bg-clinical-700 text-white font-semibold text-[11px] shadow-2xs transition inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-navy-50/50 transition">
                  <td className="py-3 font-semibold text-navy-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-success-600" />
                    <span>Destruction Certificate (Reference)</span>
                  </td>
                  <td className="py-3 font-mono font-bold text-navy-800">DC-00891</td>
                  <td className="py-3 font-mono text-navy-700">CS10-A23-2507</td>
                  <td className="py-3 text-navy-700">GreenShield Biomedical Waste</td>
                  <td className="py-3 text-navy-600">12/07/2026</td>
                  <td className="py-3">
                    <StatusBadge label="DESTRUCTION_VERIFIED" size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() =>
                        generateCompliancePDF({
                          id: 'DC-00891',
                          type: 'DESTRUCTION_CERTIFICATE',
                          title: 'Biomedical Waste Destruction Certificate',
                          serialNumber: 'DC-00891',
                          batchNumber: 'CS10-A23-2507',
                          medicineName: 'CardioSafe 10 mg Tablets',
                          issuer: 'GreenShield Biomedical Waste Services',
                          recipient: 'State Drug Controller / CDSCO',
                          quantity: 100,
                          date: '2026-07-12',
                          status: 'VERIFIED'
                        })
                      }
                      className="px-2.5 py-1 rounded bg-clinical-600 hover:bg-clinical-700 text-white font-semibold text-[11px] shadow-2xs transition inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reusable Batch Details Drawer */}
      <BatchDetailsDrawer
        batch={selectedDrawerBatch}
        onClose={() => setSelectedDrawerBatch(null)}
        onCreateReturn={handleOpenReturnModal}
      />

      {/* Return Request Modal */}
      {returnBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-navy-200 shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Initiate Return Request</h3>
                <p className="text-xs text-navy-500">Reverse supply chain collection order</p>
              </div>
              <button
                onClick={() => setReturnBatch(null)}
                className="text-navy-400 hover:text-navy-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-navy-50 border border-navy-200">
                <span className="text-navy-500 text-[11px] block font-semibold uppercase">Selected Batch</span>
                <span className="text-sm font-bold text-navy-900 block mt-0.5">
                  {returnBatch.medicine?.name || 'CardioSafe 10 mg Tablets'}
                </span>
                <span className="font-mono text-navy-700 text-xs block mt-0.5">
                  Batch No: {returnBatch.batch_number} • Expiry: {new Date(returnBatch.expiry_date).toLocaleDateString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Quantity for Return (Strips)
                </label>
                <input
                  type="number"
                  min="1"
                  max={returnBatch.quantity || 100}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-clinical-500"
                  required
                />
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Reason for Return
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500"
                >
                  <option value="Expired stock (Section 18-B compliance)">Expired stock (Section 18-B compliance)</option>
                  <option value="Damaged packaging detected on intake">Damaged packaging detected on intake</option>
                  <option value="Regulatory recall by State Drug Controller">Regulatory recall by State Drug Controller</option>
                </select>
              </div>

              <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReturnBatch(null)}
                  className="px-3.5 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-4 py-2 rounded-lg bg-critical-600 hover:bg-critical-700 text-white font-semibold disabled:opacity-50"
                >
                  {submittingReturn ? 'Submitting...' : 'Create Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
