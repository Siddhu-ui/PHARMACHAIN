import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Batch, DestructionRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState, LoadingState } from '../components/States';
import { BatchDetailsDrawer } from '../components/BatchDetailsDrawer';
import { generateCompliancePDF } from '../utils/pdfGenerator';
import {
  Factory, Building2, Flame, CheckCircle2,
  AlertTriangle, Inbox, ArrowRight, ShieldCheck,
  FileCheck, History, ExternalLink, Check, Download,
  Search, Eye, ShieldAlert
} from 'lucide-react';

export const ManufacturerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/returns') || path.includes('/intake')) return 'returns';
    if (path.includes('/quarantine')) return 'quarantine';
    if (path.includes('/disposal')) return 'disposal';
    if (path.includes('/certificates')) return 'certificates';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [destructionRecords, setDestructionRecords] = useState<DestructionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quarantine Intake Modal
  const [intakeTarget, setIntakeTarget] = useState<Batch | null>(null);
  const [intakeQty, setIntakeQty] = useState(100);
  const [intakeNotes, setIntakeNotes] = useState('Packaging seal verified. Transferred to Quarantine Bay 2');
  const [submittingIntake, setSubmittingIntake] = useState(false);

  // Disposal Scheduling Modal
  const [disposalTarget, setDisposalTarget] = useState<Batch | null>(null);
  const [wasteFacility, setWasteFacility] = useState('GreenShield Biomedical Waste Services');
  const [disposalNotes, setDisposalNotes] = useState('Authorized for high-temperature biomedical incineration under CPCB norms');
  const [submittingDisposal, setSubmittingDisposal] = useState(false);

  // Batch Details Drawer
  const [selectedDrawerBatch, setSelectedDrawerBatch] = useState<Batch | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, records] = await Promise.all([
        api.getBatches(),
        api.getDestructionRecords().catch(() => []),
      ]);
      setBatches(batchesData || []);
      setDestructionRecords(records || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load manufacturer batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const awaitingIntakeBatches = batches.filter(
    (b) => b.status === 'IN_TRANSIT' || b.status === 'PICKUP_CONFIRMED' || b.status === 'RETURN_REQUESTED'
  );
  const quarantinedBatches = batches.filter(
    (b) => b.status === 'RECEIVED_BY_MANUFACTURER'
  );
  const awaitingDisposalBatches = batches.filter(
    (b) => b.status === 'AWAITING_DESTRUCTION'
  );
  const destroyedBatches = batches.filter(
    (b) => b.status === 'DESTRUCTION_VERIFIED' || b.status === 'CLOSED'
  );

  const handleOpenIntake = (batch: Batch) => {
    setIntakeTarget(batch);
    setIntakeQty(batch.quantity || 100);
    setIntakeNotes('Packaging seal verified. Transferred to Quarantine Bay 2');
  };

  const handleConfirmIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeTarget) return;

    setSubmittingIntake(true);
    try {
      await api.receiveByManufacturer(intakeTarget.id, intakeQty, intakeNotes);
      setSuccessMsg(`Batch ${intakeTarget.batch_number} received and secured in Quarantine Bay 2. Status updated.`);
      setIntakeTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record manufacturer intake.');
    } finally {
      setSubmittingIntake(false);
    }
  };

  const handleOpenDisposal = (batch: Batch) => {
    setDisposalTarget(batch);
    setWasteFacility('GreenShield Biomedical Waste Services');
    setDisposalNotes('Authorized for high-temperature biomedical incineration under CPCB norms');
  };

  const handleConfirmDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposalTarget) return;

    setSubmittingDisposal(true);
    try {
      await api.scheduleDisposal({
        batch_id: disposalTarget.id,
        waste_facility_name: wasteFacility,
        notes: disposalNotes
      });
      setSuccessMsg(
        `Disposal scheduled for Batch ${disposalTarget.batch_number} at ${wasteFacility}. Consignment moved to AWAITING_DESTRUCTION.`
      );
      setDisposalTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule disposal.');
    } finally {
      setSubmittingDisposal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader title="Manufacturer Central QA Portal" subtitle="BharatCure Pharma" />
        <LoadingState message="Loading manufacturer quarantine bay and batch logs..." />
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
              {currentUser?.organization || 'BharatCure Pharma'}
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-clinical-50 text-clinical-800 border border-clinical-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-clinical-600" />
              Central QA & Quarantine Unit
            </span>
          </div>
          <p className="text-xs text-navy-500 mt-0.5">
            QA Director: {currentUser?.name || 'Rajan'} • Formulation Facility: Vadodara Plant, Gujarat
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-1.5 rounded-lg border border-navy-200 bg-white hover:bg-navy-50 text-navy-800 text-xs font-semibold shadow-xs transition"
        >
          Refresh Ledger
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1 border-b border-navy-200 overflow-x-auto pb-px text-xs font-semibold">
        <button
          onClick={() => navigate('/manufacturer')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          QA Overview
        </button>
        <button
          onClick={() => navigate('/manufacturer/returns')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'returns'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Awaiting Intake</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {awaitingIntakeBatches.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/manufacturer/quarantine')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'quarantine'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Quarantine Bay</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {quarantinedBatches.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/manufacturer/disposal')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'disposal'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Disposal Queue</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {awaitingDisposalBatches.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/manufacturer/certificates')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Destruction Certificates
        </button>
      </div>

      {successMsg && (
        <AlertBanner
          type="success"
          title="Manufacturer Ledger Updated"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Awaiting Inbound Intake"
              value={awaitingIntakeBatches.length}
              icon={<Inbox className="w-4 h-4 text-warning-600" />}
              color="warning"
              subtitle="From MedLink Logistics fleet"
            />

            <MetricCard
              label="Quarantined Stock"
              value={quarantinedBatches.length}
              icon={<Building2 className="w-4 h-4 text-clinical-600" />}
              color="clinical"
              subtitle="Secured in Quarantine Bay 2"
            />

            <MetricCard
              label="Awaiting Destruction"
              value={awaitingDisposalBatches.length}
              icon={<Flame className="w-4 h-4 text-warning-600" />}
              color="warning"
              subtitle="Dispatched to GreenShield"
            />

            <MetricCard
              label="Destruction Verified"
              value={destroyedBatches.length}
              icon={<CheckCircle2 className="w-4 h-4 text-success-600" />}
              color="success"
              subtitle="Closed reverse lifecycle"
            />
          </div>

          {/* Quick Action Tables */}
          <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Quarantine Bay Active Batches</h3>
                <p className="text-xs text-navy-500">Secured expired consignments awaiting authorized biomedical disposal scheduling</p>
              </div>
              <button
                onClick={() => navigate('/manufacturer/quarantine')}
                className="text-xs font-semibold text-clinical-700 hover:underline inline-flex items-center gap-1"
              >
                <span>View Quarantine Bay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {quarantinedBatches.length === 0 ? (
              <EmptyState
                title="Quarantine bay is empty"
                message="No batches are currently held in manufacturer quarantine."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-2.5">Batch Number</th>
                      <th className="pb-2.5">Medicine Product</th>
                      <th className="pb-2.5">Quantity</th>
                      <th className="pb-2.5">Location</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {quarantinedBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-navy-50/50 transition">
                        <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                        <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                        <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                        <td className="py-3 text-navy-600">{b.current_location}</td>
                        <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleOpenDisposal(b)}
                            className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Schedule Disposal</span>
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

      {/* ----------------- TAB: AWAITING INTAKE ----------------- */}
      {activeTab === 'returns' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Inbound Reverse Logistics Intake</h3>
              <p className="text-xs text-navy-500">Batches in transit from MedLink Logistics awaiting receipt verification into Quarantine Bay</p>
            </div>
            <span className="text-xs font-semibold text-navy-500">{awaitingIntakeBatches.length} Consignments En Route</span>
          </div>

          {awaitingIntakeBatches.length === 0 ? (
            <EmptyState
              title="No batches awaiting intake"
              message="All inbound reverse chain consignments have been inspected and secured."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Batch Number</th>
                    <th className="pb-2.5">Product</th>
                    <th className="pb-2.5">Quantity</th>
                    <th className="pb-2.5">Transit Hub</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {awaitingIntakeBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                      <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                      <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                      <td className="py-3 text-navy-600">{b.current_location}</td>
                      <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedDrawerBatch(b)}
                          className="px-2.5 py-1 rounded border border-navy-200 text-navy-700 font-semibold text-[11px]"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleOpenIntake(b)}
                          className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1"
                        >
                          <Inbox className="w-3.5 h-3.5" />
                          <span>Receive into Quarantine</span>
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

      {/* ----------------- TAB: QUARANTINE BAY ----------------- */}
      {activeTab === 'quarantine' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Quarantine Bay 2 Inventory</h3>
              <p className="text-xs text-navy-500">Expired pharmaceutical stock held securely under manufacturer QA oversight</p>
            </div>
          </div>

          {quarantinedBatches.length === 0 ? (
            <EmptyState
              title="Quarantine bay is empty"
              message="No expired batches are currently held in physical quarantine."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Batch Number</th>
                    <th className="pb-2.5">Product</th>
                    <th className="pb-2.5">Quarantined Qty</th>
                    <th className="pb-2.5">Bay Location</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {quarantinedBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                      <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                      <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                      <td className="py-3 text-navy-600">{b.current_location}</td>
                      <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedDrawerBatch(b)}
                          className="px-2.5 py-1 rounded border border-navy-200 text-navy-700 font-semibold text-[11px]"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleOpenDisposal(b)}
                          className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Schedule Disposal</span>
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

      {/* ----------------- TAB: DISPOSAL QUEUE ----------------- */}
      {activeTab === 'disposal' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Authorized Biomedical Disposal Consignments</h3>
              <p className="text-xs text-navy-500">Batches dispatched to GreenShield Biomedical Waste Services for high-temp incineration</p>
            </div>
          </div>

          {awaitingDisposalBatches.length === 0 ? (
            <EmptyState
              title="No consignments in disposal queue"
              message="All scheduled disposal batches have been incinerated and certified."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Batch Number</th>
                    <th className="pb-2.5">Product</th>
                    <th className="pb-2.5">Dispatched Quantity</th>
                    <th className="pb-2.5">Authorized Facility</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Audit Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {awaitingDisposalBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                      <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                      <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                      <td className="py-3 text-navy-700">GreenShield Biomedical Waste Services</td>
                      <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/batches/${b.batch_number}`}
                          className="px-3 py-1 rounded bg-clinical-50 text-clinical-700 border border-clinical-200 font-semibold text-[11px]"
                        >
                          View Ledger
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

      {/* ----------------- TAB: CERTIFICATES ----------------- */}
      {activeTab === 'certificates' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Biomedical Destruction Certificates</h3>
              <p className="text-xs text-navy-500">Official certificates issued by authorized waste disposal facilities</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Certificate Number</th>
                  <th className="pb-2.5">Batch</th>
                  <th className="pb-2.5">Medicine Product</th>
                  <th className="pb-2.5">Destroyed Quantity</th>
                  <th className="pb-2.5">Facility Name</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                <tr className="hover:bg-navy-50/50 transition">
                  <td className="py-3 font-mono font-bold text-navy-800 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-success-600" />
                    <span>DC-00891</span>
                  </td>
                  <td className="py-3 font-mono text-navy-700">CS10-A23-2507</td>
                  <td className="py-3 font-semibold text-navy-900">CardioSafe 10 mg Tablets</td>
                  <td className="py-3 font-mono font-semibold text-navy-900">100 strips</td>
                  <td className="py-3 text-navy-700">GreenShield Biomedical Waste Services</td>
                  <td className="py-3"><StatusBadge label="DESTRUCTION_VERIFIED" size="sm" /></td>
                  <td className="py-3 text-right space-x-2">
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
                          recipient: 'BharatCure Pharma QA',
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
                    <Link
                      to="/batches/CS10-A23-2507"
                      className="text-clinical-700 hover:underline font-semibold text-[11px]"
                    >
                      Audit
                    </Link>
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

      {/* Quarantine Intake Modal */}
      {intakeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-navy-200 shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Manufacturer Intake & Quarantine</h3>
                <p className="text-xs text-navy-500">Verify returned consignment into Quarantine Bay</p>
              </div>
              <button
                onClick={() => setIntakeTarget(null)}
                className="text-navy-400 hover:text-navy-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmIntake} className="space-y-4 text-xs">
              <div className="p-3 bg-navy-50 rounded-lg border border-navy-200 space-y-1">
                <span className="text-navy-500 text-[11px] font-semibold uppercase block">Inbound Batch</span>
                <span className="font-bold text-navy-900 block text-sm">
                  {intakeTarget.medicine?.name || 'CardioSafe 10 mg Tablets'}
                </span>
                <span className="font-mono text-navy-700 text-xs block">
                  Batch: {intakeTarget.batch_number} • Current Location: {intakeTarget.current_location}
                </span>
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Received Counted Quantity (Strips)
                </label>
                <input
                  type="number"
                  min="1"
                  value={intakeQty}
                  onChange={(e) => setIntakeQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-clinical-500"
                  required
                />
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  QA Quarantine Notes
                </label>
                <textarea
                  rows={2}
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500"
                />
              </div>

              <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIntakeTarget(null)}
                  className="px-3.5 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIntake}
                  className="px-4 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {submittingIntake ? 'Verifying Intake...' : 'CONFIRM INTAKE TO QUARANTINE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disposal Scheduling Modal */}
      {disposalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-navy-200 shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Schedule Authorized Biomedical Destruction</h3>
                <p className="text-xs text-navy-500">Transfer consignment custody to authorized waste incinerator</p>
              </div>
              <button
                onClick={() => setDisposalTarget(null)}
                className="text-navy-400 hover:text-navy-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDisposal} className="space-y-4 text-xs">
              <div className="p-3 bg-navy-50 rounded-lg border border-navy-200 space-y-1">
                <span className="text-navy-500 text-[11px] font-semibold uppercase block">Selected Quarantine Batch</span>
                <span className="font-bold text-navy-900 block text-sm">
                  {disposalTarget.medicine?.name || 'CardioSafe 10 mg Tablets'}
                </span>
                <span className="font-mono text-navy-700 text-xs block">
                  Batch: {disposalTarget.batch_number} • Quantity: {disposalTarget.quantity} strips
                </span>
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  CPCB / SPCB Authorized Waste Facility
                </label>
                <select
                  value={wasteFacility}
                  onChange={(e) => setWasteFacility(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500"
                >
                  <option value="GreenShield Biomedical Waste Services">
                    GreenShield Biomedical Waste Services (Hosur Pyrolysis Complex)
                  </option>
                  <option value="EcoSafe Hazardous Management Ltd.">
                    EcoSafe Hazardous Management Ltd. (Vadodara)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Compliance Directives & Instructions
                </label>
                <textarea
                  rows={2}
                  value={disposalNotes}
                  onChange={(e) => setDisposalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500"
                />
              </div>

              <div className="p-3 bg-warning-50 rounded-lg border border-warning-200 text-warning-900 text-xs">
                <strong>Statutory Notice:</strong> Once dispatched, the consignment transitions to <code>AWAITING_DESTRUCTION</code>. GreenShield will issue Certificate <code>DC-00891</code> upon complete incineration.
              </div>

              <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisposalTarget(null)}
                  className="px-3.5 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDisposal}
                  className="px-4 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {submittingDisposal ? 'Dispatching Manifest...' : 'DISPATCH TO GREENSHIELD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
