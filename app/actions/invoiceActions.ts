"use server";

import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency } from "@/lib/utils"; // Import for reminder message
import { tasks } from "@trigger.dev/sdk/v3"; // Import Trigger.dev tasks
import { generateInvoicePdf } from "../api/trigger/invoicePdf";

// Define the schema for input validation (copied from invoice-form.tsx)
const invoiceFormSchema = z.object({
  client_id: z.string({ required_error: "Please select a client" }),
  invoice_number: z.string().min(1, "Invoice number is required"),
  issue_date: z.date({ required_error: "Issue date is required" }),
  due_date: z.date({ required_error: "Due date is required" }),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce
          .number()
          .min(0.01, "Quantity must be greater than 0"),
        price: z.coerce.number().min(0.01, "Price must be greater than 0"),
      })
    )
    .min(1, "At least one item is required"),
  tax: z.coerce.number().min(0, "Tax cannot be negative").default(0),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// Define status type
type InvoiceStatus = "draft" | "sent";

// Define type for the data structure being inserted/passed
interface InvoicePayload {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string; // Formatted date
  due_date: string; // Formatted date
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  notes?: string | null;
  payment_terms?: string | null;
}

// --- Helper to Trigger PDF Task ---
async function triggerPdfGeneration(invoiceId: string, userId: string) {
  try {
    console.log(`Triggering PDF generation task for invoice ${invoiceId}`);
    const payload = {
      invoiceId: invoiceId,
      userId: userId,
    };

    // Trigger the task (don't await the result here, it runs in the background)
    await tasks.trigger<typeof generateInvoicePdf>(
      "generate-invoice-pdf",
      payload
    );
    console.log(
      `PDF generation task triggered successfully for invoice ${invoiceId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `Error triggering PDF generation task for invoice ${invoiceId}:`,
      error
    );
    // Return a warning, as the main invoice action might have succeeded
    return {
      success: false,
      warning: "Invoice saved/sent, but failed to trigger PDF generation.",
    };
  }
}

// Action function
export async function createInvoiceAction(
  // Raw form data comes in, needs parsing/validation
  rawData: InvoiceFormValues,
  status: InvoiceStatus
) {
  // Correct usage for server client
  const supabase = await createClient();

  // 1. Get Authenticated User
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Authentication Error:", authError);
    return { success: false, error: "Unauthorized: User not found." };
  }

  // 2. Validate Input Data
  const validationResult = invoiceFormSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error("Validation Error:", validationResult.error.flatten());
    // Consider returning specific field errors if needed by the form
    return { success: false, error: "Invalid form data." };
  }

  const data = validationResult.data;

  // 3. Calculate totals (can be done server-side for consistency)
  const subtotal = data.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
    0
  );
  const taxAmount = (subtotal * data.tax) / 100;
  const discountAmount = (subtotal * data.discount) / 100;
  const total = subtotal + taxAmount - discountAmount;
  const invoiceId = uuidv4();

  try {
    // 4. Insert Invoice
    const invoicePayload: InvoicePayload = {
      id: invoiceId,
      user_id: user.id,
      client_id: data.client_id,
      invoice_number: data.invoice_number,
      issue_date: format(data.issue_date, "yyyy-MM-dd"),
      due_date: format(data.due_date, "yyyy-MM-dd"),
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total,
      status,
      notes: data.notes,
      payment_terms: data.payment_terms,
    };
    const { error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoicePayload);

    if (invoiceError) {
      console.error("Supabase Invoice Insert Error:", invoiceError);
      // Check specifically for RLS violation if needed
      if (invoiceError.code === "42501") {
        return {
          success: false,
          error: `Row-level security violation: ${invoiceError.message}`,
        };
      }
      return {
        success: false,
        error: `Failed to save invoice: ${invoiceError.message}`,
      };
    }

    // 5. Insert Invoice Items
    const invoiceItems = data.items.map((item) => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      amount: item.quantity * item.price,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsError) {
      console.error("Supabase Items Insert Error:", itemsError);
      // Attempt to roll back invoice? Or notify user of partial success?
      // For now, return error, but consider cleanup logic.
      return {
        success: false,
        error: `Failed to save invoice items: ${itemsError.message}`,
      };
    }

    // 6. Create Reminder if Sent
    if (status === "sent") {
      // Fetch client name server-side for the reminder message
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("name")
        .eq("id", data.client_id)
        .eq("user_id", user.id) // Ensure user owns this client
        .single();

      if (clientError || !clientData) {
        console.warn("Could not fetch client name for reminder:", clientError);
        // Proceed without client name or handle error differently?
      }

      const clientName = clientData?.name || "Valued Client"; // Fallback name

      const upcomingMessage = `Hi ${clientName}, I hope this message finds you well. This is a friendly reminder that invoice #${
        data.invoice_number
      } for ${formatCurrency(total)} is due on ${format(
        data.due_date,
        "MMMM d, yyyy"
      )}.`;

      const { error: reminderError } = await supabase.from("reminders").insert({
        invoice_id: invoiceId,
        client_id: data.client_id, // Add client_id if schema requires it
        user_id: user.id, // Add user_id if RLS applies to reminders
        type: "upcoming",
        message: upcomingMessage,
        status: "pending",
      });

      // Log reminder error but don't necessarily fail the whole invoice creation
      if (reminderError) {
        console.error("Supabase Reminder Insert Error:", reminderError);
        // Potentially return a partial success message?
        // toast.warning("Invoice created/sent, but failed to schedule reminder.")
      }
    }

    // 7. Trigger PDF Generation Task if Sent
    let pdfWarning: string | undefined = undefined;
    if (status === "sent") {
      const pdfResult = await triggerPdfGeneration(invoiceId, user.id);
      if (!pdfResult.success) {
        pdfWarning = pdfResult.warning;
      }
    }

    // 8. Revalidate Cache
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);

    // 9. Return Success
    const warning = pdfWarning;
    return {
      success: true,
      invoiceId: invoiceId,
      status: status,
      warning: warning,
    };
  } catch (error) {
    console.error("Unexpected Error Creating Invoice:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// --- Delete Invoice Action --- //

export async function deleteInvoice(
  invoiceId: string
): Promise<{ success: boolean; message: string }> {
  // Correct usage for server client
  const supabase = await createClient();

  // 1. Get Authenticated User (Optional but good practice for RLS)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication Error deleting invoice:", authError);
    return { success: false, message: "Unauthorized: User not found." };
  }

  try {
    // 2. Delete Invoice (RLS should protect against deleting others' invoices)
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId) // Explicitly match the ID
      .eq("user_id", user.id); // Ensure the user owns this invoice

    if (deleteError) {
      console.error("Error deleting invoice:", deleteError);
      // Check for specific errors if needed (e.g., not found, RLS violation)
      if (deleteError.code === "42501") {
        return {
          success: false,
          message: `Permission denied: ${deleteError.message}`,
        };
      }
      return {
        success: false,
        message: `Failed to delete invoice: ${deleteError.message}`,
      };
    }

    // 3. Revalidate Cache
    revalidatePath("/invoices");
    revalidatePath("/dashboard"); // Dashboard might show recent invoices or stats
    // Note: revalidateTag might be preferred if tags are consistently used
    // revalidateTag("invoices");
    // revalidateTag("dashboard");

    return { success: true, message: "Invoice deleted successfully." };
  } catch (error: unknown) {
    console.error("Server action error deleting invoice:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An unknown error occurred during deletion.";
    return {
      success: false,
      message: message,
    };
  }
}

// --- Send Draft Invoice Action --- //

export async function sendDraftInvoiceAction(
  invoiceId: string
): Promise<{ success: boolean; message: string; warning?: string }> {
  if (!invoiceId) {
    return { success: false, message: "Invoice ID is required to send." };
  }

  const supabase = await createClient();

  // 1. Get Authenticated User
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication Error sending invoice:", authError);
    return { success: false, message: "Unauthorized. Please log in again." };
  }

  try {
    // 2. Fetch Existing Invoice & Related Data (ensure it's a draft owned by user)
    const { data: invoiceData, error: fetchError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        clients ( id, name, email ),
        invoice_items ( * )
      `
      )
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("Error fetching invoice for sending:", fetchError);
      return {
        success: false,
        message: `Failed to fetch invoice: ${fetchError.message}`,
      };
    }
    if (!invoiceData) {
      return { success: false, message: "Invoice not found or access denied." };
    }
    if (invoiceData.status !== "draft") {
      return {
        success: false,
        message: "Invoice is not a draft and cannot be sent again this way.",
      };
    }
    if (!invoiceData.clients) {
      return {
        success: false,
        message: "Cannot send invoice: Client data missing.",
      };
    }

    // 3. Update Invoice Status to 'sent'
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoiceId)
      .eq("user_id", user.id); // Redundant check, but safe

    if (updateError) {
      console.error("Error updating invoice status to sent:", updateError);
      return {
        success: false,
        message: `Failed to update invoice status: ${updateError.message}`,
      };
    }

    let reminderWarning: string | undefined = undefined;
    // 4. Create Reminder (Similar logic from createInvoiceAction)
    try {
      const clientName = invoiceData.clients.name || "Valued Client";
      const upcomingMessage = `Hi ${clientName}, I hope this message finds you well. This is a friendly reminder that invoice #${
        invoiceData.invoice_number
      } for ${formatCurrency(invoiceData.total)} is due on ${format(
        new Date(invoiceData.due_date), // Ensure date parsing if needed
        "MMMM d, yyyy"
      )}.`;

      const { error: reminderError } = await supabase.from("reminders").insert({
        invoice_id: invoiceId,
        client_id: invoiceData.clients.id,
        user_id: user.id,
        type: "upcoming",
        message: upcomingMessage,
        status: "pending",
      });
      if (reminderError) {
        console.error("Supabase Reminder Insert Error on Send:", reminderError);
        reminderWarning = "Invoice sent, but failed to schedule reminder.";
      }
    } catch (e) {
      console.error("Error during reminder creation on send:", e);
      reminderWarning = "Invoice sent, but failed to schedule reminder.";
    }

    // 5. Trigger PDF Generation Task
    let pdfWarning: string | undefined = undefined;
    const pdfResult = await triggerPdfGeneration(invoiceId, user.id);
    if (!pdfResult.success) {
      pdfWarning = pdfResult.warning;
    }

    // 6. Revalidate Cache using Tags
    revalidateTag("invoices");
    revalidateTag(`invoices:${invoiceId}`);
    revalidateTag("dashboard");
    revalidateTag("reminders"); // Revalidate reminders tag as well

    // Consolidate warnings if any
    const warning = reminderWarning || pdfWarning;

    return { success: true, message: "Invoice sent successfully.", warning };
  } catch (error: unknown) {
    console.error("Unexpected error sending draft invoice:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while sending.";
    return { success: false, message };
  }
}

