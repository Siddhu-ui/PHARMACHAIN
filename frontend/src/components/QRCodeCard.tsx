import React, { useEffect, useState, useRef } from 'react';
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
  size = 200,
  showDownload = true
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [productId, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(productId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* White badge frame for maximum QR scanning contrast */}
      <div className="p-3 bg-white rounded-xl shadow-md flex items-center justify-center">
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
            className="flex items-center justify-center bg-slate-100 text-slate-400 font-mono text-xs"
          >
            Generating QR...
          </div>
        )}
      </div>

      {/* Product ID Label & Info */}
      <div className="mt-4 text-center space-y-1 w-full">
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-sm font-extrabold text-emerald-400 tracking-wider">
            {productId}
          </span>
          <button
            onClick={handleCopy}
            title="Copy Product ID"
            className="p-1 text-slate-400 hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <QrCode className="w-3.5 h-3.5" />}
          </button>
        </div>

        {medicineName && (
          <p className="text-xs font-semibold text-slate-300">{medicineName}</p>
        )}
        {batchId && (
          <p className="text-[11px] font-mono text-slate-400">Batch: {batchId}</p>
        )}

        <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
          QR Payload: <span className="text-amber-300">"{productId}"</span> (Identifier only)
        </div>
      </div>

      {showDownload && dataUrl && (
        <a
          href={dataUrl}
          download={`${productId}_QR.png`}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" />
          <span>Download QR (PNG)</span>
        </a>
      )}
    </div>
  );
};
