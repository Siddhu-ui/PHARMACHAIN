import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode, Check, Calendar, Layers, Building2 } from 'lucide-react';
import { generateCanonicalQRPayload, formatClinicalDate, parseQRPayload } from '../utils/medicineRegistry';
import { calculateExpiryDays } from '../utils/dateUtils';

interface QRCodeCardProps {
  productId: string;
  medicineName?: string;
  batchId?: string;
  manufacturer?: string;
  mfgDate?: string;
  expDate?: string;
  quantity?: number;
  packSize?: string;
  qrPayload?: string;
  size?: number;
  showDownload?: boolean;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  productId,
  medicineName,
  batchId,
  manufacturer,
  mfgDate,
  expDate,
  quantity,
  packSize,
  qrPayload,
  size = 200,
  showDownload = true
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Generate canonical JSON payload containing all attributes
  const encodedPayload = qrPayload && qrPayload.trim().startsWith('{')
    ? qrPayload
    : generateCanonicalQRPayload({
        product_id: productId,
        product_name: medicineName,
        batch_number: batchId,
        manufacturer: manufacturer || 'BharatCure Pharma',
        manufacturing_date: mfgDate,
        expiry_date: expDate,
        quantity: quantity,
        pack_size: packSize
      });

  const parsedInfo = parseQRPayload(encodedPayload).parsed;
  const expiryEval = calculateExpiryDays(parsedInfo?.expiry_date || expDate || '');

  useEffect(() => {
    if (!encodedPayload) return;
    QRCode.toDataURL(encodedPayload, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url: string) => setDataUrl(url))
      .catch((err: unknown) => console.error('QR generation error:', err));
  }, [encodedPayload, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(encodedPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center bg-white border border-navy-200 rounded-2xl p-5 shadow-sm w-full max-w-sm">
      {/* White badge frame for QR scanning contrast */}
      <div className="p-3 bg-navy-50 rounded-xl border border-navy-100 flex items-center justify-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR for ${parsedInfo?.product_name || productId}`}
            className="rounded"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-navy-100 text-navy-500 font-mono text-xs"
          >
            Generating QR...
          </div>
        )}
      </div>

      {/* Product & Encoded Attribute Metadata */}
      <div className="mt-4 text-center space-y-2 w-full">
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-xs font-bold text-clinical-700 bg-clinical-50 px-2.5 py-0.5 rounded border border-clinical-200">
            {parsedInfo?.product_id || productId}
          </span>
          <button
            onClick={handleCopy}
            title="Copy Encoded QR Payload"
            className="p-1 text-navy-500 hover:text-navy-900 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success-600" /> : <QrCode className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div>
          <p className="text-sm font-bold text-navy-900">{parsedInfo?.product_name || medicineName || 'Medicine'}</p>
          <p className="text-xs text-navy-500 font-medium">{parsedInfo?.manufacturer || manufacturer || 'BharatCure Pharma'}</p>
        </div>

        {/* Encoded Fields Summary */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 text-left bg-navy-50/70 p-2.5 rounded-lg border border-navy-100">
          <div>
            <span className="text-navy-400 block text-[10px] uppercase font-mono">Batch</span>
            <span className="font-mono font-semibold text-navy-800">{parsedInfo?.batch_number || batchId}</span>
          </div>
          <div>
            <span className="text-navy-400 block text-[10px] uppercase font-mono">Quantity</span>
            <span className="font-medium text-navy-800">{parsedInfo?.quantity ? `${parsedInfo.quantity} strips` : (parsedInfo?.pack_size || '100 strips')}</span>
          </div>
          <div>
            <span className="text-navy-400 block text-[10px] uppercase font-mono">MFG Date</span>
            <span className="font-medium text-navy-800">{formatClinicalDate(parsedInfo?.manufacturing_date || mfgDate)}</span>
          </div>
          <div>
            <span className="text-navy-400 block text-[10px] uppercase font-mono">EXP Date</span>
            <span className={`font-medium ${expiryEval.isExpired ? 'text-danger-600 font-bold' : 'text-navy-800'}`}>
              {formatClinicalDate(parsedInfo?.expiry_date || expDate)}
            </span>
          </div>
        </div>

        {/* Dynamic Expiry Tag */}
        <div className="pt-0.5">
          <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
            expiryEval.isExpired ? 'bg-danger-50 text-danger-700 border border-danger-200' : 'bg-success-50 text-success-700 border border-success-200'
          }`}>
            {expiryEval.text}
          </span>
        </div>
      </div>

      {showDownload && dataUrl && (
        <a
          href={dataUrl}
          download={`${parsedInfo?.product_id || productId}_QR.png`}
          className="mt-4 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-semibold text-xs transition w-full justify-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Package QR</span>
        </a>
      )}
    </div>
  );
};
