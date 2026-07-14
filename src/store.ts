import { useState, useEffect } from 'react';
import { Notice, MarqueeAlert, ThemeConfig, DisplayScreen, CollegeStats, AuditLog, ThemeSchedule, UserSession } from './types';
import { INITIAL_NOTICES, INITIAL_ALERTS, DEFAULT_THEMES, INITIAL_SCREENS, INITIAL_AUDIT_LOGS } from './data';

// Channel for multi-tab real-time sync in the browser
const SYNC_CHANNEL_NAME = 'nbkrist_noticeboard_live_sync';
let syncChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
  try {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment:', e);
  }
}

// Simple state storage helper keys
const STORAGE_KEYS = {
  NOTICES: 'nbk_notices',
  ALERTS: 'nbk_alerts',
  THEMES: 'nbk_themes',
  SCREENS: 'nbk_screens',
  LOGS: 'nbk_audit_logs',
  ROLES: 'nbk_user_roles',
  ACTIVE_THEME: 'nbk_active_theme_global',
  ACTIVE_USER: 'nbk_active_user'
};

// Help load initial storage state
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Error loading key ${key} from storage:`, e);
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key ${key} to storage:`, e);
  }
};

// Singleton global state with event emitter
class GlobalStateEngine {
  private notices: Notice[] = [];
  private alerts: MarqueeAlert[] = [];
  private themes: ThemeConfig[] = [];
  private screens: DisplayScreen[] = [];
  private logs: AuditLog[] = [];
  private schedules: ThemeSchedule[] = [];
  private activeUser: UserSession = { email: '23kb1a3334@nbkrist.org', role: 'super-admin' };
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.notices = loadFromStorage(STORAGE_KEYS.NOTICES, INITIAL_NOTICES);
    this.alerts = loadFromStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
    this.themes = loadFromStorage(STORAGE_KEYS.THEMES, DEFAULT_THEMES);
    this.screens = loadFromStorage(STORAGE_KEYS.SCREENS, INITIAL_SCREENS);
    this.logs = loadFromStorage(STORAGE_KEYS.LOGS, INITIAL_AUDIT_LOGS);
    this.schedules = loadFromStorage('nbk_theme_schedules', []);
    this.activeUser = loadFromStorage(STORAGE_KEYS.ACTIVE_USER, {
      email: '23kb1a3334@nbkrist.org',
      role: 'super-admin'
    });

    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data?.type === 'STATE_UPDATED') {
          this.syncFromLocalStorage();
          this.notify();
        }
      };
    }
  }

  private syncFromLocalStorage() {
    this.notices = loadFromStorage(STORAGE_KEYS.NOTICES, INITIAL_NOTICES);
    this.alerts = loadFromStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
    this.themes = loadFromStorage(STORAGE_KEYS.THEMES, DEFAULT_THEMES);
    this.screens = loadFromStorage(STORAGE_KEYS.SCREENS, INITIAL_SCREENS);
    this.logs = loadFromStorage(STORAGE_KEYS.LOGS, INITIAL_AUDIT_LOGS);
    this.schedules = loadFromStorage('nbk_theme_schedules', []);
    this.activeUser = loadFromStorage(STORAGE_KEYS.ACTIVE_USER, {
      email: '23kb1a3334@nbkrist.org',
      role: 'super-admin'
    });
  }

  private broadcastChange() {
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'STATE_UPDATED' });
      } catch (e) {
        console.warn('Failed to broadcast state change', e);
      }
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- GETTERS ---
  public getNotices() {
    return this.notices;
  }

  public getSchedules() {
    return this.schedules;
  }

  public getAlerts() {
    return this.alerts;
  }

  public getThemes() {
    return this.themes;
  }

  public getScreens() {
    return this.screens;
  }

  public getLogs() {
    return this.logs;
  }

  public getActiveUser() {
    return this.activeUser;
  }

  // --- ACTIONS ---
  public login(email: string, role: 'super-admin' | 'dept-admin' | 'viewer', department?: string) {
    this.activeUser = { email, role, department };
    saveToStorage(STORAGE_KEYS.ACTIVE_USER, this.activeUser);
    this.addLog(email, 'LOGIN', `Logged in as ${role} for department ${department || 'ALL'}`);
    this.broadcastChange();
  }

  public logout() {
    this.addLog(this.activeUser.email, 'LOGOUT', `Logged out`);
    this.activeUser = { email: '', role: 'viewer' };
    saveToStorage(STORAGE_KEYS.ACTIVE_USER, this.activeUser);
    this.broadcastChange();
  }

  public addNotice(notice: Omit<Notice, 'id' | 'createdAt' | 'isArchived'>) {
    const newNotice: Notice = {
      ...notice,
      id: `notice-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isArchived: false
    };
    this.notices = [newNotice, ...this.notices];
    saveToStorage(STORAGE_KEYS.NOTICES, this.notices);
    this.addLog(this.activeUser.email, 'CREATED_NOTICE', `Created notice: ${notice.title}`);
    this.broadcastChange();

    // Trigger Speech announcement if emergency priority
    if (notice.priority === 'emergency') {
      this.triggerAnnouncement(`Attention Students. A New Emergency Notice Has Been Published: ${notice.title}`);
    }
  }

  public updateNotice(id: string, updated: Partial<Notice>) {
    this.notices = this.notices.map((n) => (n.id === id ? { ...n, ...updated } : n));
    saveToStorage(STORAGE_KEYS.NOTICES, this.notices);
    this.addLog(this.activeUser.email, 'UPDATED_NOTICE', `Updated notice ID: ${id}`);
    this.broadcastChange();
  }

  public deleteNotice(id: string) {
    const title = this.notices.find(n => n.id === id)?.title || '';
    this.notices = this.notices.filter((n) => n.id !== id);
    saveToStorage(STORAGE_KEYS.NOTICES, this.notices);
    this.addLog(this.activeUser.email, 'DELETED_NOTICE', `Deleted notice: ${title}`);
    this.broadcastChange();
  }

  public archiveNotice(id: string) {
    this.notices = this.notices.map((n) => (n.id === id ? { ...n, isArchived: true } : n));
    saveToStorage(STORAGE_KEYS.NOTICES, this.notices);
    this.addLog(this.activeUser.email, 'ARCHIVED_NOTICE', `Archived notice ID: ${id}`);
    this.broadcastChange();
  }

  public restoreNotice(id: string) {
    this.notices = this.notices.map((n) => (n.id === id ? { ...n, isArchived: false } : n));
    saveToStorage(STORAGE_KEYS.NOTICES, this.notices);
    this.addLog(this.activeUser.email, 'RESTORED_NOTICE', `Restored notice ID: ${id}`);
    this.broadcastChange();
  }

  public addAlert(alert: Omit<MarqueeAlert, 'id' | 'createdAt'>) {
    const newAlert: MarqueeAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.alerts = [newAlert, ...this.alerts];
    saveToStorage(STORAGE_KEYS.ALERTS, this.alerts);
    this.addLog(this.activeUser.email, 'PUBLISHED_ALERT', `Published emergency marquee alert: ${alert.text}`);
    this.broadcastChange();

    if (alert.priority === 'emergency') {
      this.triggerAnnouncement(`Attention Students. A New Emergency Alert Has Been Published.`);
    }
  }

  public deleteAlert(id: string) {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    saveToStorage(STORAGE_KEYS.ALERTS, this.alerts);
    this.addLog(this.activeUser.email, 'DELETED_ALERT', `Removed alert ID: ${id}`);
    this.broadcastChange();
  }

  public toggleAlertActive(id: string) {
    this.alerts = this.alerts.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    saveToStorage(STORAGE_KEYS.ALERTS, this.alerts);
    this.addLog(this.activeUser.email, 'TOGGLED_ALERT', `Toggled marquee alert state ID: ${id}`);
    this.broadcastChange();
  }

  public addTheme(theme: Omit<ThemeConfig, 'id'> & { id?: string }) {
    const id = theme.id || `theme-${Date.now()}`;
    const newTheme: ThemeConfig = { ...theme, id };
    this.themes = [...this.themes.filter((t) => t.id !== id), newTheme];
    saveToStorage(STORAGE_KEYS.THEMES, this.themes);
    this.addLog(this.activeUser.email, 'CREATED_THEME', `Saved/Updated Theme preset: ${theme.name}`);
    this.broadcastChange();
  }

  public deleteTheme(id: string) {
    if (id.startsWith('light-college') || id.startsWith('dark-neon')) {
      return; // Protect system defaults
    }
    this.themes = this.themes.filter((t) => t.id !== id);
    saveToStorage(STORAGE_KEYS.THEMES, this.themes);
    this.addLog(this.activeUser.email, 'DELETED_THEME', `Deleted theme ID: ${id}`);
    this.broadcastChange();
  }

  public updateScreenTheme(screenId: string, themeId: string) {
    this.screens = this.screens.map((s) => (s.id === screenId ? { ...s, currentThemeId: themeId } : s));
    saveToStorage(STORAGE_KEYS.SCREENS, this.screens);
    this.addLog(this.activeUser.email, 'APPLIED_THEME', `Applied theme ${themeId} to Screen ${screenId}`);
    this.broadcastChange();
  }

  public updateThemeGlobally(themeId: string) {
    // Apply this theme to all screens of the college
    this.screens = this.screens.map((s) => ({ ...s, currentThemeId: themeId }));
    saveToStorage(STORAGE_KEYS.SCREENS, this.screens);
    this.addLog(this.activeUser.email, 'APPLIED_THEME_GLOBAL', `Applied theme ${themeId} globally to all department screens`);
    this.broadcastChange();
  }

  public updateThemePerDepartment(dept: string, themeId: string) {
    this.screens = this.screens.map((s) => (s.department === dept ? { ...s, currentThemeId: themeId } : s));
    saveToStorage(STORAGE_KEYS.SCREENS, this.screens);
    this.addLog(this.activeUser.email, 'APPLIED_THEME_DEPT', `Applied theme ${themeId} to ${dept} department screens`);
    this.broadcastChange();
  }

  public addThemeSchedule(schedule: Omit<ThemeSchedule, 'id'>) {
    const newSchedule: ThemeSchedule = {
      ...schedule,
      id: `sched-${Date.now()}`
    };
    this.schedules = [...this.schedules, newSchedule];
    saveToStorage('nbk_theme_schedules', this.schedules);
    this.addLog(this.activeUser.email, 'ADD_SCHEDULE', `Scheduled theme: ${schedule.themeId} for ${schedule.target}`);
    this.broadcastChange();
  }

  public deleteThemeSchedule(id: string) {
    this.schedules = this.schedules.filter((s) => s.id !== id);
    saveToStorage('nbk_theme_schedules', this.schedules);
    this.addLog(this.activeUser.email, 'DELETE_SCHEDULE', `Removed theme schedule`);
    this.broadcastChange();
  }

  public toggleThemeSchedule(id: string) {
    this.schedules = this.schedules.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    saveToStorage('nbk_theme_schedules', this.schedules);
    this.addLog(this.activeUser.email, 'TOGGLE_SCHEDULE', `Toggled theme schedule state`);
    this.broadcastChange();
  }

  private addLog(user: string, action: string, details: string) {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.logs = [newLog, ...this.logs].slice(0, 50); // Keep last 50
    saveToStorage(STORAGE_KEYS.LOGS, this.logs);
  }

  private triggerAnnouncement(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop active voices
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  }

  public getStats(): CollegeStats {
    const activeAlertsCount = this.alerts.filter((a) => a.isActive).length;
    const activeScreensCount = this.screens.filter((s) => s.status === 'online').length;
    
    // Calculate department distribution
    const distribution: Record<string, number> = {};
    this.notices.forEach((n) => {
      n.department.forEach((d) => {
        distribution[d] = (distribution[d] || 0) + 1;
      });
    });

    return {
      totalNotices: this.notices.length,
      totalPosters: this.notices.filter((n) => n.type === 'image').length,
      activeAlerts: activeAlertsCount,
      activeScreens: activeScreensCount,
      deptDistribution: distribution
    };
  }
}

// Global active single instance
export const storeEngine = new GlobalStateEngine();

// React Hook to access values real-time
export function useSmartNoticeStore() {
  const [data, setData] = useState({
    notices: storeEngine.getNotices(),
    alerts: storeEngine.getAlerts(),
    themes: storeEngine.getThemes(),
    screens: storeEngine.getScreens(),
    logs: storeEngine.getLogs(),
    schedules: storeEngine.getSchedules(),
    activeUser: storeEngine.getActiveUser(),
    stats: storeEngine.getStats()
  });

  useEffect(() => {
    const unsubscribe = storeEngine.subscribe(() => {
      setData({
        notices: storeEngine.getNotices(),
        alerts: storeEngine.getAlerts(),
        themes: storeEngine.getThemes(),
        screens: storeEngine.getScreens(),
        logs: storeEngine.getLogs(),
        schedules: storeEngine.getSchedules(),
        activeUser: storeEngine.getActiveUser(),
        stats: storeEngine.getStats()
      });
    });
    return unsubscribe;
  }, []);

  return {
    ...data,
    login: (email: string, role: 'super-admin' | 'dept-admin' | 'viewer', dept?: string) =>
      storeEngine.login(email, role, dept),
    logout: () => storeEngine.logout(),
    
    addNotice: (notice: Omit<Notice, 'id' | 'createdAt' | 'isArchived'>) => storeEngine.addNotice(notice),
    updateNotice: (id: string, updated: Partial<Notice>) => storeEngine.updateNotice(id, updated),
    deleteNotice: (id: string) => storeEngine.deleteNotice(id),
    archiveNotice: (id: string) => storeEngine.archiveNotice(id),
    restoreNotice: (id: string) => storeEngine.restoreNotice(id),

    addAlert: (alert: Omit<MarqueeAlert, 'id' | 'createdAt'>) => storeEngine.addAlert(alert),
    deleteAlert: (id: string) => storeEngine.deleteAlert(id),
    toggleAlertActive: (id: string) => storeEngine.toggleAlertActive(id),

    addTheme: (theme: Omit<ThemeConfig, 'id'> & { id?: string }) => storeEngine.addTheme(theme),
    deleteTheme: (id: string) => storeEngine.deleteTheme(id),
    updateScreenTheme: (screenId: string, themeId: string) => storeEngine.updateScreenTheme(screenId, themeId),
    updateThemeGlobally: (themeId: string) => storeEngine.updateThemeGlobally(themeId),
    updateThemePerDepartment: (dept: string, themeId: string) => storeEngine.updateThemePerDepartment(dept, themeId),

    addThemeSchedule: (schedule: Omit<ThemeSchedule, 'id'>) => storeEngine.addThemeSchedule(schedule),
    deleteThemeSchedule: (id: string) => storeEngine.deleteThemeSchedule(id),
    toggleThemeSchedule: (id: string) => storeEngine.toggleThemeSchedule(id)
  };
}
