import React, { useState } from 'react';
import { useSmartNoticeStore, storeEngine } from '../store';
import { DEPARTMENTS } from '../data';
import { Notice, MarqueeAlert, ThemeConfig, UserSession } from '../types';
import CollegeQRCode from './CollegeQRCode';
import { createNotice } from "../services/notices/noticeService";
import { createAlert } from "../services/alerts/alertService";
import { sendTelegramNotice } from "../services/telegram/telegramService";
import useScreens from "../hooks/useScreens";
import { login } from "../services/auth/authService";
import CaptchaWidget, { verifyCaptchaWithBackend, resetRecaptcha } from "./CaptchaWidget";
import { uploadPdfToStorage } from '../firebase/storage';
import { isValidPublicDocumentUrl } from '../utils/documentUrl';

import { 
  LayoutDashboard, 
  FileText, 
  Bell, 
  Paintbrush, 
  History, 
  Plus, 
  Trash2, 
  Archive, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Volume2, 
  ExternalLink,
  ChevronRight,
  Eye,
  LogOut,
  Sparkles,
  UploadCloud,
  CalendarRange
} from 'lucide-react';

interface AdminPortalProps {
  onLaunchKiosk: (dept: string) => void;
}

export default function AdminPortal({ onLaunchKiosk }: AdminPortalProps) {
  const store = useSmartNoticeStore();
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'notices' | 'alerts' | 'themes' | 'audit'>('dashboard');

  // Role Authentication variables (mock role-based permissions)
  const [currentUser, setCurrentUser] = useState<UserSession>(store.activeUser);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  // Real-time Firestore synchronized screens
  const liveScreens = useScreens();
  const displayedScreens = liveScreens.length > 0 ? liveScreens : store.screens;

  // Admin Authentication State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCaptchaToken, setAuthCaptchaToken] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const effectiveEmail = authEmail.trim();
    const effectivePassword = authPassword;

    if (!effectiveEmail || !effectivePassword) {
      setAuthError('Please enter your Admin Login ID and Password.');
      return;
    }

    if (!authCaptchaToken) {
      setAuthError('Please complete the Google reCAPTCHA verification checkbox.');
      return;
    }

    try {
      setAuthLoading(true);
      // 1. Google reCAPTCHA server verification via backend
      const captchaRes = await verifyCaptchaWithBackend(authCaptchaToken);
      if (!captchaRes.success) {
        setAuthError(captchaRes.error || 'reCAPTCHA verification failed. Please try again.');
        setAuthCaptchaToken('');
        resetRecaptcha();
        setAuthLoading(false);
        return;
      }

      // 2. Campus Admin Authentication
      await login(effectiveEmail, effectivePassword);

      // 3. Resolve role and department
      const lower = effectiveEmail.toLowerCase();
      let role: UserSession['role'] = 'dept-admin';
      let dept: string | undefined = undefined;

      if (lower.includes('super') || lower.includes('principal') || lower.includes('admin@nbkrist.org')) {
        role = 'super-admin';
      } else {
        const foundDept = DEPARTMENTS.find(d => lower.includes(d.toLowerCase()));
        dept = foundDept ? foundDept : 'CSE';
      }

      store.login(effectiveEmail, role, dept);
      setCurrentUser({ email: effectiveEmail, role, department: dept });
      setAuthCaptchaToken('');
    } catch (err: any) {
      console.error('Admin authentication failure:', err);
      setAuthError(err.message || 'Authentication failed. Please verify your credentials.');
      setAuthCaptchaToken('');
      resetRecaptcha();
    } finally {
      setAuthLoading(false);
    }
  };

  // Notice Creation Modal / Form State
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [pdfSourceMethod, setPdfSourceMethod] = useState<'text' | 'upload'>('text');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfUploadStatus, setPdfUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string>('');
  const [uploadedPdfFileName, setUploadedPdfFileName] = useState<string>('');
  const [noticeForm, setNoticeForm] = useState<{
    title: string;
    category: Notice['category'];
    type: 'image' | 'pdf';
    priority: Notice['priority'];
    departments: string[];
    url: string;
    imageUrl: string;
    pdfUrl: string;
    customContent: string;
    pdfPages: NonNullable<Notice['pdfPages']>;
  }>({
    title: '',
    category: 'circular',
    type: 'image',
    priority: 'normal',
    departments: ['ALL'],
    url: 'placement_drive', // predefined premium visual templates or 'custom'
    imageUrl: '', // Base64 or external url
    pdfUrl: '',
    customContent: '',
    pdfPages: [
      { pageNumber: 1, title: 'Document Title', content: ['Detailed content paragraph...'], pageImageUrl: '' }
    ]
  });

  // Alert Creation Form state
  const [alertForm, setAlertForm] = useState({
    text: '',
    priority: 'general' as MarqueeAlert['priority'],
    department: 'ALL'
  });

  // Custom Theme Builder state
  const [selectedThemeId, setSelectedThemeId] = useState<string>('light-college');
  const [customTheme, setCustomTheme] = useState<Omit<ThemeConfig, 'id'>>({
    name: 'My Custom Theme',
    mode: 'dark',
    bgType: 'gradient',
    bgColor: '#1e1b4b',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
    bgImageUrl: '',
    bgEffect: 'grid',
    primaryColor: '#06b6d4',
    secondaryColor: '#ec4899',
    accentColor: '#f59e0b',
    headerColor: 'linear-gradient(90deg, #1e1b4b 0%, #030712 100%)',
    cardColor: 'rgba(30, 41, 59, 0.7)',
    textColor: '#f8fafc',
    textColorSecondary: '#94a3b8',
    marqueeBg: '#e11d48',
    marqueeTextColor: '#ffffff',
    pdfBg: '#0f172a',
    posterBg: '#1e1b4b',
    glowEffect: true,
    glassmorphism: true,
    borderAnimated: true
  });

  const [applyTarget, setApplyTarget] = useState<'global' | 'CSE' | 'ECE' | 'EEE' | 'MECH' | 'CIVIL'>('global');

  // Theme Scheduler State Form
  const [scheduleForm, setScheduleForm] = useState({
    themeId: 'light-college',
    target: 'global' as any,
    startTime: '18:00',
    endTime: '08:00',
    notes: 'Campus Night-Shift power safe override'
  });

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    store.addThemeSchedule({
      themeId: scheduleForm.themeId,
      target: scheduleForm.target,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      isActive: true,
      notes: scheduleForm.notes
    });
    setScheduleForm({
      themeId: 'light-college',
      target: 'global',
      startTime: '18:00',
      endTime: '08:00',
      notes: 'Campus Night-Shift power safe override'
    });
  };

  // Handle saving customized theme
  const handleSaveTheme = () => {
    const customId = `theme-${Date.now()}`;
    const newTheme: ThemeConfig = {
      id: customId,
      ...customTheme
    };
    store.addTheme(newTheme);
    setSelectedThemeId(customId);
    
    // Auto-apply target
    if (applyTarget === 'global') {
      store.updateThemeGlobally(customId);
    } else {
      store.updateThemePerDepartment(applyTarget, customId);
    }
    
    alert(`Theme "${customTheme.name}" saved and applied ${applyTarget === 'global' ? 'globally' : 'to ' + applyTarget + ' department'} instantly!`);
  };

  const handleRoleChange = (role: 'super-admin' | 'dept-admin' | 'viewer', dept?: string) => {
    const email = role === 'super-admin' 
      ? '23kb1a3334@nbkrist.org' 
      : role === 'dept-admin' 
        ? `${dept?.toLowerCase() || 'cse'}.admin@nbkrist.org` 
        : 'guest@nbkrist.org';
    
    store.login(email, role, dept);
    setCurrentUser({ email, role, department: dept });
    setShowRoleSelector(false);
  };

  // Handle uploading and parsing a real PDF document
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document file (.pdf).');
      return;
    }

    setIsPdfLoading(true);
    setPdfUploadStatus('uploading');
    setPdfUploadError(null);
    setUploadedPdfFileName(file.name);

    // 1. Store the PDF in Firebase Storage and obtain the download URL
    let storageDownloadUrl = '';
    try {
      storageDownloadUrl = await uploadPdfToStorage(file);
      setUploadedPdfUrl(storageDownloadUrl);
      setPdfUploadStatus('success');
      setNoticeForm(prev => ({
        ...prev,
        pdfUrl: storageDownloadUrl,
        url: storageDownloadUrl
      }));
    } catch (storageErr: any) {
      console.error('Firebase Storage PDF upload error:', storageErr);
      const errMsg = storageErr?.message || 'Failed to upload PDF to Firebase Storage.';
      setPdfUploadError(errMsg);
      setPdfUploadStatus('error');
      alert(`Firebase Storage Upload Notice:\n${errMsg}\n\nPlease verify that Firebase Storage rules and bucket configuration permit PDF uploads.`);
    }

    // 2. Rasterize PDF pages via PDF.js for crisp on-screen kiosk rendering
    try {
      // Load PDFjs dynamically from secure CDN
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load secure Web PDF engine.'));
          document.head.appendChild(script);
        });
      }

      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const extractedPages = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // High resolution render
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport }).promise;
          const pageImageUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Extract text content if available for screen-reader / fallback search
          let textParagraphs: string[] = [];
          try {
            const textContext = await page.getTextContent();
            const textItems = textContext.items.map((item: any) => item.str).join(' ');
            if (textItems.trim()) {
              textParagraphs = textItems.split(/\s{2,}/).filter((s: string) => s.trim().length > 3);
            }
          } catch (err) {
            console.warn("Could not parse text on page", i, err);
          }

          extractedPages.push({
            pageNumber: i,
            title: noticeForm.title
              ? `${noticeForm.title} - Page ${i}`
              : `Official Circular Page ${i}`,
            content:
              textParagraphs.length > 0
                ? textParagraphs
                : [`View attached official circular document page ${i}.`],
            ...(pageImageUrl ? { pageImageUrl } : {})
          });
        }
      }

      setNoticeForm(prev => ({
        ...prev,
        pdfPages: extractedPages
      }));
      
    } catch (err: any) {
      console.warn("PDF rasterization note:", err);
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Submit Notice Action
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title) return;

    // Verify PDF upload completion if administrator selected PDF upload mode
    if (noticeForm.type === 'pdf' && pdfSourceMethod === 'upload') {
      if (isPdfLoading || pdfUploadStatus === 'uploading') {
        alert('Please wait for the PDF to complete uploading to Firebase Storage before publishing.');
        return;
      }
      if (!uploadedPdfUrl || !isValidPublicDocumentUrl(uploadedPdfUrl)) {
        alert('Please select and upload a valid PDF document to Firebase Storage before publishing. The download URL is required for mobile QR linking.');
        return;
      }
    }

    // Determine actual scannable document URL for mobile phone scan
    const resolvedDocUrl = noticeForm.type === 'pdf'
      ? (pdfSourceMethod === 'upload' && isValidPublicDocumentUrl(uploadedPdfUrl) ? uploadedPdfUrl : '')
      : (isValidPublicDocumentUrl(noticeForm.imageUrl) ? noticeForm.imageUrl : '');

    // Use uploaded pages if present and we are in upload mode
    const pages = noticeForm.type === 'pdf' 
      ? (pdfSourceMethod === 'upload' && noticeForm.pdfPages?.[0]?.pageImageUrl
          ? noticeForm.pdfPages
          : [
              {
                pageNumber: 1,
                title: noticeForm.title + ' - Reference',
                content: noticeForm.customContent.split('\n').filter(p => p.trim() !== '')
              }
            ]
        )
      : undefined;

    const newNotice: any = {
      title: noticeForm.title,
      category: noticeForm.category,
      type: noticeForm.type,
      priority: noticeForm.priority,
      department: noticeForm.departments,
      url: noticeForm.type === "pdf" ? (resolvedDocUrl || "custom_pdf") : noticeForm.url,
      pdfUrl: resolvedDocUrl || "",
      imageUrl: noticeForm.imageUrl || "",
      uploadedBy:
        currentUser.role === "super-admin"
          ? "Super Admin"
          : `${currentUser.department} Dept Admin`,
      startDateTime: new Date().toISOString(),
      endDateTime: new Date(
        Date.now() + 10 * 24 * 60 * 60 * 1000
      ).toISOString(),
      // Every notice/document must have its own QR code pointing to the actual Firebase Storage download URL
      qrCodeData: resolvedDocUrl || ""
    };

    if (noticeForm.type === "pdf") {
      newNotice.pdfPages = (pages || []).map((page: any) => ({
        pageNumber: page.pageNumber || 1,
        title: page.title || "",
        content: page.content || [],
        ...(page.pageImageUrl ? { pageImageUrl: page.pageImageUrl } : {}),
      }));
    }

    // Add to local/cached state store
    store.addNotice(newNotice);

    // Reset upload state for next notice
    setUploadedPdfUrl('');
    setUploadedPdfFileName('');
    setPdfUploadStatus('idle');
    setPdfUploadError(null);

    // Persist to Firestore if configured
    try {
      await createNotice(newNotice);
    } catch (err) {
      console.warn("Firestore notice save failed or offline:", err);
    }

    // Broadcast Telegram notice if configured
    try {
      const chatIds: Record<string, string> = {
        AIML: "-5281369270",
        CSE: "-5520023183",
        ECE: "-5494111938",
        EEE: "-5296368715",
        CIVIL: "-5278808277",
        MECHANICAL: "-5104471879",
      };
      const depts = newNotice.department || [];
      const targetDepts = depts.includes('ALL') ? Object.keys(chatIds) : depts;
      for (const dept of targetDepts) {
        const cid = chatIds[dept];
        if (cid) {
          sendTelegramNotice({
            chatId: cid,
            title: newNotice.title,
            description: newNotice.title,
            department: dept,
            priority: newNotice.priority
          }).catch((e: any) => console.warn("Telegram notification error:", e));
        }
      }
    } catch (err) {
      console.warn("Telegram dispatch error:", err);
    }

    // Reset Notice Creator Form
    setNoticeForm({
      title: '',
      category: 'circular',
      type: 'image',
      priority: 'normal',
      departments: ['ALL'],
      url: 'placement_drive',
      imageUrl: '',
      pdfUrl: '',
      customContent: '',
      pdfPages: [{ pageNumber: 1, title: 'Document Title', content: ['Detailed content paragraph...'] }]
    });

    setPdfSourceMethod('text');
    setIsNoticeModalOpen(false);
  };

  // Submit Alert Ticker action
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.text) return;

    store.addAlert({
      text: alertForm.text,
      priority: alertForm.priority,
      isActive: true,
      department: alertForm.department === 'ALL' ? ['ALL'] : [alertForm.department]
    });

    try {
      await createAlert({
        text: alertForm.text,
        priority: alertForm.priority,
        isActive: true,
        department: alertForm.department === 'ALL' ? ['ALL'] : [alertForm.department]
      });
    } catch (err) {
      console.warn("Firestore alert save failed or offline:", err);
    }

    setAlertForm({ text: '', priority: 'general', department: 'ALL' });
  };

  // Quick stats computed helper
  const stats = store.stats;

  // Active user permission guard checks
  const canModifyGlobal = currentUser.role === 'super-admin';
  const canModifyDept = (dept: string) => {
    if (currentUser.role === 'super-admin') return true;
    return currentUser.role === 'dept-admin' && currentUser.department === dept;
  };

  // 0. AUTHENTICATION GATE: If not authenticated or signed out, display Admin Login with Anti-bot CAPTCHA
  if (!currentUser?.email || currentUser?.role === 'viewer') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" id="admin-login-screen">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-lg text-white font-black text-sm tracking-tight shadow-md">
              NBKR
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-widest text-indigo-400">ADMIN CONTROL</span>
              <span className="block text-base font-bold text-white tracking-wide">Notice Board Portal</span>
            </div>
          </div>

          <p className="text-center text-slate-400 text-xs mb-6">
            Authorized administrator authentication required for publishing bulletins, urgent alerts, and managing department TV displays.
          </p>

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="portal-login-id">
                Admin Login ID / Campus Email
              </label>
              <input
                id="portal-login-id"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@nbkrist.org"
                className="w-full p-3 rounded-lg bg-slate-850 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="portal-password">
                Password
              </label>
              <input
                id="portal-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full p-3 rounded-lg bg-slate-850 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            {/* Anti-bot security verification */}
            <div className="pt-1">
              <CaptchaWidget
                onVerify={(token) => setAuthCaptchaToken(token)}
                onExpire={() => setAuthCaptchaToken('')}
                disabled={authLoading}
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg text-rose-300 text-xs font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              id="admin-portal-login-btn"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 p-3 rounded-lg font-bold text-white transition text-sm shadow-md"
            >
              {authLoading ? "Authenticating..." : "Sign In to Admin Portal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      
      {/* 1. LEFT ADMIN CONTROL SIDEBAR */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Top college banner segment */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="p-1 px-1.5 bg-blue-600 rounded text-xs font-black tracking-tight">NBKR</div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-widest text-blue-400">ADMIN CONTROL</span>
              <span className="block text-[14px] font-bold text-white tracking-wide">Notice Board Portal</span>
            </div>
          </div>

          {/* User Session Profile Segment */}
          <div className="p-4 bg-slate-900/60 m-3 rounded-lg border border-slate-800 relative">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {currentUser.role === 'super-admin' ? 'SA' : 'DA'}
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs text-slate-400 truncate font-semibold" title={currentUser.email}>
                  {currentUser.email}
                </span>
                <span className="inline-flex items-center gap-1 bg-blue-900/40 text-blue-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase mt-1">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                  {currentUser.role}
                </span>
                {currentUser.department && (
                  <span className="block text-[9px] text-amber-400 font-mono mt-0.5 font-bold">
                    DEPT: {currentUser.department}
                  </span>
                )}
              </div>
            </div>

            {/* Change Profile Trigger */}
            <button 
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="mt-3 w-full text-[10px] font-mono text-center text-indigo-400 hover:text-indigo-300 bg-slate-950 hover:bg-slate-900 py-1 rounded transition border border-indigo-900/50"
            >
              Impersonate College Roles
            </button>

            {showRoleSelector && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-950 border border-slate-800 rounded-lg shadow-xl p-2 z-40 space-y-1">
                <button 
                  onClick={() => handleRoleChange('super-admin')}
                  className="w-full text-[10px] text-left p-1.5 hover:bg-slate-900 text-emerald-400 font-bold block rounded"
                >
                  👑 Super Admin (Full College)
                </button>
                <button 
                  onClick={() => handleRoleChange('dept-admin', 'CSE')}
                  className="w-full text-[10px] text-left p-1.5 hover:bg-slate-900 text-blue-300 block rounded"
                >
                  💻 CSE Dept Admin (Computer Science)
                </button>
                <button 
                  onClick={() => handleRoleChange('dept-admin', 'ECE')}
                  className="w-full text-[10px] text-left p-1.5 hover:bg-slate-900 text-purple-300 block rounded"
                >
                  ⚡ ECE Dept Admin (Electronics)
                </button>
                <button 
                  onClick={() => handleRoleChange('viewer')}
                  className="w-full text-[10px] text-left p-1.5 hover:bg-slate-900 text-slate-400 block rounded"
                >
                  👁️ Guest Student / Viewer
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Statistics</span>
            </button>

            <button
              onClick={() => setActiveTab('notices')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'notices' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Circulars & Poster Slates</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'alerts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Ticker Marquee Alerts</span>
            </button>

            <button
              onClick={() => setActiveTab('themes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'themes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              <span>Signage Theme Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Action Audit History</span>
            </button>
          </nav>
        </div>

        {/* Bottom Switcher launcher trigger */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-center">
            <p className="text-[10px] font-mono font-bold text-emerald-400">TELEVISION MONITORS</p>
            <p className="text-[8px] text-slate-400 leading-tight mt-0.5">Launches autonomous full-screen Kiosk display models</p>
          </div>
          <button 
            onClick={() => onLaunchKiosk(currentUser.department || 'ALL')}
            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 px-3 rounded text-xs transition shadow-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Launch Display Kiosk</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN ADMIN CONTENT WORKSPACE */}
      <main className="flex-1 bg-slate-900 overflow-y-auto p-8 relative">
        
        {/* UPPER BANNER INFORMATION */}
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>NBKRIST Digital Signage Core Hub</span>
              <span className="text-[10px] font-mono bg-indigo-900/60 border border-indigo-700/30 text-indigo-300 font-bold px-2 py-0.5 rounded tracking-widest uppercase">
                Enterprise Node v3.0
              </span>
            </h2>
            <p className="text-slate-400 text-xs mt-1.5">
              Control and broadcast academic bulletins, timetables, active alerts, and glassmorphic canvas styles to campus displays instantly.
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => {
                store.logout();
                setCurrentUser({ email: '', role: 'viewer' });
              }}
              className="flex items-center gap-1 bg-slate-950 hover:bg-slate-800 outline-none p-2 rounded text-slate-300 text-xs border border-slate-800 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" /> Sign Out
            </button>
          </div>
        </header>

        {/* CONTENT CHANNELS */}

        {/* =========================================================
            TAB A: DASHBOARD VIEW
           ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Quick stats tally widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all shadow-md">
                <p className="text-[10px] font-bold text-blue-400 font-mono">TOTAL SYSTEM NOTICES</p>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-3xl font-bold font-mono text-white">{stats.totalNotices}</span>
                  <span className="text-xs text-slate-500">Active circulars</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md">
                <p className="text-[10px] font-bold text-indigo-400 font-mono">IMAGE POSTER SLATES</p>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-3xl font-bold font-mono text-white">{stats.totalPosters}</span>
                  <span className="text-xs text-slate-500">Event banners</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-rose-500/50 transition-all shadow-md">
                <p className="text-[10px] font-bold text-rose-400 font-mono">ACTIVE TICKER ALERTS</p>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-3xl font-bold font-mono text-rose-400">{stats.activeAlerts}</span>
                  <span className="text-xs text-rose-500 font-semibold animate-pulse">Scrolling live</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-all shadow-md">
                <p className="text-[10px] font-bold text-emerald-400 font-mono">ONLINE TV DISPLAYS</p>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-3xl font-bold font-mono text-emerald-400">{stats.activeScreens}</span>
                  <span className="text-xs text-emerald-500/70 font-semibold">Synced grid</span>
                </div>
              </div>
            </div>

            {/* Simulated Data Analytics & Screen Grid Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* College Distribution SVG Graph */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Notice Statistics per Department</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Visual graph representation of publications</p>
                </div>

                {/* Pure custom highly accessible elegant SVG chart bar layout */}
                <div className="py-4 h-48 flex items-end justify-between gap-2 border-b border-slate-800 px-4 mt-2">
                  {Object.entries(stats.deptDistribution).length > 0 ? (
                    Object.entries(stats.deptDistribution).map(([dept, count], i) => {
                      const heights = [10, 40, 80, 110, 50, 70, 95];
                      const computedHeight = heights[i % heights.length];
                      return (
                        <div key={dept} className="flex-1 flex flex-col items-center gap-1.5 group">
                          <span className="text-[9px] font-bold font-mono text-indigo-400 opacity-0 group-hover:opacity-100 transition duration-200">
                            {count} Items
                          </span>
                          <div 
                            style={{ height: `${computedHeight}px` }} 
                            className="w-full max-w-[28px] bg-gradient-to-t from-blue-700 to-indigo-500 rounded-t shadow-inner group-hover:from-indigo-500 group-hover:to-cyan-400 transition-colors"
                          />
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">{dept}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="w-full text-center py-10 font-mono text-xs text-slate-500">
                      No notice items tracked yet.
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 italic pt-2 pl-1 select-none">
                  💡 *HOD offices synchronized. All screens check priorities before rotating slates.*
                </div>
              </div>

              {/* Real-time Display Status Monitors */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white tracking-wide">Live Department Television Monitors</h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                    Heartbeat: 30s
                  </span>
                </div>
                <div className="space-y-3 max-h-56 overflow-y-auto">
                  {displayedScreens.map((screen: any) => (
                    <div 
                      key={screen.id || screen.deviceId || screen.name} 
                      className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg flex items-center justify-between hover:bg-slate-850 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${screen.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{screen.name}</span>
                            {screen.deviceId && (
                              <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-1 rounded">
                                {screen.deviceId}
                              </span>
                            )}
                          </p>
                          <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase">
                            DEPT: {screen.department} {screen.lastSeen ? '• Active' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono py-0.5 px-2 rounded border font-semibold ${
                          screen.status === 'online'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                            : 'bg-slate-950 text-slate-500 border-slate-800/80'
                        }`}>
                          {screen.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        <button
                          onClick={() => onLaunchKiosk(screen.department)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-2 rounded text-[10px] transition cursor-pointer"
                        >
                          👁️ View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Detailed Instructions Box for College Admins */}
            <div className="bg-gradient-to-r from-blue-950 border border-blue-500/20 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow">
              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px] font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> ENTERPRISE COLLEGE TV COMMISSIONING
                </div>
                <h4 className="text-base font-bold text-white tracking-tight leading-none">
                  Offline Compilation, Raspberry Pi and Windows Display EXE Files
                </h4>
                <p className="text-slate-400 text-xs">
                  This system generates unique display binaries including <strong>NBKR_CSE_Display.exe</strong>, <strong>NBKR_ECE_Display.exe</strong> etc. 
                  Deploy any display model on monitors, TV panels, or smart Raspberry Pi nodes. When changes are made, they instantly update!
                </p>
              </div>
              <button
                onClick={() => onLaunchKiosk('ALL')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs py-2.5 px-4 rounded transition shrink-0"
              >
                PROMPT ALL SCREENS KIOSK
              </button>
            </div>

          </div>
        )}

        {/* =========================================================
            TAB B: MANAGE NOTICES / CIRCULARS LAB
           ========================================================= */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            
            {/* Top controls and launch modal trigger */}
            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Active Notices Drawer</h3>
                <p className="text-[10px] text-slate-400">Total list of high priority bulletins, placement fliers, and exam schedules.</p>
              </div>
              <button 
                onClick={() => setIsNoticeModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded text-xs flex items-center gap-1.5 shadow-lg"
              >
                <Plus className="w-4 h-4" /> Publish Circular/Poster
              </button>
            </div>

            {/* Notice creation wizard overlay modal */}
            {isNoticeModalOpen && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-slate-950 border border-slate-800 max-w-2xl w-full rounded-xl p-6 shadow-2xl overflow-y-auto max-h-[85vh]">
                  
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">Publish New College Notice</h4>
                      <p className="text-xs text-slate-400">Create either high fidelity visuals or full-scrolling PDF letterheads.</p>
                    </div>
                    <button 
                      onClick={() => setIsNoticeModalOpen(false)}
                      className="text-slate-400 hover:text-slate-200 text-xs font-mono font-bold"
                    >
                      [CLOSE]
                    </button>
                  </div>

                  <form onSubmit={handleCreateNotice} className="space-y-4">
                    
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Notice Title / Announcement Heading *</label>
                      <input 
                        type="text" 
                        required
                        value={noticeForm.title}
                        onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. TCS & Cognizant Joint Recruitment Phase 1 Commences"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Notice category</label>
                        <select 
                          value={noticeForm.category}
                          onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value as Notice['category'] })}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs focus:outline-none"
                        >
                          <option value="circular">Circular / Official Notification</option>
                          <option value="placement">Placement Info & Recruitment Flier</option>
                          <option value="event">Workshop / Technical Symposium</option>
                          <option value="timetable">Academic Class Timetable</option>
                          <option value="exam">Examination Center Schedule</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Display Priority level</label>
                        <select 
                          value={noticeForm.priority}
                          onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value as Notice['priority'] })}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs focus:outline-none text-amber-400 font-bold"
                        >
                          <option value="normal">🟢 Normal Priority (10s rotate duration)</option>
                          <option value="medium">🔵 Medium Priority (15s rotate duration)</option>
                          <option value="high">🟡 High Priority (30s rotate duration)</option>
                          <option value="emergency">🔴 Emergency Command Override (Immediate 100% full height blocking)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Target Department Screens</label>
                        <div className="bg-slate-900 border border-slate-800 rounded p-2 max-h-24 overflow-y-auto space-y-1">
                          <label className="flex items-center gap-1.5 text-xs text-indigo-300 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={noticeForm.departments.includes('ALL')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNoticeForm({ ...noticeForm, departments: ['ALL'] });
                                } else {
                                  setNoticeForm({ ...noticeForm, departments: ['CSE'] });
                                }
                              }}
                            />
                            <span>All College Screens (Global)</span>
                          </label>
                          {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA'].map(dept => (
                            <label key={dept} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={noticeForm.departments.includes(dept)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNoticeForm({
                                      ...noticeForm,
                                      departments: noticeForm.departments.filter(d => d !== 'ALL').concat(dept)
                                    });
                                  } else {
                                    const nextDepts = noticeForm.departments.filter(d => d !== dept);
                                    setNoticeForm({
                                      ...noticeForm,
                                      departments: nextDepts.length === 0 ? ['ALL'] : nextDepts
                                    });
                                  }
                                }}
                              />
                              <span>{dept} Department Display</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Notice Format Model (Type) *</label>
                        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex gap-4 text-xs font-semibold">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="format"
                              checked={noticeForm.type === 'image'}
                              onChange={() => setNoticeForm({ ...noticeForm, type: 'image' })} 
                            />
                            <span>🖼️ Interactive Banner/Poster</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="format"
                              checked={noticeForm.type === 'pdf'}
                              onChange={() => setNoticeForm({ ...noticeForm, type: 'pdf' })} 
                            />
                            <span>📄 Auto-scroll PDF Letterhead</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Left Section Template selectors if Image type */}
                    {noticeForm.type === 'image' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">Poster Source Method</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setNoticeForm({ ...noticeForm, url: 'placement_drive' })}
                              className={`py-1.5 px-3 rounded text-xs font-bold border ${
                                noticeForm.url !== 'custom_upload'
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              🎨 Design Templates
                            </button>
                            <button
                              type="button"
                              onClick={() => setNoticeForm({ ...noticeForm, url: 'custom_upload' })}
                              className={`py-1.5 px-3 rounded text-xs font-bold border ${
                                noticeForm.url === 'custom_upload'
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              📤 Upload Flyer Image
                            </button>
                          </div>
                        </div>

                        {noticeForm.url !== 'custom_upload' ? (
                          <div>
                            <label className="block text-xs font-mono text-slate-400 mb-1">Select Smart Theme Template</label>
                            <select 
                              value={noticeForm.url}
                              onChange={(e) => setNoticeForm({ ...noticeForm, url: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs focus:outline-none"
                            >
                              <option value="placement_drive">🎓 TCS & Cognizant Joint Placement drive slate</option>
                              <option value="conference_banner">⚡ Adhyayan 2026 Student Coding Hackathon</option>
                              <option value="mech_auto_expo_banner">⚙️ MECH-AUTO Expo Electric Karts banner</option>
                              <option value="custom_info">💡 Customized General System Card template</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="border border-dashed border-slate-700 bg-slate-905 hover:bg-slate-900 hover:border-slate-500 transition rounded-xl p-4 flex flex-col items-center justify-center relative cursor-pointer group">
                              <input 
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setNoticeForm({ ...noticeForm, imageUrl: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition mb-2" />
                              <span className="text-xs font-semibold text-slate-350">Drag & Drop or Click to Select circular flyer</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Supports PNG, JPG, WEBP (Max 5MB)</span>
                            </div>

                            <div>
                              <p className="text-[9px] text-slate-500 text-center uppercase tracking-wider font-mono my-1">- OR PASTE WEB IMAGE URL -</p>
                              <input 
                                type="url"
                                placeholder="e.g. https://college-portal.com/image.png"
                                value={noticeForm.imageUrl.startsWith('data:') ? '' : noticeForm.imageUrl}
                                onChange={(e) => setNoticeForm({ ...noticeForm, imageUrl: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs focus:outline-none"
                              />
                            </div>

                            {noticeForm.imageUrl && (
                              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <img 
                                    src={noticeForm.imageUrl} 
                                    alt="Preview" 
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 object-cover rounded border border-slate-700 shrink-0"
                                  />
                                  <div className="overflow-hidden">
                                    <span className="block text-[9px] font-mono font-bold text-emerald-400 leading-none">✅ ATTACHED SUCCESSFULLY</span>
                                    <span className="block text-[8px] text-slate-500 truncate mt-0.5 max-w-[220px]">{noticeForm.imageUrl.slice(0, 50)}...</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setNoticeForm({ ...noticeForm, imageUrl: '' })}
                                  className="text-xs text-rose-500 hover:text-rose-400 font-mono font-bold shrink-0"
                                >
                                  [REMOVE]
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">PDF Document Source</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPdfSourceMethod('text')}
                              className={`py-1.5 px-3 rounded text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-250 ${
                                pdfSourceMethod === 'text'
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              💻 Simulate via Text
                            </button>
                            <button
                              type="button"
                              onClick={() => setPdfSourceMethod('upload')}
                              className={`py-1.5 px-3 rounded text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-250 ${
                                pdfSourceMethod === 'upload'
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              📁 Upload Real PDF
                            </button>
                          </div>
                        </div>

                        {pdfSourceMethod === 'text' ? (
                          <div>
                            <label className="block text-xs font-mono text-slate-400 mb-1">PDF Page content text (Simulated page contents - separated by linebreaks) *</label>
                            <textarea 
                              required
                              rows={4}
                              value={noticeForm.customContent}
                              onChange={(e) => setNoticeForm({ ...noticeForm, customContent: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs focus:outline-none font-mono"
                              placeholder="Type circular paragraph block here. Each separate paragraph becomes beautifully paginated and automatically scroll-rendered in the PDF reader segment."
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="border border-dashed border-slate-700 bg-slate-900 hover:bg-slate-900/60 hover:border-slate-500 transition rounded-xl p-6 flex flex-col items-center justify-center relative cursor-pointer group min-h-[140px]">
                              <input 
                                type="file"
                                accept="application/pdf"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={handlePdfUpload}
                                disabled={isPdfLoading}
                              />
                              {isPdfLoading ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                  <div className="w-8 h-8 rounded-full border-2 border-t-cyan-400 border-slate-700 animate-spin mb-2" />
                                  <span className="text-xs font-medium text-slate-300">Uploading to Firebase Storage & Rasterizing...</span>
                                  <span className="text-[9px] text-slate-500 mt-1 font-mono">Generating secure download URL & QR mapping</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-center">
                                  <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition mb-2" />
                                  <span className="text-xs font-semibold text-slate-350">Drag & Drop or Click to Select institutional PDF</span>
                                  <span className="text-[9px] text-slate-500 mt-0.5">Uploads to Firebase Storage and generates mobile download QR</span>
                                </div>
                              )}
                            </div>

                            {/* Storage upload error notice */}
                            {pdfUploadError && (
                              <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span className="font-mono text-[10px] leading-tight">{pdfUploadError}</span>
                              </div>
                            )}

                            {noticeForm.pdfPages && noticeForm.pdfPages.length > 0 && noticeForm.pdfPages[0].pageImageUrl && (
                              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="bg-red-950/40 text-red-400 p-1.5 rounded border border-red-500/20 text-xs font-mono font-bold shrink-0">
                                      PDF
                                    </div>
                                    <div className="overflow-hidden">
                                      <span className="block text-[9px] font-mono font-bold text-emerald-400 leading-none">
                                        {uploadedPdfUrl ? '✅ STORED IN FIREBASE STORAGE & QR LINKED' : '✅ RASTERIZED SUCCESSFULLY'}
                                      </span>
                                      <span className="block text-[10px] text-slate-300 truncate mt-0.5 max-w-[220px]">
                                        {uploadedPdfFileName || noticeForm.title || "Attached Document"} ({noticeForm.pdfPages.length} Pages)
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUploadedPdfUrl('');
                                      setUploadedPdfFileName('');
                                      setPdfUploadStatus('idle');
                                      setPdfUploadError(null);
                                      setNoticeForm(prev => ({
                                        ...prev,
                                        pdfUrl: '',
                                        pdfPages: [{ pageNumber: 1, title: 'Document Title', content: ['Detailed content paragraph...'] }]
                                      }));
                                    }}
                                    className="text-xs text-rose-500 hover:text-rose-400 font-mono font-bold shrink-0"
                                  >
                                    [REMOVE]
                                  </button>
                                </div>

                                {/* Thumbnail preview of resolved pages */}
                                <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none max-h-16">
                                  {noticeForm.pdfPages.map((page, idx) => (
                                    <div key={idx} className="relative shrink-0 w-9 h-12 bg-white rounded border border-slate-705 overflow-hidden shadow-sm hover:scale-105 transition-transform duration-150">
                                      <img src={page.pageImageUrl} alt={`p${idx}`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[7px] text-center font-mono py-0.5 text-white/90">
                                        P{page.pageNumber}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                      <button 
                        type="button"
                        onClick={() => setIsNoticeModalOpen(false)}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-400 py-2 px-3 rounded text-xs transition border border-slate-800"
                      >
                        Nevermind
                      </button>
                      <button 
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded text-xs transition"
                      >
                        Publish Instantly
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

            {/* List and manage current notices */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Circular Dashboard Slates</span>
                <span className="text-[10px] font-mono text-slate-400">Archived notices automatically rotate into memory cache.</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">Title & Type</th>
                      <th className="p-4">Departments</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Priority (Timer)</th>
                      <th className="p-4">Issued By</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {store.notices.map((notice) => (
                      <tr 
                        key={notice.id} 
                        className={`hover:bg-slate-900/30 transition ${notice.isArchived ? 'opacity-50 line-through bg-slate-950' : ''}`}
                      >
                        <td className="p-4 flex flex-col">
                          <span className="font-bold text-white text-[13px]">{notice.title}</span>
                          <span className="text-[9px] font-mono text-indigo-400 mt-0.5 flex items-center gap-1">
                            {notice.type === 'pdf' ? '📄 Simulated PDF Circular' : '🖼️ Event Presentation Slate'}
                            {notice.isArchived && <span className="bg-amber-950 text-amber-400 px-1.5 py-0.2 rounded font-black">[ARCHIVED]</span>}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono bg-slate-900 text-slate-300 py-0.5 px-2 rounded font-bold border border-slate-800">
                            {notice.department.join(', ')}
                          </span>
                        </td>
                        <td className="p-4 uppercase font-mono font-bold text-slate-400">
                          {notice.category}
                        </td>
                        <td className="p-4">
                          <span 
                            className={`px-2 py-0.5 rounded font-bold font-mono uppercase text-[9px] ${
                              notice.priority === 'emergency' 
                                ? 'bg-rose-950 text-rose-400 border border-rose-900/60' 
                                : notice.priority === 'high' 
                                  ? 'bg-amber-950 text-amber-400 border border-amber-900/60' 
                                  : notice.priority === 'medium' 
                                    ? 'bg-blue-900/40 text-blue-300' 
                                    : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            {notice.priority} {notice.priority === 'high' ? '(30s)' : notice.priority === 'medium' ? '(15s)' : '(10s)'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 truncate max-w-[150px]" title={notice.uploadedBy}>
                          {notice.uploadedBy}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {notice.isArchived ? (
                              <button
                                onClick={() => store.restoreNotice(notice.id)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition"
                                title="Restore Notice"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => store.archiveNotice(notice.id)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition"
                                title="Archive Notice"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => store.deleteNotice(notice.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500 transition"
                              title="Delete notice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            TAB C: MARQUEE ALERTS COMMISSIONER
           ========================================================= */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left controller: Publish Alert */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                <Bell className="text-rose-400" />
                <span>Publish Marquee Alert</span>
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                These short alert items ticker-scroll at the screen top marquee banner. Emergency broadcasts alert TVs instantly via speakers.
              </p>

              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Scrolling Alert text *</label>
                  <textarea 
                    required
                    rows={3}
                    value={alertForm.text}
                    onChange={(e) => setAlertForm({ ...alertForm, text: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs focus:outline-none"
                    placeholder="Type alert heading or notice instructions..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Target</label>
                    <select
                      value={alertForm.department}
                      onChange={(e) => setAlertForm({ ...alertForm, department: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs focus:outline-none"
                    >
                      <option value="ALL">All Screens (College)</option>
                      {DEPARTMENTS.filter(d => d !== 'GENERAL').map(dept => (
                        <option key={dept} value={dept}>{dept} dept</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Priority Style</label>
                    <select
                      value={alertForm.priority}
                      onChange={(e) => setAlertForm({ ...alertForm, priority: e.target.value as MarqueeAlert['priority'] })}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs focus:outline-none font-bold"
                    >
                      <option value="general">🔵 General (Blue bar)</option>
                      <option value="important">🟠 Important (Orange bar)</option>
                      <option value="emergency">🔴 Emergency (Red background)</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded text-xs transition shadow-lg mt-2"
                >
                  Publish Marquee Now
                </button>
              </form>
            </div>

            {/* Right: Active Alert Tickers manager */}
            <div className="col-span-2 bg-slate-950 p-5 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3">Live Alerts Ledger</h3>
              <div className="space-y-3">
                {store.alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span 
                          className={`text-[8px] font-bold font-mono px-1.5 py-0.2 rounded uppercase ${
                            alert.priority === 'emergency' 
                              ? 'bg-rose-955 text-rose-300 border border-rose-900' 
                              : alert.priority === 'important' 
                                ? 'bg-amber-900/60 text-amber-300' 
                                : 'bg-blue-900/40 text-blue-300'
                          }`}
                        >
                          {alert.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target: {alert.department.join(', ')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-100 italic">"{alert.text}"</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-800 pl-3">
                      <button 
                        onClick={() => store.toggleAlertActive(alert.id)}
                        className={`text-[9px] font-mono py-1 px-2 rounded font-bold transition ${
                          alert.isActive 
                            ? 'bg-emerald-600 text-slate-950' 
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {alert.isActive ? 'ACTIVE' : 'MUTED'}
                      </button>

                      <button 
                        onClick={() => store.deleteAlert(alert.id)}
                        className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            TAB D: THEME BUILDER LAB & PALETTE CONFIG
           ========================================================= */}
        {activeTab === 'notices' ? null : activeTab === 'themes' && (
          <div className="space-y-6">
            
            {/* Selected active display screen control card */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3">Notice Board Canvas Themes and Palettes</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Configure colors, floating grids, matrices or glowing frames. Theme switching happens instantly on all connected college TV panels via local Web sockets / Broadcast.
              </p>

              {/* Theme Selector Presets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {store.themes.map((theme) => (
                  <div 
                    key={theme.id}
                    onClick={() => {
                      setSelectedThemeId(theme.id);
                      setCustomTheme(theme);
                    }}
                    className={`cursor-pointer p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                      selectedThemeId === theme.id 
                        ? 'bg-blue-900/20 border-blue-500 shadow-md ring-1 ring-blue-500' 
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-bold text-white leading-tight">{theme.name}</span>
                      <span className="inline-flex items-center gap-1 bg-white/5 text-slate-400 text-[8px] px-1 py-0.2 rounded font-mono mt-1 font-bold uppercase">
                        {theme.mode} • {theme.bgType}
                      </span>
                    </div>

                    <div className="flex gap-1.5 mt-3 select-none">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: theme.primaryColor }} />
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: theme.secondaryColor }} />
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: theme.bgColor }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Customize Theme Color Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900/60 p-5 rounded-lg border border-slate-800/80">
                
                {/* 1. Theme Identity */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 border-b border-slate-800 pb-1.5 font-mono">Properties & Overlay</h4>
                  
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Theme Name Identifier *</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                      value={customTheme.name}
                      onChange={(e) => setCustomTheme({ ...customTheme, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Color Mode Profile</label>
                    <div className="flex gap-2">
                      {['light', 'dark'].map(m => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setCustomTheme({ ...customTheme, mode: m as 'light' | 'dark' })}
                          className={`flex-1 py-1 px-3 text-xs rounded font-bold uppercase transition ${
                            customTheme.mode === m 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {m} Theme
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Background Category</label>
                    <div className="flex gap-2">
                      {['solid', 'gradient', 'animated'].map(bt => (
                        <button
                          type="button"
                          key={bt}
                          onClick={() => setCustomTheme({ ...customTheme, bgType: bt as any })}
                          className={`flex-1 py-1 px-2 text-[10px] rounded font-bold uppercase transition ${
                            customTheme.bgType === bt 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {bt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Canvas Animation Overlay</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none"
                      value={customTheme.bgEffect}
                      onChange={(e) => setCustomTheme({ ...customTheme, bgEffect: e.target.value as any })}
                    >
                      <option value="none">No animated overlay (Static)</option>
                      <option value="grid">💻 Technology Digital grid</option>
                      <option value="particles">🌌 Connected smart particles</option>
                      <option value="dots">⚡ Moving electrical points</option>
                      <option value="cyber">🔐 Cyber crypt circuit grids</option>
                      <option value="waves">🌊 Abstract sinusoidal waves</option>
                    </select>
                  </div>
                </div>

                {/* 2. Custom Color Pickers */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 border-b border-slate-800 pb-1.5 font-mono">Palette Color Fields</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-450 uppercase mb-0.5">Primary Color (Hex)</label>
                      <div className="flex gap-1">
                        <input type="color" value={customTheme.primaryColor} onChange={(e) => setCustomTheme({ ...customTheme, primaryColor: e.target.value })} className="w-6 h-6 border-none cursor-pointer bg-transparent" />
                        <input type="text" value={customTheme.primaryColor} onChange={(e) => setCustomTheme({ ...customTheme, primaryColor: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] p-0.5 text-center" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-455 uppercase mb-0.5">Secondary Color</label>
                      <div className="flex gap-1">
                        <input type="color" value={customTheme.secondaryColor} onChange={(e) => setCustomTheme({ ...customTheme, secondaryColor: e.target.value })} className="w-6 h-6 border-none cursor-pointer bg-transparent" />
                        <input type="text" value={customTheme.secondaryColor} onChange={(e) => setCustomTheme({ ...customTheme, secondaryColor: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] p-0.5 text-center" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-455 uppercase mb-0.5">Static Canvas Bg</label>
                      <div className="flex gap-1">
                        <input type="color" value={customTheme.bgColor} onChange={(e) => setCustomTheme({ ...customTheme, bgColor: e.target.value })} className="w-6 h-6 border-none cursor-pointer bg-transparent" />
                        <input type="text" value={customTheme.bgColor} onChange={(e) => setCustomTheme({ ...customTheme, bgColor: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] p-0.5 text-center" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-455 uppercase mb-0.5">Canvas Gradient</label>
                      <textarea rows={1} value={customTheme.bgGradient} onChange={(e) => setCustomTheme({ ...customTheme, bgGradient: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded text-[9px] p-1 font-mono focus:outline-none" />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-455 uppercase mb-0.5">Card Solid color</label>
                      <input type="text" value={customTheme.cardColor} onChange={(e) => setCustomTheme({ ...customTheme, cardColor: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] p-1 text-center font-mono" />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-455 uppercase mb-0.5">Core Text hex</label>
                      <div className="flex gap-1">
                        <input type="color" value={customTheme.textColor} onChange={(e) => setCustomTheme({ ...customTheme, textColor: e.target.value })} className="w-6 h-6 border-none cursor-pointer bg-transparent" />
                        <input type="text" value={customTheme.textColor} onChange={(e) => setCustomTheme({ ...customTheme, textColor: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] p-0.5 text-center" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Gradient Header Spec</label>
                    <textarea rows={1} value={customTheme.headerColor} onChange={(e) => setCustomTheme({ ...customTheme, headerColor: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded text-[9px] p-1 font-mono focus:outline-none" />
                  </div>
                </div>

                {/* 3. Aesthetic enhancements & dispatch controls */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 border-b border-slate-800 pb-1.5 font-mono">Special Enhancements</h4>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input type="checkbox" checked={customTheme.glowEffect} onChange={(e) => setCustomTheme({ ...customTheme, glowEffect: e.target.checked })} />
                      <span>✨ Neon Outer Glow Overlay</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input type="checkbox" checked={customTheme.glassmorphism} onChange={(e) => setCustomTheme({ ...customTheme, glassmorphism: e.target.checked })} />
                      <span>🧪 Glassmorphism Cards (Blur background)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input type="checkbox" checked={customTheme.borderAnimated} onChange={(e) => setCustomTheme({ ...customTheme, borderAnimated: e.target.checked })} />
                      <span>🧬 Pulsating / Animated Borders</span>
                    </label>
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <label className="block text-[10px] font-mono text-slate-400 mb-1.5">Apply Broadcast Target Screen</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-amber-400 font-bold focus:outline-none mb-3"
                      value={applyTarget}
                      onChange={(e) => setApplyTarget(e.target.value as any)}
                    >
                      <option value="global">🌍 Globally (Apply to all screens)</option>
                      <option value="CSE">💻 Computer Science (CSE) Screens only</option>
                      <option value="ECE">⚡ Electronics (ECE) Screens only</option>
                      <option value="EEE">💡 Electrical (EEE) Screens only</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleSaveTheme}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 px-3 rounded text-xs transition shadow-lg"
                    >
                      Apply & Save Custom Theme
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Real-time Theme Preview & Scheduling Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Live Visual Canvas Previewer */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="text-cyan-400 w-4 h-4" />
                    <span>Real-time Visual Preset Preview</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Instantly inspect typography pairs, card blur overlay, and glow effects on simulated TV displays.
                  </p>
                </div>

                {/* Simulated Display Frame mockup */}
                <div 
                  className={`w-full aspect-video rounded-lg p-2.5 flex flex-col justify-between relative overflow-hidden select-none transition-all duration-300 ${
                    customTheme.glowEffect ? 'shadow-[0_0_15px_rgba(30,144,255,0.25)] border-indigo-550' : 'border-slate-800'
                  } border`}
                  style={{
                    backgroundColor: customTheme.bgColor,
                    backgroundImage: customTheme.bgType === 'gradient' ? customTheme.bgGradient : undefined,
                  }}
                >
                  {/* Neon flow overlay simulation */}
                  {customTheme.bgType === 'animated' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-blue-900/10 to-transparent animate-pulse pointer-events-none" />
                  )}

                  {/* 1. Header Segment Mockup */}
                  <div 
                    className="p-1 px-2.5 rounded-md flex justify-between items-center text-[10px] font-bold"
                    style={{ background: customTheme.headerColor, color: customTheme.textColor }}
                  >
                    <span className="tracking-tight uppercase">NBKRIST Campus Bulletin</span>
                    <span className="font-mono text-[8px] opacity-80 font-bold">14:25:00 UTC</span>
                  </div>

                  {/* 2. Main Content Split mockup */}
                  <div className="grid grid-cols-2 gap-2 my-2 flex-grow">
                    
                    {/* Simulated Notice Banner */}
                    <div 
                      className={`p-2 rounded-lg flex flex-col justify-between transition text-left ${
                        customTheme.glassmorphism ? 'backdrop-blur-md' : ''
                      } ${customTheme.borderAnimated ? 'border-indigo-500/35 border animate-pulse' : 'border-slate-800/10'}`}
                      style={{ backgroundColor: customTheme.cardColor }}
                    >
                      <div>
                        <span className="text-[7px] font-bold font-mono px-1 rounded inline-block" style={{ backgroundColor: customTheme.primaryColor, color: '#fff' }}>
                          PLACEMENT
                        </span>
                        <h5 className="text-[9px] font-black tracking-tight leading-tight mt-0.5" style={{ color: customTheme.textColor }}>
                          Grand Campus Recruitment Drive 2026
                        </h5>
                        <p className="text-[7px] mt-0.5 line-clamp-2" style={{ color: customTheme.textColorSecondary }}>
                          Joint recruitment cell placement drive by TCS & Cognizant. Eligible all branches.
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-[6px]" style={{ color: customTheme.textColorSecondary }}>
                        <span>🎓 CSE & ECE Placement Cell</span>
                        <span className="px-1 py-0.2 rounded text-[5px] font-bold" style={{ backgroundColor: customTheme.accentColor, color: '#fff' }}>APPLY NOW</span>
                      </div>
                    </div>

                    {/* Simulated PDF Scroll Letterhead */}
                    <div 
                      className={`p-2 rounded-lg flex flex-col justify-between transition text-left ${
                        customTheme.glassmorphism ? 'backdrop-blur-md' : ''
                      }`}
                      style={{ backgroundColor: customTheme.cardColor }}
                    >
                      <div>
                        <span className="text-[7px] font-bold font-mono px-1 bg-teal-600/30 text-teal-400 rounded inline-block">
                          ACADEMIC
                        </span>
                        <h5 className="text-[9px] font-black tracking-tight leading-tight mt-0.5" style={{ color: customTheme.textColor }}>
                          B.Tech IV-Year Timetables
                        </h5>
                        <p className="text-[6px] mt-0.5 line-clamp-2 leading-tight" style={{ color: customTheme.textColorSecondary }}>
                          Regular semester exams scheduled to commence commencing 15th June 2026 Shift FN / AN. Attendance checklist active in HOD block.
                        </p>
                      </div>
                      <div className="text-[6px]" style={{ color: customTheme.textColorSecondary }}>
                        📌 Controller of Exams circulars
                      </div>
                    </div>

                  </div>

                  {/* 3. Sliding Marquee Mockup */}
                  <div 
                    className="p-0.5 text-[7px] rounded font-mono font-bold text-center tracking-wide overflow-hidden whitespace-nowrap"
                    style={{ backgroundColor: customTheme.marqueeBg, color: customTheme.marqueeTextColor }}
                  >
                    ⚡ LIVE PREVIEW OVERLAY • SYNCED REFRESH FREE CHANNELS ACTIVE
                  </div>

                </div>

                <div className="text-[10px] text-slate-500 italic mt-3 text-center">
                  *Render uses real glassmorphic card variables ({customTheme.cardColor}).*
                </div>
              </div>

              {/* Right Column: Theme Scheduling Engine */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                    <CalendarRange className="text-indigo-400 w-4 h-4" />
                    <span>College Theme Scheduler Engine</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Schedule automated theme profiles (such as Power-saver black at night, bright readable slate during classes).
                  </p>
                </div>

                <form onSubmit={handleCreateSchedule} className="space-y-3 bg-slate-900/40 p-4 rounded-lg border border-slate-850">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 mb-1 uppercase text-left">Target Theme</label>
                      <select
                        value={scheduleForm.themeId}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, themeId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none"
                      >
                        {store.themes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 mb-1 uppercase text-left">Display Target</label>
                      <select
                        value={scheduleForm.target}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, target: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none"
                      >
                        <option value="global">🌍 Globally (All Screens)</option>
                        <option value="CSE">💻 CSE Screens</option>
                        <option value="ECE">⚡ ECE Screens</option>
                        <option value="EEE">💡 EEE Screens</option>
                        <option value="MECH">⚙️ MECH Screens</option>
                        <option value="CIVIL">🧱 CIVIL Screens</option>
                        <option value="MBA">📈 MBA Screens</option>
                        <option value="MCA">🖥️ MCA Screens</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 mb-1 uppercase text-left">Start Time (Daily)</label>
                      <input 
                        type="time"
                        required
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 mb-1 uppercase text-left">End Time (Daily)</label>
                      <input 
                        type="time"
                        required
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs focus:outline-none text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 mb-1 uppercase text-left">Rule Description</label>
                    <input 
                      type="text"
                      value={scheduleForm.notes}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[11px] focus:outline-none text-indigo-300"
                      placeholder="e.g. Turn down brightness style for Overnight energy savers"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded text-xs transition mt-1"
                  >
                    🤖 Deploy Theme Schedule rule
                  </button>
                </form>

                {/* Scheduled Rules Ledger */}
                <div className="mt-4 space-y-2 max-h-[140px] overflow-y-auto">
                  <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-950 pb-1 font-bold text-left">
                    Active Override Schedules ({store.schedules?.length || 0})
                  </span>
                  
                  {(!store.schedules || store.schedules.length === 0) ? (
                    <div className="text-[10px] text-slate-600 italic py-3 text-center font-mono">
                      No automated scheduled profiles assigned yet.
                    </div>
                  ) : (
                    store.schedules.map(sched => {
                      const matchedTheme = store.themes.find(t => t.id === sched.themeId);
                      return (
                        <div key={sched.id} className="p-2 bg-slate-900 border border-slate-850 rounded flex items-center justify-between text-[11px]">
                          <div className="overflow-hidden pr-2 text-left">
                            <span className="font-bold text-white block truncate">
                              ⏰ {sched.startTime} to {sched.endTime} • {matchedTheme?.name || sched.themeId}
                            </span>
                            <span className="block text-[9.5px] text-slate-400 font-mono">
                              Target: <b className="text-amber-400 capitalize">{sched.target}</b> | {sched.notes}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-800 font-mono">
                            <button
                              type="button"
                              onClick={() => store.toggleThemeSchedule(sched.id)}
                              className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase transition ${
                                sched.isActive 
                                  ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300' 
                                  : 'bg-slate-950 text-slate-500 border border-slate-850'
                              }`}
                            >
                              {sched.isActive ? 'ACTIVE' : 'MUTED'}
                            </button>
                            <button
                              type="button"
                              onClick={() => store.deleteThemeSchedule(sched.id)}
                              className="text-slate-550 hover:text-rose-500 p-0.5"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            TAB E: SYSTEM ACTION AUDIT HISTORIC JOURNAL
           ========================================================= */}
        {activeTab === 'audit' && (
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">College Audit Journal Log</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-world enterprise logger recording uploader logins, notices published and applied styling configurations.</p>
              </div>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
              {store.logs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 bg-slate-900/50 border border-slate-850 rounded-lg flex items-center justify-between text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-850 text-indigo-400 font-bold px-1.5 py-0.2 rounded text-[9px] uppercase border border-slate-800">
                        {log.action}
                      </span>
                      <span className="text-slate-300 font-semibold">{log.user}</span>
                    </div>
                    <p className="text-slate-450 font-sans font-medium text-[12px]">{log.details}</p>
                  </div>

                  <span className="text-[10px] text-slate-500 text-right">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
