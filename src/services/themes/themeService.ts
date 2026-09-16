import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "../../firebase/config";
import { saveCachedThemes } from "../cache/offlineCache";

const themeCollection = collection(db, "themes");

export async function createTheme(theme: any) {
  if (!isFirebaseConfigured) return null;
  try {
    return await addDoc(themeCollection, {
      ...theme,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore createTheme notice (local store mode):", err);
    return null;
  }
}

export async function updateTheme(id: string, data: any) {
  if (!isFirebaseConfigured) return null;
  try {
    return await updateDoc(doc(db, "themes", id), data);
  } catch (err) {
    console.warn("Firestore updateTheme notice (local store mode):", err);
    return null;
  }
}

export async function deleteTheme(id: string) {
  if (!isFirebaseConfigured) return null;
  try {
    return await deleteDoc(doc(db, "themes", id));
  } catch (err) {
    console.warn("Firestore deleteTheme notice (local store mode):", err);
    return null;
  }
}

export function subscribeThemes(callback: (themes: any[]) => void) {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const q = query(themeCollection);

    return onSnapshot(
      q,
      (snapshot) => {
        const themes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        saveCachedThemes(themes as any).catch((e) =>
          console.warn("Failed to cache themes to IndexedDB:", e)
        );

        callback(themes);
      },
      (error) => {
        console.warn("Firestore themes subscription error / offline fallback:", error);
      }
    );
  } catch (err) {
    console.warn("subscribeThemes setup notice:", err);
    return () => {};
  }
}