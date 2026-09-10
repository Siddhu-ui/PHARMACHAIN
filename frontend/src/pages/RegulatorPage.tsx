import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FraudIncident, BatchEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { IncidentReportModal } from '../components/IncidentReportModal';
import {
  Scale, ShieldAlert, AlertTriangle, FileText,
  ExternalLink, Building, Store, Factory, BellRing,
  CheckCircle2, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RegulatorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [incidents, setIncidents] = useState<FraudIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<FraudIncident | null>(null);
  const [reportModalIncident, setReportModalIncident] = useState<FraudIncident | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<BatchEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadIncidents = async () => {
    try {
      const data = await api.getFraudIncidents();
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
        loadTimeline(data[0].batch_id);
      }
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (batchId: string) => {
    try {
      const events = await api.getBatchTimeline(batchId);
      setTimelineEvents(events);
    } catch {
      setTimelineEvents([]);
    }
  };

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectIncident = (inc: FraudIncident) => {
    setSelectedIncident(inc);
    loadTimeline(inc.batch_id);
  };

  const handleStatusChange = async (incId: string, newStatus: string) => {
    try {
      await api.updateFraudIncident(incId, newStatus, currentUser?.name || 'CDSCO Officer');
      await loadIncidents();
      if (selectedIncident && selectedIncident.id === incId) {
        setSelectedIncident(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err: any) {
      alert(`Error updating incident: ${err.message}`);
    }
  };

  const filteredIncidents = incidents.filter(i => {
    if (statusFilter === 'ALL') return true;
    return i.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header — Section 7: CDSCO-ready Regulator Alert Gateway */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400 uppercase tracking-wider mb-1">
            <Scale className="w-3.5 h-3.5" /> CDSCO-ready Regulator Alert Gateway
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Regulator Incident Feed — Demo</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono font-medium">
              LIVE GATEWAY
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-assisted risk detection &amp; statutory compliance console. Enforces immediate multi-stakeholder alert broadcasts upon boundary breach.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIncident && (
            <button
              onClick={() => setReportModalIncident(selectedIncident)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              <FileText className="w-4 h-4" />
              <span>Export Statutory Report</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Alert Broadcast Channels Header Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <BellRing className="w-3.5 h-3.5" /> Coordinated Stakeholder Alert Gateway
          </span>
          <span className="text-[11px] text-slate-500">Autonomous 3-Way Broadcast Activated on Critical Severity</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-center gap-3">
            <Scale className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">1. REGULATOR</span>
              <span className="text-slate-300 text-[11px]">Statutory enforcement dossier &amp; seizure warrant generation.</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center gap-3">
            <Factory className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">2. MANUFACTURER</span>
              <span className="text-slate-300 text-[11px]">Immediate quarantine directive &amp; QA investigation mandate.</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/40 flex items-center gap-3">
            <Store className="w-6 h-6 text-blue-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">3. RETAILER</span>
              <span className="text-slate-300 text-[11px]">Point-of-sale lock &amp; &ldquo;DO NOT ACCEPT OR DISPENSE&rdquo; freeze.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Status Filters */}
      <div className="flex items-center gap-2 text-xs">
        {['ALL', 'OPEN', 'UNDER_INVESTIGATION', 'RESOLVED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl border transition ${
              statusFilter === tab
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            {tab.replace(/_/g, ' ')} ({tab === 'ALL' ? incidents.length : incidents.filter(i => i.status === tab).length})
          </button>
        ))}
      </div>

      {/* Two-Column Layout: Incident Queue & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incidents List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Violations Queue ({filteredIncidents.length})
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-500 text-xs">
              No incidents matching filter.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              const isCritical = inc.severity === 'CRITICAL';
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-rose-500/60 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {inc.incident_type}
                    </span>
                    <RiskScoreBadge score={inc.risk_score} severity={inc.severity} size="sm" />
                  </div>

                  <div className="font-bold text-white text-sm">
                    Batch: {inc.batch?.batch_number || inc.batch_id}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{inc.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-3 pt-2 border-t border-slate-800/80">
                    <span>{new Date(inc.detected_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span className="uppercase font-bold text-amber-400">{inc.status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Inspection Dossier (7 cols) */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-panel space-y-6">
              {/* Dossier Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      {selectedIncident.incident_type}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {selectedIncident.id}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white mt-2">
                    Case Dossier: Batch {selectedIncident.batch?.batch_number || selectedIncident.batch_id}
                  </h2>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl font-black text-rose-400">{selectedIncident.risk_score}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold uppercase mt-1">
                    {selectedIncident.severity}
                  </span>
                </div>
              </div>

              {/* Status Update Action Bar */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                <span className="text-slate-400">Statutory Status:</span>
                <div className="flex items-center gap-1.5">
                  {(['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedIncident.id, st)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                        selectedIncident.status === st
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comprehensive Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Incident ID</span>
                  <span className="text-slate-200 font-bold truncate block">{selectedIncident.id.slice(0, 10)}...</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Batch ID</span>
                  <span className="text-white font-bold">{selectedIncident.batch?.batch_number || selectedIncident.batch_id}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Medicine</span>
                  <span className="text-slate-200 font-bold">{selectedIncident.batch?.medicine?.name || 'Paracetamol 500mg'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Manufacturer</span>
                  <span className="text-slate-200">{selectedIncident.batch?.medicine?.manufacturer || 'Sun Pharma'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Pharmacy / Scanner</span>
                  <span className="text-slate-200 truncate block">{selectedIncident.batch?.current_location || selectedIncident.detected_by || 'MedPlus Pharmacy'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Batch Status</span>
                  <span className="text-rose-400 font-bold">{selectedIncident.batch?.status || 'REENTRY_DETECTED'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Risk Score</span>
                  <span className="text-rose-400 font-bold">{selectedIncident.risk_score} / 100</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block">Current Status</span>
                  <span className="text-amber-400 font-bold uppercase">{selectedIncident.status}</span>
                </div>
              </div>

              {/* Detection Reason */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
                <div className="font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> Detection Reason
                </div>
                <p className="text-slate-200 leading-relaxed text-sm">{selectedIncident.description}</p>
              </div>

              {/* Evidence Inspector */}
              {selectedIncident.evidence && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Evidence Bundle &amp; Multi-Signal Log
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                    <pre>{JSON.stringify(JSON.parse(selectedIncident.evidence), null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Chain of Custody History Snippet */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Chain of Custody Ledger ({timelineEvents.length} Events)
                  </div>
                  <Link
                    to={`/batches/${selectedIncident.batch?.batch_number || selectedIncident.batch_id}`}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Full Ledger</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {timelineEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between font-mono"
                    >
                      <div>
                        <span className="font-bold text-slate-200">{ev.event_type}</span>
                        <span className="text-slate-400 block text-[10px]">
                          {ev.location} &bull; {ev.actor_name}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(ev.timestamp).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-500 text-sm">
              Select an incident from the queue to inspect full evidentiary bundle.
            </div>
          )}
        </div>
      </div>

      {/* Structured Report Modal */}
      {reportModalIncident && (
        <IncidentReportModal
          incident={reportModalIncident}
          events={timelineEvents}
          onClose={() => setReportModalIncident(null)}
        />
      )}
    </div>
  );
};
