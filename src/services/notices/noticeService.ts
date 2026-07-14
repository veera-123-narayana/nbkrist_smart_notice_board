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

const noticeCollection = collection(db, "notices");

export async function createNotice(notice: any) {
  console.log("Notice received by createNotice:", notice);

  return await addDoc(noticeCollection, {
    ...notice,
    createdAt: serverTimestamp(),
  });
}

export async function updateNotice(id: string, data: any) {
  const ref = doc(db, "notices", id);
  return await updateDoc(ref, data);
}

export async function deleteNotice(id: string) {
  const ref = doc(db, "notices", id);
  return await deleteDoc(ref);
}

export function subscribeNotices(callback: (data: any[]) => void) {
  const q = query(noticeCollection, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const notices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    callback(notices);
  });
}