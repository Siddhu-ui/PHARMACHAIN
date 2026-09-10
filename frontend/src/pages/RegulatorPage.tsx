import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { FraudIncident, Batch, BatchEvent, ReturnRequest, DestructionRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { AlertBanner } from '../components/AlertBanner';
import { LifecycleTimeline } from '../components/LifecycleTimeline';
import { EmptyState, LoadingState } from '../components/States';
import { BatchDetailsDrawer } from '../components/BatchDetailsDrawer';
import { generateCompliancePDF } from '../utils/pdfGenerator';
import {
  ShieldAlert, ShieldCheck, AlertOctagon, FileText,
  Search, ExternalLink, ArrowRight, UserCheck,
  CheckCircle2, Ban, Filter, History, AlertTriangle,
  Download, Eye, Clock, Check
} from 'lucide-react';

export const RegulatorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/incidents')) return 'incidents';
    if (path.includes('/batches')) return 'batches';
    if (path.includes('/returns')) return 'returns';
    if (path.includes('/destruction')) return 'destruction';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const [incidents, setIncidents] = useState<FraudIncident[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [destructionRecords, setDestructionRecords] = useState<DestructionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Investigation Drawer state
  const [selectedIncident, setSelectedIncident] = useState<FraudIncident | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<BatchEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [resolvingIncident, setResolvingIncident] = useState(false);

  // Batch Details Drawer
  const [selectedDrawerBatch, setSelectedDrawerBatch] = useState<Batch | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [incidentsData, batchesData, returnsData, records] = await Promise.all([
        api.getFraudIncidents(),
        api.getBatches(),
        api.getReturns(),
        api.getDestructionRecords().catch(() => []),
      ]);
      setIncidents(incidentsData || []);
      setBatches(batchesData || []);
      setReturns(returnsData || []);
      setDestructionRecords(records || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load regulatory compliance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED');
  const criticalIncidents = incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED');
  const returnsInProgressCount = returns.filter((r) => r.status === 'PENDING_PICKUP' || r.status === 'PICKED_UP').length;
  const destructionVerifiedCount = batches.filter((b) => b.status === 'DESTRUCTION_VERIFIED' || b.status === 'CLOSED').length;

  const handleOpenInvestigation = async (incident: FraudIncident) => {
    setSelectedIncident(incident);
    setLoadingTimeline(true);
    try {
      const bNumber = incident.batch?.batch_number || incident.batch_id || 'CS10-A23-2507';
      const events = await api.getBatchTimeline(bNumber);
      setTimelineEvents(events || []);
    } catch {
      setTimelineEvents([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    setResolvingIncident(true);
    try {
      await api.updateFraudIncident(incidentId, 'RESOLVED', currentUser?.name || 'Chandra');
      setSuccessMsg(`Incident ${incidentId} marked as RESOLVED. Statutory case file updated.`);
      setSelectedIncident(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update incident status.');
    } finally {
      setResolvingIncident(false);
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    const matchesSearch =
      i.incident_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.batch?.batch_number || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (severityFilter === 'CRITICAL') return matchesSearch && i.severity === 'CRITICAL';
    if (severityFilter === 'OPEN') return matchesSearch && i.status !== 'RESOLVED';
    if (severityFilter === 'RESOLVED') return matchesSearch && i.status === 'RESOLVED';
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader title="State Drug Control Administration" subtitle="Karnataka Zone" />
        <LoadingState message="Connecting to Central Drugs Standard Control Organisation (CDSCO) live monitoring gateway..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Regulator Statutory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">
              State Drug Controller Administration
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-critical-50 text-critical-800 border border-critical-200 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-critical-600" />
              Statutory Enforcement Mode
            </span>
          </div>
          <p className="text-xs text-navy-500 mt-0.5">
            Presiding Officer: {currentUser?.name || 'Chandra'} • Karnataka State Licensing Authority • Drugs & Cosmetics Act 1940
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-1.5 rounded-lg border border-navy-200 bg-white hover:bg-navy-50 text-navy-800 text-xs font-semibold shadow-xs transition"
        >
          Synchronize Ledger
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1 border-b border-navy-200 overflow-x-auto pb-px text-xs font-semibold">
        <button
          onClick={() => navigate('/regulator')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-critical-600 text-critical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Enforcement Overview
        </button>
        <button
          onClick={() => navigate('/regulator/incidents')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'incidents'
              ? 'border-critical-600 text-critical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Critical Incidents & Fraud</span>
          {openIncidents.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-critical-500 text-white text-[10px] font-bold">
              {openIncidents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/regulator/batches')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'batches'
              ? 'border-critical-600 text-critical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Batch Registry Search</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {batches.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/regulator/returns')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'returns'
              ? 'border-critical-600 text-critical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          <span>Reverse Chain Monitoring</span>
          <span className="px-1.5 py-0.2 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold">
            {returns.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/regulator/destruction')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'destruction'
              ? 'border-critical-600 text-critical-700 font-bold'
              : 'border-transparent text-navy-500 hover:text-navy-800'
          }`}
        >
          Destruction Ledger
        </button>
      </div>

      {successMsg && (
        <AlertBanner
          type="success"
          title="Statutory Record Updated"
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
          {/* Critical Statutory Alert Banner */}
          {criticalIncidents.length > 0 && (
            <div className="p-4 rounded-xl border border-critical-400 bg-critical-50 flex items-start justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-6 h-6 text-critical-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-critical-600 text-white">
                      STATUTORY VIOLATION DETECTED
                    </span>
                    <span className="text-xs font-bold text-critical-900">Immediate Action Required</span>
                  </div>
                  <h4 className="text-sm font-bold text-critical-900 mt-1">
                    Illicit Supply Chain Re-Entry Flagged on Batch CS10-A23-2507
                  </h4>
                  <p className="text-xs text-critical-800 mt-0.5">
                    Batch previously verified destroyed at GreenShield Biomedical Waste Services under Certificate DC-00891 re-appeared in distribution scans. Inspection order active under Section 18-B.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenInvestigation(criticalIncidents[0])}
                className="px-4 py-2 rounded-lg bg-critical-600 hover:bg-critical-700 text-white text-xs font-bold shrink-0 shadow-xs transition"
              >
                Open Case File
              </button>
            </div>
          )}

          {/* 4 Operations Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Critical Alarms"
              value={criticalIncidents.length}
              icon={<ShieldAlert className="w-4 h-4 text-critical-600" />}
              color="critical"
              subtitle="Re-entry & tampering"
            />

            <MetricCard
              label="Reverse Supply Chain Active"
              value={returnsInProgressCount}
              icon={<ArrowRight className="w-4 h-4 text-warning-600" />}
              color="warning"
              subtitle="In transit / pending collection"
            />

            <MetricCard
              label="Monitored Consignments"
              value={batches.length}
              icon={<AlertTriangle className="w-4 h-4 text-clinical-600" />}
              color="clinical"
              subtitle="Registered state batches"
            />

            <MetricCard
              label="Certified Destructions"
              value={destructionVerifiedCount}
              icon={<CheckCircle2 className="w-4 h-4 text-success-600" />}
              color="success"
              subtitle="Permanent chain closures"
            />
          </div>

          {/* Recent Incident Table */}
          <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Recent Statutory Non-Compliance Cases</h3>
                <p className="text-xs text-navy-500">Active inspection dockets and forensic anomaly logs</p>
              </div>
              <button
                onClick={() => navigate('/regulator/incidents')}
                className="text-xs font-semibold text-critical-700 hover:underline inline-flex items-center gap-1"
              >
                <span>View All Cases</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Severity</th>
                    <th className="pb-2.5">Violation Type</th>
                    <th className="pb-2.5">Batch</th>
                    <th className="pb-2.5">Risk Score</th>
                    <th className="pb-2.5">Detected Date</th>
                    <th className="pb-2.5">Case Status</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {incidents.slice(0, 5).map((inc) => (
                    <tr key={inc.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-critical-600 text-white'
                              : 'bg-warning-600 text-white'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-navy-900">{inc.incident_type}</td>
                      <td className="py-3 font-mono font-bold text-navy-800">
                        {inc.batch?.batch_number || inc.batch_id || 'CS10-A23-2507'}
                      </td>
                      <td className="py-3 font-mono font-bold text-critical-700">{inc.risk_score}/100</td>
                      <td className="py-3 font-mono text-navy-600">
                        {new Date(inc.detected_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3"><StatusBadge label={inc.status} size="sm" /></td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleOpenInvestigation(inc)}
                          className="px-3 py-1 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-[11px] shadow-2xs transition"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB: INCIDENTS & FRAUD ----------------- */}
      {activeTab === 'incidents' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Enforcement Case Files & Anomaly Log</h3>
              <p className="text-xs text-navy-500">Forensic incident logs under Section 18-B and Section 27</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-navy-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search violation or batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500 w-48"
                />
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-navy-200 text-xs text-navy-700 focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="OPEN">Open Cases</option>
                <option value="RESOLVED">Resolved Cases</option>
              </select>
            </div>
          </div>

          {filteredIncidents.length === 0 ? (
            <EmptyState
              title="No incidents match filter"
              message="No forensic statutory cases matched the specified criteria."
            />
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`p-4 rounded-xl border transition ${
                    inc.severity === 'CRITICAL'
                      ? 'bg-critical-50/50 border-critical-200 text-critical-900'
                      : 'bg-warning-50/50 border-warning-200 text-warning-900'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            inc.severity === 'CRITICAL' ? 'bg-critical-600 text-white' : 'bg-warning-600 text-white'
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <span className="font-mono text-xs font-bold text-navy-900">
                          Case #{inc.id.slice(0, 8)} • Batch {inc.batch?.batch_number || inc.batch_id || 'CS10-A23-2507'}
                        </span>
                        <span className="text-[11px] text-navy-500">
                          • Risk Score: <strong className="text-critical-700">{inc.risk_score}/100</strong>
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-navy-800 mt-1.5">{inc.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenInvestigation(inc)}
                        className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-2xs transition"
                      >
                        Investigate Case
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB: BATCH SEARCH ----------------- */}
      {activeTab === 'batches' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Statewide Medicine Batch Registry</h3>
              <p className="text-xs text-navy-500">Authoritative audit ledger of all registered batches in state circulation</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Batch Number</th>
                  <th className="pb-2.5">Medicine Product</th>
                  <th className="pb-2.5">Manufacturer</th>
                  <th className="pb-2.5">Quantity</th>
                  <th className="pb-2.5">Current Custody</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-50/50 transition">
                    <td className="py-3 font-mono font-bold text-navy-900">{b.batch_number}</td>
                    <td className="py-3 font-semibold text-navy-800">{b.medicine?.name || 'CardioSafe 10 mg Tablets'}</td>
                    <td className="py-3 text-navy-600">{b.manufacturer_name || 'BharatCure Pharma'}</td>
                    <td className="py-3 font-mono font-semibold text-navy-900">{b.quantity} strips</td>
                    <td className="py-3 text-navy-600 truncate max-w-xs">{b.current_location}</td>
                    <td className="py-3"><StatusBadge label={b.status} size="sm" /></td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDrawerBatch(b)}
                        className="px-2.5 py-1 rounded border border-navy-200 text-navy-700 font-semibold text-[11px]"
                      >
                        Details
                      </button>
                      <Link
                        to={`/batches/${b.batch_number}`}
                        className="px-2.5 py-1 rounded bg-clinical-50 text-clinical-700 border border-clinical-200 font-semibold text-[11px]"
                      >
                        Ledger
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB: RETURN MONITORING ----------------- */}
      {activeTab === 'returns' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Statewide Reverse Supply Chain Monitoring</h3>
              <p className="text-xs text-navy-500">Real-time custody tracking of all active expired drug returns</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Return ID</th>
                  <th className="pb-2.5">Origin Retailer</th>
                  <th className="pb-2.5">Batch</th>
                  <th className="pb-2.5">Quantity</th>
                  <th className="pb-2.5">Reason</th>
                  <th className="pb-2.5">Created Date</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {returns.map((r) => (
                  <tr key={r.id} className="hover:bg-navy-50/50 transition">
                    <td className="py-3 font-mono font-bold text-clinical-700">{r.id}</td>
                    <td className="py-3 font-semibold text-navy-800">{r.retailer_name || 'Shree Medicals'}</td>
                    <td className="py-3 font-mono text-navy-700">{r.batch?.batch_number || 'CS10-A23-2507'}</td>
                    <td className="py-3 font-mono font-semibold text-navy-900">{r.quantity} strips</td>
                    <td className="py-3 text-navy-600">{r.reason}</td>
                    <td className="py-3 font-mono text-navy-600">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="py-3"><StatusBadge label={r.status} size="sm" /></td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/batches/${r.batch?.batch_number || 'CS10-A23-2507'}`}
                        className="text-clinical-700 hover:underline font-semibold text-[11px]"
                      >
                        Audit Trail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB: DESTRUCTION LEDGER ----------------- */}
      {activeTab === 'destruction' && (
        <div className="bg-white border border-navy-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Permanent Biomedical Destruction Ledger</h3>
              <p className="text-xs text-navy-500">Official registry of certified destruction records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Certificate Serial</th>
                  <th className="pb-2.5">Batch</th>
                  <th className="pb-2.5">Certified Facility</th>
                  <th className="pb-2.5">Quantity</th>
                  <th className="pb-2.5">Destruction Date</th>
                  <th className="pb-2.5">Verification</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                <tr className="hover:bg-navy-50/50 transition">
                  <td className="py-3 font-mono font-bold text-navy-800">DC-00891</td>
                  <td className="py-3 font-mono text-navy-700">CS10-A23-2507</td>
                  <td className="py-3 text-navy-700">GreenShield Biomedical Waste Services</td>
                  <td className="py-3 font-mono font-semibold text-navy-900">100 strips</td>
                  <td className="py-3 text-navy-600">12/07/2026</td>
                  <td className="py-3"><StatusBadge label="VERIFIED" size="sm" /></td>
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

      {/* Investigation Drawer */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-navy-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-navy-200 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-navy-200 bg-critical-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-critical-600 text-white">
                    {selectedIncident.severity}
                  </span>
                  <span className="font-mono text-xs font-bold text-navy-800">
                    Case #{selectedIncident.id.slice(0, 8)}
                  </span>
                  <StatusBadge label={selectedIncident.status} size="sm" />
                </div>
                <h2 className="text-base font-bold text-navy-900 mt-1">
                  {selectedIncident.incident_type} Violation Investigation
                </h2>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-lg hover:bg-navy-200/50 text-navy-500 hover:text-navy-900 transition"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="p-4 bg-critical-50 rounded-xl border border-critical-200 text-critical-900 space-y-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider block">Statutory Non-Compliance Summary</span>
                <p className="text-xs font-semibold leading-relaxed">{selectedIncident.description}</p>
                <p className="text-[11px] text-critical-800 mt-1">
                  Assigned Enforcement Officer: <strong>{selectedIncident.assigned_to || 'CDSCO Enforcement Officer'}</strong>
                </p>
              </div>

              {/* Forensic Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-700">
                    Chain of Custody Events ({timelineEvents.length})
                  </h3>
                  <Link
                    to={`/batches/${selectedIncident.batch?.batch_number || selectedIncident.batch_id || 'CS10-A23-2507'}`}
                    onClick={() => setSelectedIncident(null)}
                    className="text-clinical-700 hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>Full Ledger Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loadingTimeline ? (
                  <div className="p-6 text-center text-navy-400">Loading chronological chain-of-custody...</div>
                ) : (
                  <LifecycleTimeline events={timelineEvents} />
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-navy-200 bg-white flex items-center justify-between gap-3">
              <Link
                to={`/batches/${selectedIncident.batch?.batch_number || selectedIncident.batch_id || 'CS10-A23-2507'}`}
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-semibold text-xs transition"
              >
                Inspect Ledger & QR
              </Link>

              {selectedIncident.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleResolveIncident(selectedIncident.id)}
                  disabled={resolvingIncident}
                  className="px-4 py-2 rounded-lg bg-success-700 hover:bg-success-800 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{resolvingIncident ? 'Updating Case...' : 'MARK CASE RESOLVED'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
