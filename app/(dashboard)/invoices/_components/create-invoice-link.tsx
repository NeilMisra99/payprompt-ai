"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreateInvoiceLinkProps {
  hasClients: boolean;
}

export function CreateInvoiceLink({ hasClients }: CreateInvoiceLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasClients) {
      event.preventDefault();
    }
  };

  if (!hasClients) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Link
              href="/invoices/new"
              aria-disabled={true}
              tabIndex={-1}
              onClick={handleClick}
              className="pointer-events-none" // Prevent clicks visually
            >
              <Button disabled={true}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Please add a client before creating an invoice.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // If hasClients is true, render the link normally
  return (
    <Link href="/invoices/new" prefetch={true}>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Invoice
      </Button>
    </Link>
  );
}
