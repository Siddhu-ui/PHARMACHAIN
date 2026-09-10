import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Truck, Store, Package, CheckCircle2, Clock, RefreshCw, ArrowRight } from 'lucide-react';

export const DistributorPickupsPage: React.FC = () => {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPickups = async () => {
    setLoading(true);
    try {
      const data = await api.getDistributorPickups();
      setPickups(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPickups();
  }, []);

  const handleConfirmPickup = async (reqId: string, qty: number) => {
    setActingId(reqId);
    setMessage(null);
    try {
      await api.confirmPickup({
        return_request_id: reqId,
        expected_quantity: qty,
        actual_quantity: qty,
        actual_weight: qty * 0.05
      });
      setMessage(`Pickup confirmed! Units transferred from Retailer to Distributor logistics custody.`);
      loadPickups();
    } catch (err: any) {
      setMessage(`Pickup error: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Distributor Logistics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Reverse Logistics & Return Pickups</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Expired and recalled stock scheduled for collection and forwarding to manufacturer quarantine.
          </p>
        </div>

        <button
          onClick={loadPickups}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="space-y-4">
        {pickups.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 font-mono text-xs">
            {loading ? 'Checking reverse chain pickup requests...' : 'No pending return pickups from pharmacies.'}
          </div>
        ) : (
          pickups.map((p) => (
            <div
              key={p.id}
              className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                  <Truck className="w-6 h-6" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                      {p.status}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Requested: {p.created_at}</span>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {p.medicine_name} &bull; <span className="text-slate-400 font-mono text-xs">Batch: {p.batch_number}</span>
                  </h3>

                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-emerald-400">
                      <Store className="w-3.5 h-3.5" /> {p.retailer_name}
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="font-mono text-white font-bold">{p.quantity} Units</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-rose-400 font-bold uppercase">{p.reason}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  onClick={() => handleConfirmPickup(p.id, p.quantity)}
                  disabled={actingId === p.id}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>{actingId === p.id ? 'Processing...' : 'Confirm Pickup'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
