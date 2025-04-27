import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClientForm from "../_components/client-form";
import { updateClientAction } from "@/app/actions/clientActions";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  contact_person?: string | null;
  user_id: string;
  // Add other fields if returned by API
}

// Function to fetch a single client from the API endpoint
async function fetchClient(id: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/clients/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token,
      },
      cache: "force-cache",
      next: { tags: [`clients:${id}`] }, // Tag for revalidation
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching client");
      return null; // Handled by redirect below
    }

    if (response.status === 404) {
      return null; // Handled by notFound below
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch client: ${response.statusText}`);
    }

    const data: Client = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching client:", error);
    return null;
  }
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditClientPage(props: PageProps) {
  const params = await props.params;
  // Check authentication first
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Now fetch the client data
  const clientId = params.id;
  const token = await cookies();
  const client = await fetchClient(clientId, token.toString());

  // Handle client not found (we already checked auth)
  if (!client) {
    notFound(); // Client doesn't exist or user doesn't have access
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Client</h1>
          <p className="text-gray-500">Update client information</p>
        </div>
        <Link href="/clients" prefetch={true}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            defaultValues={{
              name: client.name,
              email: client.email,
              phone: client.phone || "",
              address: client.address || "",
              contactPerson: client.contact_person || "",
            }}
            action={updateClientAction.bind(null, clientId)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
