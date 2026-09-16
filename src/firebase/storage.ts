import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseConfigured } from "./config";

export default storage;

/**
 * Uploads an image or file blob to Firebase Storage and returns its HTTPS public URL.
 * Falls back to base64 Data URL if Firebase is offline or unconfigured.
 */
export async function uploadMediaToStorage(
  file: File | Blob,
  customPath?: string
): Promise<string> {
  if (isFirebaseConfigured) {
    try {
      const extension = (file as File).name ? (file as File).name.split('.').pop() : 'jpg';
      const filePath = customPath || `notices/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
      const storageRef = ref(storage, filePath);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      console.warn("Firebase Storage upload notice, falling back to local format:", err);
    }
  }

  // Fallback to Data URL for instant local/offline use
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
