"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useCompletion } from "@ai-sdk/react";

interface CreateReminderButtonProps {
  invoiceId: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  dueDate: string;
  total: number;
}

interface PaymentHistorySummary {
  paidCount: number;
  avgDaysDiff: number | null;
}

export function CreateReminderButton({
  invoiceId,
  clientId,
  clientName,
  invoiceNumber,
  dueDate,
  total,
}: CreateReminderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reminderType, setReminderType] = useState<"upcoming" | "overdue">();
  const [message, setMessage] = useState("");
  const [paymentHistory, setPaymentHistory] =
    useState<PaymentHistorySummary | null>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const {
    completion,
    complete,
    isLoading: isGenerating,
  } = useCompletion({
    api: "/api/generate-reminder",
    onFinish: (_, finalCompletion) => {
      setMessage(finalCompletion);
      toast.success("AI Reminder message generated");
    },
    onError: (err) => {
      console.error("Error generating message (useCompletion):", err);
      toast.error(`Failed to generate reminder message: ${err.message}`);
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchUser = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      };
      fetchUser();

      try {
        const dueDateObj = new Date(dueDate);
        const today = startOfDay(new Date());
        const isOverdue = differenceInCalendarDays(today, dueDateObj) > 0;
        setReminderType(isOverdue ? "overdue" : "upcoming");
      } catch (dateError) {
        console.error("Error processing due date:", dateError);
        setReminderType("upcoming");
      }

      if (clientId) {
        const fetchHistory = async () => {
          setIsFetchingHistory(true);
          setPaymentHistory(null);
          try {
            const { data: pastInvoices, error } = await supabase
              .from("invoices")
              .select("due_date, paid_at")
              .eq("client_id", clientId)
              .eq("status", "paid")
              .not("paid_at", "is", null);

            if (error) throw error;

            if (pastInvoices && pastInvoices.length > 0) {
              let totalDaysDiff = 0;
              pastInvoices.forEach((inv) => {
                if (inv.paid_at && inv.due_date) {
                  const paidDate = new Date(inv.paid_at);
                  const dueDate = new Date(inv.due_date);
                  totalDaysDiff += differenceInCalendarDays(paidDate, dueDate);
                }
              });
              setPaymentHistory({
                paidCount: pastInvoices.length,
                avgDaysDiff: totalDaysDiff / pastInvoices.length,
              });
            } else {
              setPaymentHistory({ paidCount: 0, avgDaysDiff: null });
            }
          } catch (err) {
            console.error("Error fetching payment history:", err);
            setPaymentHistory({ paidCount: 0, avgDaysDiff: null });
          } finally {
            setIsFetchingHistory(false);
          }
        };
        fetchHistory();
      }
    } else {
      setReminderType(undefined);
      setMessage("");
      setPaymentHistory(null);
    }
  }, [isOpen, clientId, dueDate, supabase]);

  const generateMessage = () => {
    setMessage("");
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    let historySummary = "No payment history available for this client.";
    if (paymentHistory) {
      if (paymentHistory.paidCount > 0 && paymentHistory.avgDaysDiff !== null) {
        const avgDays = Math.round(paymentHistory.avgDaysDiff);
        if (avgDays <= 0) {
          historySummary = `This client has paid ${
            paymentHistory.paidCount
          } previous invoices, typically paying on time or ${Math.abs(
            avgDays
          )} days early on average.`;
        } else {
          historySummary = `This client has paid ${paymentHistory.paidCount} previous invoices, but typically pays ${avgDays} days late on average.`;
        }
      } else if (paymentHistory.paidCount === 0) {
        historySummary = "This is the first invoice for this client.";
      }
    }

    let basePrompt = `You are an assistant for a small business owner helping them write friendly but professional payment reminders. 
    Client Payment History Context: ${historySummary}
    --- 
    Write a ${reminderType} payment reminder for invoice #${invoiceNumber} to ${clientName}.
    The amount due is ${formatCurrency(total)}.
The due date is ${format(new Date(dueDate), "MMMM d, yyyy")}. `;

    if (reminderType === "overdue") {
      basePrompt += `The invoice is currently ${daysOverdue} days overdue. `;
    }

    basePrompt += `Keep the tone friendly and professional. Suggest they reach out if they have questions. Do not include a Subject line or any other email formatting, just provide the reminder message body. Adapt the message slightly based on the payment history context provided.`;

    complete(basePrompt);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please generate or enter a reminder message");
      return;
    }

    setIsLoading(true);

    if (!userId) {
      toast.error("Could not identify user. Please try again.");
      setIsLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from("reminders").insert({
        invoice_id: invoiceId,
        client_id: clientId,
        user_id: userId,
        type: reminderType,
        message: message,
        sent_at: new Date().toISOString(),
        status: "sent",
      });

      if (insertError) throw insertError;

      toast.success("Reminder sent successfully");
      setIsOpen(false);
      router.refresh();
    } catch (sendError) {
      console.error("Error sending reminder:", sendError);
      toast.error("Failed to send reminder");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Send className="h-4 w-4 mr-2" />
          Send Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Payment Reminder</DialogTitle>
          <DialogDescription>
            Send a payment reminder for invoice #{invoiceNumber} to {clientName}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reminder-type" className="text-right">
              Reminder Type
            </Label>
            <Select
              value={reminderType}
              onValueChange={(value: "upcoming" | "overdue") => {
                setReminderType(value);
                setMessage("");
              }}
              disabled={!reminderType}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue
                  placeholder={
                    reminderType
                      ? reminderType === "upcoming"
                        ? "Upcoming Payment"
                        : "Overdue Payment"
                      : "Loading..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming Payment</SelectItem>
                <SelectItem value="overdue">Overdue Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-start-2 col-span-3">
              <Button
                variant="outline"
                type="button"
                onClick={generateMessage}
                disabled={isGenerating || isFetchingHistory}
                className="w-full"
              >
                {isFetchingHistory
                  ? "Fetching History..."
                  : isGenerating
                    ? "Generating..."
                    : "Generate AI Reminder Message"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right pt-2">
              Message
            </Label>
            <Textarea
              id="message"
              value={isGenerating ? completion : message}
              onChange={(e) => setMessage(e.target.value)}
              className="col-span-3"
              rows={6}
              placeholder="Click 'Generate AI Reminder Message' or enter manually..."
              readOnly={isGenerating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isLoading || isGenerating || !message.trim()}
          >
            {isLoading ? "Sending..." : "Send Reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
