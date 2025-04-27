import { createClient } from "@/utils/supabase/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { NextResponse } from "next/server"; // Use NextResponse for responses

export const runtime = "edge";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

// Define the expected structure of the AI's response using Zod
const AISuggestedInvoiceSchema = z.object({
  invoiceNumber: z
    .string()
    .describe("Suggested invoice number (e.g., INV-1043)"),
  dueDate: z
    .string()
    .describe(
      "Suggested due date in YYYY-MM-DD format, typically 14-30 days from now"
    ),
  lineItems: z
    .array(
      z.object({
        description: z
          .string()
          .describe("Detailed description of the service or product"),
        qty: z.number().positive().describe("Quantity"),
        unitPrice: z
          .number()
          .positive()
          .describe("Price per unit in the specified currency"),
      })
    )
    .min(1)
    .describe("List of line items based on past services for this client"),
  notes: z
    .string()
    .optional()
    .describe("Optional brief notes or payment terms"),
  discounts: z
    .array(
      z.object({
        description: z.string().describe("Description of the discount"),
        amount: z.number().positive().describe("Discount amount"),
      })
    )
    .optional()
    .describe("Optional list of discounts"),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authentication & Authorization
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, currency } = await req.json();
    if (!clientId || !currency) {
      return NextResponse.json(
        { error: "Missing clientId or currency" },
        { status: 400 }
      );
    }

    console.log(
      `User ${user.id} requesting AI invoice for client ${clientId}, currency ${currency}`
    );

    // 2. Data Fetching
    const { data: pastInvoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(
        `
        invoice_number,
        issue_date,
        due_date,
        total,
        status,
        invoice_items ( description, quantity, price )
      `
      )
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("issue_date", { ascending: false })
      .limit(3);

    if (invoicesError) {
      console.error("Error fetching past invoices:", invoicesError);
      return NextResponse.json(
        { error: "Failed to fetch client history" },
        { status: 500 }
      );
    }

    // 3. Prompt Engineering & AI Integration
    const systemPrompt = `You are an AI assistant helping a user create a new invoice for their client. Based on the client's past invoices provided below, generate a suggested draft for a new invoice in ${currency}. Focus on common line items and estimate a reasonable due date (around 14-30 days from today, ${
      new Date().toISOString().split("T")[0]
    }). Provide the response strictly in the required JSON format.`;

    const context = {
      today: new Date().toISOString().split("T")[0],
      currency,
      pastInvoices: pastInvoices ?? [],
    };

    // 4. Generate Structured Object
    const { object: suggestedInvoice, usage } = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: AISuggestedInvoiceSchema,
      prompt: `${systemPrompt}

Client History:
${JSON.stringify(context, null, 2)}`,
      temperature: 0.5,
    });

    console.log("AI Usage:", usage);
    console.log("AI Suggested Invoice:", suggestedInvoice);

    return NextResponse.json(suggestedInvoice);
  } catch (error: unknown) {
    console.error("Error generating AI invoice suggestion:", error);

    let errorMessage = "Internal server error generating suggestion";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (
        error.message.includes("rate limit") ||
        error.message.includes("429")
      ) {
        errorMessage = "Rate limit exceeded. Please try again later.";
        statusCode = 429;
      }
    }
    // Use NextResponse for error responses
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
