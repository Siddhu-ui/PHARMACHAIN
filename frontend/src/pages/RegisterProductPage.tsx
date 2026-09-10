import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { QRCodeCard } from '../components/QRCodeCard';
import {
  Factory, QrCode, CheckCircle2, AlertTriangle, ArrowRight,
  Sparkles, Package, ShieldCheck, Download, Plus, Store,
  Calendar, Layers, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const RegisterProductPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [medicineName, setMedicineName] = useState('Paracetamol 500mg');
  const [strength, setStrength] = useState('500mg');
  const [batchId, setBatchId] = useState('PCM-BATCH-001');
  const [mfgDate, setMfgDate] = useState('2024-08-15');
  const [expDate, setExpDate] = useState('2026-08-15');
  const [manufacturer, setManufacturer] = useState('ABC Pharma');
  const [assignedRetailer, setAssignedRetailer] = useState('Pharmacy A');
  const [quantity, setQuantity] = useState(100);

  // Auto-calculated deterministic Product ID preview
  const [productIdPreview, setProductIdPreview] = useState('PG-PCM-2026-000123');

  // Submitting / Result
  const [submitting, setSubmitting] = useState(false);
  const [registeredProduct, setRegisteredProduct] = useState<Product | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute live deterministic Product ID preview
  useEffect(() => {
    const medUpper = medicineName.toUpperCase();
    let code = 'MED';
    if (medUpper.includes('PARACETAMOL')) code = 'PCM';
    else if (medUpper.includes('AMOXICILLIN')) code = 'AMX';
    else if (medUpper.includes('AZITHROMYCIN')) code = 'AZI';
    else if (medUpper.includes('METFORMIN')) code = 'MET';
    else if (medUpper.includes('PANTOPRAZOLE')) code = 'PAN';
    else {
      const clean = medUpper.replace(/[^A-Z]/g, '');
      code = clean.length >= 3 ? clean.substring(0, 3) : 'MED';
    }

    const year = expDate ? new Date(expDate).getFullYear() || 2026 : 2026;
    setProductIdPreview(`PG-${code}-${year}-000123`);
  }, [medicineName, expDate]);

  const handleQuickFillParacetamol = () => {
    setMedicineName('Paracetamol 500mg');
    setStrength('500mg');
    setBatchId('PCM-BATCH-001');
    setMfgDate('2024-08-15');
    setExpDate('2026-08-15');
    setManufacturer('ABC Pharma');
    setAssignedRetailer('Pharmacy A');
    setQuantity(100);
    setErrorMsg(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.registerProduct({
        medicine_name: medicineName.trim(),
        strength: strength.trim(),
        batch_id: batchId.trim(),
        manufacturing_date: new Date(mfgDate).toISOString(),
        expiry_date: new Date(expDate).toISOString(),
        manufacturer: manufacturer.trim(),
        assigned_retailer: assignedRetailer.trim(),
        quantity: Number(quantity),
        product_id: productIdPreview
      });

      setRegisteredProduct(res);
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header Breadcrumb & Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            <Factory className="w-3.5 h-3.5" /> Manufacturer Portal &bull; Product Registration
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Register Medicine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate unique deterministic Product IDs and tamper-resistant package QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/manufacturer/products"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
          >
            <Package className="w-3.5 h-3.5 text-indigo-400" />
            <span>Registered Products</span>
          </Link>
          <button
            type="button"
            onClick={handleQuickFillParacetamol}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-900/40 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fill Demo Product</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Registration View */}
      {registeredProduct ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/40 glass-panel shadow-2xl space-y-6">
          <div className="flex items-center gap-3 text-emerald-400 pb-4 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Product Successfully Registered!</h2>
              <p className="text-xs text-slate-400">
                Authoritative record sealed into PharmaGuard compliance ledger.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left: Product Details */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Medicine Name</span>
                  <span className="font-bold text-white text-sm">{registeredProduct.medicine}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Batch Number</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">{registeredProduct.batch_id}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Strength / Dosage</span>
                  <span className="font-semibold text-slate-200">{registeredProduct.dosage || '500mg'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Retailer</span>
                  <span className="font-semibold text-indigo-300">{registeredProduct.assigned_retailer || 'Pharmacy A'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Manufacturing Date</span>
                  <span className="font-mono text-slate-300">
                    {new Date(registeredProduct.manufacturing_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Expiry Date</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {new Date(registeredProduct.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-blue-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tamper-Resistant Identifier Principle</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  The generated QR contains <strong>ONLY</strong> the unique Product ID ({registeredProduct.product_id}). Medicine attributes remain securely stored in the trusted manufacturer database.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/manufacturer/products"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                >
                  <Package className="w-4 h-4" />
                  <span>View Registered Products Table</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setRegisteredProduct(null)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Another Medicine</span>
                </button>
              </div>
            </div>

            {/* Right: Generated QR Code Card */}
            <div className="flex flex-col items-center">
              <QRCodeCard
                productId={registeredProduct.product_id}
                medicineName={registeredProduct.medicine}
                batchId={registeredProduct.batch_id}
                size={180}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleRegister} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 glass-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            {/* Medicine Name */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Medicine Name *
              </label>
              <input
                type="text"
                required
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                placeholder="e.g. Paracetamol 500mg"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm outline-none transition"
              />
            </div>

            {/* Strength / Dosage */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Strength / Dosage
              </label>
              <input
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 500mg"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm outline-none transition"
              />
            </div>

            {/* Batch ID */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Batch ID *
              </label>
              <input
                type="text"
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                placeholder="e.g. PCM-BATCH-001"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-sm outline-none transition"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Quantity (Strips)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-sm outline-none transition"
              />
            </div>

            {/* Manufacturing Date */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Manufacturing Date *</span>
              </label>
              <input
                type="date"
                required
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm outline-none transition"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Expiry Date *</span>
              </label>
              <input
                type="date"
                required
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm outline-none transition"
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-slate-400" />
                <span>Manufacturer</span>
              </label>
              <input
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. ABC Pharma"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm outline-none transition"
              />
            </div>

            {/* Assigned Retailer */}
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-400" />
                <span>Assign Retailer</span>
              </label>
              <select
                value={assignedRetailer}
                onChange={(e) => setAssignedRetailer(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm outline-none transition"
              >
                <option value="Pharmacy A">Pharmacy A</option>
                <option value="Apollo Pharmacy - Indiranagar">Apollo Pharmacy - Indiranagar</option>
                <option value="MedPlus Pharmacy - Koramangala">MedPlus Pharmacy - Koramangala</option>
                <option value="CareWell Pharmacy - Bandra">CareWell Pharmacy - Bandra</option>
              </select>
            </div>
          </div>

          {/* Auto-Generated Deterministic Product ID Preview (Read-Only) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                Deterministic Product ID (Auto-Generated)
              </span>
              <span className="text-base font-extrabold font-mono text-emerald-400">
                {productIdPreview}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Format: PG-&#123;MEDICINE&#125;-&#123;YEAR&#125;-&#123;SEQUENCE&#125; (User manual input prohibited)
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
              AUTO UNIQUE ID
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              to="/manufacturer"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
            >
              {submitting ? (
                <span>Registering & Generating QR...</span>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Generate Product & QR</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
