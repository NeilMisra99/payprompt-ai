"use client";

import React, { useState, useCallback } from "react";
// TODO: Install and import react-dropzone
// import { useDropzone } from 'react-dropzone';
import { UploadCloud } from "lucide-react";

interface CsvDropzoneProps {
  onFileAccepted: (file: File) => void;
  // TODO: Add props for max size, file types (.csv, .zip), disabled state
}

export function CsvDropzone({ onFileAccepted }: CsvDropzoneProps) {
  // TODO: Integrate react-dropzone hook
  const [isDragging, setIsDragging] = useState(false);

  // Placeholder handler - replace with react-dropzone's onDrop
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileAccepted(file);
    }
  };

  // Placeholder drag handlers - replace with react-dropzone's getInputProps/getRootProps
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        onFileAccepted(file);
      }
    },
    [onFileAccepted]
  );

  return (
    // TODO: Replace div with dropzone root props
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-primary/50"
        }`}
    >
      {/* TODO: Replace input with dropzone input props */}
      <input
        type="file"
        accept=".csv,.zip"
        onChange={handleFileChange}
        className="hidden"
        id="csv-upload"
      />
      <label htmlFor="csv-upload" className="cursor-pointer block">
        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-semibold text-primary">
          Click to upload or drag and drop
        </p>
        <p className="text-sm text-muted-foreground">
          CSV or ZIP file (Max 5MB)
        </p>{" "}
        {/* TODO: Make max size dynamic */}
      </label>
    </div>
  );
}
