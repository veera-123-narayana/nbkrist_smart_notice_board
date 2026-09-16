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
import { saveCachedNotices } from "../cache/offlineCache";

const noticeCollection = collection(db, "notices");

export async function createNotice(notice: any) {
  if (!isFirebaseConfigured) return null;
  try {
    return await addDoc(noticeCollection, {
      ...notice,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore createNotice notice (operating in local store mode):", err);
    return null;
  }
}

export async function updateNotice(id: string, data: any) {
  if (!isFirebaseConfigured) return null;
  try {
    const ref = doc(db, "notices", id);
    return await updateDoc(ref, data);
  } catch (err) {
    console.warn("Firestore updateNotice notice (operating in local store mode):", err);
    return null;
  }
}

export async function deleteNotice(id: string) {
  if (!isFirebaseConfigured) return null;
  try {
    const ref = doc(db, "notices", id);
    return await deleteDoc(ref);
  } catch (err) {
    console.warn("Firestore deleteNotice notice (operating in local store mode):", err);
    return null;
  }
}

export function subscribeNotices(callback: (data: any[]) => void) {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const q = query(noticeCollection, orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const notices = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Cache notices to IndexedDB for offline resilience
        saveCachedNotices(notices as any).catch((e) =>
          console.warn("Failed to cache notices to IndexedDB:", e)
        );

        callback(notices);
      },
      (error) => {
        console.warn("Firestore notice subscription error / offline fallback:", error);
      }
    );
  } catch (err) {
    console.warn("subscribeNotices setup notice:", err);
    return () => {};
  }
}