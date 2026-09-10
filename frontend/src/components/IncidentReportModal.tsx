import React, { useRef } from 'react';
import { FraudIncident, BatchEvent } from '../types';
import { jsPDF } from 'jspdf';
import {
  FileText, Download, Printer, X, ShieldAlert,
  AlertTriangle, MapPin, Calendar, Building, CheckCircle2
} from 'lucide-react';

interface Props {
  incident: FraudIncident;
  events?: BatchEvent[];
  onClose: () => void;
}

export const IncidentReportModal: React.FC<Props> = ({ incident, events = [], onClose }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const evidenceObj = incident.evidence ? JSON.parse(incident.evidence) : null;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const batchNo = incident.batch?.batch_number || incident.batch_id;

    // Header
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(52, 211, 153);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PHARMAGUARD REGULATORY COMPLIANCE REPORT', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text('CENTRAL DRUGS STANDARD CONTROL ORGANISATION (CDSCO) GATEWAY', 14, 26);

    // Metadata
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text(`Incident ID: ${incident.id}`, 14, 45);
    doc.text(`Detection Date: ${new Date(incident.detected_at).toLocaleString()}`, 14, 52);
    doc.text(`Incident Type: ${incident.incident_type}`, 14, 59);
    doc.text(`Risk Score: ${incident.risk_score}/100 (${incident.severity})`, 14, 66);
    doc.text(`Incident Status: ${incident.status}`, 14, 73);

    // Batch details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BATCH INVESTIGATION SUMMARY', 14, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Batch Number: ${batchNo}`, 14, 93);
    doc.text(`Medicine: ${incident.batch?.medicine?.name || 'Paracetamol 500mg'}`, 14, 100);
    doc.text(`Manufacturer: ${incident.batch?.medicine?.manufacturer || 'Sun Pharma'}`, 14, 107);
    doc.text(`Registered Expiry: ${incident.batch?.expiry_date ? new Date(incident.batch.expiry_date).toLocaleDateString() : '15/08/2026'}`, 14, 114);

    // Description & Evidence
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('FINDINGS & EVIDENCE', 14, 126);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const splitDesc = doc.splitTextToSize(incident.description, 180);
    doc.text(splitDesc, 14, 134);

    // Enforcement action
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('STATUTORY ENFORCEMENT RECOMMENDATION', 14, 160);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('1. Immediate batch quarantine at detected retail node.', 14, 168);
    doc.text('2. Form 17 sample seizure by state drug inspector under Section 22.', 14, 175);
    doc.text('3. Initiate reverse logistics supply-chain audit on distributor manifest.', 14, 182);

    doc.save(`PharmaGuard_Report_${batchNo}_${incident.id.slice(0, 8)}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        ref={reportRef}
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl relative my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                  {incident.severity} SEVERITY
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  REF: {incident.id.slice(0, 13)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-1">
                Official Regulatory Incident Report
              </h2>
              <p className="text-xs text-slate-400">
                Central Drugs Standard Control Organisation (CDSCO) Compliance Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition"
            >
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition border border-slate-700"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-6 space-y-6 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs text-slate-500 block">Incident Type</span>
              <span className="font-bold text-rose-400 font-mono text-sm">{incident.incident_type}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Calculated Risk Score</span>
              <span className="font-bold text-white text-base">{incident.risk_score} / 100</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Current Status</span>
              <span className="font-bold text-amber-400 font-mono text-xs uppercase">{incident.status}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Detection Timestamp</span>
              <span className="font-mono text-xs text-slate-300">
                {new Date(incident.detected_at).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Batch & Product Profile */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Batch & Manufacturing Profile
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">Batch Number</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {incident.batch?.batch_number || incident.batch_id}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Medicine Name</span>
                <span className="text-slate-200">{incident.batch?.medicine?.name || 'Paracetamol 500mg'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Licensed Manufacturer</span>
                <span className="text-slate-200">{incident.batch?.medicine?.manufacturer || 'Sun Pharma Laboratories'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Registered Expiry</span>
                <span className="text-slate-200">
                  {incident.batch?.expiry_date ? new Date(incident.batch.expiry_date).toLocaleDateString('en-IN') : '15/08/2026'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Investigation Findings & Anomaly Summary
            </h3>
            <p className="text-slate-200 leading-relaxed">{incident.description}</p>
          </div>

          {/* Evidence Details */}
          {evidenceObj && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cryptographic & Inspection Evidence Bundle
              </h3>
              <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto">
                <pre>{JSON.stringify(evidenceObj, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Recommended Statutory Action */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
            <h3 className="font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Statutory Enforcement Directives
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Issue Section 22 seizure notice to the dispensing establishment.</li>
              <li>Notify State Licensing Authority and Central CDSCO Intelligence Wing.</li>
              <li>Lock batch ledger against further reverse logistics or distribution transactions.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
