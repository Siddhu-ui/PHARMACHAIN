import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Play, RotateCcw, AlertTriangle, ChevronUp, ChevronDown,
  Sparkles, CheckCircle2, ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  onScenarioStepExecuted?: () => void;
}

export const DemoControlBar: React.FC<Props> = ({ onScenarioStepExecuted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    { id: 1, label: '1. Expired Batch', desc: 'PCM500123 marked EXPIRED at Pharmacy A' },
    { id: 2, label: '2. Request Return', desc: 'Pharmacy A submits reverse logistics return' },
    { id: 3, label: '3. Distributor Pickup', desc: 'Apex confirms pickup of 100 units' },
    { id: 4, label: '4. Mfr Receipt', desc: 'Sun Pharma logs batch in quarantine bay' },
    { id: 5, label: '5. Destr Scheduled', desc: 'Batch routed to EcoSafe Waste Facility' },
    { id: 6, label: '6. Destr Verified', desc: 'Cert verified -> DESTRUCTION_VERIFIED' },
    { id: 7, label: '7. 🚨 Re-entry Fraud', desc: 'Pharmacy B scans destroyed batch!' },
    { id: 8, label: '8. 🚨 Tampering Alert', desc: 'OCR detects expiry date 2028 manipulation' },
    { id: 9, label: '9. Regulator Alert', desc: 'Emergency CDSCO enforcement broadcast' },
  ];

  const handleStep = async (stepId: number) => {
    setLoading(true);
    try {
      const res = await api.executeDemoStep(stepId);
      setActiveStep(stepId);
      setStatusMsg(res.message);

      if (stepId === 6) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.85 } });
      } else if (stepId === 7 || stepId === 8) {
        // Red alert celebration for wow moments
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.85 },
          colors: ['#ef4444', '#f97316', '#dc2626']
        });
      }

      if (onScenarioStepExecuted) {
        onScenarioStepExecuted();
      }
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await api.resetDemo();
      setActiveStep(null);
      setStatusMsg(res.message);
      if (onScenarioStepExecuted) {
        onScenarioStepExecuted();
      }
    } catch (err: any) {
      setStatusMsg(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl shadow-2xl transition-all duration-300">
      <div className="glass-panel border-emerald-500/30 rounded-2xl overflow-hidden backdrop-blur-xl bg-slate-950/90 text-white shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Hackathon Demo Scenario Controller
            </span>
            {statusMsg && (
              <span className="text-xs text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700 font-mono truncate max-w-md">
                {statusMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              title="Reset Demo Baseline"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              Reset Demo
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-medium transition"
            >
              {isOpen ? (
                <>
                  Hide Controls <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  1-Click Demo Steps <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Steps Drawer */}
        {isOpen && (
          <div className="p-3 bg-slate-950/95 space-y-2">
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
              {steps.map((s) => {
                const isSelected = activeStep === s.id;
                const isFraud = s.id === 7 || s.id === 8;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStep(s.id)}
                    disabled={loading}
                    className={`p-2 rounded-xl text-left border flex flex-col justify-between transition-all ${
                      isSelected
                        ? isFraud
                          ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/30'
                          : 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                        : isFraud
                        ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-500 text-rose-300'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-tight line-clamp-1">{s.label}</span>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
