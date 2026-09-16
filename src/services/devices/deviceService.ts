import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "../../firebase/config";
import { setCacheMeta } from "../cache/offlineCache";

const deviceCollection = collection(db, "devices");

export interface DeviceMetadata {
  deviceId: string;
  department: string;
  deviceName: string;
  status: 'online' | 'offline';
  lastHeartbeat: string;
  lastSync: string;
  appVersion: string;
  ipAddress?: string;
  screenResolution?: string;
  currentThemeId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export async function registerDevice(device: any) {
  if (!isFirebaseConfigured) return null;
  try {
    return await addDoc(deviceCollection, {
      ...device,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore registerDevice notice (local mode):", err);
    return null;
  }
}

/**
 * Registers or synchronizes a Raspberry Pi Signage Display device in Firestore
 */
export async function registerOrUpdateDevice(deviceData: {
  deviceId: string;
  department?: string;
  deviceName?: string;
  appVersion?: string;
  screenResolution?: string;
  ipAddress?: string;
  currentThemeId?: string;
}): Promise<void> {
  const { deviceId, department = 'ALL', deviceName, appVersion = '1.0.0', screenResolution, ipAddress, currentThemeId } = deviceData;

  const nowIso = new Date().toISOString();
  const payload: Partial<DeviceMetadata> = {
    deviceId,
    department,
    deviceName: deviceName || `NBKRIST ${department} Smart Display (${deviceId})`,
    status: 'online',
    lastHeartbeat: nowIso,
    lastSync: nowIso,
    appVersion,
    screenResolution: screenResolution || (typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080'),
    ...(ipAddress ? { ipAddress } : {}),
    ...(currentThemeId ? { currentThemeId } : {}),
  };

  // Always save to local device cache
  await setCacheMeta('registered_device', payload);

  if (isFirebaseConfigured) {
    try {
      const deviceDocRef = doc(db, "devices", deviceId);
      await setDoc(deviceDocRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore device registration notice (operating locally):", err);
    }
  }
}

/**
 * Sends a lightweight heartbeat ping every 30 seconds
 */
export async function sendDeviceHeartbeat(deviceId: string, extraData: Record<string, any> = {}): Promise<void> {
  if (!deviceId || !isFirebaseConfigured) return;
  const nowIso = new Date().toISOString();
  try {
    const deviceDocRef = doc(db, "devices", deviceId);
    await updateDoc(deviceDocRef, {
      lastHeartbeat: nowIso,
      status: 'online',
      ...extraData,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    try {
      const deviceDocRef = doc(db, "devices", deviceId);
      await setDoc(deviceDocRef, {
        deviceId,
        lastHeartbeat: nowIso,
        status: 'online',
        ...extraData,
      }, { merge: true });
    } catch {
      // Gracefully swallow offline heartbeat notice
    }
  }
}

export async function updateDevice(id: string, data: any) {
  if (!isFirebaseConfigured) return null;
  try {
    return await updateDoc(doc(db, "devices", id), data);
  } catch (err) {
    console.warn("Firestore updateDevice notice:", err);
    return null;
  }
}

export async function deleteDevice(id: string) {
  if (!isFirebaseConfigured) return null;
  try {
    return await deleteDoc(doc(db, "devices", id));
  } catch (err) {
    console.warn("Firestore deleteDevice notice:", err);
    return null;
  }
}

/**
 * Subscribes to device screens and evaluates Online/Offline status using the 90-second threshold:
 * ONLINE: lastHeartbeat within 90 seconds
 * OFFLINE: no heartbeat for more than 90 seconds
 */
export function subscribeScreens(callback: (devices: any[]) => void) {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const q = query(deviceCollection);

    return onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const devices = snapshot.docs.map((d) => {
          const data = d.data();
          let isOnline = false;
          if (data.lastHeartbeat) {
            const hbTime = new Date(data.lastHeartbeat).getTime();
            isOnline = now - hbTime <= 90000; // within 90 seconds
          } else if (data.status === 'online') {
            isOnline = true;
          }

          return {
            id: d.id,
            deviceId: data.deviceId || d.id,
            name: data.deviceName || data.name || d.id,
            department: data.department || 'ALL',
            status: isOnline ? 'online' : 'offline',
            lastSeen: data.lastHeartbeat || data.lastSeen || new Date().toISOString(),
            lastHeartbeat: data.lastHeartbeat,
            currentThemeId: data.currentThemeId || 'light-college',
            appVersion: data.appVersion || '1.0.0',
            screenResolution: data.screenResolution,
            ...data,
            statusComputed: isOnline ? 'online' : 'offline',
          };
        });

        callback(devices);
      },
      (err) => {
        console.warn("Firestore screens subscription notice / offline:", err);
      }
    );
  } catch (err) {
    console.warn("subscribeScreens setup notice:", err);
    return () => {};
  }
}