import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Check, Copy } from 'lucide-react';

interface QRCodeCardProps {
  productId: string;
  medicineName?: string;
  batchId?: string;
  manufacturer?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  quantity?: string | number;
  qrPayload?: string;
  size?: number;
  showDownload?: boolean;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  productId,
  medicineName,
  batchId,
  manufacturer,
  manufacturingDate,
  expiryDate,
  quantity,
  qrPayload,
  size = 180,
  showDownload = true
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Compute structured QR payload containing complete package metadata
  const getEncodedPayload = (): string => {
    if (qrPayload && qrPayload.trim().startsWith('{') && qrPayload.includes('expiry_date')) {
      return qrPayload;
    }

    const payloadObj = {
      product_name: medicineName || 'Medicine',
      manufacturer: manufacturer || 'BharatCure Pharma',
      batch_number: batchId || 'BATCH',
      serial_number: productId,
      manufacturing_date: manufacturingDate
        ? new Date(manufacturingDate).toISOString().split('T')[0]
        : '2025-08-06',
      expiry_date: expiryDate
        ? new Date(expiryDate).toISOString().split('T')[0]
        : '2026-08-29',
      quantity: quantity
        ? typeof quantity === 'number'
          ? `${quantity} strips`
          : quantity
        : '100 strips'
    };

    return JSON.stringify(payloadObj);
  };

  const payloadString = getEncodedPayload();

  useEffect(() => {
    if (!payloadString) return;
    QRCode.toDataURL(payloadString, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url: string) => setDataUrl(url))
      .catch((err: unknown) => console.error('QR generation error:', err));
  }, [payloadString, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col items-center bg-white border border-navy-200 rounded-2xl p-5 shadow-sm">
      {/* QR frame */}
      <div className="p-3 bg-navy-50 rounded-xl border border-navy-100 flex items-center justify-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR for ${productId}`}
            className="rounded-lg shadow-2xs"
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

      {/* Product & Package Details */}
      <div className="mt-4 text-center space-y-1.5 w-full">
        {medicineName && (
          <h4 className="text-sm font-bold text-navy-900 leading-tight">
            {medicineName}
          </h4>
        )}

        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-xs font-bold text-clinical-700 bg-clinical-50 px-2.5 py-0.5 rounded-md border border-clinical-200">
            {productId}
          </span>
          <button
            onClick={handleCopy}
            title="Copy QR Payload JSON"
            className="p-1 text-navy-500 hover:text-navy-900 transition rounded hover:bg-navy-100"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 2-column key metadata card */}
        <div className="mt-2 pt-2 border-t border-navy-100 grid grid-cols-2 gap-x-2 gap-y-1 text-left text-[11px]">
          <div>
            <span className="text-navy-400 block text-[10px] uppercase font-mono">Manufacturer</span>
            <span className="font-semibold text-navy-800 truncate block">
              {manufacturer || 'BharatCure Pharma'}
            </span>
          </div>

          <div>
            <span className="text-navy-400 block text-[10px] uppercase font-mono">Batch</span>
            <span className="font-mono font-bold text-navy-800 truncate block">
              {batchId || 'N/A'}
            </span>
          </div>

          {manufacturingDate && (
            <div>
              <span className="text-navy-400 block text-[10px] uppercase font-mono">Manufactured</span>
              <span className="font-mono text-navy-700 block">
                {formatDate(manufacturingDate)}
              </span>
            </div>
          )}

          {expiryDate && (
            <div>
              <span className="text-navy-400 block text-[10px] uppercase font-mono">Expiry</span>
              <span className="font-mono font-bold text-amber-700 block">
                {formatDate(expiryDate)}
              </span>
            </div>
          )}

          {quantity && (
            <div className="col-span-2 pt-0.5">
              <span className="text-navy-400 text-[10px] uppercase font-mono mr-1">Quantity:</span>
              <span className="font-mono font-semibold text-navy-800">
                {typeof quantity === 'number' ? `${quantity} strips` : quantity}
              </span>
            </div>
          )}
        </div>
      </div>

      {showDownload && dataUrl && (
        <a
          href={dataUrl}
          download={`${productId}_QR.png`}
          className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-clinical-600 hover:bg-clinical-700 text-white font-semibold text-xs transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download QR</span>
        </a>
      )}
    </div>
  );
};
