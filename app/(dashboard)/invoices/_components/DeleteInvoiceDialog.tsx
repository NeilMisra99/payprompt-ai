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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DeleteInvoiceDialogProps {
  invoiceId: string;
  invoiceNumber: string; // For display in the dialog
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    invoiceId: string
  ) => Promise<{ success: boolean; message: string }>; // The server action
}

export function DeleteInvoiceDialog({
  invoiceId,
  invoiceNumber,
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteInvoiceDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    const result = await onConfirm(invoiceId);
    setIsDeleting(false);

    if (result.success) {
      toast.success(result.message);
      onOpenChange(false); // Close dialog on success
    } else {
      toast.error(result.message);
      // Optionally keep the dialog open on error, or close it
      // onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {/* No trigger here, it will be handled externally */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete invoice
            <span className="font-semibold"> #{invoiceNumber}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
