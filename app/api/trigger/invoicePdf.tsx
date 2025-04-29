import { logger, task } from "@trigger.dev/sdk/v3";
import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
  StyleSheet,
  Image, // Re-enabled for logo
  Font,
} from "@react-pdf/renderer";
import { z } from "zod";
import createClient from "./create-client";
import { format } from "date-fns"; // For formatting dates if needed
import path from "node:path"; // Needed for resolving font path

// Register Geist Mono font
// Assuming the script runs relative to the project root
const geistMonoPath = path.join(
  process.cwd(),
  "lib",
  "fonts",
  "GeistMono-VariableFont_wght.ttf"
);
Font.register({ family: "Geist Mono", src: geistMonoPath });

// Define and export the expected payload structure using Zod
export const invoicePayloadSchema = z.object({
  invoiceId: z.string(),
  userId: z.string().uuid(), // Assuming UUID for user IDs
});

// Define the structure for the data needed to render the PDF
// Adjusted for structured address and actual field names
interface InvoicePdfData {
  company: {
    name: string | null;
    logoUrl?: string | null;
    email?: string | null;
    // Structured Address
    street?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    // Add phone etc. if available and needed
  };
  client: {
    name: string | null;
    contactPerson?: string | null;
    email?: string | null;
    // Assuming clients still have a single address field - adjust if needed
    address?: string | null;
    phone?: string | null;
  };
  invoiceNumber: string;
  invoiceDate: string; // Formatted date
  dueDate: string; // Formatted date
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number; // tax amount
  discount: number; // discount amount
  totalAmountDue: number;
  paymentTerms: string | null; // Re-added payment terms
  notes: string | null;
}

// Define the structure for an invoice item fetched from the DB
// Based on supabase/migrations/20250415231100_create_test_data.sql
type InvoiceItemFromDb = {
  description: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  // Add other required columns like id, created_at based on your needs
  // id?: string;
  // created_at?: string;
};

// Type for profile data fetched separately - UPDATED
type ProfileFromDb = {
  company_name: string | null;
  company_logo_url: string | null; // Updated field name
  company_email: string | null;
  company_address_street?: string | null;
  company_address_line2?: string | null;
  company_address_city?: string | null;
  company_address_state?: string | null;
  company_address_postal_code?: string | null;
  company_address_country?: string | null;
};

// Type for the result of the main invoice query, including relations
type InvoiceWithRelations = {
  id: string;
  created_at: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  payment_terms: string | null;
  paid_at: string | null;
  pdf_path: string | null;
  updated_at?: string;
  // Nested client data (make optional if the select might not return it)
  clients: {
    id: string;
    created_at?: string;
    name: string | null;
    email: string | null;
    phone?: string | null;
    address?: string | null;
    contact_person?: string | null;
    user_id?: string;
  } | null;
  invoice_items: InvoiceItemFromDb[];
};

