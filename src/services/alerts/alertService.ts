import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "../../firebase/config";
import { saveCachedAlerts } from "../cache/offlineCache";

const alertCollection = collection(db, "alerts");

export async function createAlert(alert: any) {
  if (!isFirebaseConfigured) return null;
  try {
    return await addDoc(alertCollection, {
      ...alert,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore createAlert notice (local store mode):", err);
    return null;
  }
}

export async function updateAlert(id: string, data: any) {
  if (!isFirebaseConfigured) return null;
  try {
    return await updateDoc(doc(db, "alerts", id), data);
  } catch (err) {
    console.warn("Firestore updateAlert notice (local store mode):", err);
    return null;
  }
}

export async function deleteAlert(id: string) {
  if (!isFirebaseConfigured) return null;
  try {
    return await deleteDoc(doc(db, "alerts", id));
  } catch (err) {
    console.warn("Firestore deleteAlert notice (local store mode):", err);
    return null;
  }
}

export function subscribeAlerts(callback: (alerts: any[]) => void) {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const q = query(alertCollection, orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const alerts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        saveCachedAlerts(alerts as any).catch((e) =>
          console.warn("Failed to cache alerts to IndexedDB:", e)
        );

        callback(alerts);
      },
      (error) => {
        console.warn("Firestore alerts subscription error / offline fallback:", error);
      }
    );
  } catch (err) {
    console.warn("subscribeAlerts setup notice:", err);
    return () => {};
  }
}