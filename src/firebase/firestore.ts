import { doc, getDoc } from "firebase/firestore";
import { db } from "./config";

export default db;

export const getUserByUID = async (uid: string) => {
  console.log("========== FIRESTORE DEBUG ==========");
  console.log("Searching UID:", uid);

  const ref = doc(db, "users", uid);

  console.log("Document Path:", ref.path);

  const snap = await getDoc(ref);

  console.log("Document Exists:", snap.exists());

  if (snap.exists()) {
    console.log("Document Data:", snap.data());
    return snap.data();
  }

  console.log("Document NOT FOUND");

  return null;
};