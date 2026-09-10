import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ScanVerifyResponse, OCRAnalyzeResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import {
  ScanLine, ShieldAlert, CheckCircle2, AlertTriangle,
  FileSearch, Sparkles, ExternalLink, RefreshCw, MapPin, X,
  ArrowRight, ShieldCheck, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

export const ScanPage: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  const [batchInput, setBatchInput] = useState('PCM999888');
  const [scanLocation, setScanLocation] = useState(
    currentUser?.organization || 'MedPlus Pharmacy - Koramangala, Bengaluru'
  );
  const [selectedScanMode, setSelectedScanMode] = useState<'quick' | 'ocr'>('quick');

  // Verification State
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ScanVerifyResponse | null>(null);

  // OCR State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRAnalyzeResponse | null>(null);
  const [ocrImagePreset, setOcrImagePreset] = useState<'tampered' | 'valid'>('tampered');

  // Error State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.organization) {
      setScanLocation(currentUser.organization);
    }
  }, [currentUser]);

  const handleVerify = async (batchNo?: string, ocrExpiry?: string) => {
    const target = batchNo || batchInput;
    if (!target) return;
    setVerifying(true);
    setVerifyResult(null);
    setErrorMessage(null);

    try {
      const res = await api.verifyScan({
        batch_number: target.trim(),
        scan_type: ocrExpiry ? 'OCR' : 'QR',
        location: scanLocation,
        scanner_role: currentRole,
        ocr_printed_expiry: ocrExpiry
      });

      setVerifyResult(res);

      if (res.result === 'VERIFIED') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.75 } });
      } else if (res.result === 'FRAUD') {
        // Red alert celebration for wow moments
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.75 },
          colors: ['#ef4444', '#dc2626', '#f87171']
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to verify scan. Make sure PharmaGuard backend is running on port 8000.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRunOCR = async (presetType: 'tampered' | 'valid') => {
    setOcrLoading(true);
    setOcrImagePreset(presetType);
    setErrorMessage(null);
    const targetBatch = 'PCM500123';
    setBatchInput(targetBatch);

    try {
      const res = await api.analyzeOCR({
        batch_number: targetBatch,
        image_url: presetType === 'tampered' ? 'package_tampered_2028.png' : 'package_valid_2026.png'
      });
      setOcrResult(res);

      // Immediately run verification check with OCR extracted date
      if (res.extracted_expiry_date) {
        await handleVerify(targetBatch, res.extracted_expiry_date);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'OCR analysis failed. Make sure PharmaGuard backend is running on port 8000.');
    } finally {
      setOcrLoading(false);
    }
  };

  const isPCM999888 = (verifyResult?.batch?.batch_number === 'PCM999888' || batchInput === 'PCM999888') && verifyResult?.result === 'FRAUD';

  // Section 4 Event Timeline for Re-entry
  const reEntryTimelineSteps = [
    { name: 'Registered', status: 'done' },
    { name: 'Expired', status: 'done' },
    { name: 'Returned', status: 'done' },
    { name: 'Received', status: 'done' },
    { name: 'Destroyed', status: 'done' },
    { name: 'Destruction Verified', status: 'done' },
    { name: '⚠ Re-entry Detected', status: 'alert' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <ScanLine className="w-3.5 h-3.5" /> AI-Assisted Risk Detection & Verification Hub
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Scan & Verify Medicine Batch</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            &ldquo;Track the medicine. Verify the destruction. Stop re-entry.&rdquo;
          </p>
        </div>

        <div className="text-right font-mono text-xs text-slate-400">
          <span className="text-slate-500 block">Scanning Node</span>
          <span className="text-emerald-300 font-bold">{currentUser?.name}</span>
          <span className="block text-[11px] text-slate-500">{scanLocation}</span>
        </div>
      </div>

      {/* Main Grid: Left Scanner Input / Right Verification Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input Hub (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setSelectedScanMode('quick')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedScanMode === 'quick'
                  ? 'bg-emerald-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Batch Entry
            </button>
            <button
              onClick={() => setSelectedScanMode('ocr')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedScanMode === 'ocr'
                  ? 'bg-emerald-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              OCR Label Inspection
            </button>
          </div>

          {/* Quick Manual / Preset Card */}
          {selectedScanMode === 'quick' && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-panel space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Target Batch Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    placeholder="e.g. PCM999888"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono font-bold tracking-wider focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleVerify()}
                    disabled={verifying}
                    className="absolute right-2 top-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Scanning Location Node
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={scanLocation}
                    onChange={(e) => setScanLocation(e.target.value)}
                    className="bg-transparent w-full focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Hackathon Demo Quick Presets */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Hackathon Scenario Presets
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {/* Primary Re-entry Fraud Wow Moment Preset */}
                  <button
                    onClick={() => {
                      setBatchInput('PCM999888');
                      handleVerify('PCM999888');
                    }}
                    className="p-3 rounded-xl bg-rose-950/30 border-2 border-rose-500/60 hover:border-rose-500 text-left transition col-span-2 ring-1 ring-rose-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-rose-400 text-sm">PCM999888 (P0 DEMO)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-600 text-white font-bold">
                        RE-ENTRY FRAUD
                      </span>
                    </div>
                    <span className="text-[11px] text-rose-200/90 block mt-1">
                      Batch previously verified destroyed &rarr; Re-appears at Pharmacy B!
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchInput('PCM500123');
                      handleVerify('PCM500123');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <span className="font-bold text-emerald-400 block">PCM500123</span>
                    <span className="text-[10px] text-slate-400">Normal Reverse Flow Batch</span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchInput('AZI777666');
                      handleVerify('AZI777666');
                    }}
                    className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 text-left transition"
                  >
                    <span className="font-bold text-rose-400 block">AZI777666</span>
                    <span className="text-[10px] text-rose-300">Flagged Re-entry Batch</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: OCR Medicine Package Image Inspection */}
          {selectedScanMode === 'ocr' && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Label Tampering Detection
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  AI-ASSISTED OCR DEMO PRESET
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Preset package inspection demonstrates AI-assisted optical character recognition reconciling physical blister pack printed dates against registered manufacturer batch metadata.
              </p>

              {/* Package Simulation Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRunOCR('tampered')}
                  disabled={ocrLoading}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    ocrImagePreset === 'tampered'
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tampered Package
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1 font-mono">
                    Scanned: <strong className="text-rose-400">15/08/2028</strong>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1">(Extended by 2 years!)</p>
                </button>

                <button
                  onClick={() => handleRunOCR('valid')}
                  disabled={ocrLoading}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    ocrImagePreset === 'valid'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Legitimate Package
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1 font-mono">
                    Scanned: <strong>15/08/2026</strong>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1">(Matches registration)</p>
                </button>
              </div>

              {/* Simulated Medicine Strip with Bounding Box Highlights */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  OCR Text Extraction Preview:
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 relative overflow-hidden">
                  <div className="flex justify-between">
                    <span className="text-slate-400">MEDICINE:</span>
                    <span className="text-white font-bold">Paracetamol 500mg (Calpol)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BATCH NO:</span>
                    <span className="text-emerald-400 font-bold">B.No. PCM500123</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MFG DATE:</span>
                    <span className="text-slate-300">15/08/2023</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">PRINTED EXP:</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                        ocrImagePreset === 'tampered'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                          : 'text-emerald-300'
                      }`}
                    >
                      {ocrImagePreset === 'tampered' ? '15/08/2028 (ALTERED!)' : '15/08/2026'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Verification Results Dossier (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-200 flex items-center justify-between text-xs shadow-lg">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {verifying ? (
            <div className="p-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl glass-panel space-y-4">
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
              <div className="text-white font-bold text-base">Running AI-Assisted Risk Engine...</div>
              <p className="text-xs text-slate-400">
                Checking QR cryptographic signature, batch ledger status, and anomaly scoring.
              </p>
            </div>
          ) : verifyResult ? (
            <div
              className={`p-6 sm:p-8 rounded-3xl border glass-panel transition-all space-y-6 ${
                verifyResult.result === 'FRAUD'
                  ? 'bg-rose-950/25 border-rose-500/70 shadow-2xl shadow-rose-950/60 ring-2 ring-rose-500/40'
                  : verifyResult.result === 'SUSPICIOUS'
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-xl'
                  : 'bg-slate-900/60 border-emerald-500/40 shadow-xl'
              }`}
            >
              {/* SECTION 4: Re-entry Fraud Wow Moment Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Compliance Verdict
                  </span>
                  <div className="flex items-center gap-3">
                    {verifyResult.result === 'FRAUD' ? (
                      <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-rose-500">
                        <ShieldAlert className="w-8 h-8 text-rose-500 animate-bounce" />
                        <span>🚨 FRAUD DETECTED</span>
                      </div>
                    ) : verifyResult.result === 'SUSPICIOUS' ? (
                      <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-amber-400">
                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                        <span>⚠️ SUSPICIOUS BATCH</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-emerald-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        <span>🟢 VERIFIED COMPLIANT</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk Score Pill (e.g. 95 / 100 CRITICAL) */}
                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-rose-400 font-mono">
                      {verifyResult.risk_score}
                    </span>
                    <span className="text-sm font-mono text-slate-400 font-bold">/ 100</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-mono text-xs font-black uppercase tracking-wider mt-1">
                    {verifyResult.severity}
                  </span>
                </div>
              </div>

              {/* Mandatory Callout: DO NOT ACCEPT OR DISPENSE */}
              {verifyResult.result === 'FRAUD' && (
                <div className="p-4 rounded-2xl bg-rose-600/20 border-2 border-rose-500 text-rose-100 flex items-center justify-between shadow-2xl">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-rose-500 shrink-0 animate-pulse" />
                    <div>
                      <div className="text-[10px] font-mono font-bold text-rose-400 tracking-wider">
                        MANDATORY COMPLIANCE DIRECTIVE
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                        DO NOT ACCEPT OR DISPENSE
                      </div>
                      <div className="text-xs text-rose-300 mt-0.5">
                        Statutory quarantine protocol initiated. Alert dispatched to CDSCO-ready Regulator Gateway.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: Re-entry Specific Batch Details */}
              {isPCM999888 && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Batch</span>
                      <span className="text-white font-bold text-sm">PCM999888</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Medicine</span>
                      <span className="text-slate-200 font-bold">Paracetamol 500mg (Calpol)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Status</span>
                      <span className="text-rose-400 font-bold">REENTRY_DETECTED</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Facility Destroyed</span>
                      <span className="text-slate-300">EcoSafe Incineration</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 text-rose-300 text-xs">
                    <strong>Reason:</strong> &ldquo;This batch was previously verified as destroyed and has appeared again in the supply chain.&rdquo;
                  </div>
                </div>
              )}

              {/* SECTION 5: COMPACT "WHY THIS WAS FLAGGED" EXPLANATION */}
              {verifyResult.result === 'FRAUD' && (
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-rose-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> WHY THIS WAS FLAGGED
                    </div>
                    <span className="text-xs font-mono text-rose-400 font-bold">
                      Risk: {verifyResult.risk_score}/100 — {verifyResult.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-950/30 border border-rose-500/30">
                      <Check className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Previously destruction verified</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-950/30 border border-rose-500/30">
                      <Check className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Unexpected pharmacy location</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-950/30 border border-rose-500/30">
                      <Check className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Duplicate / re-entry scan</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-950/30 border border-rose-500/30">
                      <Check className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Supply-chain history conflict</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    Decision reaches statutory confidence through deterministic state-lock and custody discrepancy checks.
                  </p>
                </div>
              )}

              {/* SECTION 4: VISUAL EVENT TIMELINE FOR RE-ENTRY */}
              {isPCM999888 && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
                    Chain of Custody &amp; Re-entry Timeline
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    {reEntryTimelineSteps.map((step, idx) => (
                      <React.Fragment key={step.name}>
                        <div
                          className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold ${
                            step.status === 'alert'
                              ? 'bg-rose-600 text-white animate-pulse shadow-md'
                              : 'bg-slate-900 border border-slate-800 text-emerald-400'
                          }`}
                        >
                          {step.status === 'done' ? (
                            <span>✓</span>
                          ) : null}
                          <span>{step.name}</span>
                        </div>
                        {idx < reEntryTimelineSteps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 6: VISUAL SIDE-BY-SIDE OCR COMPARISON */}
              {selectedScanMode === 'ocr' && ocrImagePreset === 'tampered' && (
                <div className="p-4 rounded-2xl bg-slate-950/90 border-2 border-rose-500/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> ⚠ LABEL TAMPERING DETECTED
                    </span>
                    <span className="text-xs font-mono text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950 border border-rose-500/40">
                      Risk: 85/100 — CRITICAL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Trusted Batch Record */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-xs">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        TRUSTED BATCH RECORD
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Batch:</span>
                          <span className="text-white font-bold">PCM500123</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Medicine:</span>
                          <span className="text-slate-300">Paracetamol 500mg</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                          <span className="text-slate-400 font-bold">Expiry:</span>
                          <span className="text-emerald-400 font-bold text-sm">15/08/2026</span>
                        </div>
                      </div>
                    </div>

                    {/* Scanned Package */}
                    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2 font-mono text-xs">
                      <div className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
                        SCANNED PACKAGE (OCR)
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Batch:</span>
                          <span className="text-white font-bold">PCM500123</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Medicine:</span>
                          <span className="text-slate-300">Paracetamol 500mg</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-rose-500/30">
                          <span className="text-rose-300 font-bold">Detected expiry:</span>
                          <span className="text-rose-400 font-bold text-sm animate-pulse">15/08/2028</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-rose-300/90 font-mono bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/30">
                    Discrepancy: Physical package date was fraudulently altered by 24 months past official registration.
                  </div>
                </div>
              )}

              {/* Recommendation Callout */}
              <div
                className={`p-4 rounded-2xl border text-sm font-semibold ${
                  verifyResult.result === 'FRAUD'
                    ? 'bg-rose-950/50 border-rose-500 text-rose-200 shadow-inner'
                    : verifyResult.result === 'SUSPICIOUS'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                }`}
              >
                {verifyResult.recommendation}
              </div>

              {/* Multi-Signal Verification Checks */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Deterministic Multi-Signal Verification Checks
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(verifyResult.checks || {}).map(([key, passed]) => (
                    <div
                      key={key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        passed
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-300 font-bold'
                      }`}
                    >
                      <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
                      <span>{passed ? '✓ PASS' : '✗ FAIL'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection / Flag Reasons */}
              {verifyResult.reasons && verifyResult.reasons.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Rule Engine Infraction Findings
                  </span>
                  <ul className="space-y-1 text-xs text-slate-200">
                    {verifyResult.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">&bull;</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                {verifyResult.incident_id ? (
                  <Link
                    to="/regulator"
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:underline font-bold"
                  >
                    <span>View Regulator Incident Case File</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">Scan verified at {scanLocation}</span>
                )}

                {verifyResult.batch && (
                  <Link
                    to={`/batches/${verifyResult.batch.batch_number}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                  >
                    <span>Audit Batch Ledger</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl glass-panel space-y-4">
              <ScanLine className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-bold text-lg">Awaiting Scan Input</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select PCM999888 on the left to trigger the Re-entry Fraud demonstration, or run OCR Label Inspection to detect package tampering.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
