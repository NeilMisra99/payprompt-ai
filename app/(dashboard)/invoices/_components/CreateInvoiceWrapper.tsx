"use client";

import { useState, useEffect, useCallback } from "react";
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

  // State for the calculated/fetched invoice number
  const [calculatedInvoiceNumber, setCalculatedInvoiceNumber] =
    useState<string>(
      existingInvoice?.invoice_number ?? "" // Initial value for editing or empty
    );
  const [isFetchingNumber, setIsFetchingNumber] = useState<boolean>(false);
  const [fetchNumberError, setFetchNumberError] = useState<string | null>(null);

  const {
    suggestedInvoice,
    isLoading: isLoadingAISuggestion, // Rename to avoid conflict
    error: suggestionError, // Rename to avoid conflict
    fetchSuggestion,
    regenerateSuggestion, // Get regenerate function
  } = useAISuggestedInvoice({ clientId: selectedClientId });

  // Function to fetch the next invoice number for a given prefix
  const fetchNextNumber = useCallback(async (prefix: string) => {
    setIsFetchingNumber(true);
    setFetchNumberError(null);
    try {
      const response = await fetch(
        `/api/hono/invoices/next-number?prefix=${encodeURIComponent(prefix)}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      const data = await response.json();
      if (!data.nextInvoiceNumber) {
        throw new Error("API did not return next invoice number");
      }
      setCalculatedInvoiceNumber(data.nextInvoiceNumber);
    } catch (err) {
      console.error("Failed to fetch next invoice number:", err);
      setFetchNumberError(err instanceof Error ? err.message : "Unknown error");
      // Optionally set a default/error state for calculatedInvoiceNumber?
      setCalculatedInvoiceNumber(""); // Reset on error?
    } finally {
      setIsFetchingNumber(false);
    }
  }, []); // Empty dependency array as it doesn't depend on component state directly

  // Effect to fetch the next invoice number when client changes
  useEffect(() => {
    if (isEditing || !selectedClientId) {
      // Don't fetch if editing or no client selected
      // Reset number if client is deselected? Depends on desired UX.
      if (!selectedClientId && !isEditing) setCalculatedInvoiceNumber("");
      return;
    }

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const lastClientInvoice = selectedClient?.last_invoice_number;

    let prefixToUse: string | null = null;
    const currentYear = new Date().getFullYear();

    if (lastClientInvoice) {
      const match = lastClientInvoice.match(/^(.*?-?)(\d+)$/);
      if (match && match[1] !== undefined) {
        let basePrefix = match[1];
        // Ensure prefix includes year for matching
        if (!basePrefix.includes(currentYear.toString())) {
          const yearMatch = basePrefix.match(/(\d{4})-$/);
          const yearToUse = yearMatch ? yearMatch[1] : currentYear.toString();
          const prefixBaseOnly = basePrefix.replace(/\d{4}-?$/, "");
          basePrefix = `${prefixBaseOnly}${yearToUse}-`;
        }
        prefixToUse = basePrefix;
      } else {
        console.warn(
          "Could not parse prefix from lastClientInvoice, using default."
        );
        prefixToUse = `INV-${currentYear}-`;
      }
    } else {
      // Default for clients with no history
      prefixToUse = `INV-${currentYear}-`;
    }

    if (prefixToUse) {
      fetchNextNumber(prefixToUse);
    }
  }, [selectedClientId, clients, isEditing, fetchNextNumber]); // Depend on client, edit state, and fetch function

  const handleClientChange = (clientId: string | null) => {
    setSelectedClientId(clientId);
    setCalculatedInvoiceNumber(""); // Clear previous number immediately
    setIsFetchingNumber(true); // Show loading state for number
  };

  // Effect to fetch AI suggestion (kept separate)
  useEffect(() => {
    if (selectedClientId && !isEditing) {
      fetchSuggestion();
    }
  }, [selectedClientId, isEditing, fetchSuggestion]);

  // Updated success handler - simplified
  const handleInvoiceSubmitSuccess = () => {
    router.push("/invoices");
  };

  // Combine loading states for the form
  const isFormLoading = isLoadingAISuggestion || isFetchingNumber;

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
            disabled={isLoadingAISuggestion}
          >
            {isLoadingAISuggestion ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Regenerate Suggestion
          </Button>
        </div>
      )}
      {/* Conditionally render error only when creating new */}
      {!isEditing && suggestionError && !isLoadingAISuggestion && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Suggestion</AlertTitle>
          <AlertDescription>{suggestionError}</AlertDescription>
        </Alert>
      )}
      {/* Show number fetching errors */}
      {!isEditing && fetchNumberError && !isFetchingNumber && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Invoice Number</AlertTitle>
          <AlertDescription>{fetchNumberError}</AlertDescription>
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
        isLoading={isFormLoading}
      />
    </div>
  );
}
