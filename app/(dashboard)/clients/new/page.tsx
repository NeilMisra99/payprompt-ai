import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClientForm from "../_components/client-form";
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";

export default async function NewClientPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Create client action
  async function createClientAction(
    formData: FormData
  ): Promise<{ error: string } | void> {
    "use server";

    const supabase = await createSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const contactPerson = formData.get("contactPerson") as string;

    // Insert client
    const { error }: { error: PostgrestError | null } = await supabase
      .from("clients")
      .insert({
        name,
        email,
        phone: phone || null,
        address: address || null,
        contact_person: contactPerson || null,
        user_id: user.id,
      });

    if (error) {
      return { error: error.message };
    }

    revalidateTag("clients");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Client</h1>
          <p className="text-gray-500">Add a new client to your account</p>
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
          <ClientForm action={createClientAction} />
        </CardContent>
      </Card>
    </div>
  );
}
