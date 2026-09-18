import { Notice, MarqueeAlert, ThemeConfig, DisplayScreen, AuditLog } from './types';

// Standard Departments of NBKRIST
export const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MCA', 'MBA', 'GENERAL'] as const;

// Default Theme Presets
export const DEFAULT_THEMES: ThemeConfig[] = [
  {
    id: 'light-college',
    name: 'NBKRIST Light Academic',
    mode: 'light',
    bgType: 'gradient',
    bgColor: '#f1f5f9',
    bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    bgImageUrl: '',
    bgEffect: 'none',
    primaryColor: '#1e3a8a', // Deep corporate blue
    secondaryColor: '#0f766e', // Teal
    accentColor: '#b45309', // Amber
    headerColor: 'linear-gradient(90deg, #1e3a8a 0%, #0f4c81 100%)',
    cardColor: 'rgba(255, 255, 255, 0.9)',
    textColor: '#0f172a',
    textColorSecondary: '#475569',
    marqueeBg: '#e11d48', // Bright rose/red
    marqueeTextColor: '#ffffff',
    pdfBg: '#ffffff',
    posterBg: '#f8fafc',
    glowEffect: false,
    glassmorphism: true,
    borderAnimated: false
  },
  {
    id: 'dark-neon',
    name: 'Modern Signage Dark',
    mode: 'dark',
    bgType: 'gradient',
    bgColor: '#090d16',
    bgGradient: 'linear-gradient(135deg, #090d16 0%, #020617 100%)',
    bgImageUrl: '',
    bgEffect: 'grid',
    primaryColor: '#3b82f6', // Cyber blue
    secondaryColor: '#10b981', // Emerald
    accentColor: '#f59e0b', // Amber
    headerColor: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
    cardColor: 'rgba(15, 23, 42, 0.75)',
    textColor: '#f8fafc',
    textColorSecondary: '#94a3b8',
    marqueeBg: '#7f1d1d', // Dark emergency red
    marqueeTextColor: '#fca5a5',
    pdfBg: '#1e293b',
    posterBg: '#0f172a',
    glowEffect: true,
    glassmorphism: true,
    borderAnimated: true
  },
  {
    id: 'cse-cyber',
    name: 'CSE Techno Cyber',
    mode: 'dark',
    bgType: 'animated',
    bgColor: '#020617',
    bgGradient: 'linear-gradient(135deg, #020617 0%, #030712 100%)',
    bgImageUrl: '',
    bgEffect: 'cyber',
    primaryColor: '#06b6d4', // Cyan
    secondaryColor: '#8b5cf6', // Violet
    accentColor: '#ef4444', // Red
    headerColor: 'linear-gradient(90deg, #0c4a6e 0%, #082f49 100%)',
    cardColor: 'rgba(15, 23, 42, 0.8)',
    textColor: '#f0f9ff',
    textColorSecondary: '#cbd5e1',
    marqueeBg: '#0369a1', // Sky blue
    marqueeTextColor: '#e0f2fe',
    pdfBg: '#0f172a',
    posterBg: '#0c4a6e',
    glowEffect: true,
    glassmorphism: true,
    borderAnimated: true
  },
  {
    id: 'ece-purple',
    name: 'ECE Digital Signage',
    mode: 'dark',
    bgType: 'gradient',
    bgColor: '#0f0720',
    bgGradient: 'linear-gradient(135deg, #0f0720 0%, #02010a 100%)',
    bgImageUrl: '',
    bgEffect: 'particles',
    primaryColor: '#d946ef', // Neon Fuchsia
    secondaryColor: '#6366f1', // Indigo
    accentColor: '#f43f5e', // Rose
    headerColor: 'linear-gradient(90deg, #3b0764 0%, #17002e 100%)',
    cardColor: 'rgba(23, 10, 46, 0.75)',
    textColor: '#fae8ff',
    textColorSecondary: '#cbd5e1',
    marqueeBg: '#4c1d95', // Rich purple
    marqueeTextColor: '#f5f3ff',
    pdfBg: '#13072b',
    posterBg: '#1e053a',
    glowEffect: true,
    glassmorphism: true,
    borderAnimated: true
  }
];

