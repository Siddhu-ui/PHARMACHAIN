import React from 'react';
import {
  ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2,
  Calendar, Layers, Building2, Hash, Tag, Clock, PackageCheck,
  Check, X
} from 'lucide-react';
import { MedicineVerificationResult, formatClinicalDate } from '../utils/medicineRegistry';
import { calculateExpiryDays } from '../utils/dateUtils';

interface VerifiedMedicineCardProps {
  result: MedicineVerificationResult | null;
  onInitiateReturn?: () => void;
}

export const VerifiedMedicineCard: React.FC<VerifiedMedicineCardProps> = ({
  result,
  onInitiateReturn
}) => {
  if (!result) return null;

  // Dynamically calculate expiry days
  const expiryEval = calculateExpiryDays(result.expiryDate);
  const mfgFormatted = formatClinicalDate(result.manufacturingDate);
  const expFormatted = formatClinicalDate(result.expiryDate);

  const isVerified = result.verificationStatus === 'VERIFIED';
  const isExpired = result.verificationStatus === 'EXPIRED' || expiryEval.isExpired;
  const isFraud = result.verificationStatus === 'REENTRY_DETECTED' || result.verificationStatus === 'TAMPERING';
  const isUnknown = result.verificationStatus === 'UNKNOWN';

  // Status header theme
  const getHeaderTheme = () => {
    if (isFraud) {
      return {
        bg: 'bg-rose-950/70 border-rose-500/60 text-rose-200',
        badge: 'bg-rose-900/60 text-rose-300 border-rose-500/40',
        icon: <AlertOctagon className="w-6 h-6 text-rose-400 animate-pulse" />,
        title: result.verdictTitle || 'COMPLIANCE VIOLATION DETECTED',
        tag: 'DO NOT DISPENSE'
      };
    }
    if (isExpired) {
      return {
        bg: 'bg-amber-950/60 border-amber-500/50 text-amber-200',
        badge: 'bg-amber-900/60 text-amber-300 border-amber-500/40',
        icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
        title: 'MEDICINE EXPIRED',
        tag: 'RETURN REQUIRED'
      };
    }
    if (isUnknown) {
      return {
        bg: 'bg-slate-900/80 border-rose-500/40 text-slate-200',
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
        icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
        title: 'PRODUCT NOT VERIFIED',
        tag: 'UNREGISTERED'
      };
    }
    return {
      bg: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200',
      badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'MEDICINE VERIFIED',
      tag: 'COMPLIANT'
    };
  };

  const theme = getHeaderTheme();

  return (
    <div className={`rounded-3xl border shadow-xl overflow-hidden transition ${theme.bg}`}>
      {/* Header Banner */}
      <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner">
            {theme.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                PharmaGuard Verification
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${theme.badge}`}>
                {theme.tag}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {theme.title}
            </h2>
          </div>
        </div>

        {/* Dynamic Expiry Status Pill */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 font-mono text-xs">
          <Clock className={`w-4 h-4 ${expiryEval.isExpired ? 'text-rose-400' : expiryEval.isNearExpiry ? 'text-amber-400' : 'text-emerald-400'}`} />
          <div>
            <span className="text-[10px] text-slate-400 uppercase block leading-none">Expiry Status</span>
            <span className={`font-bold ${expiryEval.isExpired ? 'text-rose-300' : expiryEval.isNearExpiry ? 'text-amber-300' : 'text-emerald-300'}`}>
              {expiryEval.text}
            </span>
          </div>
        </div>
      </div>

      {/* Main Medicine Details Section */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Medicine Name Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
            Product / Medicine Name
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {result.productName}
          </h3>
        </div>

        {/* 6 Grid Clinical Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Manufacturer */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Manufacturer</span>
            </span>
            <p className="text-sm font-bold text-white">
              {result.manufacturer || 'BharatCure Pharma'}
            </p>
          </div>

          {/* Batch Number */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              <span>Batch Number</span>
            </span>
            <p className="text-sm font-mono font-bold text-emerald-400">
              {result.batchNumber}
            </p>
          </div>

          {/* Serial Number */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Serial Number</span>
            </span>
            <p className="text-sm font-mono text-slate-300">
              {result.serialNumber || 'Not available'}
            </p>
          </div>

          {/* Manufacturing Date */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Manufactured</span>
            </span>
            <p className="text-sm font-bold text-slate-200">
              {mfgFormatted}
            </p>
          </div>

          {/* Expiry Date */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Expiry</span>
            </span>
            <p className={`text-sm font-bold ${expiryEval.isExpired ? 'text-rose-400 font-extrabold' : 'text-slate-200'}`}>
              {expFormatted}
            </p>
          </div>

          {/* Quantity / Pack Size */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Quantity / Pack Size</span>
            </span>
            <p className="text-sm font-bold text-white">
              {result.quantity ? `${result.quantity} strips` : (result.packSize || '100 strips')}
            </p>
          </div>
        </div>

        {/* Message & Compliance Guidance */}
        {result.verdictMessage && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Compliance Status:</span>
            <p className="leading-relaxed">{result.verdictMessage}</p>
          </div>
        )}

        {/* Discrepancies if any */}
        {result.discrepancies && result.discrepancies.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 space-y-2">
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Verification Discrepancies:</span>
            </span>
            <ul className="space-y-1 text-slate-300">
              {result.discrepancies.map((d, i) => (
                <li key={i} className="font-mono text-[11px]">
                  &bull; <strong className="text-white">{d.field}</strong>: Scanned ({d.detected}) vs Registered ({d.registered})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expired Reverse Supply Chain Action */}
        {isExpired && onInitiateReturn && (
          <div className="pt-2 flex items-center justify-between gap-4 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30">
            <div className="text-xs text-amber-200">
              <span className="font-bold block">Reverse Supply Chain Return Required</span>
              <span className="text-slate-400">Shelf-life expired. Quarantine product and initiate distributor pickup.</span>
            </div>
            <button
              type="button"
              onClick={onInitiateReturn}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shrink-0"
            >
              Initiate Return Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
