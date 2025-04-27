"use client";

import { useState, useEffect } from "react";
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
  defaultInvoiceNumber?: string; // Now optional
  existingInvoice?: InvoiceWithItemsAndClient | null; // Add optional prop for editing
}

export function CreateInvoiceWrapper({
  clients,
  profile,
  defaultInvoiceNumber, // Still needed for the case when NOT editing
  existingInvoice, // Destructure the new prop
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

  const handleClientChange = (clientId: string | null) => {
    setSelectedClientId(clientId);
  };

  // Fetch suggestion when client changes, ONLY IF NOT EDITING
  useEffect(() => {
    if (selectedClientId && !isEditing) {
      fetchSuggestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, isEditing]); // Add isEditing dependency

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
        defaultInvoiceNumber={defaultInvoiceNumber}
        existingInvoice={existingInvoice} // Pass existing invoice data
        onClientChange={handleClientChange}
        // Pass AI data only if NOT editing
        initialData={isEditing ? null : suggestedInvoice}
        onInvoiceSubmitSuccess={handleInvoiceSubmitSuccess}
        isLoading={isEditing ? false : isLoading} // Don't show AI loading state when editing
      />
    </div>
  );
}
