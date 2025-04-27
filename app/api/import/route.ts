"use server";

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

// TODO: Import types from lib/csv.ts (if needed server-side, maybe not)

// Define more specific Zod schema for CLIENT import rows coming from the client
const clientImportRowSchema = z.object({
  name: z.string().min(1, { message: "Client name cannot be empty." }),
  email: z.string().email({ message: "Invalid email format." }),
  // Allow null or string for optional fields, transform empty strings to null
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  address: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  contact_person: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
});

// Define Zod schema for INVOICE import rows
// NOTE: Coercing types (string -> date/number) as CSV values are typically strings.
const invoiceStatusEnum = z.enum(["draft", "sent", "paid", "overdue"]);

const invoiceImportRowSchema = z.object({
  invoice_number: z
    .string()
    .min(1, { message: "Invoice number cannot be empty." }),
  // Client email is required for resolution, validated as email format
  client_email: z.string().email({ message: "Invalid client email format." }),
  issue_date: z.coerce.date({
    errorMap: () => ({ message: "Invalid issue date format. Use YYYY-MM-DD." }),
  }),
  due_date: z.coerce.date({
    errorMap: () => ({ message: "Invalid due date format. Use YYYY-MM-DD." }),
  }),
  // Coerce numeric fields, handle potential NaN after coercion
  subtotal: z.coerce
    .number()
    .positive({ message: "Subtotal must be a positive number." })
    .refine((val) => !isNaN(val), {
      message: "Subtotal must be a valid number.",
    }),
  tax: z.coerce
    .number()
    .nonnegative()
    .default(0)
    .refine((val) => !isNaN(val), { message: "Tax must be a valid number." }),
  discount: z.coerce
    .number()
    .nonnegative()
    .default(0)
    .refine((val) => !isNaN(val), {
      message: "Discount must be a valid number.",
    }),
  // Total is required in spec, but we might calculate it if missing.
  // For now, require it and ensure it's a valid number.
  total: z.coerce
    .number()
    .positive({ message: "Total must be a positive number." })
    .refine((val) => !isNaN(val), { message: "Total must be a valid number." }),
  status: invoiceStatusEnum.default("draft"),
  notes: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  payment_terms: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  // TODO: Add fields for INVOICE ITEMS if handling them in the same row/schema
});

