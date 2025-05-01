"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteClientDialog } from "./DeleteClientDialog";
import { deleteClientAction } from "@/app/actions/clientActions";

// Define the data type for a row in the table
// Matches the structure returned by the fetchClients function in page.tsx
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  contact_person?: string | null;
  // Add other fields if needed by the table/filters
}

// --- Actions Cell Component ---
function ActionsCell({ row }: { row: Row<Client> }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const client = row.original;

  const handleDeleteClick = (event: Event) => {
    event.stopPropagation(); // Prevent dropdown from closing immediately
    setIsDeleteDialogOpen(true);
  };

  return (
    // Add a wrapper div for alignment
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link
              href={`/clients/${client.id}`}
              className="cursor-pointer"
              prefetch={true}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleDeleteClick} // Use onSelect to trigger dialog
            className="text-red-600 cursor-pointer focus:bg-red-100 focus:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Render Delete Dialog (outside the alignment div) */}
      <DeleteClientDialog
        clientId={client.id}
        clientName={client.name} // Pass client name for the dialog message
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={deleteClientAction} // Pass the server action
      />
    </div>
  );
}

export const columns: ColumnDef<Client>[] = [
  // Name Column
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    filterFn: "includesString", // Basic text filter
  },

  // Email Column
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="!pl-0"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("email")}</div>,
    filterFn: "includesString", // Basic text filter
  },

  // Phone Column
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
    enableSorting: false, // Optional: Disable sorting if not needed
  },

  // Contact Person Column
  {
    accessorKey: "contact_person",
    header: "Contact Person",
    cell: ({ row }) => <div>{row.getValue("contact_person") || "-"}</div>,
    enableSorting: false, // Optional: Disable sorting if not needed
  },

  // Actions Column
  {
    id: "actions",
    header: () => <div className="text-right pr-4">Actions</div>, // Add padding to align better
    cell: ActionsCell, // Use the new component
    enableSorting: false,
    enableHiding: false,
  },
];
