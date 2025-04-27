import { redirect, notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer } from "lucide-react";
import { MarkAsPaidButton } from "../_components/mark-as-paid-button";
import { DeleteInvoiceButton } from "../_components/delete-invoice-button";
import { CreateReminderButton } from "../_components/create-reminder-button";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
// Define types based on the /invoices/:id/details API response
// Using types defined/exported from invoice-form might be cleaner if they match
interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  contact_person?: string | null;
  // ... other client fields
}

interface InvoiceItemDetail {
  id: string;
  description: string;
  quantity: number;
  price: number;
  amount: number;
  // ... other item fields
}

interface ReminderDetail {
  id: string;
  type: string;
  status: string;
  sent_at?: string | null;
  created_at: string;
  // ... other reminder fields
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  status: string;
  payment_terms?: string | null;
  notes?: string | null;
  client: ClientDetail; // Nested client object
  // ... other invoice fields
}

interface InvoiceDetailsData {
  invoice: InvoiceDetail;
  items: InvoiceItemDetail[];
  reminders: ReminderDetail[];
}

// Function to fetch detailed invoice data
async function fetchInvoiceDetails(
  id: string,
  token: string
): Promise<InvoiceDetailsData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/invoices/${id}/details`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token,
      },
      cache: "force-cache",
      next: { tags: [`invoices:${id}`, `reminders`] }, // Tag for revalidation
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching invoice details");
      return null; // Handled by redirect below
    }

    if (response.status === 404) {
      return null; // Handled by notFound below
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(
        `Failed to fetch invoice details: ${response.statusText}`
      );
    }

    const data: InvoiceDetailsData = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    return null; // Let notFound handle this case
  }
}

export default async function InvoiceDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  // Check authentication first
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Now fetch the invoice data
  const invoiceId = (await props.params).id;
  const token = await cookies();
  const detailsData = await fetchInvoiceDetails(invoiceId, token.toString());

  // Handle invoice not found (we already checked auth)
  if (!detailsData) {
    notFound(); // Invoice doesn't exist or user doesn't have access
  }

  const { invoice, items, reminders } = detailsData;

  // Get current status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Invoice {invoice.invoice_number}
          </h1>
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
        </div>
        <div className="flex space-x-2">
          {invoice.status !== "paid" && (
            <MarkAsPaidButton invoiceId={invoice.id} />
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") &&
            invoice.client && (
              <CreateReminderButton
                invoiceId={invoice.id}
                clientId={invoice.client.id}
                clientName={invoice.client.name}
                invoiceNumber={invoice.invoice_number}
                dueDate={invoice.due_date}
                total={invoice.total}
              />
            )}
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <DeleteInvoiceButton invoiceId={invoice.id} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{invoice.client.name}</p>
            <p>{invoice.client.email}</p>
            {invoice.client.phone && <p>{invoice.client.phone}</p>}
            {invoice.client.address && (
              <p className="whitespace-pre-line">{invoice.client.address}</p>
            )}
            {invoice.client.contact_person && (
              <p>Attn: {invoice.client.contact_person}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p>{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p>
                  {invoice.status.charAt(0).toUpperCase() +
                    invoice.status.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Issue Date</p>
                <p>{format(new Date(invoice.issue_date), "MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p>{format(new Date(invoice.due_date), "MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Terms</p>
                <p>{invoice.payment_terms || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-bold">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium text-gray-500">
                    Description
                  </th>
                  <th className="py-2 text-right font-medium text-gray-500">
                    Quantity
                  </th>
                  <th className="py-2 text-right font-medium text-gray-500">
                    Price
                  </th>
                  <th className="py-2 text-right font-medium text-gray-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {items && items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">{item.description}</td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-gray-500">
                      No items found for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-2 text-right font-medium">
                    Subtotal
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
                {invoice.tax > 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-right">
                      Tax
                    </td>
                    <td className="py-2 text-right">
                      {formatCurrency(invoice.tax)}
                    </td>
                  </tr>
                )}
                {invoice.discount > 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-right">
                      Discount
                    </td>
                    <td className="py-2 text-right">
                      -{formatCurrency(invoice.discount)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="py-2 text-right font-bold">
                    Total
                  </td>
                  <td className="py-2 text-right font-bold">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {reminders && reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reminder History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reminders.map((reminder) => (
                <li key={reminder.id} className="text-sm text-gray-600">
                  Reminder ({reminder.type}, {reminder.status}) sent on{" "}
                  {reminder.sent_at
                    ? format(new Date(reminder.sent_at), "MMM d, yyyy HH:mm")
                    : "not sent"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
