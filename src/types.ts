export interface Notice {
  id: string;
  title: string;
  department: string[]; // ['CSE', 'ECE', etc.] or ['ALL']
  type: 'image' | 'pdf';
  url: string; // Image URL or visual asset description
  imageUrl?: string; // Opt-in base64 uploaded or pasted external image URL to display
  category: 'circular' | 'placement' | 'event' | 'timetable' | 'exam' | 'general';
  priority: 'emergency' | 'urgent' | 'important' | 'high' | 'medium' | 'normal';
  uploadedBy: string;
  createdAt: string;
  startDateTime: string;
  endDateTime: string;
  qrCodeData: string; // The text content to generate QR code or URL
  isArchived: boolean;
  pdfPages?: {
    pageNumber: number;
    title: string;
    content: string[]; // Paragraphs or lines for high-fidelity rendering
    metadata?: string;
    pageImageUrl?: string; // Data URL or URL of the actual rendered PDF page
  }[];
}

export interface MarqueeAlert {
  id: string;
  text: string;
  priority: 'emergency' | 'important' | 'general';
  createdAt: string;
  isActive: boolean;
  department: string[]; // Affected departments
}

export interface ThemeConfig {
  id: string;
  name: string;
  mode: 'light' | 'dark' | 'custom';
  bgType: 'solid' | 'gradient' | 'image' | 'animated';
  bgColor: string;
  bgGradient: string; // CSS gradient string
  bgImageUrl: string;
  bgEffect: 'grid' | 'particles' | 'dots' | 'cyber' | 'waves' | 'none';
  primaryColor: string; // Tailwind tint/hex
  secondaryColor: string;
  accentColor: string;
  headerColor: string;
  cardColor: string;
  textColor: string;
  textColorSecondary: string;
  marqueeBg: string;
  marqueeTextColor: string;
  pdfBg: string;
  posterBg: string;
  glowEffect: boolean;
  glassmorphism: boolean;
  borderAnimated: boolean;
}

export interface CollegeStats {
  totalNotices: number;
  totalPosters: number;
  activeAlerts: number;
  activeScreens: number;
  deptDistribution: Record<string, number>;
}

export interface DisplayScreen {
  id: string;
  name: string;
  department: string; // 'CSE', 'ECE', etc.
  status: 'online' | 'offline';
  lastSeen: string;
  currentThemeId: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ThemeSchedule {
  id: string;
  themeId: string;
  target: 'global' | 'CSE' | 'ECE' | 'EEE' | 'MECH' | 'CIVIL' | 'MCA' | 'MBA';
  startTime: string; // e.g. "08:00" or a Date string
  endTime: string;   // e.g. "17:00" or a Date string
  isActive: boolean;
  notes: string;
}

export interface UserSession {
  email: string;
  role: 'super-admin' | 'dept-admin' | 'viewer';
  department?: string; // e.g. 'CSE' for ECE, etc.
}
