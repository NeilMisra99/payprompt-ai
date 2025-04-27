import Link from "next/link";
// import { createClient } from "@/utils/supabase/server"; // Remove direct Supabase client
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react"; // Removed unused icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removed manual Table imports
import { DataTable } from "@/components/ui/data-table"; // Import DataTable
import {
  columns,
  type Invoice as InvoiceColumnType,
} from "./_components/columns"; // Import columns and type
// Removed formatCurrency, formatDate, StatusBadge imports (handled in columns.tsx)
import { AnimatedContainer } from "@/components/ui/animated-container";
// import { unstable_cache } from "next/cache"; // Remove unstable_cache
// import type { SupabaseClient } from "@supabase/supabase-js"; // Remove SupabaseClient type
import { cookies } from "next/headers"; // Import cookies

// Define the Invoice type based on API response
// Keep this interface for the fetch function's return type
interface ClientStub {
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
  const fetchedInvoices = await fetchInvoices(token.toString());

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
          <Link href="/invoices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
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
