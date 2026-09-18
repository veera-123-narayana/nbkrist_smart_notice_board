import { uploadFileToSupabase } from "../services/storage/supabaseUploadService";

/**
 * Storage adapter - Firebase Storage has been replaced with Supabase Storage ('notice-files' bucket).
 * Uploads are routed through the Render backend endpoint /api/storage/upload.
 */
export async function uploadPdfToStorage(
  file: File,
  _filename?: string
): Promise<string> {
  const result = await uploadFileToSupabase(file);
  return result.publicUrl;
}

export async function uploadMediaToStorage(
  file: File | Blob,
  _customPath?: string
): Promise<string> {
  let fileToUpload: File;
  if (file instanceof File) {
    fileToUpload = file;
  } else {
    fileToUpload = new File([file], `media_${Date.now()}.jpg`, {
      type: file.type || "image/jpeg",
    });
  }
  const result = await uploadFileToSupabase(fileToUpload);
  return result.publicUrl;
}
