"use client";

import { useState, useCallback } from "react";
import { z } from "zod";

// Re-define the schema shape on the client to validate the response
// Ideally, this would be shared from a common types package
const AISuggestedInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  dueDate: z.string(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        qty: z.number(),
        unitPrice: z.number(),
      })
    )
    .min(1),
  notes: z.string().optional(),
  discounts: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number(),
      })
    )
    .optional(),
});

type AISuggestedInvoice = z.infer<typeof AISuggestedInvoiceSchema>;

interface UseAISuggestedInvoiceProps {
  clientId: string | null;
  currency?: string; // Optional currency, defaults to USD
}

interface UseAISuggestedInvoiceReturn {
  suggestedInvoice: AISuggestedInvoice | null;
  isLoading: boolean;
  error: string | null;
  fetchSuggestion: () => Promise<void>; // Keep internal fetch for useEffect
  regenerateSuggestion: () => Promise<void>; // Expose for button click
}

export function useAISuggestedInvoice({
  clientId,
  currency = "USD", // Default currency
}: UseAISuggestedInvoiceProps): UseAISuggestedInvoiceReturn {
  const [suggestedInvoice, setSuggestedInvoice] =
    useState<AISuggestedInvoice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const performFetch = useCallback(async () => {
    if (!clientId) {
      setError("Client ID is required to fetch suggestions.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId, currency }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      // Validate the response against the Zod schema
      const validationResult = AISuggestedInvoiceSchema.safeParse(data);

      if (!validationResult.success) {
        console.error("Invalid AI suggestion format:", validationResult.error);
        throw new Error("Received invalid suggestion format from server.");
      }

      setSuggestedInvoice(validationResult.data);
    } catch (err: unknown) {
      console.error("Error fetching AI suggestion:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setSuggestedInvoice(null);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, currency]);

  return {
    suggestedInvoice,
    isLoading,
    error,
    fetchSuggestion: performFetch,
    regenerateSuggestion: performFetch,
  };
}
