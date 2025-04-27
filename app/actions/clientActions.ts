"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidateTag, revalidatePath } from "next/cache";
// import { redirect } from "next/navigation"; // Removed unused import

export async function deleteClientAction(
  clientId: string
): Promise<{ success: boolean; message: string }> {
  if (!clientId) {
    return { success: false, message: "Client ID is required for deletion." };
  }

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error(
      "Unauthorized access attempt in deleteClientAction:",
      authError
    );
    // Return error instead of redirecting
    return { success: false, message: "Unauthorized. Please log in again." };
  }

  // --- Removed manual deletion of associated invoices --- //
  // Assumes ON DELETE CASCADE is set on the invoices.client_id foreign key

  try {
    // Delete client
    const { error: clientError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId)
      .eq("user_id", user.id); // Ensure user owns the client

    if (clientError) {
      console.error("Failed to delete client:", clientError);
      // Check for specific errors if needed
      if (clientError.code === "42501") {
        // RLS violation
        return {
          success: false,
          message: `Permission denied: ${clientError.message}`,
        };
      }
      // Handle foreign key violation if cascade delete isn't set up
      if (clientError.code === "23503") {
        // foreign_key_violation
        return {
          success: false,
          message:
            "Cannot delete client: Associated records exist (e.g., invoices). Please remove them first or contact support.",
        };
      }
      return {
        success: false,
        message: `Failed to delete client: ${clientError.message}`,
      };
    }

    // Revalidate the cache for the clients list
    revalidateTag("clients");
    revalidatePath("/clients"); // Also revalidate path just in case
    revalidatePath("/dashboard"); // Dashboard might show client count

    return { success: true, message: "Client deleted successfully." }; // Return success object
  } catch (error: unknown) {
    console.error("Unexpected error in deleteClientAction:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An unknown error occurred during deletion.";
    return { success: false, message };
  }
}

// Action to update an existing client
export async function updateClientAction(
  clientId: string,
  formData: FormData
): Promise<{ error: string } | void> {
  // Return type matches ClientForm prop
  "use server"; // Ensure this is also marked as a server action

  if (!clientId) {
    return { error: "Client ID is required for update." };
  }

  const supabase = await createClient();

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rawFormData = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    contactPerson: formData.get("contactPerson") || undefined,
  };

  // Basic validation
  if (!rawFormData.name || !rawFormData.email) {
    return { error: "Name and Email are required." };
  }

  // Update client in Supabase
  const { error } = await supabase
    .from("clients")
    .update({
      name: rawFormData.name as string,
      email: rawFormData.email as string,
      phone: rawFormData.phone as string | undefined,
      address: rawFormData.address as string | undefined,
      contact_person: rawFormData.contactPerson as string | undefined,
    })
    .eq("id", clientId) // Use the passed clientId
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating client:", error);
    return { error: `Failed to update client: ${error.message}` };
  }

  // Revalidate relevant caches
  revalidateTag("clients"); // Revalidate the list page
  revalidateTag(`clients:${clientId}`); // Revalidate the specific client page using the correct tag

  // No explicit return needed on success (returns void implicitly)
}
