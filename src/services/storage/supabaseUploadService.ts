import { auth } from "../../firebase/config";
import { storeEngine } from "../../store";

export interface SupabaseUploadResult {
  success: boolean;
  publicUrl: string;
  path: string;
}

/**
 * Uploads a file (PDF circular document or flyer image) to Supabase Storage bucket 'notice-files'
 * via the secure backend endpoint POST /api/storage/upload on Render.
 * 
 * SECURITY: The Supabase service-role secret key exists ONLY on the backend server.
 * The client communicates securely via the backend API endpoint.
 */
export async function uploadFileToSupabase(file: File): Promise<SupabaseUploadResult> {
  if (!file) {
    throw new Error("No file specified for upload.");
  }

  const rawBackend = import.meta.env.VITE_BACKEND_URL || "";
  const backendUrl = rawBackend.replace(/\/+$/, "");
  const endpoint = backendUrl ? `${backendUrl}/api/storage/upload` : "/api/storage/upload";

  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};

  // Attach Firebase authentication Bearer token if user is signed in
  try {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const idToken = await firebaseUser.getIdToken();
      headers["Authorization"] = `Bearer ${idToken}`;
    }
  } catch (err) {
    console.warn("Could not acquire Firebase token for Supabase upload:", err);
  }

  // Attach active admin session credentials from global store
  const activeUser = storeEngine.getActiveUser();
  if (activeUser?.role) {
    headers["x-admin-role"] = activeUser.role;
  }
  if (activeUser?.email) {
    headers["x-admin-email"] = activeUser.email;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (networkErr: any) {
    throw new Error(
      `Failed to connect to backend upload service at ${endpoint}. Please ensure the Render backend server is running.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success || !data.publicUrl) {
    const errorMsg = data?.error || `Upload failed with status code ${response.status}.`;
    throw new Error(errorMsg);
  }

  return {
    success: true,
    publicUrl: data.publicUrl,
    path: data.path,
  };
}
