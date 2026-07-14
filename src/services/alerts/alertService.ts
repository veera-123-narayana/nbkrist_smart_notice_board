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

import { db } from "../../firebase/config";

const alertCollection = collection(db, "alerts");

export async function createAlert(alert: any) {
  return await addDoc(alertCollection, {
    ...alert,
    createdAt: serverTimestamp(),
  });
}

export async function updateAlert(id: string, data: any) {
  return await updateDoc(doc(db, "alerts", id), data);
}

export async function deleteAlert(id: string) {
  return await deleteDoc(doc(db, "alerts", id));
}

export function subscribeAlerts(callback: (alerts: any[]) => void) {
  const q = query(alertCollection, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  });
}