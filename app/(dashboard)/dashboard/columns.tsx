"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge, type InvoiceStatus } from "@/components/ui/status-badge";

// Define the shape of our data (matches the mock data structure)
export interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  client_name: string;
  user_id: string;
}

export const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          Invoice
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("invoice_number")}</div>
    ),
  },
  {
    accessorKey: "client_name",
    filterFn: "arrIncludesSome",
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
    cell: ({ row }) => <div>{row.getValue("client_name")}</div>,
  },
  {
    accessorKey: "status",
    filterFn: "arrIncludesSome",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as InvoiceStatus;
      return (
        <div>
          <StatusBadge status={status} />
        </div>
      );
    },
  },
  {
    accessorKey: "total",
    filterFn: "inNumberRange",
    header: ({ column }) => {
      return (
        <div>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="!pl-0"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total"));
      return <div className="font-medium">{formatCurrency(amount)}</div>;
    },
  },
  // Add more columns here if needed (e.g., client name, due date)
];
