import { useState, useEffect, useRef } from "react";

import { useSmartNoticeStore } from "../store";

import useNotices from "../hooks/useNotices";
import useAlerts from "../hooks/useAlerts";
import useThemes from "../hooks/useThemes";
import useScreens from "../hooks/useScreens";

import { Notice, ThemeConfig } from "../types";
import CollegeQRCode from "./CollegeQRCode";
import AnimatedBackground from "./AnimatedBackground";
import { registerOrUpdateDevice, sendDeviceHeartbeat } from "../services/devices/deviceService";
import { resolveNoticeDocumentUrl } from "../utils/documentUrl";

import {
  Volume2,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

interface KioskDisplayProps {
  initialDept?: string;
  deviceId?: string;
  onExit?: () => void;
  isKioskAppliance?: boolean;
}

export default function KioskDisplay({
  initialDept = "ALL",
  deviceId: propDeviceId,
  onExit,
  isKioskAppliance,
}: KioskDisplayProps) {

  // Temporary Local Store
  // (We'll remove this after Firestore migration is complete)
  const store = useSmartNoticeStore();

  // Firestore Hooks
  const notices = useNotices();

  const alerts = useAlerts();

  const themes = useThemes();

  const screens = useScreens();

  const [currentDept, setCurrentDept] = useState(initialDept);

  // Derive unique device identifier for Raspberry Pi
  const resolvedDeviceId = propDeviceId || 
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('deviceId') : null) || 
    `NBKR-${currentDept}-01`;

  // FEATURE 2: Register device identity in Firebase
  useEffect(() => {
    registerOrUpdateDevice({
      deviceId: resolvedDeviceId,
      department: currentDept,
      deviceName: `NBKRIST ${currentDept} Smart TV Display (${resolvedDeviceId})`,
      appVersion: "1.0.0",
      screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080',
    });
  }, [resolvedDeviceId, currentDept]);

  // FEATURE 3: 30-second interval Device Heartbeat update in Firebase
  useEffect(() => {
    const hbInterval = setInterval(() => {
      sendDeviceHeartbeat(resolvedDeviceId, {
        department: currentDept,
        screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080',
      });
    }, 30000); // 30s interval

    return () => clearInterval(hbInterval);
  }, [resolvedDeviceId, currentDept]);

  // Sync with outer HUD / selected display screen shifts
  useEffect(() => {
    setCurrentDept(initialDept);
    setCurrentPosterIndex(0);
    currentPdfIndexRef.current = 0;
  }, [initialDept]);
  
  // Offline simulation state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Rotation Engine State
  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  const [activePdfNotice, setActivePdfNotice] = useState<Notice | null>(null);
  
  // PDF Scrolling state
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const pdfScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollPhase, setScrollPhase] = useState<'idle' | 'scrolling' | 'paused' | 'done'>('idle');

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Speech Announcement Queue tracker
  const [spokenEmergencies, setSpokenEmergencies] = useState<Set<string>>(new Set());

  // Screen-specific theme configuration
  const currentScreen = store.screens.find(s => s.department === currentDept) || store.screens[0];

  // Evaluate active theme schedule real-time (using clock ticks)
  const activeSchedule = (store.schedules || []).find(sched => {
    if (!sched.isActive) return false;
    
    // Check target matching: matches if global, or matches currentDept, or if screen matches
    const targetMatches = 
      sched.target === 'global' || 
      sched.target === currentDept || 
      (currentScreen && sched.target === currentScreen.department);
      
    if (!targetMatches) return false;

    // Get current "HH:MM"
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    const { startTime, endTime } = sched;
    if (startTime <= endTime) {
      return currentTimeStr >= startTime && currentTimeStr <= endTime;
    } else {
      // Overnight rule (crosses midnight, e.g. 18:00 to 07:00)
      return currentTimeStr >= startTime || currentTimeStr <= endTime;
    }
  });

  const activeThemeId = activeSchedule ? activeSchedule.themeId : (currentScreen?.currentThemeId || store.themes[0].id);
  const activeTheme = store.themes.find(t => t.id === activeThemeId) || store.themes[0];

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor network connection status
  useEffect(() => {
    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }, []);

  // FEATURE 8: Emergency & Priority hierarchy handling
  // Priority ordering: urgent notices rotate first, then high, medium, normal
  const priorityRank: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    normal: 4,
  };

  // Filter content matching current department or ALL, sorted by priority rank
  const departmentNotices = store.notices
    .filter(notice => 
      !notice.isArchived && 
      (notice.department.includes('ALL') || notice.department.includes(currentDept))
    )
    .sort((a, b) => (priorityRank[a.priority] || 4) - (priorityRank[b.priority] || 4));

  const imageNotices = departmentNotices.filter(n => n.type === 'image');
  const pdfNotices = departmentNotices.filter(n => n.type === 'pdf');

  // Filter active alerts for ticker marquee
  const activeAlerts = store.alerts.filter(a => 
    a.isActive && 
    (a.department.includes('ALL') || a.department.includes(currentDept))
  );

  // 1. Check for active emergency notice
  const emergencyNotice = departmentNotices.find(n => n.priority === 'emergency');

  // Trigger browser Speech Synthesis if new emergency is detected
  useEffect(() => {
    if (emergencyNotice && !spokenEmergencies.has(emergencyNotice.id)) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          `Attention Students. An Emergency Notice has been published for ${currentDept}: ${emergencyNotice.title}`
        );
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
        setSpokenEmergencies(prev => {
          const next = new Set(prev);
          next.add(emergencyNotice.id);
          return next;
        });
      }
    }
  }, [emergencyNotice, currentDept, spokenEmergencies]);

  // 2. LEFT SECTION - Rotation Engine for posters/notifications (Non-Emergency)
  useEffect(() => {
    if (imageNotices.length === 0) {
      setActiveNotice(null);
      return;
    }

    // Determine current notice details
    const notice = imageNotices[currentPosterIndex] || imageNotices[0];
    setActiveNotice(notice);

    // Get display timing based on Poster Priority levels
    let duration = 10000; // default 10s
    if (notice.priority === 'urgent') duration = 35000; // 35s for urgent
    else if (notice.priority === 'high') duration = 30000; // 30s for high / important
    else if (notice.priority === 'medium') duration = 15000;
    else if (notice.priority === 'normal') duration = 10000;

    const timer = setTimeout(() => {
      setCurrentPosterIndex(prev => (prev + 1) % imageNotices.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentPosterIndex, imageNotices.length, store.notices, currentDept]);

  // 3. RIGHT SECTION - Automated Infinite PDF Scrolling & Rotation
  const currentPdfIndexRef = useRef(0);

  useEffect(() => {
    if (pdfNotices.length === 0) {
      setActivePdfNotice(null);
      return;
    }

    const currentPdf = pdfNotices[currentPdfIndexRef.current % pdfNotices.length];
    setActivePdfNotice(currentPdf);
    setCurrentPdfPage(1);
    setScrollPhase('idle');
  }, [pdfNotices.length, store.notices, currentDept]);

  // Handle PDF automated scroll and page transitioning
  useEffect(() => {
    const container = pdfScrollContainerRef.current;
    if (!container || !activePdfNotice) return;

    let timer: NodeJS.Timeout;
    
    // Start automated slow scroll after page loads / mounts
    if (scrollPhase === 'idle') {
      timer = setTimeout(() => {
        setScrollPhase('scrolling');
      }, 1500); // Wait 1.5 seconds at page head
    } 
    else if (scrollPhase === 'scrolling') {
      let scrollSpeed = 0.6; // speed modifier
      const scrollLoop = () => {
        if (!container || scrollPhase !== 'scrolling') return;
        
        container.scrollTop += scrollSpeed;
        
        // Detect current page dynamically as it scrolls
        const pages = container.querySelectorAll('.circular-page-item');
        if (pages.length > 0) {
          let detectedPage = 1;
          const containerRect = container.getBoundingClientRect();
          for (let i = 0; i < pages.length; i++) {
            const pageRect = pages[i].getBoundingClientRect();
            // If the page is scrolled past the container's midsection or is the first page
            if (pageRect.top - containerRect.top <= containerRect.height / 2) {
              detectedPage = i + 1;
            }
          }
          setCurrentPdfPage(detectedPage);
        }

        // Check if hit bottom
        const hasReachedBottom = 
          container.scrollHeight - container.scrollTop <= container.clientHeight + 4;
        
        if (hasReachedBottom) {
          setScrollPhase('paused');
        } else {
          timer = setTimeout(scrollLoop, 30);
        }
      };
      timer = setTimeout(scrollLoop, 30);
    } 
    else if (scrollPhase === 'paused') {
      // Pause at the bottom of the entire PDF for 2.5 seconds
      timer = setTimeout(() => {
        // Finished entire PDF circular, queue next
        setScrollPhase('done');
      }, 2500);
    } 
    else if (scrollPhase === 'done') {
      // Stagger transitions to next PDF document
      timer = setTimeout(() => {
        currentPdfIndexRef.current = (currentPdfIndexRef.current + 1) % pdfNotices.length;
        const nextPdf = pdfNotices[currentPdfIndexRef.current];
        setActivePdfNotice(nextPdf);
        setCurrentPdfPage(1);
        container.scrollTop = 0;
        setScrollPhase('idle');
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [scrollPhase, activePdfNotice, pdfNotices.length]);

  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden select-none select-none z-40 flex flex-col font-sans transition-all duration-1000"
      style={{
        height: '100vh',
        width: '100vw',
        color: activeTheme.textColor,
        textShadow: activeTheme.glowEffect ? `0 0 12px ${activeTheme.primaryColor}20` : 'none'
      }}
    >
      {/* 1. Dynamic Animated / Static Background Canvas */}
      <AnimatedBackground theme={activeTheme} />

      {/* 2. ENTERPRISE COLLEGE HEADER SECTION (Height: 100px) */}
      <header 
        className="relative z-10 w-full h-[100px] px-6 flex items-center justify-between border-b"
        style={{
          background: activeTheme.headerColor,
          borderColor: activeTheme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          boxShadow: activeTheme.glowEffect ? `0 4px 20px ${activeTheme.primaryColor}30` : 'none'
        }}
      >
        {/* Left Side: Brand Label */}
        <div className="flex flex-col">
          <div className="text-xs uppercase tracking-widest font-mono opacity-80 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Smart Notice Board System
          </div>
          <div className="text-[26px] font-black font-sans uppercase tracking-tight flex items-center gap-2">
            <span style={{ color: activeTheme.primaryColor }}>NBKRIST</span>
            <span className="text-sm font-semibold opacity-60 bg-white/10 px-2 py-0.5 rounded tracking-normal">
              {currentDept} DISPLAY
            </span>
          </div>
        </div>

        {/* Center: Official College Title */}
        <div className="hidden lg:flex flex-col items-center text-center">
          <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
            NBKR Institute of Science & Technology
          </h1>
          <p className="text-xs text-white/75 font-serif italic">
            (Autonomous Institution Affiliated to JNTUA, Accredited by NAAC & NBA)
          </p>
        </div>

        {/* Right Side: College Mini Seal, Clock & Network Feed */}
        <div className="flex items-center gap-5">
          {/* Official college crest vector representation */}
          <div className="bg-white/95 p-1.5 rounded-md flex items-center gap-2 shadow-inner border border-white/20">
            <svg viewBox="0 0 100 100" className="w-[50px] h-[50px] text-blue-900" fill="currentColor">
              <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" className="stroke-2 fill-none stroke-blue-900" />
              <circle cx="50" cy="50" r="28" className="fill-blue-100" />
              <path d="M50,22 L50,78 M22,50 L78,50 M30,30 L70,70 M30,70 L70,30" className="stroke-blue-900 stroke-1 opacity-40" />
              <text x="50" y="55" textAnchor="middle" className="font-serif font-black text-xs">NBKR</text>
            </svg>
          </div>

          <div className="flex flex-col items-end border-l border-white/15 pl-4">
            <span className="text-xl font-mono font-bold tracking-wide text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-xs text-white/80 font-mono">
              {currentTime.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Quick exit and Department Switcher (Kiosk Control HUD overlay) */}
          <div className="flex flex-col gap-1 items-stretch">
            {onExit && (
              <button 
                onClick={onExit}
                className="text-[10px] font-mono font-bold bg-white/15 hover:bg-white/25 text-white py-1 px-2.5 rounded transition shadow-sm border border-white/10"
              >
                ADMIN PANEL
              </button>
            )}
            <select
              value={currentDept}
              onChange={(e) => {
                setCurrentDept(e.target.value);
                setCurrentPosterIndex(0);
                currentPdfIndexRef.current = 0;
              }}
              className="text-[10px] font-mono bg-blue-950/70 border border-blue-400/30 text-emerald-400 py-0.5 px-1.5 rounded focus:outline-none"
            >
              {['ALL', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA'].map(dept => (
                <option key={dept} value={dept}>{dept} Screen</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* 3. SCROLLING MARQUEE ALERT BAR (Height: 40px) */}
      <section 
        className="relative z-10 w-full h-[40px] px-4 flex items-center overflow-hidden border-b"
        style={{
          background: activeAlerts.length > 0 && activeAlerts[0].priority === 'emergency' 
            ? '#be123c' 
            : activeAlerts.length > 0 && activeAlerts[0].priority === 'important' 
              ? '#d97706' 
              : activeTheme.marqueeBg,
          color: activeTheme.marqueeTextColor,
          borderColor: 'rgba(0,0,0,0.1)'
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 px-3 bg-black/30 flex items-center gap-1.5 z-20 font-bold font-mono text-xs shadow-md">
          <Volume2 className="w-4 h-4 animate-bounce" />
          <span>ALERTS:</span>
        </div>

        {/* Real continuously scrolling marquee */}
        <div className="w-full flex overflow-hidden select-none translate-x-[90px]">
          <div className="whitespace-nowrap flex gap-12 animate-marquee py-1">
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert, index) => (
                <span key={alert.id} className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  {alert.text}
                  {index < activeAlerts.length - 1 && <span className="opacity-50 mx-4">|</span>}
                </span>
              ))
            ) : (
              <span className="text-sm font-mono tracking-wider opacity-90 animate-pulse">
                🎓 NBKRIST Smart Digital Notice Board System online and synchronized. Scan notice QRs to download circulars onto devices. 🎓
              </span>
            )}
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 px-3 bg-black/40 flex items-center gap-1.5 z-20 font-mono text-xs">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold scale-[0.85]">
              <Wifi className="w-3.5 h-3.5" /> LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-400 font-bold scale-[0.85] animate-pulse">
              <WifiOff className="w-3.5 h-3.5" /> CACHED
            </span>
          )}
        </div>
      </section>

      {/* 4. MAIN WORKSPACE / LAYOUT CHANNELS */}
      <main className="relative z-10 flex-1 w-full overflow-hidden flex">
        
        {/* =========================================================
            A. EMERGENCY POSTER OVERRIDE MODE (Hides left & right)
            ========================================================= */}
        {emergencyNotice ? (
          <div className="w-full h-full p-6 flex flex-col justify-center items-center z-30">
            <div 
              className="w-full max-w-5xl flex-1 rounded-xl p-8 border-4 border-rose-600 shadow-2xl flex flex-col justify-between overflow-hidden"
              style={{
                background: activeTheme.mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)',
                color: activeTheme.textColor
              }}
            >
              {/* Emergency Banner Header */}
              <div className="text-center pb-4 border-b border-rose-600/30">
                <div className="inline-flex bg-rose-600 text-white rounded-full px-6 py-1.5 text-xs font-mono font-bold uppercase tracking-widest gap-2 animate-bounce">
                  🚨 EMERGENCY COMMAND BROADCAST 🚨
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight mt-3 text-rose-500 uppercase">
                  {emergencyNotice.title}
                </h2>
              </div>

              {/* Simulated Poster / Document Body */}
              <div className="flex-1 flex flex-col justify-center items-center py-6 px-12 text-center">
                <p className="text-xl md:text-2xl leading-relaxed max-w-3xl font-serif text-slate-800 dark:text-slate-200">
                  {emergencyNotice.pdfPages?.[0]?.content.join(' ') || 
                   `This is a critical institutional update published for ${emergencyNotice.department.join(', ')} students. Please check with your HOD or counselor immediately.`}
                </p>
                
                {/* Visual Stamp Decorator */}
                <div className="mt-8 border-4 border-rose-600/60 rounded px-6 py-2 rotate-[-5deg] text-xs font-mono font-bold text-rose-500 shadow-sm uppercase tracking-widest animate-pulse inline-block">
                  IMMEDIATE ACTION REQUIRED
                </div>
              </div>

              {/* Stamp of Authority footer with QR code */}
              <div className="flex items-center justify-between pt-4 border-t border-rose-600/35">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-xs opacity-60">ADMINISTRATIVE ISSUING OFFICE:</span>
                  <span className="text-sm font-semibold text-rose-500 font-mono">
                    {emergencyNotice.uploadedBy}
                  </span>
                  <span className="text-[10px] opacity-50">
                    Published: {new Date(emergencyNotice.createdAt).toLocaleString()}
                  </span>
                </div>
                
                {/* QR scanning compartment */}
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <p className="font-semibold text-rose-500">MOBILE SCAN ACCESS</p>
                    <p className="text-[9px] opacity-70">
                      {resolveNoticeDocumentUrl(emergencyNotice) ? 'Scan to fetch files off-grid' : 'Emergency advisory'}
                    </p>
                  </div>
                  <CollegeQRCode value={resolveNoticeDocumentUrl(emergencyNotice) || ''} size={110} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          
          /* =========================================================
              B. REGULAR SPLIT-SCREEN LAYOUT (60% Info, 40% Documents)
             ========================================================= */
          <div className="w-full h-full flex">
            
            {/* LEFT AREA: IMAGE & POSTER SYSTEM (60%) */}
            <section className="w-[60%] h-full p-6 flex flex-col gap-4 border-r border-white/5 bg-[radial-gradient(circle_at_top_left,_#1e293b_0%,_#020617_70%)] transition-all">
              <div 
                className="w-full h-full glass rounded-2xl overflow-hidden relative group p-2 flex flex-col justify-between"
              >
                {/* Content Frame */}
                {activeNotice ? (
                  <div className="w-full h-full flex flex-col relative">
                    
                    {/* Visual Priority Accent line */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ 
                        background: activeNotice.priority === 'high' 
                          ? '#f59e0b' // Amber
                          : activeNotice.priority === 'medium'
                            ? '#3b82f6' // Blue
                            : '#10b981' // Green
                      }}
                    />

                    {/* Meta bar */}
                    <div className="px-4 py-2 bg-black/60 text-[10px] font-mono text-white flex justify-between items-center z-10 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="bg-white/15 px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-400">
                          {activeNotice.category.toUpperCase()}
                        </span>
                        <span className="opacity-80">Posted by: {activeNotice.uploadedBy.slice(0, 30)}...</span>
                      </div>
                      <div className="font-semibold text-amber-400 animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                        {activeNotice.priority.toUpperCase()} PRIORITY {activeNotice.priority === 'high' ? '• 30s' : activeNotice.priority === 'medium' ? '• 15s' : '• 10s'}
                      </div>
                    </div>

                    {/* Styled High-Fidelity Poster Canvas */}
                    <div className="flex-1 w-full p-4 flex items-center justify-center relative overflow-hidden bg-slate-900/40">
                      
                      {activeNotice.url === 'placement_drive' && (
                        <div className="w-full max-w-2xl h-full rounded-lg bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-6 border border-indigo-500/30 flex flex-col justify-between text-white shadow-xl animate-fade-zoom">
                          <div className="flex justify-between items-start">
                            <div className="bg-indigo-600/30 border border-indigo-500 text-indigo-300 text-xs font-mono font-bold px-3 py-1 rounded">
                              OFFICIAL CAMPUS RECRUITMENT 2026
                            </div>
                            <span className="text-xl">🎓</span>
                          </div>

                          <div className="my-auto space-y-3">
                            <h3 className="text-xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-emerald-300">
                              TCS & COGNIZANT POLL
                            </h3>
                            <p className="text-[13px] text-slate-300 leading-relaxed max-w-xl">
                              Students of CSE, ECE, EEE, and MCA segments with CGPA 6.5+ are eligible. 
                              The offline evaluation phase kicks off on <span className="text-emerald-300 font-bold">22nd June 2026</span> at the main Computer Center.
                            </p>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="bg-white/5 border border-white/10 rounded p-2 text-center">
                                <p className="text-[9px] text-indigo-400 font-mono font-bold">CTC RANGE</p>
                                <p className="text-sm font-bold text-emerald-400">4.5 - 7.5 LPA</p>
                              </div>
                              <div className="bg-white/5 border border-white/10 rounded p-2 text-center">
                                <p className="text-[9px] text-indigo-400 font-mono font-bold">DEADLINE</p>
                                <p className="text-sm font-bold text-rose-400">June 18, 5 PM</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-end border-t border-white/10 pt-4">
                            <div>
                              <p className="text-[9px] text-slate-400 font-mono">AUTHORIZED POSTING</p>
                              <p className="text-[11px] font-semibold text-slate-200">{activeNotice.uploadedBy}</p>
                            </div>
                            <div className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-3 py-1 rounded uppercase tracking-wider animate-pulse">
                              Apply Now
                            </div>
                          </div>
                        </div>
                      )}

                      {activeNotice.url === 'conference_banner' && (
                        <div className="w-full max-w-2xl h-full rounded-lg bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 border border-emerald-500/30 flex flex-col justify-between text-white shadow-xl animate-slide-right">
                          <div className="flex justify-between items-start">
                            <span className="bg-emerald-600/30 border border-emerald-500 text-emerald-300 text-xs font-mono font-bold px-3 py-1 rounded">
                              ADHYAYAN 2026 • ANNUAL TECHNICAL FEST
                            </span>
                            <span className="text-xl">⚡</span>
                          </div>

                          <div className="my-auto space-y-3">
                            <h3 className="text-xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 uppercase leading-none">
                              National Coding Symposium
                            </h3>
                            <p className="text-[13px] text-slate-300 leading-relaxed max-w-xl">
                              Enter the state-wide hackathon, AI model exhibition & Cyber Security lockouts. Over ₹50,000 in cash prizes to be won! Register immediately.
                            </p>
                            <div className="flex gap-4">
                              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30 font-mono">
                                CSE Blocks III & IV
                              </span>
                              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30 font-mono">
                                17th - 18th June
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-end border-t border-white/10 pt-3">
                            <div>
                              <p className="text-[9px] text-slate-400 font-mono">ORGANIZED BY</p>
                              <p className="text-[11px] font-semibold text-slate-250">Department of Computer Science & Engineering</p>
                            </div>
                            <div className="bg-emerald-500 text-slate-950 font-mono font-bold text-[9px] px-3 py-1 rounded animate-pulse">
                              ₹50,000 PRIZE POOL
                            </div>
                          </div>
                        </div>
                      )}

                      {activeNotice.url === 'mech_auto_expo_banner' && (
                        <div className="w-full max-w-2xl h-full rounded-lg bg-gradient-to-br from-orange-950 via-slate-900 to-amber-950 p-6 border border-orange-500/30 flex flex-col justify-between text-white shadow-xl animate-fade-zoom">
                          <div className="flex justify-between items-start">
                            <span className="bg-orange-600/30 border border-orange-500 text-orange-300 text-xs font-mono font-bold px-3 py-1 rounded">
                              MECHANICAL & CIVIL ENGINEERING EXPANSION
                            </span>
                            <span className="text-xl">⚙️</span>
                          </div>

                          <div className="my-auto space-y-3">
                            <h3 className="text-xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-red-300 uppercase leading-none">
                              MECH-AUTO EXPO 2026
                            </h3>
                            <p className="text-[13px] text-slate-300 leading-relaxed max-w-xl">
                              Behold the Hyper-CAD design finals, automotive aerodynamic tests, and Electric Kart demonstrations running in the mechanical workshop quadrangle.
                            </p>
                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded border border-orange-500/30 font-mono inline-block">
                              Location: Heavy Machinery Lab Yards
                            </span>
                          </div>

                          <div className="flex justify-between items-end border-t border-white/10 pt-3">
                            <div>
                              <p className="text-[9px] text-slate-400 font-mono">CONVENER</p>
                              <p className="text-[11px] font-semibold text-slate-200">{activeNotice.uploadedBy}</p>
                            </div>
                            <span className="text-xs font-mono text-amber-400">12th June 2026</span>
                          </div>
                        </div>
                      )}

                      {/* Custom Uploaded Image Flyer Rendering */}
                      {activeNotice.imageUrl && (
                        <div className="w-full h-full rounded-xl overflow-hidden relative flex flex-col justify-between text-white bg-black/40 animate-fade-zoom border border-white/10 shadow-2xl">
                          {/* Ambient background blur using the image itself */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-30 select-none scale-110 pointer-events-none"
                            style={{ backgroundImage: `url(${activeNotice.imageUrl})` }}
                          />
                          
                          {/* Centered Image Showcase */}
                          <div className="flex-1 w-full h-full flex items-center justify-center p-2 relative z-10 overflow-hidden">
                            <img 
                              src={activeNotice.imageUrl} 
                              alt={activeNotice.title} 
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain rounded-lg shadow-xl border border-white/10"
                            />
                          </div>

                          {/* Info Overlay Panel */}
                          <div className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-white/10 relative z-10 flex justify-between items-center gap-3">
                            <div className="text-left">
                              <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/30 uppercase mr-2 inline-block">
                                {activeNotice.category}
                              </span>
                              <span className="text-xs font-semibold text-slate-300 font-mono">
                                Target: {activeNotice.department.join(', ')}
                              </span>
                              <h4 className="text-[14px] font-black text-white tracking-tight mt-1">
                                {activeNotice.title}
                              </h4>
                            </div>
                            <div className="shrink-0 text-right text-[10px] font-mono text-slate-400">
                              <span className="block font-semibold text-white">ISSUED BY</span>
                              {activeNotice.uploadedBy.slice(0, 20)}...
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom Uploaded Poster Cover Fallback */}
                      {!activeNotice.imageUrl && activeNotice.url !== 'placement_drive' && activeNotice.url !== 'conference_banner' && activeNotice.url !== 'mech_auto_expo_banner' && (
                        <div className="w-full max-w-2xl h-full rounded-lg bg-slate-950/70 border border-slate-500/35 p-6 flex flex-col justify-between text-white shadow-lg relative overflow-hidden group">
                          {/* Top accent */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                          
                          <div className="flex justify-between items-start">
                            <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono font-bold px-2.5 py-1 rounded">
                              DEPARTMENT CIRCULAR • {activeNotice.category.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{new Date(activeNotice.createdAt).toLocaleDateString()}</span>
                          </div>

                          <div className="my-auto py-4">
                            <h4 className="text-2xl font-bold tracking-tight text-slate-100 group-hover:text-blue-400 transition-colors">
                              {activeNotice.title}
                            </h4>
                            <p className="text-sm font-mono text-slate-300 mt-3 leading-relaxed border-l-2 border-blue-500 pl-3">
                              This institutional poster content was published digitally via the NBKRIST Admin Management Node. 
                              Scan the companion QR code to fetch immediate downloads or file listings.
                            </p>
                          </div>

                          <div className="flex justify-between items-end border-t border-slate-800 pt-4 mt-2">
                            <div>
                              <span className="text-[9px] text-slate-500 block font-mono">UPLOADER</span>
                              <span className="text-xs text-slate-300 font-medium">{activeNotice.uploadedBy}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 block font-mono">TARGET</span>
                              <span className="text-xs font-semibold text-blue-400 font-mono">{activeNotice.department.join(', ')}</span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Left footer status */}
                    <div className="px-5 py-3 bg-slate-950/40 backdrop-blur-md flex justify-between items-center z-10 border-t border-white/5 font-mono text-[10px]">
                      <span className="text-slate-400">
                        Poster Rotation: {currentPosterIndex + 1} of {imageNotices.length}
                      </span>
                      <span className="text-emerald-400 animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin duration-3000" /> AUTO ROTATING
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center p-6 text-slate-400">
                    <span className="text-3xl">📭</span>
                    <p className="mt-3 text-sm font-semibold">No active posters for {currentDept} department.</p>
                    <p className="text-xs opacity-75 mt-1 text-center">Posters uploaded by college administrators appear here.</p>
                  </div>
                )}
              </div>
            </section>

            {/* RIGHT AREA: ADVANCED AUTOMATED PDF VIEWER (40%) */}
            <section className="w-[40%] h-full p-6 flex flex-col gap-4">
              <div 
                className="w-full h-full glass rounded-2xl relative overflow-hidden flex flex-col p-2"
              >
                {activePdfNotice ? (
                  <div className="w-full h-full flex flex-col">
                    
                    {/* Integrated PDF Header */}
                    <div className="p-3 bg-red-800/10 dark:bg-red-950/30 border-b border-rose-950/30 flex justify-between items-center z-10">
                      <div className="flex items-center gap-2">
                        <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded tracking-wide animate-pulse">
                          PDF VIEW
                        </span>
                        <span className="text-xs font-bold text-slate-400 truncate max-w-[150px] font-mono select-all">
                          NBKRIST_CIRC_{activePdfNotice.id.slice(-4).toUpperCase()}.pdf
                        </span>
                      </div>
                      <div className="text-[10px] opacity-75 font-mono">
                        Page {currentPdfPage} of {activePdfNotice.pdfPages?.length || 1}
                      </div>
                    </div>

                    {/* Core Scroll View Body */}
                    <div 
                      ref={pdfScrollContainerRef}
                      className="flex-1 w-full p-4 overflow-y-hidden select-text relative scrollbar-none-layout flex flex-col gap-6"
                    >
                      {activePdfNotice.pdfPages && activePdfNotice.pdfPages.length > 0 ? (
                        activePdfNotice.pdfPages.map((page, idx) => (
                          <div key={idx} className="circular-page-item w-full shrink-0 relative transition-transform duration-300">
                            {page.pageImageUrl ? (
                              /* Real Rasterized PDF Page Output */
                              <div className="pdf-page w-full rounded shadow-2xl bg-white p-1 select-all">
                                <img 
                                  src={page.pageImageUrl} 
                                  alt={`PDF Page ${idx + 1}`}
                                  className="w-full h-auto block rounded-sm"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              /* Simulated Circular Page Template Fallback */
                              <div className="pdf-page w-full min-h-full rounded shadow-2xl bg-white text-slate-800 p-8 flex flex-col gap-4 font-mono select-all text-left">
                                
                                {/* Mock Official Institutional Header Letterhead */}
                                <div className="text-center pb-2 border-b-2 border-slate-300 w-full">
                                  <h4 className="text-xs font-extrabold text-blue-900 font-sans tracking-tight leading-none uppercase">
                                    NBKR Institute of Science & Technology
                                  </h4>
                                  <span className="text-[7px] text-slate-500 tracking-wider">VIDYANAGAR, NELLORE DISTRICT, AP - 524413</span>
                                  
                                  <div className="flex justify-between items-center text-[7px] mt-2 block font-normal text-slate-500 border-t border-dashed border-slate-300 pt-1 italic">
                                    <span>Ref: NBKRIST/{currentDept}/CIRCULAR/2026</span>
                                    <span>Date: 10th June 2026</span>
                                  </div>
                                </div>

                                {/* Document Content Block */}
                                <div className="space-y-3 flex-1 min-h-[180px]">
                                  <div className="text-[10px] font-extrabold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-tight text-center leading-tight">
                                    {page.title || activePdfNotice.title}
                                  </div>
                                  
                                  <div className="space-y-2 text-[9px] text-slate-700 leading-relaxed text-justify px-1 antialiased font-sans font-medium whitespace-pre-wrap">
                                    {page.content.map((paragraph, i) => (
                                      <p key={i} className="indent-4 leading-normal">
                                        {paragraph}
                                      </p>
                                    ))}
                                  </div>
                                </div>

                                {/* Stamp & Approval signature */}
                                <div className="flex justify-between items-end border-t border-slate-100 pt-2 mt-auto">
                                  <div className="border border-emerald-600 rounded bg-emerald-50 px-2 py-0.5 text-[7px] font-sans font-extrabold text-emerald-800 uppercase tracking-widest rotate-[-5deg]">
                                    APPROVED ADMIN
                                  </div>
                                  <div className="text-right text-[8px] font-bold text-slate-900 flex flex-col items-end leading-none font-sans">
                                    <span className="font-serif italic font-light opacity-80 h-3 leading-none">V. R. Prasad</span>
                                    <span className="border-t border-slate-400 mt-1 pt-0.5 uppercase tracking-tighter text-[7px]">REGISTRAR / DIRECTOR</span>
                                  </div>
                                </div>

                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        /* Simulated Circular Page Template Fallback for Single / Empty PDFs */
                        <div className="circular-page-item w-full shrink-0 relative">
                          <div className="pdf-page w-full min-h-full rounded shadow-2xl bg-white text-slate-800 p-8 flex flex-col gap-4 font-mono select-all text-left">
                            
                            {/* Mock Official Institutional Header Letterhead */}
                            <div className="text-center pb-2 border-b-2 border-slate-300 w-full">
                              <h4 className="text-xs font-extrabold text-blue-900 font-sans tracking-tight leading-none uppercase">
                                NBKR Institute of Science & Technology
                              </h4>
                              <span className="text-[7px] text-slate-500 tracking-wider">VIDYANAGAR, NELLORE DISTRICT, AP - 524413</span>
                              
                              <div className="flex justify-between items-center text-[7px] mt-2 block font-normal text-slate-500 border-t border-dashed border-slate-300 pt-1 italic">
                                <span>Ref: NBKRIST/{currentDept}/CIRCULAR/2026</span>
                                <span>Date: 10th June 2026</span>
                              </div>
                            </div>

                            {/* Document Content Block */}
                            <div className="space-y-3 flex-1 min-h-[180px]">
                              <div className="text-[10px] font-extrabold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-tight text-center leading-tight">
                                {activePdfNotice.title}
                              </div>
                              
                              <div className="space-y-2 text-[9px] text-slate-700 leading-relaxed text-justify px-1 antialiased font-sans font-medium whitespace-pre-wrap">
                                <p className="indent-4 leading-normal">
                                  {(activePdfNotice as any).description || activePdfNotice.title || "Official electronic circular attachment."}
                                </p>
                              </div>
                            </div>

                            {/* Stamp & Approval signature */}
                            <div className="flex justify-between items-end border-t border-slate-100 pt-2 mt-auto">
                              <div className="border border-emerald-600 rounded bg-emerald-50 px-2 py-0.5 text-[7px] font-sans font-extrabold text-emerald-800 uppercase tracking-widest rotate-[-5deg]">
                                APPROVED ADMIN
                              </div>
                              <div className="text-right text-[8px] font-bold text-slate-900 flex flex-col items-end leading-none font-sans">
                                <span className="font-serif italic font-light opacity-80 h-3 leading-none">V. R. Prasad</span>
                                <span className="border-t border-slate-400 mt-1 pt-0.5 uppercase tracking-tighter text-[7px]">REGISTRAR / DIRECTOR</span>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>

                    {/* Integrated QR Scan-Drawer Footer */}
                    {(() => {
                      const activeDocUrl = resolveNoticeDocumentUrl(activePdfNotice);
                      return (
                        <div className="p-4 bg-slate-950/65 border-t border-white/5 flex items-center justify-between z-10">
                          <div className="flex-1 pr-3">
                            <div className={`${activeDocUrl ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-400'} border rounded px-2.5 py-1 inline-flex items-center gap-1 shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${activeDocUrl ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'} inline-block`} />
                              <span className="text-[9px] font-bold font-mono">
                                {activeDocUrl ? 'QR SYNCHRONIZED' : 'QR NOT LINKED'}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-200 mt-1.5 truncate max-w-[200px]">
                              {activePdfNotice.title}
                            </p>
                            <p className="text-[8px] font-mono text-slate-400 leading-tight">
                              {activeDocUrl
                                ? 'Aim smartphone lens at the panel code to instantly load full PDF schedules on-the-go.'
                                : 'Notice displayed on screen. Awaiting downloadable document attachment.'}
                            </p>
                          </div>

                          {/* Display QR code */}
                          <CollegeQRCode value={activeDocUrl || ''} size={90} />
                        </div>
                      );
                    })()}

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center p-6 text-slate-400">
                    <span className="text-3xl">📄</span>
                    <p className="mt-3 text-sm font-semibold">No active circulars for {currentDept} department.</p>
                    <p className="text-xs opacity-75 mt-1 text-center">Timetables and schedules undergo automated scrolling.</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
