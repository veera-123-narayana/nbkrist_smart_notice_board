import { doc, getDoc } from "firebase/firestore";
import { db } from "./config";

export default db;

export const getUserByUID = async (uid: string) => {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn("Firestore getUserByUID notice (operating in offline/local mode):", err);
    return null;
  }
};