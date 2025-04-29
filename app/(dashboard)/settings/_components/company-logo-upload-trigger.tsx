"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Building2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadCompanyLogo } from "@/lib/supabase/client/storage";
import { updateProfile } from "@/app/actions/profileActions";
import { ImageUploadModal } from "@/components/ui/image-upload-modal";
import { cn } from "@/lib/utils";

interface CompanyLogoUploadTriggerProps {
  userId: string;
  currentLogoUrl: string | null;
}

export function CompanyLogoUploadTrigger({
  userId,
  currentLogoUrl,
}: CompanyLogoUploadTriggerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayLogoUrl, setDisplayLogoUrl] = useState(currentLogoUrl);

  useEffect(() => {
    setDisplayLogoUrl(currentLogoUrl);
  }, [currentLogoUrl]);

  const handleUploadComplete = (newUrl: string | null) => {
    setDisplayLogoUrl(newUrl);
  };

  const logoUploadAction = async (
    uploadFormData: FormData
  ): Promise<{
    success: boolean;
    error?: string;
    newImageUrl?: string | null;
  }> => {
    const file = uploadFormData.get("companyLogoFile") as File | null;
    if (!file) {
      return { success: false, error: "No logo file provided." };
    }
    if (!userId) {
      return { success: false, error: "User ID missing." };
    }

    let uploadedUrl: string | null = null;
    try {
      uploadedUrl = await uploadCompanyLogo(file, userId);

      const profileUpdateFormData = new FormData();
      profileUpdateFormData.append("company_logo_url", uploadedUrl);
      const result = await updateProfile(profileUpdateFormData);

      if (!result.success) {
        throw new Error(result.error || "Failed to save logo URL to profile.");
      }
      return { success: true, newImageUrl: uploadedUrl };
    } catch (error: unknown) {
      console.error("Logo upload/update failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred.",
        newImageUrl: null,
      };
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative">
        <Button
          variant="ghost"
          className={cn(
            "relative group h-72 w-72 rounded-full border p-0",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          onClick={() => setIsModalOpen(true)}
          aria-label="Update company logo"
        >
          {displayLogoUrl ? (
            <Image
              src={displayLogoUrl}
              alt="Current Company Logo"
              fill
              className="rounded-full object-contain p-1 group-hover:opacity-75 transition-opacity duration-200"
            />
          ) : (
            <Building2 className="!h-24 !w-24 text-muted-foreground group-hover:opacity-75 transition-opacity duration-200" />
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="!h-8 !w-8 text-white" />
          </div>
        </Button>
      </div>

      <span className="text-sm font-medium text-muted-foreground mt-1">
        Company Logo
      </span>

      <ImageUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        uploadAction={logoUploadAction}
        currentImageUrl={displayLogoUrl}
        imageTypeLabel="Company Logo"
        inputName="companyLogoFile"
        maxSizeMB={2}
        acceptedFileTypes={{
          "image/png": [".png"],
          "image/jpeg": [".jpg", ".jpeg"],
          "image/webp": [".webp"],
        }}
      />
    </div>
  );
}
