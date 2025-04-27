"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as React from "react";
import { toast } from "sonner"; // Use sonner
import { Loader2 } from "lucide-react";

interface DeleteClientDialogProps {
  clientId: string;
  clientName: string; // For display in the dialog
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    clientId: string
  ) => Promise<{ success: boolean; message: string }>; // The server action
}

export function DeleteClientDialog({
  clientId,
  clientName,
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteClientDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    const result = await onConfirm(clientId);
    setIsDeleting(false);

    if (result.success) {
      toast.success(result.message);
      onOpenChange(false); // Close dialog on success
    } else {
      toast.error(result.message);
      // Keep the dialog open on error so user sees message
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {/* No trigger here, it will be handled externally */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            client
            <span className="font-semibold"> {clientName}</span> and all
            associated data (like invoices).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:bg-red-700"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Delete Client
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