// --- PDF Styling ---
// Updated styles for dark theme (matching Image 2)
const styles = StyleSheet.create({
  page: {
    fontFamily: "Geist Mono",
    fontSize: 10,
    padding: 40, // Consistent padding
    lineHeight: 1.5,
    flexDirection: "column",
    backgroundColor: "#000000", // Changed to true black
    color: "#F9FAFB", // Light text (Tailwind gray-50)
  },
  // --- Header Section (Invoice Info + Logo) ---
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Align items to the top
    marginBottom: 40,
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerRight: {
    // Container for the logo
    width: 100, // Enlarged logo container
    height: 100, // Enlarged logo container
    backgroundColor: "#374151", // Placeholder background (Tailwind gray-700)
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    maxWidth: "100%",
    maxHeight: "100%",
  },
  invoiceTitle: {
    fontSize: 32, // Increased heading size
    fontWeight: "bold",
    color: "#FFFFFF", // White title
    marginBottom: 32, // Further increased spacing under title
  },
  headerDetailItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  headerDetailLabel: {
    fontSize: 10,
    color: "#D1D5DB", // Lighter gray (Tailwind gray-300)
    width: 70, // Fixed width for alignment
  },
  headerDetailValue: {
    fontSize: 10,
    color: "#F9FAFB", // Light text (Tailwind gray-50)
    fontWeight: "bold",
  },
  // --- From/To Section ---
  fromToSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  addressBlock: {
    flexDirection: "column",
    width: "45%", // Adjust width as needed
  },
  addressBlockTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#9CA3AF", // Medium gray (Tailwind gray-400)
    marginBottom: 8,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 10,
    marginBottom: 3,
    color: "#D1D5DB", // Lighter gray (Tailwind gray-300)
  },
  addressName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#F9FAFB", // Light text (Tailwind gray-50)
  },
  // --- Items Table ---
  table: {
    display: "flex",
    width: "auto",
    marginBottom: 30,
    borderBottomWidth: 0, // Remove outer table border
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0, // Remove header underline
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8, // Use padding for vertical spacing
    borderBottomWidth: 0, // Remove row dividers
  },
  tableColHeader: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#9CA3AF", // Medium gray (Tailwind gray-400)
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableCol: {
    fontSize: 10,
    color: "#D1D5DB", // Lighter gray (Tailwind gray-300)
  },
  // Column Widths & Alignment (adjust as needed)
  colItem: { width: "50%" },
  colQty: { width: "15%", textAlign: "left" }, // Left aligned quantity
  colPrice: { width: "15%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },

  // --- Totals Section ---
  totalsSection: {
    flexDirection: "column", // Stack totals vertically
    alignItems: "flex-end", // Align to the right
    marginTop: 10,
    marginBottom: 30,
  },
  totalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%", // Adjust width as needed
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
    color: "#D1D5DB", // Lighter gray (Tailwind gray-300)
    textAlign: "left",
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#F9FAFB", // Light text (Tailwind gray-50)
    textAlign: "right",
  },
  finalTotalItem: {
    // Specific style for the final total row
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%", // Match width
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#4B5563", // Darker border (Tailwind gray-600)
  },
  finalTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F9FAFB", // Light text
    textAlign: "left",
  },
  finalTotalValue: {
    fontSize: 14, // Larger final total
    fontWeight: "bold",
    color: "#FFFFFF", // White
    textAlign: "right",
  },

  // --- Footer Section (Payment Details, Notes) ---
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20, // Space above footer
    paddingTop: 20, // Space within footer top
    borderTopWidth: 1,
    borderTopColor: "#4B5563", // Darker border (Tailwind gray-600)
  },
  footerBlock: {
    width: "45%",
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#9CA3AF", // Medium gray (Tailwind gray-400)
    marginBottom: 8,
    textTransform: "uppercase",
  },
  footerText: {
    fontSize: 10,
    color: "#D1D5DB", // Lighter gray (Tailwind gray-300)
    marginBottom: 3,
  },
});

// Helper to format currency
const formatPdfCurrency = (amount: number | null | undefined) => {
  // Format without currency symbol for cleaner look in dark theme? Or keep it? Keeping for now.
  return (amount ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD", // Assuming USD, adjust if needed
  });
};

