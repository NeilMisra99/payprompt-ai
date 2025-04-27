"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InvoiceStatus = "paid" | "sent" | "draft" | "overdue";

interface StatusBadgeProps {
  status: InvoiceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // Determine the base variant
  const variant =
    status === "paid"
      ? "default"
      : status === "overdue"
        ? "destructive"
        : status === "sent"
          ? "secondary"
          : "outline";

  return (
    <Badge
      variant={variant}
      className={cn(
        "capitalize border", // Ensure consistent capitalization and border presence
        // Light Mode Styles (Default)
        status === "paid" && "bg-green-100 text-green-800 border-green-200",
        status === "overdue" && "bg-red-100 text-red-800 border-red-200",
        status === "sent" && "bg-blue-100 text-blue-800 border-blue-200",
        status === "draft" && "bg-gray-100 text-gray-700 border-gray-200",

        // Dark Mode Overrides (using original/similar styles)
        status === "paid" &&
          "dark:bg-green-800/20 dark:text-green-400 dark:border-green-800/30",
        // For overdue, let's use the destructive variant's dark colors but adjust bg
        status === "overdue" &&
          "dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/30",
        status === "sent" &&
          "dark:bg-blue-800/20 dark:text-blue-400 dark:border-blue-800/30",
        status === "draft" &&
          "dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-700/60"
      )}
    >
      {status}
    </Badge>
  );
}
