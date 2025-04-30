"use server";

import { createClient } from "@/utils/supabase/server";
import { type Profile } from "@/app/(dashboard)/settings/_components/profile-form";
import { revalidateTag } from "next/cache";
import type { ProfileData } from "@/components/auth/otp-form"; // Import ProfileData type

// Interface defining fields that can be updated via the main profile form
// Note: avatar_url and company_logo_url are now expected to be passed in if changed
interface ProfileUpdateData {
  company_name?: string | null;
  company_email?: string | null;
  company_address_street?: string | null;
  company_address_line2?: string | null;
  company_address_city?: string | null;
  company_address_state?: string | null;
  company_address_postal_code?: string | null;
  company_address_country?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null; // URL passed from client after upload
  company_logo_url?: string | null; // URL passed from client after upload
  timezone?: string | null; // <-- Add timezone
}

// Explicitly list the keys we expect and can handle from FormData
const profileUpdateKeys: Array<keyof ProfileUpdateData> = [
  "company_name",
  "company_email",
  "company_address_street",
  "company_address_line2",
  "company_address_city",
  "company_address_state",
  "company_address_postal_code",
  "company_address_country",
  "full_name",
  "username",
  "avatar_url",
  "company_logo_url",
  "timezone", // <-- Add timezone
];

// Consolidated action to update profile fields (including pre-uploaded image URLs)
export async function updateProfile(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Update profile error: User not authenticated", authError);
    return { success: false, error: "User not authenticated" };
  }

  // Prepare the data specifically for the Supabase update, matching Profile keys
  const updateData: { [K in keyof Profile]?: Profile[K] } = {}; // Use a mapped type based on Profile
  let hasChanges = false;

  // Iterate through expected keys and populate updateData from formData
  profileUpdateKeys.forEach((key) => {
    if (formData.has(key)) {
      const value = formData.get(key);
      // Ensure we only process string values from FormData for profile fields
      if (typeof value === "string") {
        // Assign string value or null if it's an empty string
        updateData[key] = value === "" ? null : value;
        hasChanges = true;
      }
      // Ignore File objects or unexpected types in profile data update
    }
  });

  // Type assertion for adding updated_at
  const finalUpdateData = updateData as Partial<Profile> & {
    updated_at?: Date;
  };

  // Add updated_at only if there are other changes
  if (hasChanges) {
    finalUpdateData.updated_at = new Date();
  } else {
    console.log("[updateProfile] No relevant fields to update.");
    return { success: true }; // No changes submitted
  }

  console.log(
    `[updateProfile] Attempting to update profile for user: ${user.id}`,
    JSON.stringify(finalUpdateData, null, 2)
  );

  // --- Update Profile Table ---
  const { error: updateError } = await supabase
    .from("profiles")
    .update(finalUpdateData) // Should be type-safe now
    .eq("id", user.id);

  if (updateError) {
    console.error("[updateProfile] Error during UPDATE phase:", updateError);
    const errorMsg = `Failed to update profile: ${updateError.message} (Code: ${updateError.code})`;
    return {
      success: false,
      error: errorMsg,
    };
  }

  console.log(
    "[updateProfile] Profile update action completed successfully for user:",
    user.id
  );
  revalidateTag("profile");

  return { success: true };
}

// REMOVED the dedicated updateCompanyLogoAction as its functionality
// (updating the URL in the profiles table) is now handled by updateProfile.
// The client will call uploadCompanyLogo and pass the URL to updateProfile.

// --- NEW ACTION --- //

/**
 * Creates the user's profile entry in the database after successful OTP verification.
 * This should only be called *after* supabase.auth.verifyOtp confirms the user.
 * Relies on RLS policies allowing an authenticated user to insert into their own profile row.
 *
 * @param profileData - The complete profile data collected during registration.
 * @returns Object indicating success or failure.
 */
export async function createProfile(profileInputData: ProfileData): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Double-check authentication on the server-side
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Crucial: Ensure the user calling this action is the one whose profile is being created
  if (authError || !user || user.id !== profileInputData.userId) {
    console.error("Create profile error: Mismatch or unauthenticated", {
      serverUserId: user?.id,
      dataUserId: profileInputData.userId,
      authError,
    });
    return {
      success: false,
      error: "Authentication error or User ID mismatch.",
    };
  }

  // Prepare data for UPDATE, matching the 'profiles' table schema
  // Remove 'id' as it's used in the .eq() filter, not in the update payload.
  const profileToUpdate: Omit<
    Profile,
    "id" | "invoice_settings" | "created_at"
  > & {
    updated_at?: Date | string;
  } = {
    full_name: profileInputData.fullName,
    username: null, // Assuming username is not collected at signup initially
    company_name: profileInputData.companyName,
    company_email: profileInputData.companyEmail,
    company_address_street: profileInputData.companyAddressStreet,
    company_address_line2: profileInputData.companyAddressLine2,
    company_address_city: profileInputData.companyAddressCity,
    company_address_state: profileInputData.companyAddressState,
    company_address_postal_code: profileInputData.companyAddressPostalCode,
    company_address_country: profileInputData.companyAddressCountry,
    avatar_url: null, // Set avatar_url explicitly to null initially
    company_logo_url: profileInputData.logoUrl,
    updated_at: new Date().toISOString(), // Set updated_at on this modification
  };

  console.log(
    `[createProfile] Attempting to UPDATE profile for user: ${user.id}`,
    JSON.stringify(profileToUpdate, null, 2)
  );

  // Use .update() instead of .insert()
  const { error: updateError } = await supabase
    .from("profiles")
    .update(profileToUpdate)
    .eq("id", user.id); // Specify which profile to update

  if (updateError) {
    console.error("[createProfile] Error updating profile:", updateError);
    // No need to check for 23505 specifically anymore, as update won't cause that
    // unless there's a different unique constraint violation (e.g., username if made unique)
    return {
      success: false,
      error: `Database error: ${updateError.message} (Code: ${updateError.code})`,
    };
  }

  console.log(
    "[createProfile] Profile updated successfully after OTP verification for user:",
    user.id
  );
  revalidateTag("profile"); // Revalidate if profile data is fetched elsewhere

  return { success: true };
}
