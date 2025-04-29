"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUploadModal } from "@/components/ui/image-upload-modal";
import { updateProfile } from "@/app/actions/profileActions";
import { uploadUserAvatar } from "@/lib/supabase/client/storage";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

interface AvatarUploadTriggerProps {
  userId: string;
  currentAvatarUrl: string | null;
  userName: string; // For fallback
}

export function AvatarUploadTrigger({
  userId,
  currentAvatarUrl,
  userName,
}: AvatarUploadTriggerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState(currentAvatarUrl);
  const router = useRouter();

  useEffect(() => {
    setDisplayAvatarUrl(currentAvatarUrl);
  }, [currentAvatarUrl]);

  const handleUploadComplete = (newUrl: string | null) => {
    setDisplayAvatarUrl(newUrl);
    router.refresh();
  };

  const avatarUploadAction = async (
    uploadFormData: FormData
  ): Promise<{
    success: boolean;
    error?: string;
    newImageUrl?: string | null;
  }> => {
    const file = uploadFormData.get("avatarFile") as File | null;
    if (!file) {
      return { success: false, error: "No avatar file provided." };
    }
    if (!userId) {
      return { success: false, error: "User ID missing." };
    }

    let uploadedUrl: string | null = null;
    try {
      // 1. Client-side upload
      uploadedUrl = await uploadUserAvatar(file, userId);

      // 2. Call server action to update profile with the new URL
      const profileUpdateFormData = new FormData();
      profileUpdateFormData.append("avatar_url", uploadedUrl);
      const result = await updateProfile(profileUpdateFormData);

      if (!result.success) {
        throw new Error(
          result.error || "Failed to save avatar URL to profile."
        );
      }

      // Return success with the new URL for the modal
      return { success: true, newImageUrl: uploadedUrl };
    } catch (error: unknown) {
      console.error("Avatar upload/update failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred.",
        newImageUrl: null,
      };
    }
  };

  return (
    <div>
      <Avatar
        className="relative group h-72 w-72 border cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <AvatarImage
          src={displayAvatarUrl ?? undefined}
          alt={userName ?? "User avatar"}
          className="object-cover group-hover:opacity-75 transition-opacity duration-200"
        />
        <AvatarFallback className="text-6xl group-hover:opacity-75 transition-opacity duration-200">
          {userName?.charAt(0).toUpperCase() ?? "U"}
        </AvatarFallback>
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </Avatar>

      <ImageUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        uploadAction={avatarUploadAction}
        currentImageUrl={displayAvatarUrl}
        imageTypeLabel="Profile Picture"
        inputName="avatarFile"
        maxSizeMB={1}
        acceptedFileTypes={{
          "image/png": [".png"],
          "image/jpeg": [".jpg", ".jpeg"],
          "image/webp": [".webp"],
        }}
      />
    </div>
  );
}
