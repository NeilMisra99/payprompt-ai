"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type FileRejection, type FileError } from "react-dropzone";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (newUrl: string | null) => void; // Callback with new URL
  uploadAction: (formData: FormData) => Promise<{
    success: boolean;
    error?: string;
    newImageUrl?: string | null; // Action should return the new URL
  }>;
  currentImageUrl?: string | null;
  imageTypeLabel: string; // e.g., "Profile Picture", "Company Logo"
  inputName: string; // e.g., "avatarFile", "companyLogoFile"
  maxSizeMB: number;
  acceptedFileTypes: { [key: string]: string[] }; // e.g., { 'image/png': ['.png'], ... }
}

export function ImageUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  uploadAction,
  currentImageUrl,
  imageTypeLabel,
  inputName,
  maxSizeMB,
  acceptedFileTypes,
}: ImageUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    currentImageUrl || null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Reset preview AND file when currentImageUrl changes or dialog closes externally
  useEffect(() => {
    if (!isOpen) {
      // If dialog is closed
      setPreview(currentImageUrl || null);
      setFile(null); // Reset file selection as well
    } else if (!file) {
      // If dialog is open but no file selected
      setPreview(currentImageUrl || null);
    }
  }, [currentImageUrl, file, isOpen]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        fileRejections.forEach(({ errors }) => {
          errors.forEach((err: FileError) => {
            if (err.code === "file-too-large") {
              toast.error(`File is too large. Max size is ${maxSizeMB}MB.`);
            } else if (err.code === "file-invalid-type") {
              toast.error("Invalid file type selected.");
            } else {
              toast.error(err.message);
            }
          });
        });
        return;
      }

      const selectedFile = acceptedFiles[0];
      if (selectedFile) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    },
    [maxSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: false,
    maxSize: maxSizeMB * 1024 * 1024,
  });

  async function handleUpload() {
    if (!file) {
      toast.warning(
        `Please select a ${imageTypeLabel.toLowerCase()} file first.`
      );
      return;
    }

    setIsLoading(true);
    const originalToastId = toast.loading(
      `Uploading ${imageTypeLabel.toLowerCase()}...`
    );

    const formData = new FormData();
    formData.append(inputName, file);

    try {
      const result = await uploadAction(formData);
      toast.dismiss(originalToastId);

      if (result.success) {
        toast.success(`${imageTypeLabel} updated successfully!`);
        setFile(null); // Clear selection
        onUploadComplete(result.newImageUrl || null); // Pass new URL back
        onClose(); // Close modal on success
      } else {
        throw new Error(
          result.error || `Failed to update ${imageTypeLabel.toLowerCase()}.`
        );
      }
    } catch (error: unknown) {
      toast.dismiss(originalToastId);
      console.error(`Error uploading ${imageTypeLabel.toLowerCase()}:`, error);
      const message =
        error instanceof Error
          ? error.message
          : `Failed to update ${imageTypeLabel.toLowerCase()}.`;
      toast.error(`Failed to update ${imageTypeLabel.toLowerCase()}`, {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[480px]"
        onPointerDownOutside={(event) => {
          if (!isLoading) {
            onClose();
            event.preventDefault();
          } else {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Update {imageTypeLabel}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-muted/50"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-sm text-muted-foreground">
                Drop the image here ...
              </p>
            ) : (
              <p className="text-sm text-center text-muted-foreground">
                Drag & drop your image here, or click to select
                <br />
                (Max {maxSizeMB}MB)
              </p>
            )}
          </div>

          {preview && (
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <Image
                src={preview}
                alt={`${imageTypeLabel} Preview`}
                width={200} // Larger preview size
                height={200}
                className="inline-block object-contain rounded border p-1 bg-muted/30 max-h-[250px]"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={!file || isLoading}>
            {isLoading ? "Uploading..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
