import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;

// Check if a real, valid Firebase API key is configured
export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  typeof rawApiKey === "string" &&
  rawApiKey.trim() !== "" &&
  !rawApiKey.includes("YOUR_") &&
  rawApiKey.length > 10
);

// Fallback configuration ensures Firebase SDKs (Auth, Firestore, Storage)
// do not throw 'auth/invalid-api-key' at startup if environment variables are not yet provided.
const firebaseConfig = {
  apiKey: isFirebaseConfigured ? rawApiKey : "AIzaSyDummyKeyForFallbackNBKRIST2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nbkrist-smart-notice-board.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nbkrist-smart-notice-board",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nbkrist-smart-notice-board.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:100000000000:web:abcdef123456",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;