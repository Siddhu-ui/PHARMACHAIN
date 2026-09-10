import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Pickup, ReturnRequest, Batch } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState, LoadingState } from '../components/States';
import { BatchDetailsDrawer } from '../components/BatchDetailsDrawer';
import { generateCompliancePDF } from '../utils/pdfGenerator';
import {
  Truck, Package, AlertTriangle, CheckCircle2,
  Upload, ArrowRight, ShieldCheck, MapPin, FileText, Check,
  Download, Filter, Search, Eye, Scale
} from 'lucide-react';

export const DistributorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/pickups')) return 'pickups';
    if (path.includes('/transit')) return 'transit';
    if (path.includes('/discrepancies')) return 'discrepancies';
    if (path.includes('/documents')) return 'documents';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pickup Confirmation Modal
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [actualQty, setActualQty] = useState<number>(100);
  const [actualWeight, setActualWeight] = useState<number>(4.8);
  const [evidenceFileName, setEvidenceFileName] = useState<string>('MLD-88219_Pickup_Docket.pdf');
  const [submittingPickup, setSubmittingPickup] = useState(false);

  // Batch Details Drawer
  const [selectedDrawerBatch, setSelectedDrawerBatch] = useState<Batch | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pickupData, returnData, batchData] = await Promise.all([
        api.getPickups(),
        api.getReturns(),
        api.getBatches(),
      ]);
      setPickups(pickupData || []);
      setReturns(returnData || []);
      setBatches(batchData || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load distributor operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingPickups = returns.filter((r) => r.status === 'PENDING_PICKUP' || r.status === 'PENDING');
  const inTransitReturns = returns.filter((r) => r.status === 'PICKED_UP' || r.status === 'IN_TRANSIT');
  const discrepancyPickups = pickups.filter((p) => p.actual_quantity !== p.expected_quantity);

  const handleOpenPickup = (ret: ReturnRequest) => {
    setSelectedReturn(ret);
    setActualQty(ret.quantity);
    setActualWeight(Number((ret.quantity * 0.048).toFixed(2)));
  };

  const handleConfirmPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setSubmittingPickup(true);
    try {
      const isMismatch = actualQty !== selectedReturn.quantity;
      await api.confirmPickup({
        return_request_id: selectedReturn.id,
        expected_quantity: selectedReturn.quantity,
        actual_quantity: actualQty,
        actual_weight: actualWeight,
        evidence_url: `/evidence/${evidenceFileName}`
      });

      if (isMismatch) {
        setSuccessMsg(
          `QUANTITY DISCREPANCY RECORDED: Return ${selectedReturn.id} logged with ${actualQty} strips (Expected ${selectedReturn.quantity}, Difference: ${actualQty - selectedReturn.quantity}). Audit flag raised.`
        );
      } else {
        setSuccessMsg(
          `Pickup verified for Return ${selectedReturn.id}. Batch ${selectedReturn.batch?.batch_number || 'CS10-A23-2507'} is now IN_TRANSIT to BharatCure Pharma Quarantine Bay.`
        );
      }

      setSelectedReturn(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm pickup.');
    } finally {
      setSubmittingPickup(false);
    }
  };

  const handleDownloadLogisticsDocket = (pickup: Pickup) => {
    generateCompliancePDF({
      id: pickup.id,
      type: 'PICKUP_DOCKET',
      title: 'Reverse Logistics Custody Transfer Docket',
      serialNumber: pickup.id,
      batchNumber: 'CS10-A23-2507',
      medicineName: 'CardioSafe 10 mg Tablets',
      issuer: pickup.distributor_name || 'MedLink Distributors',
      recipient: 'BharatCure Pharma - Central QA',
      quantity: pickup.actual_quantity,
      date: pickup.pickup_time,
      status: pickup.status === 'CONFIRMED' ? 'VERIFIED' : 'PENDING'
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader title="Distributor Logistics Hub" subtitle="MedLink Distributors" />
        <LoadingState message="Loading reverse logistics pickup queue and transit manifests..." />
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
              {currentUser?.organization || 'MedLink Distributors'}
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-clinical-50 text-clinical-800 border border-clinical-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-clinical-600" />
              State Logistics Corridor Hub
            </span>
          </div>
          <p className="text-xs text-navy-500 mt-0.5">
            Logistics Officer: {currentUser?.name || 'Senthil'} • Fleet: KA-04-E-8821 • Bengaluru Distribution Hub
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-1.5 rounded-lg border border-navy-200 bg-white hover:bg-navy-50 text-navy-800 text-xs font-semibold shadow-xs transition"
        >
          Refresh Manifests
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1 border-b border-navy-200 overflow-x-auto pb-px text-xs font-semibold">
        <button
          onClick={() => navigate('/distributor')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Logistics Overview
        </button>
        <button
          onClick={() => navigate('/distributor/pickups')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pickups'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Pickup Requests</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {pendingPickups.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/distributor/transit')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'transit'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>In Transit Fleet</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {inTransitReturns.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/distributor/discrepancies')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'discrepancies'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Discrepancies</span>
          {discrepancyPickups.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-critical-500 text-white text-[10px] font-bold">
              {discrepancyPickups.length}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/distributor/documents')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Transit Dockets & Reports
        </button>
      </div>

      {successMsg && (
        <AlertBanner
          type="success"
          title="Logistics Ledger Updated"
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
          {/* 4 Operations Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Pending Pickups"
              value={pendingPickups.length}
              icon={<Truck className="w-4 h-4 text-warning-600" />}
              color="warning"
              subtitle="From Shree Medicals & partners"
            />

            <MetricCard
              label="In Transit to BharatCure"
              value={inTransitReturns.length}
              icon={<Package className="w-4 h-4 text-clinical-600" />}
              color="clinical"
              subtitle="Fleet Van KA-04-E-8821"
            />

            <MetricCard
              label="Quantity Discrepancies"
              value={discrepancyPickups.length}
              icon={<AlertTriangle className="w-4 h-4 text-critical-600" />}
              color="critical"
              subtitle="Audit mismatch flagged"
            />

            <MetricCard
              label="Completed Deliveries"
              value={pickups.length}
              icon={<CheckCircle2 className="w-4 h-4 text-success-600" />}
              color="success"
              subtitle="Closed reverse logistics"
            />
          </div>

          {/* Quick Pickup Queue Table */}
          <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Active Reverse Pickup Queue</h3>
                <p className="text-xs text-navy-500">Retailer return consignments awaiting physical verification and collection</p>
              </div>
              <button
                onClick={() => navigate('/distributor/pickups')}
                className="text-xs font-semibold text-clinical-700 hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingPickups.length === 0 ? (
              <EmptyState
                title="All pickups completed"
                message="No pending reverse logistics orders awaiting MedLink collection."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-2.5">Return ID</th>
                      <th className="pb-2.5">Origin Retailer</th>
                      <th className="pb-2.5">Medicine Product</th>
                      <th className="pb-2.5">Expected Qty</th>
                      <th className="pb-2.5">Reason</th>
                      <th className="pb-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {pendingPickups.map((ret) => (
                      <tr key={ret.id} className="hover:bg-navy-50/50 transition">
                        <td className="py-3 font-mono font-bold text-clinical-700">
                          {ret.id}
                        </td>
                        <td className="py-3 font-semibold text-navy-800">
                          {ret.retailer_name || 'Shree Medicals'}
                        </td>
                        <td className="py-3 font-medium text-navy-900">
                          {ret.batch?.medicine?.name || 'CardioSafe 10 mg Tablets'}
                        </td>
                        <td className="py-3 font-mono font-semibold text-navy-900">
                          {ret.quantity} strips
                        </td>
                        <td className="py-3 text-navy-600">
                          {ret.reason}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleOpenPickup(ret)}
                            className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Confirm Pickup</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB: PICKUP REQUESTS ----------------- */}
      {activeTab === 'pickups' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Retail Pharmacy Pickup Queue</h3>
              <p className="text-xs text-navy-500">Authorized return orders scheduled for MedLink reverse logistics</p>
            </div>
            <span className="text-xs font-semibold text-navy-500">
              {pendingPickups.length} Orders Pending Collection
            </span>
          </div>

          {pendingPickups.length === 0 ? (
            <EmptyState
              title="No pending pickups"
              message="All reverse chain return consignments have been collected and verified into transit."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Return ID</th>
                    <th className="pb-2.5">Origin Retailer</th>
                    <th className="pb-2.5">Batch</th>
                    <th className="pb-2.5">Medicine Product</th>
                    <th className="pb-2.5">Expected Qty</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {pendingPickups.map((ret) => (
                    <tr key={ret.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3 font-mono font-bold text-clinical-700">
                        {ret.id}
                      </td>
                      <td className="py-3 font-semibold text-navy-800">
                        {ret.retailer_name || 'Shree Medicals'}
                      </td>
                      <td className="py-3 font-mono text-navy-700">
                        {ret.batch?.batch_number || 'CS10-A23-2507'}
                      </td>
                      <td className="py-3 font-medium text-navy-900">
                        {ret.batch?.medicine?.name || 'CardioSafe 10 mg Tablets'}
                      </td>
                      <td className="py-3 font-mono font-semibold text-navy-900">
                        {ret.quantity} strips
                      </td>
                      <td className="py-3">
                        <StatusBadge label={ret.status} size="sm" />
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <Link
                          to={`/batches/${ret.batch?.batch_number || 'CS10-A23-2507'}`}
                          className="px-2.5 py-1 rounded border border-navy-200 text-navy-700 hover:bg-navy-50 font-semibold text-[11px] transition"
                        >
                          Audit Trail
                        </Link>
                        <button
                          onClick={() => handleOpenPickup(ret)}
                          className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirm Pickup</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB: IN TRANSIT ----------------- */}
      {activeTab === 'transit' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">In Transit Fleet Consignments</h3>
              <p className="text-xs text-navy-500">Batches currently in transit to BharatCure Pharma Quarantine Bay</p>
            </div>
            <span className="text-xs font-semibold text-navy-500">
              {inTransitReturns.length} Active Shipments
            </span>
          </div>

          {inTransitReturns.length === 0 ? (
            <EmptyState
              title="No shipments currently in transit"
              message="All collected consignments have been delivered to manufacturer intake."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Return ID</th>
                    <th className="pb-2.5">Batch</th>
                    <th className="pb-2.5">Medicine</th>
                    <th className="pb-2.5">Quantity</th>
                    <th className="pb-2.5">Destination</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {inTransitReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3 font-mono font-bold text-clinical-700">{ret.id}</td>
                      <td className="py-3 font-mono text-navy-800">{ret.batch?.batch_number || 'CS10-A23-2507'}</td>
                      <td className="py-3 font-semibold text-navy-900">{ret.batch?.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                      <td className="py-3 font-mono font-semibold text-navy-900">{ret.quantity} strips</td>
                      <td className="py-3 text-navy-700">BharatCure Pharma - Quarantine Bay 2</td>
                      <td className="py-3"><StatusBadge label="IN_TRANSIT" size="sm" /></td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/batches/${ret.batch?.batch_number || 'CS10-A23-2507'}`}
                          className="px-3 py-1 rounded bg-clinical-50 text-clinical-700 border border-clinical-200 font-semibold text-[11px]"
                        >
                          Track Transit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB: DISCREPANCIES ----------------- */}
      {activeTab === 'discrepancies' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Quantity Discrepancies & Flagged Pickups</h3>
              <p className="text-xs text-navy-500">Pickups where physical strip count did not match retailer return manifest</p>
            </div>
          </div>

          {discrepancyPickups.length === 0 ? (
            <EmptyState
              title="Zero discrepancies detected"
              message="All verified pickups match 100% with registered retailer return manifest quantities."
            />
          ) : (
            <div className="space-y-3">
              {discrepancyPickups.map((p) => {
                const diff = p.actual_quantity - p.expected_quantity;
                return (
                  <div key={p.id} className="p-4 rounded-xl border border-critical-200 bg-critical-50/70">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-critical-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-critical-600 text-white">
                              QUANTITY DISCREPANCY
                            </span>
                            <span className="font-mono text-xs text-navy-700 font-bold">
                              Pickup Ref: {p.id} • Return: {p.return_request_id}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-navy-900 space-y-0.5">
                            <p>
                              Expected Manifest: <strong>{p.expected_quantity} strips</strong> • Received Ground Count:{' '}
                              <strong>{p.actual_quantity} strips</strong>
                            </p>
                            <p className="font-bold text-critical-800">
                              Variance Difference: {diff} strips ({((diff / p.expected_quantity) * 100).toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadLogisticsDocket(p)}
                          className="px-2.5 py-1 rounded bg-white border border-critical-200 text-critical-800 font-semibold text-[11px]"
                        >
                          Docket PDF
                        </button>
                        <Link
                          to="/batches/CS10-A23-2507"
                          className="px-2.5 py-1 rounded bg-critical-600 hover:bg-critical-700 text-white font-semibold text-[11px]"
                        >
                          Investigate
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB: DOCUMENTS ----------------- */}
      {activeTab === 'documents' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Transit Dockets & Chain-of-Custody Proofs</h3>
              <p className="text-xs text-navy-500">Legal transfer dockets for reverse supply chain consignments</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Docket Serial</th>
                  <th className="pb-2.5">Consignment Type</th>
                  <th className="pb-2.5">Batch</th>
                  <th className="pb-2.5">Origin Retailer</th>
                  <th className="pb-2.5">Verified Qty</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                <tr className="hover:bg-navy-50/50 transition">
                  <td className="py-3 font-mono font-bold text-navy-800">MLD-88219</td>
                  <td className="py-3 font-semibold text-navy-900">Reverse Logistics Custody Transfer Docket</td>
                  <td className="py-3 font-mono text-navy-700">CS10-A23-2507</td>
                  <td className="py-3 text-navy-700">Shree Medicals</td>
                  <td className="py-3 font-mono font-semibold text-navy-900">100 strips (4.8 kg)</td>
                  <td className="py-3"><StatusBadge label="CONFIRMED" size="sm" /></td>
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reusable Batch Details Drawer */}
      <BatchDetailsDrawer
        batch={selectedDrawerBatch}
        onClose={() => setSelectedDrawerBatch(null)}
      />

      {/* Pickup Confirmation Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-navy-200 shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Verify & Confirm Physical Pickup</h3>
                <p className="text-xs text-navy-500">Chain-of-Custody Handoff Protocol</p>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="text-navy-400 hover:text-navy-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPickup} className="space-y-4 text-xs">
              <div className="p-3 bg-navy-50 rounded-lg border border-navy-200 space-y-1">
                <span className="text-navy-500 text-[11px] font-semibold uppercase block">Pickup Consignment</span>
                <span className="font-bold text-navy-900 block text-sm">
                  {selectedReturn.batch?.medicine?.name || 'CardioSafe 10 mg Tablets'}
                </span>
                <span className="font-mono text-navy-700 text-xs block">
                  Return Ref: {selectedReturn.id} • Batch: {selectedReturn.batch?.batch_number || 'CS10-A23-2507'}
                </span>
                <span className="text-navy-600 text-xs block">
                  Origin: <strong>{selectedReturn.retailer_name || 'Shree Medicals, Bengaluru'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-navy-700 font-semibold mb-1">
                    Expected Strips
                  </label>
                  <input
                    type="number"
                    value={selectedReturn.quantity}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-navy-200 font-mono text-sm bg-navy-50 text-navy-600"
                  />
                </div>

                <div>
                  <label className="block text-navy-700 font-semibold mb-1">
                    Actual Counted Strips
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={actualQty}
                    onChange={(e) => {
                      const q = parseInt(e.target.value) || 0;
                      setActualQty(q);
                      setActualWeight(Number((q * 0.048).toFixed(2)));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-navy-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-clinical-500"
                    required
                  />
                </div>
              </div>

              {/* Quantity Discrepancy Real-time Alert */}
              {actualQty !== selectedReturn.quantity && (
                <div className="p-3 bg-critical-50 rounded-lg border border-critical-200 text-critical-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-critical-600 shrink-0" />
                    <span>QUANTITY DISCREPANCY DETECTED</span>
                  </div>
                  <p className="text-[11px]">
                    Expected: <strong>{selectedReturn.quantity}</strong> • Received: <strong>{actualQty}</strong> • Difference:{' '}
                    <strong>{actualQty - selectedReturn.quantity} strips</strong>.
                  </p>
                  <p className="text-[10px] text-critical-700">
                    Confirming this pickup will raise an automated fraud/loss alert in the State Drug Controller compliance ledger.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Verified Physical Weight (kg)
                </label>
                <div className="relative">
                  <Scale className="w-4 h-4 text-navy-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.01"
                    value={actualWeight}
                    onChange={(e) => setActualWeight(parseFloat(e.target.value) || 0)}
                    className="pl-9 pr-3 py-2 w-full rounded-lg border border-navy-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Signed Delivery Docket Attachment
                </label>
                <div className="p-2.5 bg-navy-50 rounded-lg border border-navy-200 flex items-center justify-between text-xs">
                  <span className="font-mono text-navy-800">{evidenceFileName}</span>
                  <span className="text-[11px] text-success-700 font-semibold">Attached</span>
                </div>
              </div>

              <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="px-3.5 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPickup}
                  className="px-4 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {submittingPickup ? 'Recording Ledger...' : 'CONFIRM PICKUP & DISPATCH'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
