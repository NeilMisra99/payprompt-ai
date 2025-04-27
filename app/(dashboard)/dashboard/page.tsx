// import { createClient } from "@/utils/supabase/server"; // Removed
import { DollarSign, Users, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns, type Invoice as InvoiceColumnType } from "./columns"; // Renamed imported type
import { AnimatedContainer } from "@/components/ui/animated-container";
import { FloatingIcon } from "@/components/ui/floating-icon";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cookies } from "next/headers"; // Added

// Define types based on the new /api/hono/dashboard endpoint response
interface DashboardClientStub {
  name: string | null;
}

interface DashboardInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  status: string; // Consider using a specific enum/union type if possible
  clients: DashboardClientStub | null;
  user_id: string;
  created_at: string;
  // Add other necessary invoice fields
}

interface DashboardData {
  invoices: DashboardInvoice[];
  clientCount: number;
}

// Function to fetch dashboard data from the API endpoint
async function fetchDashboardData(token: string): Promise<DashboardData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/dashboard`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token,
      },
      cache: "force-cache",
      next: { tags: ["dashboard", "invoices", "clients"] }, // Tag for revalidation
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching dashboard data");
      // Return default empty state if unauthorized
      return { invoices: [], clientCount: 0 };
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }

    const data: DashboardData = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Return default empty state on error
    return { invoices: [], clientCount: 0 };
  }
}

export default async function DashboardPage() {
  // Removed Supabase client creation and direct data fetching
  const token = await cookies();
  const { invoices: fetchedInvoices, clientCount } = await fetchDashboardData(
    token.toString()
  );

  // Prepare data for DataTable (map client data)
  // Use the type defined in columns.tsx for the DataTable
  const invoicesForTable: InvoiceColumnType[] = fetchedInvoices.map((inv) => ({
    ...inv,
    client_name: inv.clients?.name || "N/A", // Extract client name
    status: inv.status as InvoiceColumnType["status"], // Ensure status type matches DataTable expectation
  }));

  // Calculate statistics from fetched data
  const totalOutstanding =
    fetchedInvoices
      ?.filter((invoice) => invoice.status !== "paid")
      .reduce((sum, invoice) => sum + invoice.total, 0) || 0;

  const totalOverdue =
    fetchedInvoices
      ?.filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.total, 0) || 0;

  const invoiceCount = fetchedInvoices?.length || 0;
  // clientCount is directly from fetched data

  return (
    <div className="space-y-6">
      <AnimatedContainer variant="fadeIn" delay={0.1}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your invoicing activity
          </p>
        </div>
      </AnimatedContainer>

      {/* Stats Cards with staggered animation */}
      <AnimatedContainer variant="staggered" delay={0.2}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 - Total Outstanding */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Outstanding
              </CardTitle>
              <FloatingIcon distance="small" duration={4}>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </FloatingIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber
                  value={totalOutstanding}
                  isCurrency={true}
                  delay={0.3}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                From {invoiceCount} invoices
              </p>
            </CardContent>
          </Card>

          {/* Card 2 - Overdue Amount */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overdue Amount
              </CardTitle>
              <FloatingIcon distance="medium" duration={3.5} delay={0.2}>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </FloatingIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber
                  value={totalOverdue}
                  isCurrency={true}
                  delay={0.35}
                />
              </div>
              <p className="text-xs text-destructive">Requires attention</p>
            </CardContent>
          </Card>

          {/* Card 3 - Total Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Invoices
              </CardTitle>
              <FloatingIcon distance="small" duration={4.2} delay={0.4}>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </FloatingIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={invoiceCount} delay={0.4} />
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          {/* Card 4 - Total Clients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clients
              </CardTitle>
              <FloatingIcon distance="medium" duration={3.8} delay={0.6}>
                <Users className="h-4 w-4 text-muted-foreground" />
              </FloatingIcon>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={clientCount} delay={0.45} />
              </div>
              <p className="text-xs text-muted-foreground">Active accounts</p>
            </CardContent>
          </Card>
        </div>
      </AnimatedContainer>

      {/* Recent Invoices Card with slide up animation */}
      <AnimatedContainer variant="slideUp" delay={0.4}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={invoicesForTable} />
            </CardContent>
          </Card>
        </div>
      </AnimatedContainer>
    </div>
  );
}
