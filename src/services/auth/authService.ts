import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { auth, isFirebaseConfigured } from "../../firebase/config";

export const login = async (email: string, password: string) => {
  if (!email || !email.trim() || !password) {
    throw new Error("Admin email and password are required.");
  }

  const cleanEmail = email.trim();

  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase configuration missing. Please provide VITE_FIREBASE_API_KEY and related configuration."
    );
  }

  return await signInWithEmailAndPassword(auth, cleanEmail, password);
};

export const logout = async () => {
  if (!isFirebaseConfigured) {
    return Promise.resolve();
  }
  try {
    return await signOut(auth);
  } catch (err) {
    console.warn("Firebase logout notice:", err);
    return Promise.resolve();
  }
};

export const observeUser = (
  callback: (user: User | null) => void
) => {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  try {
    return onAuthStateChanged(
      auth, 
      (user) => callback(user),
      (err) => {
        console.warn("Firebase Auth observer notice:", err?.message);
        callback(null);
      }
    );
  } catch (err) {
    console.warn("Firebase observeUser initialization notice:", err);
    callback(null);
    return () => {};
  }
};