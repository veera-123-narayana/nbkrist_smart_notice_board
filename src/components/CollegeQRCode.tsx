import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import { isValidPublicDocumentUrl } from '../utils/documentUrl';

interface CollegeQRCodeProps {
  value: string;
  size?: number;
}

export default function CollegeQRCode({ value, size = 100 }: CollegeQRCodeProps) {
  const [qrSrc, setQrSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  const isValidUrl = isValidPublicDocumentUrl(value);

  // Generate crisp local QR code whenever value or size updates
  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    if (!isValidUrl) {
      setQrSrc('');
      return;
    }

    // High resolution for sharp scanning on phone cameras from the TV screen
    QRCode.toDataURL(value, {
      width: Math.max(size * 2, 200),
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrSrc(dataUrl);
        }
      })
      .catch((err) => {
        console.warn('Local QRCode generator warning, using fallback proxy:', err);
        if (isMounted) {
          setQrSrc(
            `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&color=0f172a&bgcolor=ffffff&qzone=1&data=${encodeURIComponent(
              value
            )}`
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, isValidUrl]);

  // Requirement 6: If the current document has no valid public/download URL,
  // do not generate a misleading QR. Show the appropriate empty/unavailable state
  // while preserving exact visual design, size, position, styling, and surrounding UI.
  if (!isValidUrl) {
    return (
      <div 
        style={{ width: size + 12, height: size + 24 }} 
        className="bg-slate-900/80 p-2 border border-dashed border-slate-700/80 rounded-md shadow-sm flex flex-col items-center justify-center text-center select-none"
        title="No public download URL linked to this circular"
      >
        <div className="w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-1">
          <QrCode className="w-4 h-4 opacity-50" />
        </div>
        <span className="text-[8px] font-mono font-bold text-slate-300 uppercase tracking-tight leading-tight">
          QR NOT LINKED
        </span>
        <span className="text-[7px] font-mono text-slate-500 uppercase mt-0.5">
          No Public PDF
        </span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div 
        style={{ width: size + 12, height: size + 24 }} 
        className="bg-slate-900/80 p-2 border border-dashed border-slate-700/80 rounded-md shadow-sm flex flex-col items-center justify-center text-center select-none"
        title="Unable to generate QR code"
      >
        <div className="w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-1">
          <QrCode className="w-4 h-4 opacity-50" />
        </div>
        <span className="text-[8px] font-mono font-bold text-slate-300 uppercase tracking-tight leading-tight">
          QR GENERATION
        </span>
        <span className="text-[7px] font-mono text-slate-500 uppercase mt-0.5">
          Render Error
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white p-1.5 border border-slate-200/80 rounded-md shadow-sm transition-transform hover:scale-105 duration-200 flex flex-col items-center">
      {qrSrc ? (
        <img
          src={qrSrc}
          alt="Notice Scan QR Code"
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
          className="rounded"
        />
      ) : (
        <div style={{ width: size, height: size }} className="flex items-center justify-center bg-slate-100 rounded">
          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="text-[8px] font-mono font-semibold text-slate-600 mt-1 select-none flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        SCAN TO PORTABLE
      </div>
    </div>
  );
}

