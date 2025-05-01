"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Send,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { Checkbox } from "@/components/ui/checkbox"; // Removed unused import
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge, type InvoiceStatus } from "@/components/ui/status-badge";
import { DeleteInvoiceDialog } from "./DeleteInvoiceDialog";
import {
  deleteInvoice,
  sendDraftInvoiceAction,
} from "@/app/actions/invoiceActions";
import { toast } from "sonner";

// Define the data type for a row in the table
// Matches the structure returned by the fetchInvoices function in page.tsx
// and expected by the DataTable component filters
export interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  status: InvoiceStatus; // Use the specific type
  client_name: string | null; // Expecting client_name directly
  user_id: string;
  created_at: string;
}

// Helper function to determine the correct edit path
function getEditPath(invoice: Invoice): string {
  if (invoice.status === "draft") {
    return `/invoices/${invoice.id}/edit`;
  }
  return `/invoices/${invoice.id}`; // Default view path
}

// Actions Column Component
function ActionsCell({ row }: { row: Row<Invoice> }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const invoice = row.original;
  const editPath = getEditPath(invoice); // Get the correct path

  const handleDeleteClick = (event: Event) => {
    event.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleSendClick = async (event: Event) => {
    event.stopPropagation();
    if (invoice.status !== "draft") return;

    setIsSending(true);
    const result = await sendDraftInvoiceAction(invoice.id);
    setIsSending(false);

    if (result.success) {
      toast.success(result.message);
      if (result.warning) {
        toast.warning(result.warning);
      }
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSending}>
            <span className="sr-only">Open menu</span>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {/* Conditionally render Edit only for drafts */}
          {invoice.status === "draft" && (
            <DropdownMenuItem asChild>
              <Link href={editPath} className="cursor-pointer" prefetch={true}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              href={`/invoices/${invoice.id}/duplicate`}
              className="cursor-pointer"
              prefetch={true}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Link>
          </DropdownMenuItem>
          {invoice.status === "draft" && (
            <DropdownMenuItem
              onSelect={handleSendClick}
              disabled={isSending}
              className="cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Invoice
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleDeleteClick}
            disabled={isSending}
            className="text-red-600 cursor-pointer focus:bg-red-100 focus:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteInvoiceDialog
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={deleteInvoice}
      />
    </div>
  );
}

export const columns: ColumnDef<Invoice>[] = [
  // Select Checkbox (Optional - useful for bulk actions later)
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },

  // Invoice Number Column
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          Invoice #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("invoice_number")}</div>
    ),
  },

  // Client Name Column
  {
    accessorKey: "client_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          Client
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("client_name") ?? "N/A"}</div>,
    filterFn: "arrIncludesSome", // Enable faceted filter
  },

  // Issue Date Column
  {
    accessorKey: "issue_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          Issue Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{formatDate(row.getValue("issue_date"))}</div>,
  },

  // Due Date Column
  {
    accessorKey: "due_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{formatDate(row.getValue("due_date"))}</div>,
  },

  // Amount Column
  {
    accessorKey: "total",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          <div className="flex items-center justify-end w-full">
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total"));
      return <div className="font-medium">{formatCurrency(amount)}</div>;
    },
    filterFn: "inNumberRange", // Enable range filter
  },

  // Status Column
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          <div className="flex items-center justify-center w-full">
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        </Button>
      );
    },
    cell: ({ row }) => (
      <div>
        <StatusBadge status={row.getValue("status")} />
      </div>
    ),
    filterFn: "arrIncludesSome", // Enable faceted filter
  },

  // Actions Column (Using the component)
  {
    id: "actions",
    cell: ActionsCell,
    enableSorting: false,
    enableHiding: false,
  },
];
