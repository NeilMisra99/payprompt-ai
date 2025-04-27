"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface MarkAsPaidButtonProps {
  invoiceId: string;
}

export function MarkAsPaidButton({ invoiceId }: MarkAsPaidButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleMarkAsPaid = async () => {
    try {
      setIsLoading(true);

      // Update invoice status to "paid" and set the paid_at timestamp
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(), // Set current timestamp
        })
        .eq("id", invoiceId);

      if (error) throw error;

      toast.success("Invoice marked as paid");
      router.refresh();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error("Failed to mark invoice as paid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleMarkAsPaid} disabled={isLoading} variant="default">
      <CheckCircle className="h-4 w-4 mr-2" />
      Mark as Paid
    </Button>
  );
}