// Refined payload schema using discriminated union
const importPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("clients"),
    rows: z.array(clientImportRowSchema),
  }),
  z.object({
    type: z.literal("invoices"),
    rows: z.array(invoiceImportRowSchema), // Use the specific invoice schema
  }),
]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedPayload;
  try {
    const body = await request.json();
    parsedPayload = importPayloadSchema.safeParse(body); // Use safeParse for better error handling

    if (!parsedPayload.success) {
      console.error("Zod validation error:", parsedPayload.error.errors);
      return NextResponse.json(
        {
          error: "Invalid request body",
          // Provide more structured Zod errors
          details: parsedPayload.error.flatten(),
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to parse JSON body:", error);
    return NextResponse.json(
      { error: "Failed to parse request body" },
      { status: 400 }
    );
  }

  const { type, rows } = parsedPayload.data;

  console.log(
    `Processing import request for type: ${type}, user: ${user.id}, rows: ${rows.length}`
  );

  if (type === "clients") {
    const rowsToUpsert = rows.map((row) => ({
      ...row,
      user_id: user.id,
    }));

    try {
      const { count, error } = await supabase
        .from("clients")
        .upsert(rowsToUpsert, {
          onConflict: "user_id,email",
        });

      if (error) {
        console.error("Supabase client upsert error:", error);
        return NextResponse.json(
          {
            error: "Failed to upsert clients",
            details: error.message,
            code: error.code,
          },
          { status: 500 }
        );
      }

      console.log(`Upserted ${count ?? 0} client rows for user ${user.id}`);

      // Revalidate the 'clients' tag after successful upsert
      revalidateTag("clients");

      return NextResponse.json({
        message: `Client import processed successfully.`,
        successCount: count ?? rowsToUpsert.length,
        errorRows: [], // Row-level errors from bulk upsert are typically not available
      });
    } catch (processingError) {
      console.error("Client import processing error:", processingError);
      return NextResponse.json(
        { error: "Internal server error during client import processing" },
        { status: 500 }
      );
    }
  }

  if (type === "invoices") {
    const validatedInvoiceRows = rows as z.infer<
      typeof invoiceImportRowSchema
    >[];
    const rowErrors: { rowIndex: number; error: string }[] = [];
    const rowsToUpsert = [];

    try {
      // 1. Fetch existing clients for the user
      const { data: userClients, error: clientError } = await supabase
        .from("clients")
        .select("id, email")
        .eq("user_id", user.id);

      if (clientError) {
        console.error("Failed to fetch user clients:", clientError);
        throw new Error("Database error fetching client data.");
      }
      if (!userClients) {
        throw new Error("Could not retrieve client data.");
      }
      const clientEmailToIdMap = new Map<string, string>();
      userClients.forEach((client) => {
        if (client.email) {
          clientEmailToIdMap.set(client.email.toLowerCase(), client.id);
        }
      });

      console.log(
        `Found ${clientEmailToIdMap.size} clients for user ${user.id} for mapping.`
      );

      // 2. Map/Transform rows and resolve client_id
      for (let i = 0; i < validatedInvoiceRows.length; i++) {
        const row = validatedInvoiceRows[i];
        const originalRowIndex = i;
        const clientId = clientEmailToIdMap.get(row.client_email.toLowerCase());

        if (!clientId) {
          rowErrors.push({
            rowIndex: originalRowIndex,
            error: `Client with email '${row.client_email}' not found.`,
          });
          continue;
        }

        const invoiceData = {
          user_id: user.id,
          client_id: clientId,
          invoice_number: row.invoice_number,
          issue_date: row.issue_date.toISOString(),
          due_date: row.due_date.toISOString(),
          subtotal: row.subtotal,
          tax: row.tax,
          discount: row.discount,
          total: row.total,
          status: row.status,
          notes: row.notes,
          payment_terms: row.payment_terms,
        };
        rowsToUpsert.push(invoiceData);
      }

      if (rowsToUpsert.length === 0 && rowErrors.length > 0) {
        console.log(
          `Invoice import for user ${user.id}: All rows failed client resolution.`
        );
        return NextResponse.json(
          {
            message:
              "Invoice import failed: Could not resolve client emails for any rows.",
            successCount: 0,
            errorRows: rowErrors,
          },
          { status: 400 }
        );
      }

      // 3. Perform upsert for invoices
      console.log(
        `Attempting to upsert ${rowsToUpsert.length} processed invoice rows for user ${user.id}.`
      );

      // Actual Supabase upsert call for invoices
      const { count: upsertCount, error: upsertError } = await supabase
        .from("invoices")
        .upsert(rowsToUpsert, {
          onConflict: "user_id,invoice_number",
        });

      if (upsertError) {
        console.error("Invoice upsert error:", upsertError);
        return NextResponse.json(
          {
            error: "Failed to save invoices",
            details: upsertError.message ?? "Unknown database error",
            code: upsertError.code,
          },
          { status: 500 }
        );
      }

      console.log(
        `Upserted ${upsertCount ?? 0} invoice rows for user ${user.id}`
      );

      // Revalidate relevant tags after successful invoice upsert
      revalidateTag("invoices");
      // Optionally revalidate clients too, if invoice import could affect client data (e.g., implicit creation)
      // revalidateTag('clients');

      return NextResponse.json({
        message: `Invoice import processed. ${upsertCount ?? 0} rows saved. ${
          rowErrors.length
        } rows skipped due to client resolution issues.`,
        successCount: upsertCount ?? 0,
        errorRows: rowErrors, // Row-level errors from bulk upsert are typically not available
      });
    } catch (error) {
      console.error("Invoice import processing error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Internal server error during invoice import.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Fallback return
  return NextResponse.json(
    { error: `Unsupported import type: ${type}` },
    { status: 400 }
  );
}
