import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode, Check } from 'lucide-react';

interface QRCodeCardProps {
  productId: string;
  medicineName?: string;
  batchId?: string;
  size?: number;
  showDownload?: boolean;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  productId,
  medicineName,
  batchId,
  size = 180,
  showDownload = true
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!productId) return;
    QRCode.toDataURL(productId, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url: string) => setDataUrl(url))
      .catch((err: unknown) => console.error('QR generation error:', err));
  }, [productId, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(productId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center bg-white border border-navy-200 rounded-xl p-5 shadow-sm">
      {/* White badge frame for QR scanning contrast */}
      <div className="p-3 bg-navy-50 rounded-lg border border-navy-100 flex items-center justify-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR for ${productId}`}
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

      {/* Product ID Label & Info */}
      <div className="mt-4 text-center space-y-1 w-full">
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-xs font-bold text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
            {productId}
          </span>
          <button
            onClick={handleCopy}
            title="Copy Product ID"
            className="p-1 text-navy-500 hover:text-navy-900 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success-600" /> : <QrCode className="w-3.5 h-3.5" />}
          </button>
        </div>

        {medicineName && (
          <p className="text-xs font-semibold text-navy-800">{medicineName}</p>
        )}
        {batchId && (
          <p className="text-[11px] font-mono text-navy-500">Batch: {batchId}</p>
        )}
      </div>

      {showDownload && dataUrl && (
        <a
          href={dataUrl}
          download={`${productId}_QR.png`}
          className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-medium text-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download QR</span>
        </a>
      )}
    </div>
  );
};
