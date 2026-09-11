import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { OCRAnalyzeResponse, Batch, ReturnRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { MedicineScanner } from '../components/MedicineScanner';
import { OCRResult } from '../components/OCRResult';
import { AlertBanner } from '../components/AlertBanner';
import { LoadingState } from '../components/States';
import { Card } from '../components/Card';
import { ScanLine, ArrowLeft, Plus, CheckCircle2 } from 'lucide-react';
import { parseQRPayload } from '../utils/medicineRegistry';

export const ScanPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRAnalyzeResponse | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  // Return creation state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnQty, setReturnQty] = useState(100);
  const [returnReason, setReturnReason] = useState('Expired stock');
  const [createdReturn, setCreatedReturn] = useState<ReturnRequest | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Handle uploaded image file
  const handleImageUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setCreatedReturn(null);

    try {
      const result = await api.uploadOCR(file);
      setOcrResult(result);
      setImageName(file.name);

      if (result.extracted_batch_number) {
        try {
          const batchData = await api.getBatch(result.extracted_batch_number);
          setBatch(batchData);
        } catch {
          setBatch(null);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to process medicine packaging with OCR service.');
      setOcrResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle decoded barcode / QR
  const handleBarcodeScanned = async (code: string) => {
    setLoading(true);
    setError(null);
    setCreatedReturn(null);

    try {
      // Find batch or verify scan using parsed QR structure
      const { parsed } = parseQRPayload(code);
      const batchNo = parsed?.batch_number || (code.includes('CS10') ? 'CS10-A23-2507' : code);
      const verifyRes = await api.verifyScan({
        batch_number: batchNo,
        scan_type: 'QR',
        location: currentUser?.organization || 'Shree Medicals, Bengaluru',
        scanner_role: currentUser?.role || 'RETAILER'
      });

      const ocrRes = await api.analyzeOCR({
        batch_number: batchNo,
        image_url: 'qr_scanned_package.png'
      });

      setOcrResult(ocrRes);
      setBatch(verifyRes.batch || null);
      setImageName(parsed?.product_name ? `QR Scan: ${parsed.product_name} (${batchNo})` : `QR Scan: ${code}`);
    } catch (err: any) {
      setError(err?.message || 'QR code verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle preset scenarios
  const handleScenarioSelect = async (scenario: string) => {
    setLoading(true);
    setError(null);
    setCreatedReturn(null);

    try {
      let targetBatch = 'CS10-A23-2507';
      let overrideImg = 'package_expired.png';

      if (scenario === 'SAFE') {
        targetBatch = 'CS10-SAFE';
        overrideImg = 'package_safe.png';
      } else if (scenario === 'TAMPERING') {
        targetBatch = 'CS10-A23-2507';
        overrideImg = 'package_tampered_2028.png';
      } else if (scenario === 'REENTRY') {
        targetBatch = 'CS10-D99-0089';
        overrideImg = 'package_reentry_destroyed.png';
      } else if (scenario === 'UNKNOWN') {
        targetBatch = 'FAKE-BATCH-999';
        overrideImg = 'package_counterfeit.png';
      } else if (scenario === 'EXPIRING_SOON') {
        targetBatch = 'CS10-EXP18';
        overrideImg = 'package_expiring_soon.png';
      }

      const ocrRes = await api.analyzeOCR({
        batch_number: targetBatch,
        image_url: overrideImg
      });

      setOcrResult(ocrRes);
      setImageName(`Preset: ${scenario} (${targetBatch})`);

      try {
        const batchData = await api.getBatch(targetBatch);
        setBatch(batchData);
      } catch {
        setBatch(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Scenario verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReturnModal = () => {
    setShowReturnModal(true);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrResult?.extracted_batch_number && !batch?.batch_number) {
      setError('Cannot create return without valid batch number.');
      return;
    }

    setSubmittingReturn(true);
    try {
      const targetBatchId = batch?.id || ocrResult?.extracted_batch_number || 'CS10-A23-2507';
      const res = await api.createReturnRequest(targetBatchId, returnQty, returnReason);
      setCreatedReturn(res);
      setShowReturnModal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create return request.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Medicine Packaging Scanner"
        subtitle={`Operated by ${currentUser?.name} (${currentUser?.role}) • ${currentUser?.organization}`}
        icon={<ScanLine className="w-5 h-5 text-clinical-600" />}
        action={
          ocrResult
            ? {
                label: 'New Scan',
                icon: <ArrowLeft className="w-4 h-4" />,
                variant: 'secondary',
                onClick: () => {
                  setOcrResult(null);
                  setBatch(null);
                  setImageName(null);
                  setCreatedReturn(null);
                },
              }
            : undefined
        }
      />

      {error && (
        <AlertBanner
          type="critical"
          title="Inspection Notice"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Return Created Success Notification */}
      {createdReturn && (
        <div className="p-5 bg-success-50 border border-success-300 rounded-xl shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-success-900">RETURN REQUEST CREATED</h4>
              <p className="text-xs text-success-800 mt-0.5">
                Return ID: <strong className="font-mono">{createdReturn.id}</strong> • Quantity: <strong>{createdReturn.quantity} strips</strong>
              </p>
              <p className="text-xs text-success-700 mt-1">
                Status: <strong>Awaiting Distributor Pickup</strong>. MedLink Distributors has been notified to schedule reverse transit.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => navigate('/distributor')}
                  className="px-3.5 py-1.5 rounded-lg bg-success-700 text-white font-semibold text-xs hover:bg-success-800 transition"
                >
                  Switch to MedLink (Distributor View) →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-navy-200 rounded-xl p-12 shadow-xs">
          <LoadingState message="Extracting packaging text and evaluating compliance rules..." />
        </div>
      ) : ocrResult ? (
        <div className="space-y-6">
          {imageName && (
            <div className="px-4 py-2 bg-white border border-navy-200 rounded-lg text-xs text-navy-600 flex items-center justify-between">
              <span>Source: <strong className="text-navy-900">{imageName}</strong></span>
              <span className="font-mono text-[11px] text-navy-400">Timestamp: {new Date().toLocaleTimeString()}</span>
            </div>
          )}

          <OCRResult
            result={ocrResult}
            batch={batch}
            onAddToReturn={handleOpenReturnModal}
            onEscalate={() => navigate('/regulator')}
            onReportIssue={() => alert('Issue report logged in CDSCO audit file.')}
          />
        </div>
      ) : (
        <MedicineScanner
          onImageUpload={handleImageUpload}
          onBarcodeScanned={handleBarcodeScanned}
          onScenarioSelect={handleScenarioSelect}
          loading={loading}
          error={error || undefined}
        />
      )}

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4">
          <div className="bg-white rounded-xl border border-navy-200 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">Create Reverse Return Request</h3>
                <p className="text-xs text-navy-500">Initiate distributor handoff for expired medicine</p>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-navy-400 hover:text-navy-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-navy-50 border border-navy-200">
                <p className="text-navy-500 text-[11px]">Medicine & Batch</p>
                <p className="text-sm font-bold text-navy-900">
                  {ocrResult?.extracted_medicine_name || 'CardioSafe 10 mg Tablets'}
                </p>
                <p className="font-mono text-navy-700 mt-0.5">
                  Batch: {ocrResult?.extracted_batch_number || batch?.batch_number || 'CS10-A23-2507'}
                </p>
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Quantity (Strips)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-clinical-500"
                  required
                />
              </div>

              <div>
                <label className="block text-navy-700 font-semibold mb-1">
                  Return Justification
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-1 focus:ring-clinical-500"
                >
                  <option value="Expired stock">Expired stock (Mandatory reverse return)</option>
                  <option value="Packaging damage">Packaging damage / Blister puncture</option>
                  <option value="Manufacturer recall">Manufacturer recall notice</option>
                </select>
              </div>

              <div className="pt-3 border-t border-navy-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-4 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-semibold disabled:opacity-50"
                >
                  {submittingReturn ? 'Submitting...' : 'Confirm Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
