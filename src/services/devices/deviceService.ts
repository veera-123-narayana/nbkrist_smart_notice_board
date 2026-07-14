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

const deviceCollection = collection(db, "devices");

export async function registerDevice(device: any) {
  return await addDoc(deviceCollection, {
    ...device,
    createdAt: serverTimestamp(),
  });
}

export async function updateDevice(id: string, data: any) {
  return await updateDoc(doc(db, "devices", id), data);
}

export async function deleteDevice(id: string) {
  return await deleteDoc(doc(db, "devices", id));
}

export function subscribeScreens(callback: (devices: any[]) => void) {
  const q = query(deviceCollection);

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  });
}