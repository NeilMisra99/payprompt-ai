"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import { updateProfile } from "@/app/actions/profileActions"; // Use the correct action
import { uploadCompanyLogo } from "@/lib/supabase/client/storage"; // Import client upload
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CompanyLogoUploadFormProps {
  userId: string; // Add userId prop
  currentLogoUrl?: string | null;
}

export function CompanyLogoUploadForm({
  userId, // Destructure userId
  currentLogoUrl,
}: CompanyLogoUploadFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size exceeds 2MB limit.");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    multiple: false,
  });

  async function handleUpload() {
    if (!logoFile) {
      toast.warning("Please select or drop a logo file first.");
      return;
    }
    if (!userId) {
      toast.error("User information is missing. Cannot upload."); // Should not happen if prop passed correctly
      return;
    }

    setIsLoading(true);
    toast.loading("Uploading company logo...");
    let newLogoUrl: string | null = null;

    try {
      // Step 1: Upload client-side
      newLogoUrl = await uploadCompanyLogo(logoFile, userId);
      toast.dismiss(); // Dismiss loading toast
      toast.success("Logo uploaded! Saving profile...");

      // Step 2: Call updateProfile action with the URL
      const formData = new FormData();
      formData.append("company_logo_url", newLogoUrl);

      const result = await updateProfile(formData); // Call the correct action

      if (result.success) {
        toast.success("Profile updated successfully!");
        setPreview(newLogoUrl); // Update preview with the final URL
        setLogoFile(null); // Clear selection
        // router.refresh(); // Consider if refresh is needed here
      } else {
        throw new Error(
          result.error || "Failed to update profile with logo URL."
        );
      }
    } catch (error) {
      toast.dismiss(); // Dismiss loading/success toast if error occurs
      console.error("Error uploading/updating company logo:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to update company logo", {
        description: errorMessage,
      });
      // Revert preview if update failed after successful upload
      if (newLogoUrl) {
        setPreview(currentLogoUrl || null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Label>Company Logo</Label>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragActive
            ? "border-primary"
            : "border-border hover:border-muted-foreground/50"
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-sm text-muted-foreground">
            Drop the logo here ...
          </p>
        ) : (
          <p className="text-sm text-center text-muted-foreground">
            Drag & drop your logo here, or click to select file
            <br />
            (PNG, JPG, WEBP - Max 2MB)
          </p>
        )}
      </div>

      {(preview || logoFile) && (
        <div className="mt-4 text-center space-y-2">
          <p className="text-sm font-medium">
            {logoFile ? "New Logo Preview:" : "Current Logo:"}
          </p>
          <Image
            src={preview!} // Preview state holds the URL
            alt="Company Logo Preview"
            width={150} // Adjust size as needed
            height={150}
            className="inline-block object-contain rounded border p-1 bg-muted/30"
          />
        </div>
      )}

      {logoFile && (
        <Button
          onClick={handleUpload}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? "Saving..." : "Save New Logo"}
        </Button>
      )}
    </div>
  );
}
