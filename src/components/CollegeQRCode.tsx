import { useState } from 'react';

interface CollegeQRCodeProps {
  value: string;
  size?: number;
}

export default function CollegeQRCode({ value, size = 100 }: CollegeQRCodeProps) {
  const [hasError, setHasError] = useState(false);

  // Free, ultra-reliable QR API proxy. Students can scan it on the TV screen and actually visit the notice!
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=0f172a&bgcolor=ffffff&qzone=1&data=${encodeURIComponent(
    value
  )}`;

  if (hasError) {
    // Fallback: Elegant mathematical vector matrix representation of a QR Code if offline!
    return (
      <div 
        style={{ width: size, height: size }} 
        className="relative bg-white p-2 border border-slate-200 rounded flex flex-col justify-between items-center"
      >
        <div className="grid grid-cols-5 gap-1 w-full h-full opacity-90">
          {/* Main Finder Pattern topLeft */}
          <div className="col-span-2 row-span-2 border-2 border-slate-800 p-0.5 flex">
            <div className="bg-slate-800 w-full h-full" />
          </div>
          <div className="bg-slate-700 rounded-sm" />
          <div className="bg-slate-400 rounded-sm" />
          <div className="bg-slate-600 rounded-sm" />
          
          <div className="bg-slate-400" />
          <div className="bg-slate-800" />
          <div className="bg-slate-500" />
          
          {/* Finder Pattern topRight */}
          <div className="bg-slate-500" />
          <div className="col-span-2 row-span-2 border-2 border-slate-800 p-0.5 flex">
            <div className="bg-slate-800 w-full h-full" />
          </div>
          <div className="bg-slate-700" />
          <div className="bg-slate-600" />
          
          {/* Finder Pattern bottomLeft */}
          <div className="col-span-2 row-span-2 border-2 border-slate-800 p-0.5 flex">
            <div className="bg-slate-800 w-full h-full" />
          </div>
          <div className="bg-slate-400" />
          <div className="bg-slate-800" />
          <div className="bg-slate-700" />
          
          <div className="bg-slate-500" />
          <div className="col-span-2 gap-0.5 grid grid-cols-2">
            <div className="bg-slate-800" />
            <div className="bg-slate-300" />
            <div className="bg-slate-400" />
            <div className="bg-slate-800" />
          </div>
        </div>
        <span className="text-[7px] font-mono mt-0.5 text-slate-500 select-none uppercase truncate w-full text-center">
          NBKRIST Scan
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white p-1.5 border border-slate-200/80 rounded-md shadow-sm transition-transform hover:scale-105 duration-200 flex flex-col items-center">
      <img
        src={qrUrl}
        alt="Notice Scan QR Code"
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setHasError(true)}
        className="rounded"
      />
      <div className="text-[8px] font-mono font-semibold text-slate-600 mt-1 select-none flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        SCAN TO PORTABLE
      </div>
    </div>
  );
}
