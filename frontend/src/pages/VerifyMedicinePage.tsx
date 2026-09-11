import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { RetailerVerifyResponse, MedicineQRPayload } from '../types';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  ShieldCheck, Upload, Image as ImageIcon,
  CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  Check, X, Sparkles, AlertOctagon,
  ScanLine, Store, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

type DemoPreset =
  | 'glyconorm'
  | 'safe'
  | 'expiring'
  | 'expired'
  | 'respi'
  | 'pcm'
  | 'tampered'
  | 'unknown'
  | 'reentry';

export const VerifyMedicinePage: React.FC = () => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & File State
  const [, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Manual / Detected QR Product ID & JSON Payload
  const [detectedProductId, setDetectedProductId] = useState<string>('PG-CS10-2026-003319');
  const [decodedPayload, setDecodedPayload] = useState<MedicineQRPayload | null>(null);
  const [isQrDetected, setIsQrDetected] = useState<boolean>(true);
  const [isQrScanning, setIsQrScanning] = useState<boolean>(false);
  const [qrStatusNote, setQrStatusNote] = useState<string>('QR Code decoded from package metadata');

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<RetailerVerifyResponse | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  // Preset demo mode
  const [currentPreset, setCurrentPreset] = useState<DemoPreset>('glyconorm');

  // Helper to dynamically calculate expiry days on client side
  const computeExpiryDays = (expDateStr?: string) => {
    if (!expDateStr) return { days: 0, status: 'UNKNOWN', isExpired: false, label: 'N/A' };

    let exp: Date;
    if (expDateStr.includes('/')) {
      const parts = expDateStr.split('/');
      exp = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`) : new Date(expDateStr);
    } else {
      exp = new Date(expDateStr);
    }

    if (isNaN(exp.getTime())) {
      return { days: 0, status: 'UNKNOWN', isExpired: false, label: 'N/A' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return {
        days: absDays,
        status: `Expired ${absDays} day${absDays !== 1 ? 's' : ''} ago`,
        isExpired: true,
        label: `${absDays} day${absDays !== 1 ? 's' : ''} expired`
      };
    } else if (diffDays === 0) {
      return {
        days: 0,
        status: 'Expires today',
        isExpired: false,
        label: 'Expires today'
      };
    } else {
      return {
        days: diffDays,
        status: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
        isExpired: false,
        label: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`
      };
    }
  };

  // Preset definitions
  const demoConfigs: Record<DemoPreset, {
    payload: MedicineQRPayload;
    note: string;
    overrideImage?: string;
  }> = {
    glyconorm: {
      payload: {
        product_name: 'GlycoNorm 500 mg Tablets',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'CS10-B14-9921',
        serial_number: 'PG-CS10-2026-003319',
        manufacturing_date: '2025-08-06',
        expiry_date: '2026-08-29',
        quantity: '100 strips'
      },
      note: 'Demo Package: GlycoNorm 500 mg Tablets (Batch: CS10-B14-9921)'
    },
    safe: {
      payload: {
        product_name: 'CardioSafe 10 mg Tablets',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'CS10-SAFE',
        serial_number: 'PG-CS10-2027-009841',
        manufacturing_date: '2026-01-10',
        expiry_date: '2027-01-30',
        quantity: '150 strips'
      },
      note: 'Demo Package: CardioSafe 10 mg (Active Shelf Life)'
    },
    expiring: {
      payload: {
        product_name: 'CardioSafe 10 mg Tablets',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'CS10-EXP18',
        serial_number: 'PG-CS10-2026-004412',
        manufacturing_date: '2025-10-01',
        expiry_date: '2026-09-29',
        quantity: '80 strips'
      },
      note: 'Demo Package: CardioSafe 10 mg (Expiring in ~18 days)'
    },
    expired: {
      payload: {
        product_name: 'CardioSafe 10 mg Tablets',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'CS10-A23-2507',
        serial_number: 'PG-CS10-2026-A232507',
        manufacturing_date: '2025-07-15',
        expiry_date: '2026-07-15',
        quantity: '100 strips'
      },
      note: 'Demo Package: CardioSafe 10 mg (Expired Batch - Return Required)'
    },
    respi: {
      payload: {
        product_name: 'RespiClear 250 mg Capsules',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'CS10-C32-8812',
        serial_number: 'PG-CS10-2026-007721',
        manufacturing_date: '2025-04-20',
        expiry_date: '2026-08-20',
        quantity: '100 strips'
      },
      note: 'Demo Package: RespiClear 250 mg Capsules (Batch: CS10-C32-8812)'
    },
    pcm: {
      payload: {
        product_name: 'Paracetamol 500mg Tablets',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'PCM500123',
        serial_number: 'PG-PCM-2026-500123',
        manufacturing_date: '2023-08-15',
        expiry_date: '2026-08-15',
        quantity: '100 strips'
      },
      note: 'Demo Package: Paracetamol 500mg (Batch: PCM500123)'
    },
    tampered: {
      payload: {
        product_name: 'Paracetamol 500mg Tablets',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'PCM500123',
        serial_number: 'PG-PCM-2026-500123',
        manufacturing_date: '2023-08-15',
        expiry_date: '2028-08-15',
        quantity: '100 strips'
      },
      note: 'Demo Package: Altered label expiry (Printed 2028 vs Registered 2026)',
      overrideImage: '/blister_tampered_pcm.svg'
    },
    unknown: {
      payload: {
        product_name: 'Counterfeit Medicine',
        manufacturer: 'Unregistered Entity',
        batch_number: 'UNKNOWN-001',
        serial_number: 'PG-UNKNOWN-999',
        manufacturing_date: '2025-01-01',
        expiry_date: '2027-01-01',
        quantity: '50 strips'
      },
      note: 'Demo Package: Unregistered identity (Not in database)',
      overrideImage: '/blister_unknown_fake.svg'
    },
    reentry: {
      payload: {
        product_name: 'Paracetamol 500mg Tablets',
        manufacturer: 'BharatCure Pharma',
        batch_number: 'PCM999888',
        serial_number: 'PG-PCM-2026-999888',
        manufacturing_date: '2024-03-01',
        expiry_date: '2026-03-01',
        quantity: '100 strips'
      },
      note: 'Demo Package: Verified destroyed medicine re-entry (PCM999888)',
      overrideImage: '/blister_reentry_pcm.svg'
    }
  };

  const loadPreset = (preset: DemoPreset) => {
    setCurrentPreset(preset);
    setVerifyResult(null);
    setFileError(null);

    const config = demoConfigs[preset];
    if (config) {
      setDecodedPayload(config.payload);
      setDetectedProductId(config.payload.serial_number);
      setIsQrDetected(true);
      setQrStatusNote(config.note);

      if (config.overrideImage) {
        setImagePreview(config.overrideImage);
      } else {
        QRCode.toDataURL(JSON.stringify(config.payload), {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0f172a', light: '#ffffff' }
        })
          .then((url: string) => setImagePreview(url))
          .catch(() => setImagePreview(null));
      }
    }
  };

  // Initialize with GlycoNorm demo preset
  useEffect(() => {
    loadPreset('glyconorm');
  }, []);

  // QR Decoder using html5-qrcode scanFile
  const decodeQRFromFile = async (file: File) => {
    setIsQrScanning(true);
    setFileError(null);

    let tempDiv = document.getElementById('qr-temp-reader');
    if (!tempDiv) {
      tempDiv = document.createElement('div');
      tempDiv.id = 'qr-temp-reader';
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-temp-reader');
      const decoded = await html5QrCode.scanFile(file, false);
      html5QrCode.clear();

      if (decoded && decoded.trim()) {
        const rawText = decoded.trim();
        try {
          const parsed = JSON.parse(rawText);
          if (parsed.batch_number || parsed.serial_number || parsed.product_name) {
            setDecodedPayload(parsed);
            const pid = parsed.serial_number || parsed.product_id || parsed.batch_number || rawText;
            setDetectedProductId(pid);
            setIsQrDetected(true);
            setQrStatusNote(`QR Decoded: ${parsed.product_name || 'Medicine'} (Batch: ${parsed.batch_number || 'N/A'}, EXP: ${parsed.expiry_date || 'N/A'})`);
            return;
          }
        } catch {
          // Plain text code
        }

        setDetectedProductId(rawText);
        setDecodedPayload(null);
        setIsQrDetected(true);
        setQrStatusNote(`QR Code detected: ${rawText}`);
      } else {
        throw new Error('No QR text found');
      }
    } catch {
      // Image has no QR or was not readable - fallback detection based on filename
      const lower = file.name.toLowerCase();
      if (lower.includes('glyconorm') || lower.includes('cs10-b14')) {
        loadPreset('glyconorm');
      } else if (lower.includes('pcm999888') || lower.includes('reentry')) {
        loadPreset('reentry');
      } else if (lower.includes('tamper')) {
        loadPreset('tampered');
      } else if (lower.includes('unknown') || lower.includes('fake')) {
        loadPreset('unknown');
      } else {
        setIsQrDetected(false);
        setDetectedProductId('');
        setDecodedPayload(null);
        setQrStatusNote('QR CODE NOT DETECTED — Unable to verify Product ID from this image.');
      }
    } finally {
      setIsQrScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Unsupported file format. Please upload PNG, JPG, JPEG, or WEBP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    setSelectedFile(file);
    setFileError(null);
    setVerifyResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    decodeQRFromFile(file);
  };

  const handleRunVerification = async () => {
    setVerifying(true);
    setVerifyResult(null);
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 200);
    setTimeout(() => setActiveStep(3), 450);
    setTimeout(() => setActiveStep(4), 700);
    setTimeout(() => setActiveStep(5), 900);

    try {
      let printedExpiryOverride: string | undefined = undefined;
      if (currentPreset === 'tampered') {
        printedExpiryOverride = '15/08/2028';
      }

      const qrPayloadString = decodedPayload ? JSON.stringify(decodedPayload) : undefined;

      const res = await api.verifyRetailerPackage({
        product_id: detectedProductId,
        qr_data: qrPayloadString || detectedProductId,
        qr_detected: isQrDetected,
        package_image_url: imagePreview || undefined,
        printed_expiry_override: printedExpiryOverride,
        location: currentUser?.organization || 'Shree Medicals',
        scanner_role: 'RETAILER'
      });

      setVerifyResult(res);

      if (res.status_verdict === 'VERIFIED') {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      } else if (res.status_verdict === 'REENTRY_FRAUD' || res.status_verdict === 'LABEL_TAMPERING') {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#ef4444', '#dc2626', '#f87171']
        });
      }
    } catch (err: any) {
      setFileError(err.message || 'Verification service error. Ensure backend is running.');
    } finally {
      setVerifying(false);
    }
  };

  // Helper formatting for displayed values
  const displayMedicine = verifyResult?.medicine_name || decodedPayload?.product_name || 'GlycoNorm 500 mg Tablets';
  const displayMfr = verifyResult?.manufacturer || decodedPayload?.manufacturer || 'BharatCure Pharma';
  const displayBatch = verifyResult?.batch_number || decodedPayload?.batch_number || 'CS10-B14-9921';
  const displaySerial = verifyResult?.serial_number || verifyResult?.product_id || decodedPayload?.serial_number || 'PG-CS10-2026-003319';
  const displayMfg = verifyResult?.manufacturing_date || decodedPayload?.manufacturing_date || '06 Aug 2025';
  const displayExp = verifyResult?.expiry_date || decodedPayload?.expiry_date || '29 Aug 2026';
  const displayQty = verifyResult?.quantity || decodedPayload?.quantity || '100 strips';

  const clientExpiryCalc = computeExpiryDays(displayExp);
  const displayExpiryStatus = verifyResult?.current_expiry_status || clientExpiryCalc.status;
  const isExpiredFinal = verifyResult?.is_expired ?? clientExpiryCalc.isExpired;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <Store className="w-3.5 h-3.5" /> Retailer Portal &bull; Medicine QR Verification
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Verify Medicine Before Sale
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Scan/Decode QR payload &bull; Authoritative Database Verification &bull; Dynamic Expiry Calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/retailer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
          >
            <span>Expiry & Returns</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Demo Preset Selector Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Select Demo Medicine / Test Case (1-Click QR Setup)</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">5-7 Demo Medicines</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadPreset('glyconorm')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'glyconorm'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🟢 1. GlycoNorm 500mg (CS10-B14-9921)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('safe')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'safe'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🟢 2. CardioSafe 10mg (CS10-SAFE)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('expiring')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'expiring'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🟡 3. CardioSafe (CS10-EXP18)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'expired'
                ? 'bg-amber-700 text-white shadow-md shadow-amber-700/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🟠 4. CardioSafe Expired (CS10-A23-2507)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('respi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'respi'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🟢 5. RespiClear 250mg (CS10-C32-8812)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('pcm')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'pcm'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🟢 6. Paracetamol 500mg (PCM500123)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('tampered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'tampered'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🔴 7. Label Tampering</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('reentry')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'reentry'
                ? 'bg-rose-900 text-rose-200 border border-rose-500 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🚨 8. Re-Entry Fraud (PCM999888)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('unknown')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentPreset === 'unknown'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🔴 9. Unknown Product</span>
          </button>
        </div>
      </div>

      {fileError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Main Upload & Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Upload & Preview */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 glass-panel">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Package QR Code Image</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload any package photo or select a demo preset above to decode complete metadata.
            </p>
          </div>

          {/* Upload Drop Zone / Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-5 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-900"
          >
            <div className="mx-auto w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white block">Upload QR Image / Package Photo</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Click to browse from your device</span>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Package / QR Preview:</span>
                <span className="text-[10px] text-emerald-400 font-bold">Ready for Inspection</span>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-white flex items-center justify-center p-4 max-h-72">
                <img
                  src={imagePreview}
                  alt="Package QR Preview"
                  className="max-h-60 object-contain rounded-xl"
                />
              </div>
            </div>
          )}

          {/* QR Status & Decoded Metadata Summary */}
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            isQrDetected
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 font-mono uppercase text-[11px]">
                <ScanLine className="w-4 h-4" />
                <span>STEP 1: QR Metadata Decoding</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                isQrDetected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {isQrDetected ? 'RESOLVED' : 'NOT DETECTED'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300">{qrStatusNote}</p>

            {decodedPayload && (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
                <div><span className="text-slate-400">Medicine:</span> <span className="text-white font-bold">{decodedPayload.product_name}</span></div>
                <div><span className="text-slate-400">Batch:</span> <span className="text-emerald-400">{decodedPayload.batch_number}</span></div>
                <div><span className="text-slate-400">MFG Date:</span> <span className="text-slate-200">{decodedPayload.manufacturing_date}</span></div>
                <div><span className="text-slate-400">EXP Date:</span> <span className="text-slate-200">{decodedPayload.expiry_date}</span></div>
              </div>
            )}

            <div className="pt-1">
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                Resolved Serial / Product ID:
              </label>
              <input
                type="text"
                value={detectedProductId}
                onChange={(e) => {
                  setDetectedProductId(e.target.value);
                  setIsQrDetected(!!e.target.value.trim());
                }}
                placeholder="e.g. PG-CS10-2026-003319"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-400 outline-none"
              />
            </div>
          </div>

          {/* Verify Button */}
          <button
            type="button"
            onClick={handleRunVerification}
            disabled={verifying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            {verifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Decoding QR & Verifying Medicine...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Medicine Before Sale</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: 5-Step Pipeline & Result Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* 5-Step Visual Indicator */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 glass-panel">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-3">
              PharmaGuard Multi-Signal Verification Pipeline
            </span>
            <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
              <div className={`p-2 rounded-xl border transition ${
                activeStep >= 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                <span className="block font-bold">STEP 1</span>
                <span>QR Decode</span>
              </div>

              <div className={`p-2 rounded-xl border transition ${
                activeStep >= 2 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                <span className="block font-bold">STEP 2</span>
                <span>DB Lookup</span>
              </div>

              <div className={`p-2 rounded-xl border transition ${
                activeStep >= 3 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                <span className="block font-bold">STEP 3</span>
                <span>OCR Extract</span>
              </div>

              <div className={`p-2 rounded-xl border transition ${
                activeStep >= 4 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                <span className="block font-bold">STEP 4</span>
                <span>Cross Check</span>
              </div>

              <div className={`p-2 rounded-xl border transition ${
                activeStep >= 5 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                <span className="block font-bold">STEP 5</span>
                <span>Lifecycle</span>
              </div>
            </div>
          </div>

          {/* Verification Result Section */}
          {verifyResult ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Core Medicine Verification Card (Format Requested) */}
              <div className={`p-7 rounded-3xl border shadow-2xl space-y-6 ${
                verifyResult.status_verdict === 'VERIFIED'
                  ? 'bg-gradient-to-br from-emerald-950/60 to-slate-950 border-emerald-500/60 text-emerald-100'
                  : verifyResult.status_verdict === 'EXPIRED'
                  ? 'bg-gradient-to-br from-amber-950/60 to-slate-950 border-amber-500/60 text-amber-100'
                  : 'bg-gradient-to-br from-rose-950/60 to-slate-950 border-rose-500/60 text-rose-100'
              }`}>
                {/* Status Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
                      {verifyResult.status_verdict === 'VERIFIED' ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      ) : verifyResult.status_verdict === 'REENTRY_FRAUD' ? (
                        <AlertOctagon className="w-7 h-7 text-rose-400 animate-bounce" />
                      ) : (
                        <AlertTriangle className="w-7 h-7 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                        VERIFICATION RESULT
                      </span>
                      <h3 className="text-2xl font-black text-white tracking-wide">
                        {verifyResult.status_verdict === 'VERIFIED' ? 'MEDICINE VERIFIED' : verifyResult.title}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 uppercase block">Risk Score</span>
                    <span className={`text-xl font-black ${
                      verifyResult.risk_score >= 80 ? 'text-rose-400' : verifyResult.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {verifyResult.risk_score}/100
                    </span>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      {verifyResult.severity}
                    </span>
                  </div>
                </div>

                {/* Medicine Title */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Product / Medicine Name
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-1">
                    {displayMedicine}
                  </h2>
                </div>

                {/* Structured Verification Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Manufacturer:</span>
                    <span className="text-sm font-bold text-white block">
                      {displayMfr}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Batch:</span>
                    <span className="text-sm font-bold text-emerald-400 block">
                      {displayBatch}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Serial:</span>
                    <span className="text-sm font-bold text-slate-200 block truncate" title={displaySerial}>
                      {displaySerial}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Manufactured:</span>
                    <span className="text-sm font-bold text-white block">
                      {displayMfg}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Expiry:</span>
                    <span className="text-sm font-bold text-white block">
                      {displayExp}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Quantity:</span>
                    <span className="text-sm font-bold text-white block">
                      {displayQty}
                    </span>
                  </div>
                </div>

                {/* Expiry Status & Dynamic Calculation Highlight */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isExpiredFinal
                    ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                    : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Expiry Status:</span>
                    <span className="text-base font-extrabold tracking-tight block mt-0.5">
                      {displayExpiryStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">
                      {isExpiredFinal ? 'Days Expired:' : 'Days Remaining:'}
                    </span>
                    <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white">
                      {verifyResult.days_remaining !== undefined
                        ? `${verifyResult.days_remaining} days`
                        : clientExpiryCalc.label}
                    </span>
                  </div>
                </div>

                {/* Compliance Message & Recommendation */}
                <div className="space-y-2 pt-1">
                  <p className="text-sm font-semibold text-slate-200">{verifyResult.message}</p>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                      Recommended Action:
                    </span>
                    <span className="font-bold text-white">{verifyResult.recommendation}</span>
                  </div>
                </div>
              </div>

              {/* Authoritative Ledger Cross-Check Table */}
              {verifyResult.comparison && verifyResult.comparison.length > 0 && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden glass-panel">
                  <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Package QR / OCR vs Trusted Manufacturer Ledger
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Authoritative Ledger</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-3">Attribute</th>
                          <th className="px-6 py-3">Detected on Package</th>
                          <th className="px-6 py-3">Manufacturer Database</th>
                          <th className="px-6 py-3 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {verifyResult.comparison.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-800/40 transition">
                            <td className="px-6 py-3.5 font-semibold text-white">{c.field}</td>
                            <td className="px-6 py-3.5 font-mono">{c.detected}</td>
                            <td className="px-6 py-3.5 font-mono text-slate-300">{c.registered}</td>
                            <td className="px-6 py-3.5 text-right font-mono font-bold">
                              {c.match ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400">
                                  <Check className="w-3.5 h-3.5" /> MATCH
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400">
                                  <X className="w-3.5 h-3.5" /> MISMATCH
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reverse Chain Direct Link if Expired */}
              {verifyResult.status_verdict === 'EXPIRED' && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold block">Reverse Supply Chain Required</span>
                    <span className="text-[11px] text-slate-400">
                      Product must be isolated in quarantine and returned to distributor.
                    </span>
                  </div>
                  <Link
                    to="/retailer"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 transition"
                  >
                    Initiate Return Request
                  </Link>
                </div>
              )}

              {/* Regulator Feed Alert Confirmation if Fraud */}
              {(verifyResult.status_verdict === 'REENTRY_FRAUD' || verifyResult.status_verdict === 'LABEL_TAMPERING') && (
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold block">🚨 Compliance Incident Created</span>
                    <span className="text-[11px] text-slate-400">
                      Regulator Gateway, Manufacturer QA, and Retailer security teams alerted.
                    </span>
                  </div>
                  <Link
                    to="/regulator"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition"
                  >
                    View Regulator Feed
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Standby State */
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3 glass-panel">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                <Layers className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Awaiting Medicine QR Verification</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload a package QR photo on the left or select a demo medicine above, then click &quot;Verify Medicine Before Sale&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
