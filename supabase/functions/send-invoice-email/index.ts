import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0"; // Import Resend SDK

// Import the UPDATED email template function
import InvoiceEmailTemplate, {
  InvoiceEmailTemplateProps,
  InvoiceItem,
} from "./_templates/invoice-email.tsx";

console.log("send-invoice-email function booting up...");

// Define interfaces for expected data structures
interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  due_date: string; // Assuming string date YYYY-MM-DD
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  // ... other invoice fields potentially needed ...
}

interface Client {
  id: string;
  name: string;
  email: string;
  // ... other client fields ...
}

interface Profile {
  id: string;
  company_name?: string | null;
  // ... other profile fields ...
}

// Interface for data fetched from invoice_items table
interface InvoiceItemData extends InvoiceItem {
  // Inherits description, quantity, price, amount
  // Add other columns if needed, e.g., id
  id?: string;
}

// Add helper function here
function formatCurrency(amount: number): string {
  // Basic USD formatting, adjust as needed for locale/currency
  return `$${amount.toFixed(2)}`;
}

// Environment variables (ensure these are set in Supabase Function settings)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!; // Not needed
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

serve(async (req) => {
  // 1. Initialize clients
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }, // Important for server-side/edge functions
  });
  const resend = new Resend(RESEND_API_KEY);

  // 2. Handle request (assuming POST from webhook)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 3. Parse webhook payload
    // Supabase webhooks send the record in the `record` or `old_record` field
    const payload = await req.json();
    const invoice: Invoice = payload.record; // Adjust if webhook structure differs

    console.log(
      `Processing invoice: ${invoice.id} (Number: ${invoice.invoice_number})`
    );

    // Basic validation
    if (!invoice || !invoice.id || !invoice.client_id || !invoice.user_id) {
      console.error("Invalid payload received:", payload);
      return new Response(JSON.stringify({ error: "Invalid invoice data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Fetch required data using Admin client (bypasses RLS)

    // Fetch Client
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, name, email")
      .eq("id", invoice.client_id)
      .single<Client>();

    // Fetch Profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, company_name")
      .eq("id", invoice.user_id)
      .single<Profile>();

    // Fetch Invoice Items
    const { data: itemsData, error: itemsError } = await supabaseAdmin
      .from("invoice_items")
      .select("description, quantity, price, amount") // Select necessary fields
      .eq("invoice_id", invoice.id)
      .returns<InvoiceItemData[]>(); // Specify return type array

    // --- Error Handling for Fetched Data ---
    if (clientError || !clientData || !clientData.email) {
      console.error(
        "Error fetching client data or missing email:",
        clientError
      );
      return new Response(
        JSON.stringify({ error: "Failed to fetch client details" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (profileError) {
      console.error("Error fetching profile data:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch sender profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (itemsError) {
      console.error("Error fetching invoice items:", itemsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch invoice items" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!itemsData || itemsData.length === 0) {
      // Should an invoice exist without items? Decide how to handle.
      console.warn(`No items found for invoice ${invoice.id}`);
      // For now, proceed with empty items, but could also error out.
    }

    // --- Prepare Data ---
    const companyName = profileData?.company_name || "Your Company";
    const clientEmail = clientData.email;
    const clientName = clientData.name || "Valued Client";
    const invoiceItems = itemsData || [];

    // *** Add Logging Here ***
    console.log("Fetched profile data:", profileData);
    console.log(`Resolved companyName: '${companyName}'`);
    // ***********************

    // Format currency and date
    const formattedSubtotal = formatCurrency(invoice.subtotal);
    const formattedTotal = formatCurrency(invoice.total);
    const formattedTax =
      invoice.tax > 0 ? formatCurrency(invoice.tax) : undefined;
    const formattedDiscount =
      invoice.discount > 0 ? formatCurrency(invoice.discount) : undefined;
    const formattedDueDate = new Date(invoice.due_date).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    // Optional: Construct the invoice URL
    // Replace with your actual app URL structure
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "http://localhost:3000"; // Add APP_BASE_URL to env
    const invoiceUrl = `${appBaseUrl}/invoices/${invoice.id}`;

    // Prepare props for the template, including items
    const templateProps: InvoiceEmailTemplateProps = {
      clientName: clientName,
      invoiceNumber: invoice.invoice_number,
      formattedDueDate: formattedDueDate,
      formattedTotal: formattedTotal,
      formattedSubtotal: formattedSubtotal,
      formattedTax: formattedTax,
      formattedDiscount: formattedDiscount,
      companyName: companyName,
      items: invoiceItems, // Pass the fetched items
      invoiceUrl: invoiceUrl,
    };

    // *** Log props being passed ***
    console.log("Props passed to template:", templateProps);
    // *****************************

    const emailHtml = InvoiceEmailTemplate(templateProps);

    // 6. Send email via Resend
    const senderEmail =
      Deno.env.get("RESEND_SENDER_EMAIL") || "noreply@example.com"; // Provide a default
    const emailSubject = `Invoice #${invoice.invoice_number} from ${companyName}`;

    console.log(`Sending invoice email to: ${clientEmail} from ${senderEmail}`);

    const { data, error: emailError } = await resend.emails.send({
      from: `${companyName} <${senderEmail}>`,
      to: clientEmail,
      subject: emailSubject,
      html: emailHtml,
      // attachments: [] // Add attachments if needed
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully:", data);

    // 7. Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Invoice email sent." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    // Type check the error before accessing properties
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-invoice-email' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
