import { useState } from 'react';
import AdminPortal from './components/AdminPortal';
import KioskDisplay from './components/KioskDisplay';
import { Monitor, Shield, Sparkles, LayoutGrid, Calendar, HelpCircle } from 'lucide-react';

export default function App() {
  // Query param parsing for Raspberry Pi Smart Signage Appliance boot (?mode=kiosk)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isKioskQuery = searchParams?.get('mode') === 'kiosk';
  const urlDept = searchParams?.get('dept') || 'ALL';
  const urlDeviceId = searchParams?.get('deviceId') || undefined;

  const [viewMode, setViewMode] = useState<'landing' | 'admin' | 'kiosk'>('landing');
  const [selectedDept, setSelectedDept] = useState<string>(urlDept);

  const launchKiosk = (dept: string) => {
    setSelectedDept(dept);
    setViewMode('kiosk');
  };

  // HARDENED APPLIANCE MODE: When ?mode=kiosk is active, directly render KioskDisplay
  // Admin controls, landing page, and floating HUD are strictly disabled and cannot be accessed.
  if (isKioskQuery) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-slate-950 relative" id="kiosk-appliance-root">
        <KioskDisplay 
          initialDept={urlDept} 
          deviceId={urlDeviceId}
          isKioskAppliance={true}
        />
      </div>
    );
  }

  // Preview / Simulation Kiosk Mode for testing in desktop browser
  if (viewMode === 'kiosk') {
    return (
      <div className="w-screen h-screen overflow-hidden bg-slate-950 relative">
        <KioskDisplay 
          initialDept={selectedDept} 
          deviceId={urlDeviceId}
          isKioskAppliance={false}
          onExit={() => setViewMode('admin')} 
        />
        
        {/* Sleek Minimalist floating HUD toolbar for desktop previewers only */}
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 opacity-30 hover:opacity-100 transition-opacity duration-300 bg-slate-900/80 backdrop-blur-md p-1.5 px-3 rounded-full border border-white/10 shadow-lg text-[9px] font-mono text-white select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-350">TV PREVIEW SHIFT:</span>
          {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA', 'ALL'].map(dept => (
            <button 
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-1.5 py-0.5 rounded font-bold transition hover:bg-white/15 ${
                selectedDept === dept ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              {dept}
            </button>
          ))}
          <span className="text-slate-600">|</span>
          <button 
            onClick={() => setViewMode('admin')}
            className="text-amber-400 hover:text-amber-300 font-bold ml-1 flex items-center gap-0.5 uppercase"
          >
            ⚙️ exit kiosk
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'admin') {
    return (
      <div className="relative">
        <AdminPortal onLaunchKiosk={launchKiosk} />
        
        {/* Return to Launcher trigger floating at the corner of Admin Portal */}
        <button 
          onClick={() => setViewMode('landing')}
          className="fixed bottom-5 right-5 z-40 bg-slate-950 hover:bg-indigo-950 text-slate-300 font-mono font-bold text-[10px] py-1.5 px-3 rounded-full border border-indigo-900/40 shadow-xl flex items-center gap-1.5 transition-colors"
        >
          🎓 COLLEGE PORTAL HOME
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none selection:bg-indigo-500/30">
      
      {/* Dynamic light effects background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />

      {/* Grid line overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* 1. Portal Heading Container */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" className="w-[45px] h-[45px] text-indigo-400" fill="currentColor">
            <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" className="stroke-2 fill-none stroke-indigo-500" />
            <circle cx="50" cy="50" r="28" className="fill-indigo-950/80 stroke-1 stroke-indigo-500/20" />
            <text x="50" y="55" textAnchor="middle" className="font-serif font-black text-xs fill-indigo-200">NBKR</text>
          </svg>
          <div>
            <h1 className="text-sm font-black font-sans uppercase tracking-[0.15em] text-white leading-none">NBKRIST</h1>
            <span className="text-[10px] text-slate-500 font-mono font-bold tracking-tight">INSTITUTE OF SCIENCE & TECHNOLOGY</span>
          </div>
        </div>

        {/* Status ticker */}
        <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PORTAL ACTIVE ON CLOUD SERVER</span>
        </div>
      </header>

      {/* 2. Interactive Landing Panel (Core Screen content) */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Landing Copywriting Intro segment */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3.5 py-1 text-xs font-mono font-bold text-blue-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Enterprise Smart Digital Signage System</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight uppercase">
              Smart Notice Board<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                Command Engine
              </span>
            </h2>

            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Fully automated notice distribution system tailored for high resolution TV displays, hallway monitors, and smart Raspberry Pi connected screens across NBKRIST engineering blocks.
            </p>

            {/* Feature lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs text-slate-350">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 bg-white/5 rounded text-blue-400">✔</div>
                <div>
                  <h4 className="font-bold text-slate-200">Real-Time Sync Engine</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Instant notice & theme updates over Broadcast live streams.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 bg-white/5 rounded text-blue-400">✔</div>
                <div>
                  <h4 className="font-bold text-slate-200">Scrolling PDF Letterheads</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Page-by-page automatic scrolling and transition sweeps.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 bg-white/5 rounded text-blue-400">✔</div>
                <div>
                  <h4 className="font-bold text-slate-200">Theme customization Drawer</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Control visual styles on monitors per college department.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 bg-white/5 rounded text-blue-400">✔</div>
                <div>
                  <h4 className="font-bold text-slate-200">Voice & QR Integration</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Automatic speech alerts and mobile QR code compilation.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Core launcher selector widgets */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* View Module Choice A: Admin Board */}
            <div 
              onClick={() => setViewMode('admin')}
              className="group cursor-pointer p-6 glass hover:border-indigo-500/50 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition" />
              
              <div className="flex items-start justify-between">
                <div className="p-3 bg-indigo-950/80 group-hover:bg-indigo-900 border border-indigo-500/20 rounded-xl text-indigo-400 transition">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 tracking-wider">SECURE ENTRY</span>
              </div>

              <h3 className="text-lg font-bold text-white mt-4 group-hover:text-indigo-300 transition">
                Admin Management Portal
              </h3>
              <p className="text-xs text-slate-400 mt-1 lines-clamp-2">
                Log in as Super Admin or Department HOD. Manage notice slates, write ticker alerts, design custom signage themes, and view display logs.
              </p>

              <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-400 font-bold mt-4">
                <span>OPEN ADMINISTRATIVE NODE</span>
                <span className="text-sm scale-95 group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </div>

            {/* View Module Choice B: TV Signage Display */}
            <div 
              onClick={() => launchKiosk('CSE')}
              className="group cursor-pointer p-6 glass hover:border-emerald-500/50 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
              
              <div className="flex items-start justify-between">
                <div className="p-3 bg-emerald-950/80 group-hover:bg-emerald-900 border border-emerald-500/20 rounded-xl text-emerald-400 transition">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">TV BROADCAST</span>
              </div>

              <h3 className="text-lg font-bold text-white mt-4 group-hover:text-emerald-300 transition">
                Department Display Signage
              </h3>
              <p className="text-xs text-slate-400 mt-1 lines-clamp-2">
                Prompt full screen TV kiosk view representing classroom monitors. Fits height and rotates materials, schedules, and active emergency overrides automatically.
              </p>

              <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold mt-4">
                <span>SIMULATE KIOSK RECEIVER</span>
                <span className="text-sm scale-95 group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* 3. Sleek copyright informational footer */}
      <footer className="relative z-10 w-full text-center py-6 border-t border-slate-900 text-[10px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>NBKRIST Digital Signage Core © 2026. Made for Vidyanagar Engineering Campus.</span>
          <span className="space-x-3">
            <span>Raspberry Pi client ready</span>
            <span>•</span>
            <span>Windows EXE compiled</span>
            <span>•</span>
            <span>Local Cache Active</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