// Define the React component for the Invoice PDF (Redesigned)
function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document
      title={`Invoice ${data.invoiceNumber}`}
      author={data.company.name ?? undefined}
      subject={`Invoice ${data.invoiceNumber}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header: Invoice Info (Left) & Logo (Right) */}
        <View style={styles.headerSection}>
          <View style={styles.headerLeft}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <View style={styles.headerDetailItem}>
              <Text style={styles.headerDetailLabel}>Invoice NO:</Text>
              <Text style={styles.headerDetailValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.headerDetailItem}>
              <Text style={styles.headerDetailLabel}>Issue date:</Text>
              <Text style={styles.headerDetailValue}>{data.invoiceDate}</Text>
            </View>
            <View style={styles.headerDetailItem}>
              <Text style={styles.headerDetailLabel}>Due date:</Text>
              <Text style={styles.headerDetailValue}>{data.dueDate}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {data.company.logoUrl ? (
              <Image style={styles.logo} src={data.company.logoUrl} />
            ) : (
              <Text style={{ fontSize: 20, color: "#9CA3AF" }}>L</Text> // Placeholder 'L'
            )}
          </View>
        </View>

        {/* From / To Addresses */}
        <View style={styles.fromToSection}>
          {/* From Address (Company) */}
          <View style={styles.addressBlock}>
            <Text style={styles.addressBlockTitle}>From</Text>
            <Text style={styles.addressName}>
              {data.company.name ?? "Your Company"}
            </Text>
            <Text style={styles.addressText}>{data.company.street ?? ""}</Text>
            {data.company.line2 && (
              <Text style={styles.addressText}>{data.company.line2}</Text>
            )}
            <Text style={styles.addressText}>
              {`${data.company.city ?? ""} ${data.company.state ?? ""} ${
                data.company.postalCode ?? ""
              }`.trim()}
            </Text>
            <Text style={styles.addressText}>{data.company.country ?? ""}</Text>
            {data.company.email && (
              <Text style={styles.addressText}>{data.company.email}</Text>
            )}
            {/* Add Phone if available/needed */}
          </View>

          {/* To Address (Client) */}
          <View style={styles.addressBlock}>
            <Text style={styles.addressBlockTitle}>To</Text>
            <Text style={styles.addressName}>
              {data.client.name ?? "Client Name"}
            </Text>
            {data.client.contactPerson && (
              <Text style={styles.addressText}>
                {data.client.contactPerson}
              </Text>
            )}
            {/* Assuming client.address is multiline or single line */}
            {data.client.address?.split("\n").map((line, idx) => (
              <Text key={idx} style={styles.addressText}>
                {line}
              </Text>
            )) ?? <Text style={styles.addressText}>Client Address</Text>}
            {data.client.email && (
              <Text style={styles.addressText}>{data.client.email}</Text>
            )}
            {data.client.phone && (
              <Text style={styles.addressText}>{data.client.phone}</Text>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colItem]}>Item</Text>
            <Text style={[styles.tableColHeader, styles.colQty]}>Quantity</Text>
            <Text style={[styles.tableColHeader, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
          </View>

          {/* Table Rows */}
          {data.lineItems.map((item, index) => (
            <View style={styles.tableRow} key={`item_${index}`}>
              <Text style={[styles.tableCol, styles.colItem]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCol, styles.colQty]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCol, styles.colPrice]}>
                {formatPdfCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableCol, styles.colTotal]}>
                {formatPdfCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              {formatPdfCurrency(data.subtotal)}
            </Text>
          </View>
          {/* Only show Tax if > 0 */}
          {data.tax > 0 && (
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>
                {formatPdfCurrency(data.tax)}
              </Text>
            </View>
          )}
          {/* Only show Discount if > 0 */}
          {data.discount > 0 && (
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>
                -{formatPdfCurrency(data.discount)}{" "}
                {/* Show discount as negative */}
              </Text>
            </View>
          )}
          {/* Final Total */}
          <View style={styles.finalTotalItem}>
            <Text style={styles.finalTotalLabel}>Total</Text>
            <Text style={styles.finalTotalValue}>
              {formatPdfCurrency(data.totalAmountDue)}
            </Text>
          </View>
        </View>

        {/* Footer: Payment Details & Notes */}
        <View style={styles.footerSection}>
          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>Payment details</Text>
            {/* Use paymentTerms or add specific fields later */}
            <Text style={styles.footerText}>{data.paymentTerms ?? "N/A"}</Text>
            {/* Add Bank, Account No, IBAN etc. here if data exists */}
          </View>
          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>Note</Text>
            <Text style={styles.footerText}>{data.notes ?? ""}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export const generateInvoicePdf = task({
  id: "generate-invoice-pdf",
  run: async (payload: z.infer<typeof invoicePayloadSchema>) => {
    logger.info("Starting PDF generation for invoice", {
      invoiceId: payload.invoiceId,
      userId: payload.userId,
    });

    const supabase = createClient(); // Use service role client

    try {
      // 1. Fetch the core Invoice data
      logger.info("Fetching core invoice data (service role)...");
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, clients(*)") // Include client fetch here
        .eq("id", payload.invoiceId)
        .eq("user_id", payload.userId)
        .maybeSingle<InvoiceWithRelations>();

      if (invoiceError) {
        logger.error("Supabase invoice fetch error", { error: invoiceError });
        throw new Error(
          `Failed to query invoice data: ${invoiceError.message}`
        );
      }
      if (!invoice) {
        logger.error("Invoice not found for ID and User", {
          invoiceId: payload.invoiceId,
          userId: payload.userId,
        });
        throw new Error(
          `Invoice not found or access denied: ${payload.invoiceId}`
        );
      }
      logger.info("Successfully fetched core invoice data", {
        invoiceId: invoice.id,
      });

      // 2. Fetch related Client data
      logger.info("Fetching client data...", { clientId: invoice.client_id });
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", invoice.client_id)
        .maybeSingle();

      if (clientError) {
        logger.error("Supabase client fetch error", {
          error: clientError,
          clientId: invoice.client_id,
        });
        // Decide if missing client is fatal
        throw new Error(`Failed to fetch client data: ${clientError.message}`);
      }
      if (!client) {
        logger.warn("Client not found", { clientId: invoice.client_id });
        // Decide how to handle - proceed with null client? Or throw error?
        // For now, we'll allow proceeding, mapping step will handle null.
      }
      logger.info("Client data fetch complete", {
        clientId: invoice.client_id,
        found: !!client,
      });

      // 3. Fetch related Invoice Items
      logger.info("Fetching invoice items...", { invoiceId: invoice.id });
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);

      if (itemsError) {
        logger.error("Supabase invoice items fetch error", {
          error: itemsError,
          invoiceId: invoice.id,
        });
        throw new Error(`Failed to fetch invoice items: ${itemsError.message}`);
      }
      if (!items || items.length === 0) {
        // This might be valid for a $0 invoice, but usually an error
        logger.error("No invoice items found for invoice", {
          invoiceId: invoice.id,
        });
        throw new Error(`Invoice items missing for invoice: ${invoice.id}`);
      }
      logger.info(`Successfully fetched ${items.length} invoice items`);

      // 4. Fetch Profile data - UPDATED SELECT
      logger.info("Fetching profile data...", { userId: payload.userId });
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          ` 
          company_name,
          company_logo_url,
          company_email,
          company_address_street,
          company_address_line2,
          company_address_city,
          company_address_state,
          company_address_postal_code,
          company_address_country
        `
        )
        .eq("id", payload.userId)
        .maybeSingle<ProfileFromDb>();

      if (profileError) {
        logger.error("Supabase profile fetch error", {
          error: profileError,
          userId: payload.userId,
        });
        // Non-fatal, proceed with null profile
      }
      logger.info("Profile data fetch complete", {
        userId: payload.userId,
        found: !!profile,
      });

      // 5. Map fetched data to InvoicePdfData structure - UPDATED MAPPING
      const invoiceData: InvoicePdfData = {
        company: {
          name: profile?.company_name ?? null,
          logoUrl: profile?.company_logo_url ?? null,
          email: profile?.company_email ?? null,
          street: profile?.company_address_street ?? null,
          line2: profile?.company_address_line2 ?? null,
          city: profile?.company_address_city ?? null,
          state: profile?.company_address_state ?? null,
          postalCode: profile?.company_address_postal_code ?? null,
          country: profile?.company_address_country ?? null,
        },
        client: {
          name: invoice.clients?.name ?? null,
          contactPerson: invoice.clients?.contact_person ?? null,
          email: invoice.clients?.email ?? null,
          phone: invoice.clients?.phone ?? null,
          address: invoice.clients?.address ?? null, // Keep single line for client for now
        },
        invoiceNumber: invoice.invoice_number,
        invoiceDate: format(new Date(invoice.issue_date), "MM/dd/yyyy"),
        dueDate: format(new Date(invoice.due_date), "MM/dd/yyyy"),
        lineItems: items.map((item: InvoiceItemFromDb) => ({
          description: item.description ?? "",
          quantity: item.quantity ?? 0,
          unitPrice: item.price ?? 0,
          total: item.amount ?? 0,
        })),
        subtotal: invoice.subtotal ?? 0,
        tax: invoice.tax ?? 0,
        discount: invoice.discount ?? 0,
        totalAmountDue: invoice.total ?? 0,
        notes: invoice.notes ?? null,
        paymentTerms: invoice.payment_terms ?? null, // Map payment_terms
      };
      logger.info("Successfully mapped fetched data");

      // 6. Render the React component to a PDF buffer
      logger.info("Rendering PDF to buffer...");
      const pdfBuffer = await renderToBuffer(
        <InvoiceDocument data={invoiceData} />
      );
      logger.info("Successfully rendered PDF buffer", {
        size: pdfBuffer.length,
      });

      // 7. Upload the PDF buffer to Supabase Storage
      logger.info("Uploading PDF to Supabase Storage (using service role)...");
      const filePath = `users/${payload.userId}/invoices/${invoice.id}/${invoiceData.invoiceNumber}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("invoice-pdfs")
        .upload(filePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        logger.error("Supabase storage upload error (service role)", {
          error: uploadError,
        });
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      const pdfPath = uploadData.path;
      logger.info("Successfully uploaded PDF to Supabase Storage", {
        path: pdfPath,
      });

      // 8. Store the PDF path back to the invoice record
      logger.info("Updating invoice record with PDF path (service role)...");
      const { error: dbUpdateError } = await supabase
        .from("invoices")
        .update({ pdf_path: pdfPath })
        .eq("id", invoice.id);

      if (dbUpdateError) {
        logger.error("Failed to update invoice with PDF path", {
          error: dbUpdateError,
        });
        throw dbUpdateError;
      }

      logger.info("Successfully updated invoice record with PDF path.", {
        invoiceId: invoice.id,
        pdfPath: pdfPath,
      });

      // --- NEW: Invoke send-invoice-email function --- //
      // Prepare the payload expected by the function (matching webhook structure)
      const emailPayload = {
        record: {
          ...invoice, // Spread the original fetched invoice data
          pdf_path: pdfPath, // Ensure the updated path is included
          // Note: If the email function requires full client/item data, fetch it again or ensure it's on the 'invoice' object.
          // Assuming the function fetches client/items itself based on invoice.id.
        },
      };

      logger.info("Invoking send-invoice-email function...", {
        invoiceId: invoice.id,
      });
      const { data: funcData, error: funcError } =
        await supabase.functions.invoke("send-invoice-email", {
          body: emailPayload,
        });

      if (funcError) {
        // Log the error but don't fail the PDF task.
        // The PDF was generated successfully, but the email failed.
        logger.error(
          "Error invoking send-invoice-email function after PDF generation",
          {
            error: funcError,
            invoiceId: invoice.id,
          }
        );
        // Return success for PDF generation, but include a warning
        return {
          status: "success_with_warning",
          message: "PDF generated, but failed to trigger email.",
          pdfPath: pdfPath,
        };
      } else {
        logger.info(
          "send-invoice-email function invoked successfully after PDF generation",
          {
            invoiceId: invoice.id,
            result: funcData,
          }
        );
      }
      // --- END NEW SECTION ---

      logger.info("PDF generation and storage process completed successfully", {
        invoiceId: invoice.id,
      });

      return {
        status: "success",
        message: "PDF generated and stored successfully",
        pdfPath: pdfPath,
      };
    } catch (error) {
      logger.error("Unhandled error in generateInvoicePdf task", {
        error,
        invoiceId: payload.invoiceId,
      });
      // Ensure the error is thrown so Trigger.dev knows the task failed
      throw error;
    }
  },
});
