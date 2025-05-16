// import { createClient } from "@/utils/supabase/server"; // Removed
import { redirect } from "next/navigation";
// import { InvoiceForm } from "../_components/invoice-form"; // Remove direct form import
import { CreateInvoiceWrapper } from "../_components/CreateInvoiceWrapper"; // Import the wrapper
import { cookies } from "next/headers";
import type {
  Client as InvoiceFormClientType, // Reverted: Keep using imported type
  Profile as InvoiceFormProfileType,
} from "../_components/invoice-form";

// Define types based on API response matching InvoiceForm expectations
interface NewInvoiceData {
  clients: InvoiceFormClientType[];
  profile: InvoiceFormProfileType | null;
}

// Function to fetch data for the new invoice page
async function fetchNewInvoiceData(
  token: string
): Promise<NewInvoiceData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/invoices/new-data`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token,
      },
      cache: "force-cache",
      next: { tags: ["clients", "profile", "invoices"] }, // Invalidate when related data changes
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching new invoice data");
      return null; // Handled by redirect below
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(
        `Failed to fetch new invoice data: ${response.statusText}`
      );
    }

    const data: NewInvoiceData = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching new invoice data:", error);
    // Return null or a default structure if needed, depends on how errors should be handled
    return null;
  }
}

export default async function NewInvoicePage() {
  const token = await cookies();
  const invoiceData = await fetchNewInvoiceData(token.toString());

  if (!invoiceData) {
    redirect("/login");
  }

  const { clients, profile } = invoiceData;

  return (
    <div className="space-y-6 mb-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Invoice
        </h1>
        <p className="text-gray-500">
          Create and send professional invoices to your clients
        </p>
      </div>

      {/* Render the Client Component Wrapper */}
      <CreateInvoiceWrapper clients={clients} profile={profile ?? undefined} />
    </div>
  );
}
