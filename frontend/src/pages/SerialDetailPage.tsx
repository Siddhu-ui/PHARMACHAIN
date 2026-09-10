import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { SerialDetailResponse } from '../types';
import {
  ShieldAlert, ShieldCheck, ArrowLeft, QrCode, Download, Clock,
  Factory, Truck, Store, Flame, AlertOctagon, CheckCircle2,
  Calendar, MapPin, Package, ArrowRight, UserCheck, RefreshCw
} from 'lucide-react';

export const SerialDetailPage: React.FC = () => {
  const { serialCode } = useParams<{ serialCode: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<SerialDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!serialCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSerialDetail(serialCode);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load serialized product information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [serialCode]);

  const handleDownloadQR = () => {
    if (!data?.unit?.qr_payload) return;
    const blob = new Blob([data.unit.qr_payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.unit.serial_code}_qr_payload.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400 font-mono">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Traceability Query: Inquiring authoritative blockchain ledger for {serialCode}...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
          <AlertOctagon className="w-8 h-8 mx-auto text-rose-400 mb-2" />
          <h2 className="text-lg font-bold">Trace Lookup Error</h2>
          <p className="text-xs mt-1">{error || 'Serial code not found in registered manufacturer database.'}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const unit = data.unit;
  const custody_transfers = (data as any).custody_transfers || (data as any).transfers || [];
  const alerts = data.alerts || [];
  const scans = (data as any).scans || (data as any).verification_history || [];
  const return_info = (data as any).return_info || null;
  const destruction_info = (data as any).destruction_info || (data as any).destruction_record || null;
  const isExpired = unit.expiry_status === 'EXPIRED';
  const isExpiringSoon = unit.expiry_status === 'EXPIRING_SOON';
  const isClosed = unit.product_status === 'CLOSED' || unit.product_status === 'DESTRUCTION_VERIFIED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-xs font-mono text-slate-500">
          SERIAL CODE LEDGER TRACE
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                SERIALIZED PRODUCT UNIT
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase ${
                unit.product_status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isClosed
                  ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                STATUS: {unit.product_status}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase ${
                isExpired
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : isExpiringSoon
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              }`}>
                EXPIRY: {unit.expiry_status}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono text-emerald-300">
              {unit.serial_code}
            </h1>
            <p className="text-base text-slate-300 font-semibold mt-1">
              {unit.medicine_name} &bull; <span className="text-cyan-400">{unit.dosage_strength || '500mg'}</span>
            </p>
          </div>

          {/* QR Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadQR}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download QR JSON</span>
            </button>
            <Link
              to="/retailer/verify"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Verify In Scanner</span>
            </Link>
          </div>
        </div>

        {/* Core Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">Batch Number</span>
            <span className="text-white font-bold">{unit.batch_number}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Manufacturer</span>
            <span className="text-white font-bold">{unit.manufacturer_name || 'ABC Pharma'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Manufacturing Date</span>
            <span className="text-slate-200">{unit.manufacturing_date?.slice(0, 10)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Expiry Date</span>
            <span className={`font-bold ${isExpired ? 'text-rose-400' : 'text-slate-200'}`}>
              {unit.expiry_date?.slice(0, 10)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Holder</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {unit.current_holder_type} ({unit.current_holder_name || 'Warehouse'})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Location</span>
            <span className="text-slate-200 truncate block">{unit.current_location || 'Storage'}</span>
          </div>
        </div>
      </div>

      {/* Chain of Custody & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Chain of Custody (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Authoritative Chain-of-Custody History</span>
              <span className="text-xs font-mono text-slate-500 font-normal">
                ({custody_transfers.length} Recorded Transfers)
              </span>
            </h2>

            <div className="space-y-4">
              {custody_transfers.map((tx: any, idx: number) => (
                <div
                  key={tx.id || idx}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
                      {tx.transfer_type === 'MANUFACTURED' ? <Factory className="w-4 h-4" /> :
                       tx.transfer_type === 'DISPATCH' ? <Truck className="w-4 h-4" /> :
                       tx.transfer_type === 'DELIVERY' ? <Store className="w-4 h-4" /> :
                       tx.transfer_type === 'RETURN_PICKUP' ? <Truck className="w-4 h-4 text-amber-400" /> :
                       <Package className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-white uppercase tracking-wide">
                        {tx.transfer_type} &bull; <span className="text-slate-400 font-mono text-[11px]">{tx.status}</span>
                      </div>
                      <div className="text-slate-300 mt-0.5">
                        <span className="text-slate-400 font-mono">{tx.from_party_type}</span> ({tx.from_party_name || 'Origin'})
                        <ArrowRight className="w-3 h-3 inline mx-1.5 text-slate-500" />
                        <span className="text-slate-400 font-mono">{tx.to_party_type}</span> ({tx.to_party_name || 'Destination'})
                      </div>
                      {tx.notes && <p className="text-[11px] text-slate-500 mt-1 italic">{tx.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[11px] text-slate-500">
                    {new Date(tx.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Scans History */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-cyan-400" />
              <span>Retail Verification Scans</span>
            </h2>

            {scans.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">
                No retail scans recorded yet. Product is awaiting verification before sale.
              </div>
            ) : (
              <div className="space-y-3">
                {scans.map((s: any, idx: number) => (
                  <div
                    key={s.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          s.verification_result === 'VERIFIED' ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                        <span>{s.verification_result}</span>
                        <span className="text-slate-400 text-[11px]">Location: {s.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        s.risk_score < 30 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        Risk: {s.risk_score}/100
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QR Preview + Return/Destruction status (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* QR Code Payload Card */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Structured QR Payload
              </span>
              <QrCode className="w-4 h-4 text-emerald-400" />
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {data.unit.qr_payload ? JSON.stringify(JSON.parse(data.unit.qr_payload), null, 2) : 'No QR payload'}
            </pre>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              <strong>Security Invariant:</strong> The physical QR payload is validated against the authoritative manufacturer database during retail scan.
            </div>
          </div>

          {/* Reverse Chain Status: Return / Destruction */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3">
              Reverse Chain Status
            </h3>

            {return_info ? (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs space-y-1">
                <div className="font-bold text-amber-300 uppercase">Return Active</div>
                <div className="text-slate-300">Status: {return_info.status}</div>
                <div className="text-slate-400 text-[11px]">Reason: {return_info.reason}</div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">No return initiated for this serial.</div>
            )}

            {destruction_info ? (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs space-y-1">
                <div className="font-bold text-slate-200 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" /> Destruction Record
                </div>
                <div className="text-slate-300">Facility: {destruction_info.facility_name}</div>
                <div className="text-slate-400 font-mono text-[11px]">Cert: {destruction_info.certificate_number}</div>
                <div className="text-slate-400 text-[11px]">Status: {destruction_info.status}</div>
              </div>
            ) : null}
          </div>

          {/* Associated Alerts */}
          {alerts && alerts.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-rose-500/30 backdrop-blur-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Active Alerts ({alerts.length})
              </h3>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
                    <div className="font-bold">{a.message}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">Recipient: {a.recipient_role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
