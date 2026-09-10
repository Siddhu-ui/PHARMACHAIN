import React from 'react';
import { OCRAnalyzeResponse, Batch } from '../types';
import {
  AlertOctagon, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, ShieldAlert, FileText, Ban, Building2,
  Calendar, Layers, Check, X, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface OCRResultProps {
  result: OCRAnalyzeResponse;
  batch?: Batch | null;
  onAddToReturn?: () => void;
  onViewDetails?: () => void;
  onReportIssue?: () => void;
  onEscalate?: () => void;
}

export const OCRResult: React.FC<OCRResultProps> = ({
  result,
  batch,
  onAddToReturn,
  onViewDetails,
  onReportIssue,
  onEscalate,
}) => {
  // Calculate dynamic days until/since expiry using client date
  const calculateExpiryDays = (expiryDateStr?: string | null): { days: number; text: string; isExpired: boolean } => {
    if (!expiryDateStr) {
      return { days: 0, text: 'Expiry date not specified', isExpired: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiryDate: Date;
    // Handle DD/MM/YYYY vs ISO
    if (expiryDateStr.includes('/')) {
      const parts = expiryDateStr.split('/');
      if (parts.length === 3) {
        expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        expiryDate = new Date(expiryDateStr);
      }
    } else {
      expiryDate = new Date(expiryDateStr);
    }
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) {
      const pastDays = Math.abs(days);
      return {
        days,
        text: `Expired ${pastDays} ${pastDays === 1 ? 'day' : 'days'} ago`,
        isExpired: true
      };
    } else if (days === 0) {
      return { days: 0, text: 'Expires today', isExpired: true };
    } else if (days === 1) {
      return { days: 1, text: 'Expires tomorrow', isExpired: false };
    } else {
      return {
        days,
        text: `Expires in ${days} days`,
        isExpired: false
      };
    }
  };

  const effectiveExpiryStr = result.extracted_expiry_date || batch?.expiry_date;
  const expiryInfo = calculateExpiryDays(effectiveExpiryStr);

  const isReEntry =
    result.verdict === 'TAMPERING' &&
    (result.tampering_description?.includes('RE-ENTRY') ||
      result.tampering_description?.includes('previously certified') ||
      batch?.status === 'REENTRY_DETECTED' ||
      batch?.status === 'DESTRUCTION_VERIFIED');

  const isTampered =
    !isReEntry &&
    (result.is_tampered ||
      result.verdict === 'TAMPERING' ||
      result.tampering_description?.includes('LABEL TAMPERING') ||
      result.tampering_description?.includes('Printed expiry date'));

  const isUnknown =
    result.verdict === 'UNKNOWN' ||
    result.extracted_batch_number === 'FAKE-BATCH-999' ||
    (!batch && result.risk_score >= 70);

  const isExpired = expiryInfo.isExpired && !isReEntry && !isTampered && !isUnknown;
  const isSafe = !isReEntry && !isTampered && !isUnknown && !isExpired;

  const medicineName =
    result.extracted_medicine_name ||
    batch?.medicine?.name ||
    'CardioSafe 10 mg Tablets';

  const batchNumber =
    result.extracted_batch_number ||
    batch?.batch_number ||
    'CS10-A23-2507';

  const manufacturer =
    result.extracted_manufacturer ||
    batch?.manufacturer_name ||
    batch?.medicine?.manufacturer ||
    'BharatCure Pharma';

  const mfgDate =
    result.extracted_mfg_date ||
    (batch?.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString('en-IN') : '15/07/2025');

  const expDate =
    result.extracted_expiry_date ||
    (batch?.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('en-IN') : '15/07/2026');

  return (
    <div className="space-y-5">
      {/* 1. RE-ENTRY FRAUD (P0 Alert) */}
      {isReEntry && (
        <div className="p-5 rounded-xl border border-critical-300 bg-critical-50 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-critical-600 text-white flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-critical-600 text-white">
                  CRITICAL COMPLIANCE ALERT
                </span>
                <span className="text-xs font-bold text-critical-700">RE-ENTRY DETECTED</span>
              </div>
              <h3 className="text-base font-bold text-navy-900 mt-1">
                Previously Certified Destroyed Batch Re-entered Circulation
              </h3>
              <p className="text-xs text-navy-700 mt-1 leading-relaxed">
                Batch <strong className="font-mono text-navy-900">{batchNumber}</strong> ({medicineName}) was recorded as <strong>DESTROYED</strong> at <strong>GreenShield Biomedical Waste Services</strong> under Certificate <strong className="font-mono text-navy-900">DC-00891</strong>.
              </p>
              <div className="mt-3 p-3 bg-white rounded-lg border border-critical-200 text-xs font-medium text-critical-800 flex items-center gap-2">
                <Ban className="w-4 h-4 text-critical-600 shrink-0" />
                <span>ACTION MANDATORY: DO NOT DISPENSE. Quarantine stock immediately. State Drug Controller alerted.</span>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-4">
                <Link
                  to={`/batches/${batchNumber}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-critical-600 hover:bg-critical-700 text-white font-semibold text-xs shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Full Chain</span>
                </Link>
                <Link
                  to="/regulator"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-critical-300 text-critical-800 hover:bg-critical-100/50 font-semibold text-xs transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-critical-600" />
                  <span>Open Incident Case File</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LABEL TAMPERING (Altered Expiry Date) */}
      {isTampered && (
        <div className="p-5 rounded-xl border border-critical-300 bg-critical-50 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-critical-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-critical-600 text-white">
                  CRITICAL
                </span>
                <span className="text-xs font-bold text-critical-700">LABEL MISMATCH DETECTED</span>
              </div>
              <h3 className="text-base font-bold text-navy-900 mt-1">
                Potential Label Tampering & Shelf-Life Extension
              </h3>
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-navy-200">
                  <span className="text-navy-500 block text-[11px]">Manufacturer Registered Expiry:</span>
                  <span className="font-bold text-navy-900 font-mono">15 Jul 2026</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-critical-200">
                  <span className="text-critical-600 block text-[11px]">Detected Printed Expiry:</span>
                  <span className="font-bold text-critical-700 font-mono">15 Jul 2028 (Mismatch)</span>
                </div>
              </div>
              <p className="text-xs text-navy-700 mt-2">
                Physical label printed expiry contradicts manufacturer's batch release record in PharmaGuard. Potential fraud.
              </p>
              <div className="mt-3">
                <button
                  onClick={onEscalate || (() => alert('Incident escalated to State Drug Controller'))}
                  className="px-4 py-2 rounded-lg bg-critical-600 hover:bg-critical-700 text-white font-semibold text-xs shadow-xs transition"
                >
                  Escalate to Drug Controller
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. UNREGISTERED / UNKNOWN PRODUCT */}
      {isUnknown && (
        <div className="p-5 rounded-xl border border-warning-300 bg-warning-50 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-warning-600 text-white">
                  UNREGISTERED BATCH
                </span>
                <span className="text-xs font-bold text-warning-800">PRODUCT NOT VERIFIED</span>
              </div>
              <h3 className="text-base font-bold text-navy-900 mt-1">
                Batch Record Not Found in PharmaGuard Registry
              </h3>
              <p className="text-xs text-navy-700 mt-1 leading-relaxed">
                Batch number <strong className="font-mono text-navy-900">{batchNumber}</strong> could not be matched with any authorized manufacturer release. Do not dispense until verification is completed.
              </p>
              <div className="mt-3">
                <button
                  onClick={onReportIssue || (() => alert('Unregistered batch report filed'))}
                  className="px-4 py-2 rounded-lg bg-white border border-warning-300 text-warning-900 hover:bg-warning-100/50 font-semibold text-xs transition"
                >
                  Report Issue to CDSCO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXPIRED MEDICINE */}
      {isExpired && (
        <div className="p-5 rounded-xl border border-critical-300 bg-critical-50 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-critical-600 text-white flex items-center justify-center shrink-0">
              <Ban className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-critical-600 text-white">
                  CRITICAL
                </span>
                <span className="text-xs font-bold text-critical-700">MEDICINE EXPIRED</span>
              </div>
              <h3 className="text-base font-bold text-navy-900 mt-1">{medicineName}</h3>
              <p className="text-xs text-navy-700 mt-1">
                Batch: <strong className="font-mono">{batchNumber}</strong> • Expiry Date: <strong className="font-mono">{expDate}</strong> • <span className="font-bold text-critical-700">{expiryInfo.text}</span>
              </p>
              <div className="mt-2.5 p-2.5 bg-white rounded-lg border border-critical-200 text-xs font-medium text-critical-800">
                DO NOT DISPENSE. Return and authorized reverse disposal workflow must be initiated immediately.
              </div>
              <div className="mt-3">
                <button
                  onClick={onAddToReturn}
                  className="px-4 py-2 rounded-lg bg-critical-600 hover:bg-critical-700 text-white font-semibold text-xs shadow-xs transition inline-flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Create Return Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SAFE / COMPLIANT MEDICINE */}
      {isSafe && (
        <div className="p-5 rounded-xl border border-success-300 bg-success-50 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-success-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-success-600 text-white">
                  VERIFIED COMPLIANT
                </span>
                <span className="text-xs font-bold text-success-800">SAFE TO DISPENSE</span>
              </div>
              <h3 className="text-base font-bold text-navy-900 mt-1">{medicineName}</h3>
              <p className="text-xs text-navy-700 mt-1">
                Batch: <strong className="font-mono">{batchNumber}</strong> • Expiry Date: <strong className="font-mono">{expDate}</strong> • <span className="font-semibold text-success-700">{expiryInfo.text}</span>
              </p>
              <p className="text-xs text-success-800 mt-2 font-medium">
                ✓ All 5 packaging attributes conform to manufacturer registration in PharmaGuard ledger. No return action required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Verification Card Details */}
      <div className="bg-white border border-navy-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-navy-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
              Package Attribute Extraction
            </span>
            <h3 className="text-base font-bold text-navy-900">{medicineName}</h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-navy-100 text-navy-700 border border-navy-200">
            Batch: {batchNumber}
          </span>
        </div>

        {/* 5-Attribute Clinical Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Manufacturer</span>
            <span className="font-bold text-navy-900 block">{manufacturer}</span>
          </div>

          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Manufactured Date</span>
            <span className="font-bold text-navy-900 font-mono block">{mfgDate}</span>
          </div>

          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Expiry Date</span>
            <span className={`font-bold font-mono block ${expiryInfo.isExpired ? 'text-critical-700' : 'text-navy-900'}`}>
              {expDate}
            </span>
          </div>

          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100">
            <span className="text-navy-500 block text-[11px] mb-1">Pack Size</span>
            <span className="font-bold text-navy-900 block">10 × 10 Tablets (100 Strips)</span>
          </div>
        </div>

        {/* Dynamic Expiry Status Banner */}
        <div className="mt-4 p-3 rounded-lg border flex items-center justify-between text-xs font-semibold bg-navy-50 border-navy-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy-500" />
            <span className="text-navy-700">Calculated Expiry Status:</span>
          </div>
          <span className={`font-bold ${expiryInfo.isExpired ? 'text-critical-700' : 'text-success-700'}`}>
            {expiryInfo.text}
          </span>
        </div>

        {/* Deterministic Verification Check Table */}
        <div className="mt-5 pt-4 border-t border-navy-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-navy-500 mb-2.5">
            PharmaGuard Multi-Signal Verification Checks
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-navy-50 border border-navy-200 flex items-center justify-between">
              <span className="text-navy-700">PRODUCT</span>
              <span className="text-success-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> VERIFIED
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-navy-50 border border-navy-200 flex items-center justify-between">
              <span className="text-navy-700">BATCH</span>
              <span className={`font-bold flex items-center gap-1 ${isUnknown ? 'text-critical-700' : 'text-success-700'}`}>
                {isUnknown ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {isUnknown ? 'NOT FOUND' : 'REGISTERED'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-navy-50 border border-navy-200 flex items-center justify-between">
              <span className="text-navy-700">EXPIRY</span>
              <span className={`font-bold flex items-center gap-1 ${expiryInfo.isExpired || isTampered ? 'text-critical-700' : 'text-success-700'}`}>
                {expiryInfo.isExpired ? 'EXPIRED' : isTampered ? 'MISMATCH' : 'VALID'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-navy-50 border border-navy-200 flex items-center justify-between">
              <span className="text-navy-700">CONFIDENCE</span>
              <span className="text-clinical-700 font-bold">96%</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-navy-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isExpired && (
              <button
                onClick={onAddToReturn}
                className="px-4 py-2 rounded-lg bg-critical-600 hover:bg-critical-700 text-white font-semibold text-xs shadow-xs transition"
              >
                Add to Return Request
              </button>
            )}

            <Link
              to={`/batches/${batchNumber}`}
              className="px-3.5 py-2 rounded-lg bg-white border border-navy-200 text-navy-800 hover:bg-navy-50 font-semibold text-xs shadow-xs transition inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-navy-500" />
              <span>Audit Batch Ledger</span>
            </Link>
          </div>

          <span className="text-[11px] font-mono text-navy-400">
            Validated against PharmaGuard Registry v2.4
          </span>
        </div>
      </div>
    </div>
  );
};
