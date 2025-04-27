import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

// Assume CreateInvoiceWrapper can handle editing by accepting an `existingInvoice` prop
// We might need to adjust CreateInvoiceWrapper later
import { CreateInvoiceWrapper } from "../../_components/CreateInvoiceWrapper";
import type {
  Client as InvoiceFormClientType,
  Profile as InvoiceFormProfileType,
  InvoiceWithItemsAndClient as InvoiceFormDataType, // Assuming this type exists or will be created
} from "../../_components/invoice-form"; // Keep type imports

// Define types based on the new API endpoint `/invoices/:id/edit-data`
interface EditInvoiceData {
  invoice: InvoiceFormDataType; // Includes invoice details, client object, and items array
  items: InvoiceFormDataType["items"] | null;
  clients: InvoiceFormClientType[];
  profile: InvoiceFormProfileType | null;
}

// Function to fetch data for the edit invoice page
async function fetchEditInvoiceData(
  invoiceId: string
): Promise<EditInvoiceData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/invoices/${invoiceId}/edit-data`;
  const token = await cookies();
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token.toString(),
      },
      cache: "no-store", // Don't cache edit data heavily
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching edit invoice data");
      return null; // Will trigger redirect
    }
    if (response.status === 404) {
      console.warn("Invoice not found for editing:", invoiceId);
      return null; // Will trigger notFound()
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(
        `Failed to fetch edit invoice data: ${response.statusText}`
      );
    }

    const data: EditInvoiceData = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching edit invoice data:", error);
    // Consider how to handle errors, maybe redirect or show an error message
    // For now, return null which will lead to notFound() or redirect
    return null;
  }
}

interface EditInvoicePageProps {
  params: { id: string };
}

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps) {
  const { id: invoiceId } = params;
  const editData = await fetchEditInvoiceData(invoiceId);

  // Handle unauthorized access
  if (editData === null) {
    // Basic check, ideally API handles this better
    redirect("/login");
  }

  // Handle invoice not found (404 from fetch) or other fetch errors
  if (!editData) {
    notFound();
  }

  const { invoice, items, clients, profile } = editData;

  // Combine invoice details and items into the structure expected by the form
  const invoiceForForm: InvoiceFormDataType = {
    ...invoice,
    items: items ?? [], // Add the items array to the invoice object
  };

  // Check if the fetched invoice is actually a draft, otherwise redirect to view
  if (invoiceForForm.status !== "draft") {
    console.warn(
      `Attempted to edit non-draft invoice (${invoiceId}), redirecting to view.`
    );
    redirect(`/invoices/${invoiceId}`);
  }

  return (
    <div className="space-y-6 mb-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Draft Invoice #{invoiceForForm.invoice_number}
        </h1>
        <p className="text-muted-foreground">
          Update the details for this draft invoice.
        </p>
      </div>

      {/* Render the Client Component Wrapper, passing the combined invoice data */}
      <CreateInvoiceWrapper
        clients={clients}
        profile={profile ?? undefined}
        existingInvoice={invoiceForForm} // Pass the combined data
      />
    </div>
  );
}
