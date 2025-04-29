"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { updateProfile } from "@/app/actions/profileActions";
import { uploadUserAvatar } from "@/lib/supabase/client/storage"; // Import client upload function
import { cn } from "@/lib/utils";
import { type User } from "@supabase/supabase-js";

interface AvatarUploadFormProps {
  user: User;
  initialAvatarUrl: string | null;
  userName?: string | null; // For fallback
}

// Helper function to get avatar fallback initials
function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AvatarUploadForm({
  user,
  initialAvatarUrl,
  userName,
}: AvatarUploadFormProps) {
  const router = useRouter();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialAvatarUrl
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setError("Avatar file size must be less than 1MB.");
        toast.error("Avatar file size must be less than 1MB.");
        e.target.value = "";
        setAvatarFile(null);
        setAvatarPreview(initialAvatarUrl);
        return;
      }
      setAvatarFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      setAvatarPreview(initialAvatarUrl);
    }
  };

  const handleUpload = async () => {
    if (!avatarFile || !user) {
      setError("Please select a file to upload.");
      toast.warning("Please select a file to upload.");
      return;
    }

    setIsLoading(true);
    setError(null);
    let newAvatarUrl: string | null = null;

    try {
      // Step 1: Upload image client-side
      toast.info("Uploading avatar...");
      newAvatarUrl = await uploadUserAvatar(avatarFile, user.id);
      toast.success("Avatar uploaded! Saving profile...");

      // Step 2: Call server action with only the URL
      const formData = new FormData();
      formData.append("avatar_url", newAvatarUrl);

      const { success, error: profileError } = await updateProfile(formData);

      if (!success || profileError) {
        // Attempt to clean up if profile update fails? Maybe not necessary.
        throw new Error(
          profileError || "Avatar uploaded, but failed to update profile."
        );
      }

      toast.success("Profile updated successfully!");
      setAvatarFile(null); // Clear file input state
      // Preview is already updated optimistically or by upload result
      setAvatarPreview(newAvatarUrl); // Ensure preview shows the final URL
      router.refresh(); // Refresh server state
    } catch (err: unknown) {
      console.error("Avatar upload/update error:", err);
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      toast.error(`Update failed: ${message}`);
      // Revert preview if update failed after successful upload
      if (newAvatarUrl) {
        setAvatarPreview(initialAvatarUrl);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <Label>Profile Picture</Label>
      <div className="flex items-center gap-4 mt-3">
        <Avatar className="h-16 w-16 flex-shrink-0">
          <AvatarImage
            src={avatarPreview ?? undefined}
            alt={userName ?? "User avatar"}
          />
          <AvatarFallback>{getInitials(userName)}</AvatarFallback>
        </Avatar>
        <Input
          id="avatarFile"
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
        />
        <Label
          htmlFor="avatarFile"
          className="flex-grow h-10 flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:cursor-pointer"
        >
          <span
            className={cn("truncate", !avatarFile && "text-muted-foreground")}
          >
            {avatarFile ? avatarFile.name : "Select a picture..."}
          </span>
          <div className="ml-4 inline-flex h-auto items-center justify-center whitespace-nowrap rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground ring-offset-background transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
            Choose File
          </div>
        </Label>
        <Button
          onClick={handleUpload}
          disabled={!avatarFile || isLoading}
          size="sm"
          className="flex-shrink-0"
        >
          {isLoading ? "Saving..." : "Save Avatar"}
        </Button>
      </div>
      <div className="pl-[calc(4rem+1rem)]">
        <div className="h-4 pt-1">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && (
            <p className="text-xs text-muted-foreground">
              Recommended: Square image (PNG, JPG, WEBP). Max 1MB.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