// --- Update Invoice Action --- //
export async function updateInvoiceAction(
  invoiceId: string,
  rawData: InvoiceFormValues,
  status: InvoiceStatus
): Promise<{
  success: boolean;
  error?: string;
  warning?: string;
  invoiceId?: string;
  status?: InvoiceStatus;
}> {
  const supabase = await createClient();

  // 1. Get Authenticated User
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Authentication Error (Update):", authError);
    return { success: false, error: "Unauthorized: User not found." };
  }

  // 2. Validate Input Data
  const validationResult = invoiceFormSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error(
      "Validation Error (Update):",
      validationResult.error.flatten()
    );
    return { success: false, error: "Invalid form data." };
  }
  const data = validationResult.data;

  // 3. Calculate totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
    0
  );
  const taxAmount = (subtotal * data.tax) / 100;
  const discountAmount = (subtotal * data.discount) / 100;
  const total = subtotal + taxAmount - discountAmount;

  try {
    // Check if the invoice exists and belongs to the user before updating
    const { error: checkError } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (checkError) {
      console.error("Supabase Invoice Check Error (Update):", checkError);
      if (checkError.code === "PGRST116") {
        return { success: false, error: "Invoice not found or access denied." };
      }
      return {
        success: false,
        error: `Failed to verify invoice: ${checkError.message}`,
      };
    }

    // 4. Update Invoice
    const invoicePayload: Omit<
      InvoicePayload,
      "id" | "user_id" | "generated_by_ai"
    > & { generated_by_ai?: boolean } = {
      client_id: data.client_id,
      invoice_number: data.invoice_number,
      issue_date: format(data.issue_date, "yyyy-MM-dd"),
      due_date: format(data.due_date, "yyyy-MM-dd"),
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total,
      status,
      notes: data.notes,
      payment_terms: data.payment_terms,
    };
    const { error: invoiceUpdateError } = await supabase
      .from("invoices")
      .update(invoicePayload)
      .eq("id", invoiceId)
      .eq("user_id", user.id); // Ensure user owns the record

    if (invoiceUpdateError) {
      console.error("Supabase Invoice Update Error:", invoiceUpdateError);
      return {
        success: false,
        error: `Failed to update invoice: ${invoiceUpdateError.message}`,
      };
    }

    // 5. Update Invoice Items (Delete existing and insert new)
    const { error: deleteItemsError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);

    if (deleteItemsError) {
      console.error("Supabase Delete Items Error (Update):", deleteItemsError);
      // Invoice was updated, but items failed. What to do?
      // For now, report error but invoice update succeeded partially.
      return {
        success: false,
        error: `Invoice updated, but failed to update items: ${deleteItemsError.message}`,
        invoiceId: invoiceId,
        status: status,
      };
    }

    const invoiceItems = data.items.map((item) => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      amount: item.quantity * item.price,
    }));

    const { error: insertItemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (insertItemsError) {
      console.error("Supabase Insert Items Error (Update):", insertItemsError);
      return {
        success: false,
        error: `Invoice updated, but failed to insert new items: ${insertItemsError.message}`,
        invoiceId: invoiceId,
        status: status,
      };
    }

    // 6. Handle Reminders (if status changed to 'sent')
    let reminderWarning: string | undefined = undefined;
    if (status === "sent") {
      // Check if a reminder already exists to avoid duplicates?
      // Or delete existing reminders first?
      // Simple approach: just try to insert the reminder.
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("name")
        .eq("id", data.client_id)
        .eq("user_id", user.id)
        .single();

      // Log if client fetch fails, but don't block update
      if (clientError) {
        console.warn(
          "Could not fetch client name for reminder (Update):",
          clientError
        );
      }

      const clientName = clientData?.name || "Valued Client";
      const upcomingMessage = `Hi ${clientName}, I hope this message finds you well. This is a friendly reminder that invoice #${
        data.invoice_number
      } for ${formatCurrency(total)} is due on ${format(
        data.due_date,
        "MMMM d, yyyy"
      )}.`;

      const { error: reminderError } = await supabase.from("reminders").insert({
        invoice_id: invoiceId,
        client_id: data.client_id,
        user_id: user.id,
        type: "upcoming",
        message: upcomingMessage,
        status: "pending",
      });

      if (reminderError) {
        console.error(
          "Supabase Reminder Insert Error (Update):",
          reminderError
        );
        reminderWarning = "Invoice updated, but failed to schedule reminder.";
      }
    }

    // 7. Trigger PDF Generation Task if Sent
    let pdfWarning: string | undefined = undefined;
    if (status === "sent") {
      const pdfResult = await triggerPdfGeneration(invoiceId, user.id);
      if (!pdfResult.success) {
        pdfWarning = pdfResult.warning;
      }
    }

    // 8. Revalidate Cache
    revalidateTag(`invoice:${invoiceId}`); // More specific tag for the single invoice
    revalidateTag("invoices"); // Tag for the list
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/${invoiceId}/edit`); // Revalidate edit path too?

    // 9. Return Success (potentially with warnings)
    const warning = reminderWarning || pdfWarning;
    return {
      success: true,
      invoiceId: invoiceId,
      status: status,
      warning: warning,
    };
  } catch (error) {
    console.error("Unexpected Error Updating Invoice:", error);
    return {
      success: false,
      error: "An unexpected error occurred during update.",
    };
  }
}
