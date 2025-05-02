"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { InvoiceForm } from "./invoice-form";
import { useAISuggestedInvoice } from "@/hooks/use-ai-suggested-invoice";
import type {
  Client,
  Profile,
  InvoiceWithItemsAndClient,
} from "./invoice-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error state
import { Terminal, RefreshCcw, Loader2 } from "lucide-react"; // Added icons
import { Button } from "@/components/ui/button"; // Added Button

interface CreateInvoiceWrapperProps {
  clients: Client[];
  profile?: Profile;
  existingInvoice?: InvoiceWithItemsAndClient | null;
}

// Helper to increment the numeric part of an invoice number string
function incrementInvoiceNumber(invoiceNumberStr: string): string | null {
  const match = invoiceNumberStr.match(/^(.*?-?)(\d+)$/);
  if (match && match[1] !== undefined && match[2]) {
    const prefix = match[1];
    const numberStr = match[2];
    const nextNumber = parseInt(numberStr, 10) + 1;
    const paddedNextNumber = nextNumber
      .toString()
      .padStart(numberStr.length, "0");
    return `${prefix}${paddedNextNumber}`;
  }
  return null; // Return null if format is unexpected
}

export function CreateInvoiceWrapper({
  clients,
  profile,
  existingInvoice,
}: CreateInvoiceWrapperProps) {
  const router = useRouter(); // Initialize router
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    existingInvoice?.client?.id ?? null // Initialize with existing client ID if editing
  );
  const isEditing = !!existingInvoice; // Determine if we are in edit mode

  const {
    suggestedInvoice,
    isLoading,
    error,
    fetchSuggestion,
    regenerateSuggestion, // Get regenerate function
  } = useAISuggestedInvoice({ clientId: selectedClientId });

  // Calculate the next invoice number based on the selected client's history
  const calculatedInvoiceNumber = useMemo(() => {
    if (isEditing) {
      const num = existingInvoice?.invoice_number ?? "";
      return num;
    }
    if (!selectedClientId) {
      return ""; // No client selected, maybe return placeholder or default?
    }

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const lastClientInvoice = selectedClient?.last_invoice_number;

    if (lastClientInvoice) {
      const nextNum = incrementInvoiceNumber(lastClientInvoice);
      if (nextNum) {
        return nextNum; // Successfully incremented client's last number
      }
      console.warn(
        `Could not increment invoice number format: ${lastClientInvoice}`
      );
    }

    // Fallback: No client history or failed increment, use default format
    const currentYear = new Date().getFullYear();
    const defaultNum = `INV-${currentYear}-001`; // Default for new clients or on error
    return defaultNum;
  }, [selectedClientId, clients, isEditing, existingInvoice]);

  const handleClientChange = (clientId: string | null) => {
    setSelectedClientId(clientId);
  };

  // Fetch suggestion when client changes, ONLY IF NOT EDITING
  useEffect(() => {
    if (selectedClientId && !isEditing) {
      fetchSuggestion();
    }
  }, [selectedClientId, isEditing, fetchSuggestion]); // Added fetchSuggestion dependency

  // Updated success handler - simplified
  const handleInvoiceSubmitSuccess = () => {
    router.push("/invoices");
  };

  return (
    <div className="space-y-4">
      {" "}
      {/* Add space-y for elements */}
      {/* Conditionally render AI suggestion related UI only when creating new */}
      {!isEditing && selectedClientId && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateSuggestion}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Regenerate Suggestion
          </Button>
        </div>
      )}
      {/* Conditionally render error only when creating new */}
      {!isEditing && error && !isLoading && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Suggestion</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Render the form, passing down props and suggestion data */}
      {/* Pass existingInvoice data down to InvoiceForm */}
      <InvoiceForm
        clients={clients}
        profile={profile}
        defaultInvoiceNumber={calculatedInvoiceNumber}
        existingInvoice={existingInvoice}
        onClientChange={handleClientChange}
        initialData={isEditing ? null : suggestedInvoice}
        onInvoiceSubmitSuccess={handleInvoiceSubmitSuccess}
        isLoading={isEditing ? false : isLoading}
      />
    </div>
  );
}
