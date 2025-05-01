import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removed manual Table imports
import { DataTable } from "@/components/ui/data-table"; // Import DataTable
import {
  columns,
  type Invoice as InvoiceColumnType,
} from "./_components/columns"; // Import columns and type
// Removed formatCurrency, formatDate, StatusBadge imports (handled in columns.tsx)
import { AnimatedContainer } from "@/components/ui/animated-container";
import { CreateInvoiceLink } from "./_components/create-invoice-link"; // Import the new component
// import { unstable_cache } from "next/cache"; // Remove unstable_cache
// import type { SupabaseClient } from "@supabase/supabase-js"; // Remove SupabaseClient type
import { cookies } from "next/headers"; // Import cookies

// Define the Invoice type based on API response
// Keep this interface for the fetch function's return type
interface ClientStub {
  id: string; // Assuming clients have an ID
  name: string | null;
}

interface FetchedInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  status: string; // API returns string
  clients: ClientStub | null;
  user_id: string;
  created_at: string;
}

// Function to fetch clients from the API endpoint
async function fetchClients(token: string): Promise<ClientStub[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/clients`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token,
      },
      cache: "force-cache",
      next: { tags: ["clients"] }, // Tag for revalidation
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching clients");
      return [];
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch clients: ${response.statusText}`);
    }

    const data: ClientStub[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

// Function to fetch invoices from the API endpoint
async function fetchInvoices(token: string): Promise<FetchedInvoice[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/invoices`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token,
      },
      cache: "force-cache",
      next: { tags: ["invoices"] }, // Tag for revalidation
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching invoices");
      return [];
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch invoices: ${response.statusText}`);
    }

    const data: FetchedInvoice[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
}

export default async function InvoicesPage() {
  const token = await cookies();
  // Fetch both invoices and clients in parallel
  const [fetchedInvoices, fetchedClients] = await Promise.all([
    fetchInvoices(token.toString()),
    fetchClients(token.toString()),
  ]);

  // Determine if there are any clients
  const hasClients = fetchedClients.length > 0;

  // Prepare data for DataTable - map to the structure expected by columns.tsx
  const invoicesForTable: InvoiceColumnType[] = fetchedInvoices.map((inv) => ({
    ...inv,
    client_name: inv.clients?.name || null, // Extract client name, ensuring it can be null
    status: inv.status as InvoiceColumnType["status"], // Cast status to the expected enum/type
  }));

  return (
    <div className="space-y-6">
      <AnimatedContainer variant="fadeIn" delay={0.1}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">Manage your invoices</p>{" "}
            {/* Use muted-foreground */}
          </div>
          <CreateInvoiceLink hasClients={hasClients} />
        </div>
      </AnimatedContainer>

      <AnimatedContainer variant="slideUp" delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            {/* Filters will be rendered inside DataTable */}
          </CardHeader>
          <CardContent>
            {/* Use DataTable */}
            <DataTable columns={columns} data={invoicesForTable} />
            {/* Remove the old table structure and empty state logic */}
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
