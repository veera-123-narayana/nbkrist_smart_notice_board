import { Notice, MarqueeAlert, ThemeConfig, DisplayScreen } from '../../types';

const DB_NAME = 'nbkrist_signage_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('notices')) {
          db.createObjectStore('notices', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('alerts')) {
          db.createObjectStore('alerts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('themes')) {
          db.createObjectStore('themes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('screens')) {
          db.createObjectStore('screens', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB failed to open, using memory/localStorage fallback', request.error);
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

// Generic store writers
async function writeAllToStore<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear(); // Replace with latest synced batch
      for (const item of items) {
        store.put(item);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    // Fallback to localStorage if IndexedDB is inaccessible
    try {
      localStorage.setItem(`nbk_idb_fallback_${storeName}`, JSON.stringify(items));
    } catch {
      // ignore storage quota errors
    }
  }
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    try {
      const raw = localStorage.getItem(`nbk_idb_fallback_${storeName}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function saveCachedNotices(notices: Notice[]): Promise<void> {
  await writeAllToStore('notices', notices);
}

export async function getCachedNotices(): Promise<Notice[]> {
  return await getAllFromStore<Notice>('notices');
}

export async function saveCachedAlerts(alerts: MarqueeAlert[]): Promise<void> {
  await writeAllToStore('alerts', alerts);
}

export async function getCachedAlerts(): Promise<MarqueeAlert[]> {
  return await getAllFromStore<MarqueeAlert>('alerts');
}

export async function saveCachedThemes(themes: ThemeConfig[]): Promise<void> {
  await writeAllToStore('themes', themes);
}

export async function getCachedThemes(): Promise<ThemeConfig[]> {
  return await getAllFromStore<ThemeConfig>('themes');
}

export async function saveCachedScreens(screens: DisplayScreen[]): Promise<void> {
  await writeAllToStore('screens', screens);
}

export async function getCachedScreens(): Promise<DisplayScreen[]> {
  return await getAllFromStore<DisplayScreen>('screens');
}

export async function setCacheMeta(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('meta', 'readwrite');
      const store = transaction.objectStore('meta');
      store.put({ key, value, updatedAt: new Date().toISOString() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    try {
      localStorage.setItem(`nbk_meta_${key}`, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
}

export async function getCacheMeta(key: string): Promise<any> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('meta', 'readonly');
      const store = transaction.objectStore('meta');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`nbk_meta_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
