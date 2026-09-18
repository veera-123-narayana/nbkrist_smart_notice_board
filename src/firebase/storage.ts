import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseConfigured } from "./config";

export default storage;

/**
 * Uploads a PDF document to Firebase Storage and returns its HTTPS public download URL.
 * Automatically configures inline content-disposition and application/pdf contentType
 * so that mobile phone browsers open the PDF directly upon scanning the QR code.
 */
export async function uploadPdfToStorage(
  file: File,
  filename?: string
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase Storage is not configured. Please ensure VITE_FIREBASE_STORAGE_BUCKET is declared."
    );
  }

  try {
    const originalName = filename || file.name || `circular_${Date.now()}.pdf`;
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalFileName = `${uniqueSuffix}_${cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`}`;
    const storagePath = `circulars/${finalFileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: "application/pdf",
      contentDisposition: "inline",
      customMetadata: {
        originalName: originalName,
        uploadedAt: new Date().toISOString(),
      },
    };

    const uploadResult = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    if (!downloadUrl || !downloadUrl.startsWith("http")) {
      throw new Error("Failed to obtain a valid public download URL from Firebase Storage.");
    }

    return downloadUrl;
  } catch (err: any) {
    console.error("Firebase Storage PDF upload error:", err);
    throw new Error(
      err?.message || "Failed to upload PDF to Firebase Storage. Please check storage bucket permissions."
    );
  }
}

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