// Initial mock display screens installed in college
export const INITIAL_SCREENS: DisplayScreen[] = [
  { id: 'screen-cse-main', name: 'CSE Department Foyer TV', department: 'CSE', status: 'online', lastSeen: '2026-06-10T05:40:00Z', currentThemeId: 'cse-cyber' },
  { id: 'screen-ece-corridor', name: 'ECE Block Entrance LED', department: 'ECE', status: 'online', lastSeen: '2026-06-10T05:45:00Z', currentThemeId: 'ece-purple' },
  { id: 'screen-eee-office', name: 'EEE Staff & Student Notice Board', department: 'EEE', status: 'online', lastSeen: '2026-06-10T05:48:00Z', currentThemeId: 'light-college' },
  { id: 'screen-mech-workshop', name: 'Mechanical block Lounge LCD', department: 'MECH', status: 'offline', lastSeen: '2026-06-09T18:30:00Z', currentThemeId: 'light-college' },
  { id: 'screen-civil-display', name: 'Civil Engineering Entrance', department: 'CIVIL', status: 'online', lastSeen: '2026-06-10T05:49:00Z', currentThemeId: 'light-college' },
  { id: 'screen-mba-hallway', name: 'MBA/MCA Shared Seminar Block', department: 'MCA', status: 'online', lastSeen: '2026-06-10T05:49:10Z', currentThemeId: 'dark-neon' }
];

// Pre-packaged high-fidelity circular templates
export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'notice-campus-drive',
    title: 'Grand Placement Drive 2026: TCS & Cognizant Joint Recruitment',
    department: ['CSE', 'ECE', 'EEE', 'MCA'],
    type: 'image',
    url: 'placement_drive', // Styled high-fidelity visual poster mockup
    category: 'placement',
    priority: 'high',
    uploadedBy: 'Dr. V. R. Prasad (Placement Cell)',
    createdAt: '2026-06-08T10:00:00Z',
    startDateTime: '2026-06-09T09:00:00Z',
    endDateTime: '2026-06-20T17:00:00Z',
    qrCodeData: '',
    isArchived: false
  },
  {
    id: 'notice-exam-timetable',
    title: 'B.Tech IV Year II Semester End Exams Time Table - June 2026',
    department: ['ALL'],
    type: 'pdf',
    url: 'exam_timetable',
    category: 'exam',
    priority: 'high',
    uploadedBy: 'Prof. K. Srinivasa Rao (Controller of Exams)',
    createdAt: '2026-06-09T08:30:00Z',
    startDateTime: '2026-06-09T08:00:00Z',
    endDateTime: '2026-06-25T18:00:00Z',
    pdfUrl: '',
    qrCodeData: '',
    isArchived: false,
    pdfPages: [
      {
        pageNumber: 1,
        title: 'Examination Instructions & Dates (FN / AN Shifts)',
        content: [
          'All IV Year B.Tech students are hereby informed that the Year-End Semester Examinations will commence from 15th June 2026.',
          'Morning Session (FN): 09:30 AM to 12:30 PM | Afternoon Session (AN): 01:30 PM to 04:30 PM',
          'Students must carry their Hall Tickets and college Identification Cards without fail. Electronic gadgets, smart watches, and phones are strictly barred.'
        ],
        metadata: 'NBKRIST Controller of Exams Decs'
      },
      {
        pageNumber: 2,
        title: 'Subject Wise Schedule - Engineering Departments',
        content: [
          '• 15-Jun-2026 (FN): Cryptography & Network Security (CSE) | VLSI Design (ECE) | Power Quality (EEE)',
          '• 17-Jun-2026 (FN): Machine Learning & AI (CSE) | Embedded Systems (ECE) | Electric Vehicles (EEE)',
          '• 19-Jun-2026 (FN): Cloud Computing (CSE) | Radar Systems (ECE) | Smart Grid Tech (EEE)',
          '• 22-Jun-2026 (FN): Professional Elective-V (All Departments) | Entrepreneurship Development'
        ],
        metadata: 'Table 1.1: Academic Schedule'
      }
    ]
  },
  {
    id: 'notice-national-conference',
    title: 'Adhyayan 2026: National Student Technical Symposium & Coding Hackathon',
    department: ['CSE', 'MCA'],
    type: 'image',
    url: 'conference_banner',
    category: 'event',
    priority: 'medium',
    uploadedBy: 'Dr. S. K. Althaf (HOD, CSE Dept)',
    createdAt: '2026-06-07T14:30:00Z',
    startDateTime: '2026-06-07T08:00:00Z',
    endDateTime: '2026-06-18T16:00:00Z',
    qrCodeData: '',
    isArchived: false
  },
  {
    id: 'notice-academic-calendar',
    title: 'Re-opening & Academic Calendar for B.Tech III & II Year Segments',
    department: ['ALL'],
    type: 'pdf',
    url: 'academic_calendar',
    category: 'circular',
    priority: 'normal',
    uploadedBy: 'Dr. I. Gopal Reddy (Director, NBKRIST)',
    createdAt: '2026-06-05T09:00:00Z',
    startDateTime: '2026-06-05T09:00:00Z',
    endDateTime: '2026-06-30T17:00:00Z',
    pdfUrl: '',
    qrCodeData: '',
    isArchived: false,
    pdfPages: [
      {
        pageNumber: 1,
        title: 'Phase-I Class Commencement & Syllabus Milestones',
        content: [
          'The regular classwork for B.Tech II and III Year, First Semester for the academic session 2026-2027 shall commence from 1st July 2026.',
          'Instructors are directed to complete Unit-1 and Unit-2 syllabus by 14th August 2026. The mid-academic diagnostics test will follow.',
          'Attendance is cumulative. A minimum of 75% attendance is compulsory for authorization to write examinations.'
        ]
      },
      {
        pageNumber: 2,
        title: 'Mid Exams & Holiday Calendar (July-December 2026)',
        content: [
          '• Mid Term-1 Exams: 24-Aug-2026 to 29-Aug-2026',
          '• Dussehra Festival Vacation: 12-Oct-2026 to 18-Oct-2026',
          '• Mid Term-2 Exams: 02-Nov-2026 to 07-Nov-2026',
          '• Practical Lab Internals: 16-Nov-2026 onwards',
          '• Semester End Examinations: 30-Nov-2026 onwards'
        ]
      }
    ]
  },
  {
    id: 'notice-mech-symposium',
    title: 'MECH-AUTO Expo 2026: Hyper-CAD Design Contest & Electric Kart Showcase',
    department: ['MECH', 'CIVIL'],
    type: 'image',
    url: 'mech_auto_expo_banner',
    category: 'event',
    priority: 'medium',
    uploadedBy: 'Dr. M. Chandra Sekhar (MECH Dept)',
    createdAt: '2026-06-08T11:00:00Z',
    startDateTime: '2026-06-08T11:00:00Z',
    endDateTime: '2026-06-15T16:00:00Z',
    qrCodeData: '',
    isArchived: false
  },
  {
    id: 'notice-ece-ieee-workshop',
    title: 'IEEE Sponsored Workshop: 5G/6G Wireless Antennas Design using HFSS',
    department: ['ECE', 'EEE'],
    type: 'pdf',
    url: 'ece_ieee_workshop',
    category: 'event',
    priority: 'normal',
    uploadedBy: 'Dr. G. Harinath Reddy (ECE Dept Coordinator)',
    createdAt: '2026-06-06T15:00:00Z',
    startDateTime: '2026-06-06T12:00:00Z',
    endDateTime: '2026-06-14T17:00:00Z',
    pdfUrl: '',
    qrCodeData: '',
    isArchived: false,
    pdfPages: [
      {
        pageNumber: 1,
        title: 'Workshop Objective & Lab Equipment Allocation',
        content: [
          'The Department of Electronics & Comm. Engineering, in partnership with IEEE Hyderabad Section, is conducting a hands-on technical workshop.',
          'Focus areas: Microstrip patch antenna designs, smart grids telemetry, electromagnetic compatibility diagnostics in HFSS simulation tools.',
          'Venue: ECE CAD & VLSI Lab, Block-III. Number of seat participants capped at 45 on first-come basis.'
        ]
      }
    ]
  }
];

