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

import { db } from "../../firebase/config";

const themeCollection = collection(db, "themes");

export async function createTheme(theme: any) {
  return await addDoc(themeCollection, {
    ...theme,
    createdAt: serverTimestamp(),
  });
}

export async function updateTheme(id: string, data: any) {
  return await updateDoc(doc(db, "themes", id), data);
}

export async function deleteTheme(id: string) {
  return await deleteDoc(doc(db, "themes", id));
}

export function subscribeThemes(callback: (themes: any[]) => void) {
  const q = query(themeCollection);

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  });
}