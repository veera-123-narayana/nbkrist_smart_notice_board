export type UserRole =
  | "super-admin"
  | "dept-admin"
  | "viewer";

export interface AdminUser {
  uid?: string;
  email: string;
  role: UserRole;
  department?: string;
}

export interface Notice {
  id?: string;

  title: string;

  category: string;

  type: "poster" | "pdf" | "notice";

  priority: "low" | "medium" | "high" | "critical";

  department: string[];

  url: string;

  imageUrl?: string;

  uploadedBy: string;

  createdAt?: any;

  startDateTime: string;

  endDateTime: string;

  qrCodeData: string;

  pdfPages?: number;

  active?: boolean;
}

export interface Alert {
  id?: string;

  message: string;

  priority: "low" | "medium" | "high" | "critical";

  active: boolean;

  createdAt?: any;
}

export interface Theme {
  id?: string;

  name: string;

  primaryColor: string;

  secondaryColor: string;

  accentColor: string;

  darkMode: boolean;

  active: boolean;
}

export interface Device {
  id?: string;

  name: string;

  department: string;

  status: "online" | "offline";

  lastSeen?: any;
}