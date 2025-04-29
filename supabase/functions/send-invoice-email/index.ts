import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0"; // Import Resend SDK
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
  pdf_path?: string | null; // Add pdf_path field
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
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  // 2. Handle request (assuming POST from webhook or server action)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 3. Parse webhook payload
    const payload = await req.json();
    const invoice: Invoice = payload.record; // Get the invoice record

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

    // 4. Fetch required related data using Admin client (bypasses RLS)
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
      .eq("invoice_id", invoice.id);

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
    // Ensure itemsData is treated as InvoiceItemData[] or empty array
    const invoiceItems: InvoiceItemData[] = itemsData || [];
    if (!itemsData || itemsData.length === 0) {
      console.warn(`No items found for invoice ${invoice.id}`);
    }

    // --- Prepare Data ---
    const companyName = profileData?.company_name || "Your Company";
    const clientEmail = clientData.email;
    const clientName = clientData.name || "Valued Client";
    const pdfPath = invoice.pdf_path; // Get PDF path from the invoice record

    console.log("Fetched profile data:", profileData);
    console.log(`Resolved companyName: '${companyName}'`);
    console.log(`PDF path from record: ${pdfPath}`);

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
    // const appBaseUrl = Deno.env.get("APP_BASE_URL") || "http://localhost:3000"; // Removed
    // const invoiceUrl = `${appBaseUrl}/invoices/${invoice.id}`; // Removed

    // Prepare props for the template
    const templateProps: InvoiceEmailTemplateProps = {
      clientName: clientName,
      invoiceNumber: invoice.invoice_number,
      formattedDueDate: formattedDueDate,
      formattedTotal: formattedTotal,
      formattedSubtotal: formattedSubtotal,
      formattedTax: formattedTax,
      formattedDiscount: formattedDiscount,
      companyName: companyName,
      items: invoiceItems,
      // invoiceUrl: invoiceUrl, // Removed
    };
    console.log("Props passed to template:", templateProps);
    const emailHtml = InvoiceEmailTemplate(templateProps);

    // --- 5. Prepare Attachment (if path exists) --- //
    const attachments = [];

    if (pdfPath) {
      console.log(`Attempting to download PDF from path: ${pdfPath}`);
      try {
        // Download the file content from storage
        const { data: fileBlob, error: downloadError } =
          await supabaseAdmin.storage.from("invoice-pdfs").download(pdfPath);

        if (downloadError) {
          throw new Error(`Storage download error: ${downloadError.message}`);
        }
        if (!fileBlob) {
          throw new Error(`File blob is null for path: ${pdfPath}`);
        }

        // Convert Blob to Uint8Array
        const fileArrayBuffer = await fileBlob.arrayBuffer();
        const fileContent = new Uint8Array(fileArrayBuffer);

        // --- START: BASE64 CONVERSION ---
        // Use Deno std encoding/base64 for reliable conversion from Uint8Array
        const base64Content = base64Encode(fileContent);
        // --- END: BASE64 CONVERSION ---

        // Prepare attachment with BASE64 content
        attachments.push({
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: base64Content, // Use the Base64 string
        });
        console.log(
          `PDF attachment prepared successfully using Base64 encoded content.`
        );
      } catch (attachError) {
        console.error("Error preparing PDF attachment:", attachError);
        // Decide whether to proceed without attachment or fail
        console.warn(
          `Proceeding to send email without PDF attachment for invoice ${invoice.id}`
        );
      }
    } else {
      console.warn(
        `No pdf_path found for invoice ${invoice.id}, sending email without attachment.`
      );
    }

    // 6. Send email via Resend
    const senderEmail =
      Deno.env.get("RESEND_SENDER_EMAIL") || "noreply@example.com";
    const emailSubject = `Invoice #${invoice.invoice_number} from ${companyName}`;

    console.log(
      `Sending invoice email to: ${clientEmail} from ${senderEmail} ${
        attachments.length > 0 ? "with attachment" : "without attachment"
      }.`
    );

    try {
      const { data, error: emailError } = await resend.emails.send({
        from: `${companyName} <${senderEmail}>`,
        to: "nilaanjann.misra@gmail.com", // REMINDER: Keep test email or use clientEmail
        subject: emailSubject,
        html: emailHtml,
        attachments: attachments, // Add the attachments array here (now uses 'content')
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
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
    --header 'Authorization: Bearer <YOUR_ANON_KEY>' \
    --header 'Content-Type: application/json' \
    --data '{ "record": { "id": "your_invoice_id", "user_id": "your_user_id", "client_id": "your_client_id", "invoice_number": "INV-123", "due_date": "2024-12-31", "total": 150.00, "subtotal": 120.00, "tax": 30.00, "discount": 0, "pdf_path": "users/your_user_id/invoices/your_invoice_id/INV-123.pdf" } }'

*/