// Initial scrolling marquee alert feeds
export const INITIAL_ALERTS: MarqueeAlert[] = [
  {
    id: 'alert-1',
    text: '🚨 Campus Recruitment Drive: TCS registration portal closes today at 05:00 PM. Submit profiles! 🚨',
    priority: 'important',
    createdAt: '2026-06-10T02:00:00Z',
    isActive: true,
    department: ['CSE', 'ECE', 'EEE', 'MCA']
  },
  {
    id: 'alert-2',
    text: '📢 Emergency Notice: Special Remedial Classes for CSE III-Yr Scheduled Tomorrow in Main Seminar Hall - Attend without fail! 📢',
    priority: 'emergency',
    createdAt: '2026-06-10T05:30:00Z',
    isActive: true,
    department: ['CSE']
  },
  {
    id: 'alert-3',
    text: '📚 Semester-End Exam Hall Tickets distributed in respective HOD offices starting 11th June 2026. Clear all pending fee dues first. 📚',
    priority: 'general',
    createdAt: '2026-06-09T09:00:00Z',
    isActive: true,
    department: ['ALL']
  }
];

// INITIAL AUDIT LOG FOR COLLEGE DEPARTMENTS
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', user: 'Super Admin (Administrator)', action: 'CREATED_NOTICE', details: 'Added Placements Notice TCS Cognizant Drive', timestamp: '2026-06-08T10:05:00Z' },
  { id: 'log-2', user: 'CSE Department Admin', action: 'PUBLISHED_ALERT', details: 'Added active emergency remedial class notice', timestamp: '2026-06-10T05:31:00Z' },
  { id: 'log-3', user: 'Super Admin (Administrator)', action: 'APPLIED_THEME', details: 'Configured CSE TV Display with custom cse-cyber background', timestamp: '2026-06-10T05:35:00Z' },
  { id: 'log-4', user: 'ECE Department Admin', action: 'CREATED_NOTICE', details: 'Published IEEE Antenna design seminar scheduled layout', timestamp: '2026-06-06T15:05:00Z' }
];
