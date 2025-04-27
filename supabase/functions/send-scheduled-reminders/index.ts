import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createGoogleGenerativeAI } from "https://esm.sh/@ai-sdk/google@1.2.13"; // Use AI SDK (pinned version)
import { generateText } from "https://esm.sh/ai@4.3.10"; // Use AI SDK (pinned version)
import { Resend } from "https://esm.sh/resend@4.0.0"; // Import Resend SDK
import { corsHeaders } from "../_shared/cors.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  format,
  differenceInCalendarDays,
  startOfDay,
} from "https://esm.sh/date-fns@3.6.0";
import ReminderEmailTemplate, {
  ReminderEmailTemplateProps,
} from "./_templates/reminder-email.tsx";

interface ReminderPayload {
  invoice_id: string;
  client_id: string;
  client_email: string;
  client_name: string;
  invoice_number: string;
  total: number;
  due_date: string;
  user_id: string;
}

interface PaymentHistorySummary {
  paidCount: number;
  avgDaysDiff: number | null;
}

// --- Main Edge Function Logic ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: ReminderPayload = await req.json();

    // --- Setup Clients and Keys ---
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_SENDER_EMAIL =
      Deno.env.get("RESEND_SENDER_EMAIL") || "noreply@example.com"; // Provide a default
    const COMPANY_NAME = Deno.env.get("COMPANY_NAME") || "[Your Company Name]";

    if (!GOOGLE_API_KEY || !RESEND_API_KEY) {
      console.error(
        "Missing required environment variables (Google, Resend, Supabase)."
      );
      throw new Error("Configuration error.");
    }

    const google = createGoogleGenerativeAI({ apiKey: GOOGLE_API_KEY });
    const model = google("gemini-2.0-flash-001"); // Specify model, e.g., flash

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resend = new Resend(RESEND_API_KEY); // Instantiate Resend client

    // --- 1. Fetch Payment History ---
    let paymentHistorySummary: PaymentHistorySummary = {
      paidCount: 0,
      avgDaysDiff: null,
    };
    try {
      const { data: pastInvoices, error: historyError } = await supabaseAdmin
        .from("invoices")
        .select("due_date, paid_at")
        .eq("client_id", payload.client_id)
        .eq("status", "paid")
        .not("paid_at", "is", null);

      if (historyError) throw historyError;

      if (pastInvoices && pastInvoices.length > 0) {
        let totalDaysDiff = 0;
        pastInvoices.forEach((inv) => {
          if (inv.paid_at && inv.due_date) {
            const paidDate = startOfDay(new Date(inv.paid_at));
            const dueDate = startOfDay(new Date(inv.due_date));
            totalDaysDiff += differenceInCalendarDays(paidDate, dueDate);
          }
        });
        paymentHistorySummary = {
          paidCount: pastInvoices.length,
          avgDaysDiff: totalDaysDiff / pastInvoices.length,
        };
      }
    } catch (err) {
      // Check if err is an instance of Error before accessing message
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error fetching payment history";
      console.error(
        `Error fetching payment history for client ${payload.client_id}:`,
        errorMessage
      );
      // Proceed without history, the prompt will handle null/default history
    }

    // --- 2. Generate Reminder Message via AI SDK ---
    const today = startOfDay(new Date());
    const dueDateObj = startOfDay(new Date(payload.due_date));
    const daysDiff = differenceInCalendarDays(today, dueDateObj);
    const isOverdue = daysDiff > 0;
    const reminderType = isOverdue ? "overdue" : "upcoming";

    let historyContext = "No payment history available for this client.";
    if (
      paymentHistorySummary.paidCount > 0 &&
      paymentHistorySummary.avgDaysDiff !== null
    ) {
      const avgDays = Math.round(paymentHistorySummary.avgDaysDiff);
      if (avgDays <= 0) {
        historyContext = `This client has paid ${
          paymentHistorySummary.paidCount
        } previous invoices, typically paying on time or ${Math.abs(
          avgDays
        )} days early on average.`;
      } else {
        historyContext = `This client has paid ${paymentHistorySummary.paidCount} previous invoices, but typically pays ${avgDays} days late on average.`;
      }
    } else if (paymentHistorySummary.paidCount === 0) {
      historyContext = "This is the first invoice for this client.";
    }

    const prompt = `
You are an assistant for ${COMPANY_NAME} helping write friendly but professional payment reminders.
Client Payment History Context: ${historyContext}
---
Write a ${reminderType} payment reminder message body (no salutation like 'Dear X' or subject line) for invoice #${
      payload.invoice_number
    } to ${payload.client_name}.
The amount due is ${payload.total.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    })}.
The due date was ${format(dueDateObj, "MMMM d, yyyy")}.
${
  isOverdue
    ? `The invoice is currently ${daysDiff} days overdue.`
    : `The invoice is due soon.`
}
---
Instructions:
- Adapt the tone slightly based on the payment history. Be firmer but still professional if they often pay late. Be gentler if they always pay early or on time, or if it's their first invoice.
- Keep the message concise.
- Remind them of the invoice number, due date, and amount.
- Suggest they reach out if they have questions or have already paid.
- Do NOT include a subject line or greeting (like "Hi Jane,"). Start directly with the message body.
- Do NOT include a sign-off (like "Thanks, [Company]"). The email template handles the sign-off.
`.trim();

    let messageBody = `This is a friendly reminder regarding invoice #${
      payload.invoice_number
    } for ${payload.total.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    })}, which was due on ${format(
      dueDateObj,
      "MMMM d, yyyy"
    )}. Please let us know if you have any questions.`; // Enhanced fallback

    try {
      const { text } = await generateText({ model, prompt });
      messageBody = text.trim();
      console.info(`AI-Generated message for invoice ${payload.invoice_id}`);
    } catch (aiError) {
      // Check if aiError is an instance of Error before accessing message
      const errorMessage =
        aiError instanceof Error ? aiError.message : "Unknown AI SDK error";
      console.error(
        `Error calling AI SDK for invoice ${payload.invoice_id}:`,
        errorMessage
      );
      // Use fallback message
    }

    // --- 3. Send Reminder via Resend ---
    let reminderStatus: "sent" | "failed" = "failed";

    // Prepare props for the HTML generator
    const emailProps: ReminderEmailTemplateProps = {
      messageBody: messageBody,
      invoiceNumber: payload.invoice_number,
      formattedDueDate: format(dueDateObj, "MMMM d, yyyy"),
      formattedTotal: payload.total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
      companyName: COMPANY_NAME,
    };

    // Generate HTML directly using the imported function
    const html = ReminderEmailTemplate(emailProps);

    try {
      // Use Resend SDK's send method with the generated HTML
      const { data, error } = await resend.emails.send({
        from: RESEND_SENDER_EMAIL, // e.g., "PayPrompt <notifications@pay-prompt.com>"
        to: [payload.client_email], // Use actual client email
        subject: `Payment Reminder: Invoice #${payload.invoice_number}`,
        html: html, // Pass the generated HTML string
      });

      if (error) {
        console.error(
          `Failed to send email via Resend for invoice ${payload.invoice_id}:`,
          error
        );
      } else {
        console.info(
          `Reminder email sent successfully via Resend for invoice ${payload.invoice_id}`,
          data
        );
        reminderStatus = "sent";
      }
    } catch (emailError) {
      // Check if emailError is an instance of Error before accessing message
      const errorMessage =
        emailError instanceof Error
          ? emailError.message
          : "Unknown Resend error";
      console.error(
        `Error sending email via Resend for invoice ${payload.invoice_id}:`,
        errorMessage
      );
    }

    // --- 4. Log Reminder in Database ---
    const { error: insertError } = await supabaseAdmin
      .from("reminders")
      .insert({
        invoice_id: payload.invoice_id,
        user_id: payload.user_id,
        client_id: payload.client_id, // Ensure client_id column exists in reminders table
        type: reminderType,
        message: messageBody, // Log the generated text body
        status: reminderStatus,
        sent_at: reminderStatus === "sent" ? new Date().toISOString() : null,
      });

    if (insertError) {
      // Log the error but maybe don't fail the whole function if email was sent?
      // Or maybe we should fail? Depends on desired behavior.
      console.error(
        `Error inserting reminder log for invoice ${payload.invoice_id}:`,
        insertError
      );
      // Optionally re-throw or return error status
      throw new Error(`Failed to log reminder: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: reminderStatus,
        invoice_id: payload.invoice_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Check if error is an instance of Error before accessing message
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Error processing scheduled reminder request:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
