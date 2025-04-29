import { createClient } from "@/utils/supabase/client";
import { sanitizeFileName } from "@/lib/utils";

/**
 * Uploads a company logo to Supabase storage.
 *
 * @param file - The logo file to upload.
 * @param userId - The ID of the user uploading the logo (used for path organization).
 * @returns The public URL of the uploaded logo.
 * @throws If the upload fails or the file size exceeds 2MB.
 */
export async function uploadCompanyLogo(
  file: File,
  userId: string
): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error("No file provided for upload.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Logo file size must be less than 2MB.");
  }

  const supabase = createClient();
  const sanitizedFileName = sanitizeFileName(file.name);

  // --- BEGIN DEBUG LOGGING ---
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  console.log("[uploadCompanyLogo] User ID Prop:", userId);
  console.log("[uploadCompanyLogo] Current Session:", session);
  console.log("[uploadCompanyLogo] Current Auth User ID:", session?.user?.id);

  if (sessionError) {
    console.error("[uploadCompanyLogo] Error getting session:", sessionError);
  }
  if (!session || session.user.id !== userId) {
    console.warn("[uploadCompanyLogo] Potential User ID mismatch!");
  }
  // --- END DEBUG LOGGING ---

  const filePath = `${userId}/${Date.now()}_${sanitizedFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("company_logos") // Ensure this bucket exists and has correct policies
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Company Logo Upload Error:", uploadError);
    throw new Error(`Failed to upload company logo: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("company_logos")
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    // This case is unlikely if upload succeeded but good to handle
    console.error("Failed to get public URL for uploaded company logo.");
    throw new Error("Logo uploaded, but failed to retrieve its public URL.");
  }

  return urlData.publicUrl;
}

/**
 * Uploads a user avatar to Supabase storage.
 *
 * @param file - The avatar file to upload.
 * @param userId - The ID of the user uploading the avatar (used for path organization).
 * @returns The public URL of the uploaded avatar.
 * @throws If the upload fails or the file size exceeds 1MB (adjust size limit as needed).
 */
export async function uploadUserAvatar(
  file: File,
  userId: string
): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error("No file provided for upload.");
  }

  // Example: Smaller size limit for avatars
  if (file.size > 1 * 1024 * 1024) {
    throw new Error("Avatar file size must be less than 1MB.");
  }

  const supabase = createClient();
  const sanitizedFileName = sanitizeFileName(file.name);

  // --- BEGIN DEBUG LOGGING ---
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  console.log("[uploadUserAvatar] User ID Prop:", userId);
  console.log("[uploadUserAvatar] Current Session:", session);
  console.log("[uploadUserAvatar] Current Auth User ID:", session?.user?.id);

  if (sessionError) {
    console.error("[uploadUserAvatar] Error getting session:", sessionError);
  }
  if (!session || session.user.id !== userId) {
    console.warn("[uploadUserAvatar] Potential User ID mismatch!");
  }
  // --- END DEBUG LOGGING ---

  // Correct path for avatars RLS policy: <user_id>/<filename>
  const filePath = `${userId}/${Date.now()}_${sanitizedFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars") // Ensure this bucket exists and has correct policies
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("User Avatar Upload Error:", uploadError);
    throw new Error(`Failed to upload user avatar: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    console.error("Failed to get public URL for uploaded user avatar.");
    throw new Error("Avatar uploaded, but failed to retrieve its public URL.");
  }

  return urlData.publicUrl;
}
