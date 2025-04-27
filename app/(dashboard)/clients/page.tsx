import Link from "next/link";
// Remove Supabase client import for fetching data directly
// import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  columns,
  type Client as ClientColumnType,
} from "./_components/columns";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { CsvWizard } from "@/components/import/csv-wizard";
// import { deleteClientAction } from "@/app/actions/clientActions"; // Action handled in columns now
import { cookies } from "next/headers";

// Define the client type based on API response
// Renamed to FetchedClient to distinguish from Column type
interface FetchedClient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  contact_person?: string | null;
}

// Function to fetch clients from the API endpoint (remains the same)
async function fetchClients(token: string): Promise<FetchedClient[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/clients`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token.toString(),
      },
      cache: "force-cache",
      next: { tags: ["clients"] },
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch clients: ${response.statusText}`);
    }

    const data: FetchedClient[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export default async function ClientsPage() {
  const token = await cookies();
  const fetchedClients = await fetchClients(token.toString());

  // Prepare data for DataTable - ensure it matches ClientColumnType if needed
  // In this case, FetchedClient likely already matches ClientColumnType
  const clientsForTable: ClientColumnType[] = fetchedClients;

  return (
    <div className="space-y-6">
      <AnimatedContainer variant="fadeIn" delay={0.1}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">Manage your clients</p>
          </div>
          <div className="flex items-center gap-2">
            <CsvWizard />
            <Link href="/clients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </Link>
          </div>
        </div>
      </AnimatedContainer>

      <AnimatedContainer variant="slideUp" delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={clientsForTable} />
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
