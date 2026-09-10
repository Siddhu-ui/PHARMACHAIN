import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ScanVerifyResponse, OCRAnalyzeResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import {
  ScanLine, Camera, Upload, ShieldAlert, CheckCircle2, AlertTriangle,
  FileSearch, Sparkles, ExternalLink, RefreshCw, MapPin, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

export const ScanPage: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  const [batchInput, setBatchInput] = useState('PCM500123');
  const [scanLocation, setScanLocation] = useState(
    currentUser?.organization || 'MedPlus Pharmacy - Koramangala, Bengaluru'
  );
  const [selectedScanMode, setSelectedScanMode] = useState<'quick' | 'camera' | 'ocr'>('quick');

  // Verification State
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ScanVerifyResponse | null>(null);

  // OCR State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRAnalyzeResponse | null>(null);
  const [ocrImagePreset, setOcrImagePreset] = useState<'tampered' | 'valid'>('tampered');

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
        // Red alert celebration for fraud catch!
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.75 },
          colors: ['#ef4444', '#dc2626', '#f87171']
        });
      }
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleRunOCR = async (presetType: 'tampered' | 'valid') => {
    setOcrLoading(true);
    setOcrImagePreset(presetType);
    try {
      const res = await api.analyzeOCR({
        batch_number: batchInput,
        image_url: presetType === 'tampered' ? 'package_tampered_2028.png' : 'package_valid_2026.png'
      });
      setOcrResult(res);

      // Immediately pass OCR printed expiry to multi-signal verification!
      if (res.extracted_expiry_date) {
        await handleVerify(batchInput, res.extracted_expiry_date);
      }
    } catch (err: any) {
      alert(`OCR analysis failed: ${err.message}`);
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <ScanLine className="w-3.5 h-3.5" /> Multi-Signal Reverse Chain Verification Hub
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Scan & Verify Medicine Batch</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reconciles QR cryptographic metadata, package OCR label tampering, and immutable destruction ledgers.
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
              Package OCR Inspection
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
                    placeholder="e.g. PCM500123"
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
                  <button
                    onClick={() => {
                      setBatchInput('PCM500123');
                      handleVerify('PCM500123');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <span className="font-bold text-emerald-400 block">PCM500123</span>
                    <span className="text-[10px] text-slate-400">Demo Target Batch</span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchInput('PCM999888');
                      handleVerify('PCM999888');
                    }}
                    className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 text-left transition"
                  >
                    <span className="font-bold text-rose-400 block">PCM999888</span>
                    <span className="text-[10px] text-rose-300">Destroyed Batch (Test Re-entry)</span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchInput('AZI777666');
                      handleVerify('AZI777666');
                    }}
                    className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 text-left transition"
                  >
                    <span className="font-bold text-rose-400 block">AZI777666</span>
                    <span className="text-[10px] text-rose-300">Re-entry Detected Batch</span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchInput('AMX202401');
                      handleVerify('AMX202401');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <span className="font-bold text-amber-400 block">AMX202401</span>
                    <span className="text-[10px] text-slate-400">Expiring in 22 Days</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OCR Medicine Package Image Inspection */}
          {selectedScanMode === 'ocr' && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Label Tampering Detection Engine
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  OCR AI ACTIVE
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Simulate uploading a medicine blister pack to test if printed expiry date matches manufacturer registration.
              </p>

              {/* Package Simulation Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRunOCR('tampered')}
                  disabled={ocrLoading}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    ocrImagePreset === 'tampered'
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tampered Package
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Printed Expiry: <strong className="text-rose-400">15/08/2028</strong>
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">(Extended by 2 yrs!)</p>
                </button>

                <button
                  onClick={() => handleRunOCR('valid')}
                  disabled={ocrLoading}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    ocrImagePreset === 'valid'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Legitimate Package
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Printed Expiry: <strong>15/08/2026</strong>
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">(Matches registration)</p>
                </button>
              </div>

              {/* Simulated Medicine Strip with Bounding Box Highlights */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-slate-500 text-[10px] uppercase tracking-wider">
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
        <div className="lg:col-span-7">
          {verifying ? (
            <div className="p-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl glass-panel space-y-4">
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
              <div className="text-white font-bold text-base">Running Multi-Signal Verification Engine...</div>
              <p className="text-xs text-slate-400">
                Checking QR cryptographic signature, batch ledger status, and Isolation Forest ML anomaly score.
              </p>
            </div>
          ) : verifyResult ? (
            <div
              className={`p-6 sm:p-8 rounded-3xl border glass-panel transition-all space-y-6 ${
                verifyResult.result === 'FRAUD'
                  ? 'bg-rose-950/20 border-rose-500/60 shadow-2xl shadow-rose-950/50 ring-1 ring-rose-500/40'
                  : verifyResult.result === 'SUSPICIOUS'
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-xl'
                  : 'bg-slate-900/60 border-emerald-500/40 shadow-xl'
              }`}
            >
              {/* Result Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Multi-Signal Compliance Verdict
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

                <RiskScoreBadge
                  score={verifyResult.risk_score}
                  severity={verifyResult.severity}
                  size="lg"
                />
              </div>

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

              {/* Batch Metadata Comparison */}
              {verifyResult.batch && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-3">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block">
                    Authoritative Database Ledger Record
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Batch Number</span>
                      <span className="text-white font-bold text-sm">{verifyResult.batch.batch_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Medicine</span>
                      <span className="text-slate-200">{verifyResult.batch.medicine?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Registered Status</span>
                      <span className="text-rose-400 font-bold">{verifyResult.batch.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Registered Expiry</span>
                      <span className="text-slate-200">
                        {new Date(verifyResult.batch.expiry_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Current Custody Node</span>
                      <span className="text-slate-200 truncate block">{verifyResult.batch.current_location}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ML Anomaly Score</span>
                      <span className="text-emerald-400 font-bold">
                        {(verifyResult.ml_anomaly_score * 100).toFixed(1)}% ({verifyResult.is_ml_anomaly ? 'ANOMALY' : 'NORMAL'})
                      </span>
                    </div>
                  </div>
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
                Select a batch number preset on the left, or test package OCR label tampering detection to inspect multi-signal compliance verdicts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
