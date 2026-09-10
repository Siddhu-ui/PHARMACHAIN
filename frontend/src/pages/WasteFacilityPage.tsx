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
  Flame, FileCheck, CheckCircle2, ShieldCheck,
  AlertTriangle, Inbox, ArrowRight, Upload,
  FileText, Check, Layers, Download, Eye, ExternalLink
} from 'lucide-react';

export const WasteFacilityPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/incoming') || path.includes('/receipts')) return 'incoming';
    if (path.includes('/destruction')) return 'destruction';
    if (path.includes('/certificates')) return 'certificates';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [destructionRecords, setDestructionRecords] = useState<DestructionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState<{
    batch_number: string;
    quantity: number;
    certificate_number: string;
  } | null>(null);

  // Destruction Workflow Modal state
  const [destroyTarget, setDestroyTarget] = useState<Batch | null>(null);
  const [workflowStep, setWorkflowStep] = useState<number>(1);
  const [verifiedBatchCheck, setVerifiedBatchCheck] = useState(true);
  const [verifiedQuantity, setVerifiedQuantity] = useState(100);
  const [certificateNumber, setCertificateNumber] = useState('DC-00891');
  const [certificateFile, setCertificateFile] = useState('DC-00891_Certificate_GreenShield.pdf');
  const [incinerationTemp, setIncinerationTemp] = useState('1200°C (High-Temperature Pyrolysis)');
  const [submittingDestruction, setSubmittingDestruction] = useState(false);

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
      setError(err?.message || 'Failed to load waste facility data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingReceipts = batches.filter(
    (b) => b.status === 'AWAITING_DESTRUCTION' || b.status === 'RECEIVED_BY_MANUFACTURER'
  );
  const activeDestructionQueue = batches.filter(
    (b) => b.status === 'AWAITING_DESTRUCTION'
  );
  const destroyedBatches = batches.filter(
    (b) => b.status === 'DESTRUCTION_VERIFIED' || b.status === 'CLOSED'
  );

  const handleOpenWorkflow = (batch: Batch) => {
    setDestroyTarget(batch);
    setVerifiedQuantity(batch.quantity || 100);
    setCertificateNumber('DC-00891');
    setWorkflowStep(1);
    setVerifiedBatchCheck(true);
  };

  const handleConfirmDestruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destroyTarget) return;

    setSubmittingDestruction(true);
    try {
      await api.confirmDestruction({
        batch_id: destroyTarget.id,
        waste_facility_id: currentUser?.id || 'waste_greenshield_01',
        waste_facility_name: 'GreenShield Biomedical Waste Services',
        certificate_number: certificateNumber,
        destroyed_quantity: verifiedQuantity,
        certificate_url: `/certificates/${certificateNumber}.pdf`
      });

      setVerifiedSuccess({
        batch_number: destroyTarget.batch_number,
        quantity: verifiedQuantity,
        certificate_number: certificateNumber
      });

      setDestroyTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Destruction record confirmation failed.');
    } finally {
      setSubmittingDestruction(false);
    }
  };

  const handleDownloadCertificate = (rec: DestructionRecord | any) => {
    generateCompliancePDF({
      id: rec.id || 'DC-00891',
      type: 'DESTRUCTION_CERTIFICATE',
      title: 'Biomedical Waste Destruction Certificate',
      serialNumber: rec.certificate_number || 'DC-00891',
      batchNumber: rec.batch?.batch_number || 'CS10-A23-2507',
      medicineName: 'CardioSafe 10 mg Tablets',
      issuer: 'GreenShield Biomedical Waste Services',
      recipient: 'BharatCure Pharma / State Drug Controller',
      quantity: rec.destroyed_quantity || 100,
      date: rec.destruction_date || new Date().toISOString(),
      status: 'VERIFIED'
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader title="Biomedical Waste Destruction Facility" subtitle="GreenShield" />
        <LoadingState message="Loading incineration manifest queue and temperature logs..." />
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
              GreenShield Biomedical Waste Services
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-success-50 text-success-800 border border-success-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success-600" />
              CPCB / SPCB Authorized Facility
            </span>
          </div>
          <p className="text-xs text-navy-500 mt-0.5">
            Destruction Officer: {currentUser?.name || 'Anbu'} • Incineration Complex, Hosur Industrial Zone, Tamil Nadu
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
          onClick={() => navigate('/waste-facility')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Chamber Overview
        </button>
        <button
          onClick={() => navigate('/waste-facility/incoming')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'incoming'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Incoming Consignments</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {pendingReceipts.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/waste-facility/destruction')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'destruction'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Incineration Queue</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {activeDestructionQueue.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/waste-facility/certificates')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'certificates'
              ? 'border-clinical-600 text-clinical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Destruction Certificates</span>
          <span className="px-1.5 py-0.2 rounded-full bg-success-100 text-success-800 text-[10px] font-bold">
            {destroyedBatches.length}
          </span>
        </button>
      </div>

      {/* Verified Destruction Banner */}
      {verifiedSuccess && (
        <div className="p-5 rounded-xl border border-success-300 bg-success-50 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-success-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-success-600 text-white">
                  DESTRUCTION VERIFIED
                </span>
                <span className="text-xs font-bold text-success-800">LIFECYCLE STATUS: CLOSED</span>
              </div>
              <h3 className="text-base font-bold text-navy-900 mt-1">
                Batch {verifiedSuccess.batch_number} Permanently Incinerated
              </h3>
              <p className="text-xs text-navy-700 mt-0.5">
                Quantity: <strong>{verifiedSuccess.quantity} strips</strong> • Certificate Serial: <strong className="font-mono">{verifiedSuccess.certificate_number}</strong> • Method: High-Temp Pyrolysis Incineration
              </p>
              <div className="mt-2.5 p-2 bg-white rounded border border-success-200 text-xs text-success-800 font-medium">
                ✓ Immutable ledger closed. Re-entry monitoring activated across all retail gateways. If this batch is scanned again, a critical regulatory alarm will trigger.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    handleDownloadCertificate({
                      certificate_number: verifiedSuccess.certificate_number,
                      destroyed_quantity: verifiedSuccess.quantity,
                      batch: { batch_number: verifiedSuccess.batch_number }
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-clinical-700 hover:bg-clinical-800 text-white font-semibold text-xs transition inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Certificate PDF</span>
                </button>
                <Link
                  to={`/batches/${verifiedSuccess.batch_number}`}
                  className="px-3 py-1.5 rounded-lg bg-success-700 hover:bg-success-800 text-white font-semibold text-xs transition"
                >
                  View Final Audit Ledger →
                </Link>
                <button
                  onClick={() => setVerifiedSuccess(null)}
                  className="px-3 py-1.5 rounded-lg border border-success-300 text-success-800 hover:bg-success-100/50 text-xs font-semibold transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
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
              label="Pending Receipts"
              value={pendingReceipts.length}
              icon={<Inbox className="w-4 h-4 text-warning-600" />}
              color="warning"
              subtitle="Awaiting physical delivery"
            />

            <MetricCard
              label="Active Incineration Queue"
              value={activeDestructionQueue.length}
              icon={<Flame className="w-4 h-4 text-clinical-600" />}
              color="clinical"
              subtitle="High-Temp Pyrolysis Chamber"
            />

            <MetricCard
              label="Certificates Issued"
              value={destroyedBatches.length}
              icon={<FileCheck className="w-4 h-4 text-success-600" />}
              color="success"
              subtitle="Signed & digitally sealed"
            />

            <MetricCard
              label="Permanent Chain Closures"
              value={destroyedBatches.length}
              icon={<CheckCircle2 className="w-4 h-4 text-success-600" />}
              color="success"
              subtitle="Guaranteed re-entry protection"
            />
          </div>

          {/* Incoming Manifest Queue Preview */}
          <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Active Incineration Manifest Queue</h3>
                <p className="text-xs text-navy-500">Authorized expiry consignments awaiting high-temperature biomedical destruction</p>
              </div>
              <button
                onClick={() => navigate('/waste-facility/destruction')}
                className="text-xs font-semibold text-clinical-700 hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Batch Number</th>
                    <th className="pb-2.5">Medicine Product</th>
                    <th className="pb-2.5">Quantity</th>
                    <th className="pb-2.5">Origin Facility</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Primary Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {batches.map((b) => {
                    const isClosed = b.status === 'DESTRUCTION_VERIFIED' || b.status === 'CLOSED';

                    return (
                      <tr key={b.id} className="hover:bg-navy-50/50 transition">
                        <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                        <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                        <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                        <td className="py-3 text-navy-600">{b.manufacturer_name || 'BharatCure Pharma'}</td>
                        <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                        <td className="py-3 text-right">
                          {!isClosed ? (
                            <button
                              onClick={() => handleOpenWorkflow(b)}
                              className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                              <Flame className="w-3.5 h-3.5" />
                              <span>RECORD DESTRUCTION</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-success-700 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>DC-00891 Issued</span>
                            </div>
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

      {/* ----------------- TAB: INCOMING BATCHES ----------------- */}
      {activeTab === 'incoming' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Incoming Quarantine Consignments</h3>
              <p className="text-xs text-navy-500">Batches routed to GreenShield for high-temperature pyrolysis</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Batch</th>
                  <th className="pb-2.5">Product</th>
                  <th className="pb-2.5">Quantity</th>
                  <th className="pb-2.5">Consignor</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {pendingReceipts.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-50/50 transition">
                    <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                    <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                    <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                    <td className="py-3 text-navy-600">{b.manufacturer_name || 'BharatCure Pharma'}</td>
                    <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleOpenWorkflow(b)}
                        className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition"
                      >
                        Intake to Chamber
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB: DESTRUCTION PROTOCOL ----------------- */}
      {activeTab === 'destruction' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Pyrolysis Incineration Chamber Protocol</h3>
              <p className="text-xs text-navy-500">Execute verified thermal destruction under Section 18-B CPCB standards</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Batch</th>
                  <th className="pb-2.5">Medicine Product</th>
                  <th className="pb-2.5">Quantity</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Incineration Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {batches.map((b) => {
                  const isClosed = b.status === 'DESTRUCTION_VERIFIED' || b.status === 'CLOSED';
                  return (
                    <tr key={b.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                      <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                      <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                      <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                      <td className="py-3 text-right">
                        {!isClosed ? (
                          <button
                            onClick={() => handleOpenWorkflow(b)}
                            className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1.5"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>RECORD DESTRUCTION</span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-success-700">✓ Incinerated (DC-00891)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB: CERTIFICATES ----------------- */}
      {activeTab === 'certificates' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Issued Destruction Certificates Registry</h3>
              <p className="text-xs text-navy-500">Permanent digital certificates sealing pharmaceutical reverse lifecycles</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Certificate Number</th>
                  <th className="pb-2.5">Batch</th>
                  <th className="pb-2.5">Product</th>
                  <th className="pb-2.5">Quantity Incinerated</th>
                  <th className="pb-2.5">Chamber Setting</th>
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
                  <td className="py-3 text-navy-600">1200°C Pyrolysis</td>
                  <td className="py-3"><StatusBadge label="DESTRUCTION_VERIFIED" size="sm" /></td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() =>
                        handleDownloadCertificate({
                          certificate_number: 'DC-00891',
                          batch: { batch_number: 'CS10-A23-2507' },
                          destroyed_quantity: 100,
                          destruction_date: '2026-07-12'
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
                      Audit Trail
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Step Destruction Workflow Modal */}
      {destroyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-navy-200 shadow-2xl max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Biomedical Destruction Protocol</h3>
                <p className="text-xs text-navy-500">GreenShield Certified Incineration Workflow</p>
              </div>
              <button
                onClick={() => setDestroyTarget(null)}
                className="text-navy-400 hover:text-navy-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step Tracker */}
            <div className="flex items-center justify-between mb-5 px-2 text-[11px] font-semibold text-navy-500">
              <span className={workflowStep >= 1 ? 'text-clinical-700 font-bold' : ''}>1. Verify Batch</span>
              <span>→</span>
              <span className={workflowStep >= 2 ? 'text-clinical-700 font-bold' : ''}>2. Chamber Setting</span>
              <span>→</span>
              <span className={workflowStep >= 3 ? 'text-clinical-700 font-bold' : ''}>3. Issue Certificate DC-00891</span>
            </div>

            <form onSubmit={handleConfirmDestruction} className="space-y-4 text-xs">
              {/* Step 1: Verify Batch */}
              {workflowStep === 1 && (
                <div className="space-y-3">
                  <div className="p-3 bg-navy-50 rounded-lg border border-navy-200">
                    <span className="text-navy-500 text-[11px] block font-semibold uppercase">Consignment Identification</span>
                    <span className="text-sm font-bold text-navy-900 block mt-0.5">
                      {destroyTarget.medicine?.name || 'CardioSafe 10 mg Tablets'}
                    </span>
                    <span className="font-mono text-navy-700 text-xs block mt-0.5">
                      Batch: {destroyTarget.batch_number} • Manufacturer: BharatCure Pharma
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-navy-200 rounded-lg space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={verifiedBatchCheck}
                        onChange={(e) => setVerifiedBatchCheck(e.target.checked)}
                        className="w-4 h-4 text-clinical-600 rounded"
                        required
                      />
                      <span className="font-medium text-navy-800">
                        Physical blister packaging and tamper-evident seal match consignment manifest
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWorkflowStep(2)}
                    disabled={!verifiedBatchCheck}
                    className="w-full py-2.5 rounded-lg bg-clinical-600 text-white font-bold text-xs hover:bg-clinical-700 disabled:opacity-50"
                  >
                    Proceed to Chamber Verification →
                  </button>
                </div>
              )}

              {/* Step 2: Chamber & Quantity */}
              {workflowStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-navy-800 font-semibold mb-1">
                      Counted Destruction Quantity (Strips)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={verifiedQuantity}
                      onChange={(e) => setVerifiedQuantity(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-navy-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-clinical-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-navy-800 font-semibold mb-1">
                      Destruction Incineration Chamber
                    </label>
                    <input
                      type="text"
                      value={incinerationTemp}
                      readOnly
                      className="w-full px-3 py-2 rounded-lg border border-navy-200 text-xs font-mono text-navy-800 bg-navy-50"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWorkflowStep(1)}
                      className="w-1/3 py-2 rounded-lg border border-navy-200 text-navy-700 font-medium"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkflowStep(3)}
                      className="w-2/3 py-2 rounded-lg bg-clinical-600 text-white font-bold text-xs hover:bg-clinical-700"
                    >
                      Record Certificate DC-00891 →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Certificate Serial & Confirmation */}
              {workflowStep === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-navy-800 font-semibold mb-1">
                      Destruction Certificate Serial Number
                    </label>
                    <input
                      type="text"
                      value={certificateNumber}
                      onChange={(e) => setCertificateNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-navy-200 font-mono text-sm font-bold text-navy-900 focus:outline-none focus:ring-1 focus:ring-clinical-500"
                      required
                    />
                    <span className="text-[10px] text-navy-500 mt-0.5 block">
                      Canonical GreenShield Certificate: DC-00891
                    </span>
                  </div>

                  <div>
                    <label className="block text-navy-800 font-semibold mb-1">
                      Digitally Sealed Manifest Document
                    </label>
                    <div className="p-3 bg-navy-50 rounded-lg border border-navy-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-navy-800 font-mono">
                        <FileCheck className="w-4 h-4 text-success-600" />
                        <span>{certificateFile}</span>
                      </div>
                      <span className="text-[11px] text-success-700 font-semibold">Attached</span>
                    </div>
                  </div>

                  <div className="p-3 bg-critical-50 rounded-lg border border-critical-200 text-xs text-critical-900">
                    <strong>Permanent Lifecycle Notice:</strong> Recording this certificate will permanently seal Batch {destroyTarget.batch_number} as <code>DESTRUCTION_VERIFIED / CLOSED</code>. Any subsequent scan of this batch will be flagged as RE-ENTRY FRAUD.
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-navy-100">
                    <button
                      type="button"
                      onClick={() => setWorkflowStep(2)}
                      className="w-1/3 py-2 rounded-lg border border-navy-200 text-navy-700 font-medium"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={submittingDestruction}
                      className="w-2/3 py-2 rounded-lg bg-clinical-700 hover:bg-clinical-800 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                    >
                      {submittingDestruction ? 'Recording Final Ledger...' : 'CONFIRM DESTRUCTION (DC-00891)'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Reusable Batch Details Drawer */}
      <BatchDetailsDrawer
        batch={selectedDrawerBatch}
        onClose={() => setSelectedDrawerBatch(null)}
      />
    </div>
  );
};
