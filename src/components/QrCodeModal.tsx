import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode as QrIcon, Smartphone } from 'lucide-react';

interface QrCodeModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, title, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('QR generation error:', err));
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
          <QrIcon className="w-5 h-5" />
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">Mobile QR Link</h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 truncate" title={title}>
          {title}
        </p>

        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-lg shadow-sm" />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-sm">
              Generating QR Code...
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>Scan with any camera app to download directly</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none select-all"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
