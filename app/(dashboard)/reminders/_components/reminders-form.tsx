"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCompletion } from "@ai-sdk/react";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";

// Define types for nested client data and the invoice itself
interface ClientInfo {
  name: string;
  email: string | null;
  id: string;
}

interface InvoiceWithClient {
  id: string;
  invoice_number: string;
  due_date: string;
  total: number;
  status: string;
  clients: ClientInfo | null;
}

interface PaymentHistorySummary {
  paidCount: number;
  avgDaysDiff: number | null; // Overall avg payment time vs due date
}

// Add interface for reminder response data
interface ReminderResponseData {
  sent_at: string | null; // sent_at can be null
  invoices: {
    paid_at: string | null; // paid_at can be null
    client_id: string; // Ensure client_id is selected
  } | null;
}

// Form schema
const reminderSchema = z.object({
  invoiceId: z.string().min(1, { message: "Please select an invoice." }),
  type: z.enum(["upcoming", "overdue"]),
  tone: z.enum(["friendly", "neutral", "firm"]),
  customMessage: z.string().optional(),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

interface RemindersFormProps {
  userId: string;
}

export default function RemindersForm({ userId }: RemindersFormProps) {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [message, setMessage] = useState("");
  const [suggestedTiming, setSuggestedTiming] = useState<string | null>(null); // State for suggestion
  const [paymentHistory, setPaymentHistory] =
    useState<PaymentHistorySummary | null>(null); // Stores overall history now
  const [avgReminderResponseTime, setAvgReminderResponseTime] = useState<
    number | null
  >(null); // Still stores specific reminder->payment avg
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiOutput, setShowAiOutput] = useState(false);

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      invoiceId: "",
      type: "upcoming",
      tone: "friendly",
      customMessage: "",
    },
  });

  const selectedInvoiceId = useWatch({
    control: form.control,
    name: "invoiceId",
  });

  // AI Hook Setup - Updated onFinish
  const {
    completion,
    complete,
    isLoading: isGenerating,
  } = useCompletion({
    api: "/api/generate-reminder",
    onFinish: (_, finalCompletion) => {
      const parts = finalCompletion.split("--- SUGGESTION ---");
      const generatedMessage = parts[0]?.trim() || "";
      const timingSuggestion = parts[1]?.trim() || null;

      setMessage(generatedMessage);
      setSuggestedTiming(timingSuggestion);
      setShowAiOutput(true);
      form.setValue("customMessage", generatedMessage, {
        shouldValidate: true,
      });
      toast.success("AI Reminder message and suggestion generated");
    },
    onError: (err) => {
      console.error("Error generating message:", err);
      setSuggestedTiming(null); // Clear suggestion on error
      setError(`Failed to generate reminder message: ${err.message}`);
      toast.error(`Failed to generate reminder message: ${err.message}`);
      setShowAiOutput(false);
    },
  });

  // Effect for updating message based on completion (no change needed)
  useEffect(() => {
    if (isGenerating && completion !== message) {
      const parts = completion.split("--- SUGGESTION ---");
      setMessage(parts[0]?.trim() || "");
      // Optionally update suggestion preview while streaming if desired
      // setSuggestedTiming(parts[1]?.trim() || null);
    }
  }, [completion, isGenerating, message]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setError(null);
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("invoices")
          .select(
            `
            id,
            invoice_number,
            due_date,
            total,
            status,
            clients ( id, name, email )
          `
          )
          .eq("user_id", userId)
          .in("status", ["sent", "overdue"])
          .order("due_date")
          .returns<InvoiceWithClient[]>();

        if (fetchError) throw fetchError;

        if (data) {
          setInvoices(data);
        } else {
          setInvoices([]);
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError("Failed to load invoices.");
        setInvoices([]);
      }
    };
    fetchInvoices();
  }, [userId]);

  // Effect for processing selected invoice - Updated History Fetching
  useEffect(() => {
    const processSelectedInvoice = async () => {
      setMessage("");
      setSuggestedTiming(null); // Reset suggestion on new invoice select
      form.setValue("customMessage", "");
      setPaymentHistory(null);
      setAvgReminderResponseTime(null);

      if (!selectedInvoiceId) {
        return;
      }

      const selectedInvoice = invoices.find(
        (inv) => inv.id === selectedInvoiceId
      );

      if (!selectedInvoice || !selectedInvoice.clients?.id) {
        return;
      }
      const clientId = selectedInvoice.clients.id;

      try {
        const dueDate = new Date(selectedInvoice.due_date);
        const today = startOfDay(new Date());
        const isOverdue = differenceInCalendarDays(today, dueDate) > 0;
        const suggestedType = isOverdue ? "overdue" : "upcoming";

        if (form.getValues("type") !== suggestedType) {
          form.setValue("type", suggestedType, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      } catch (dateError) {
        console.error("Error processing due date:", dateError);
      }

      setIsFetchingHistory(true);
      try {
        const supabase = createClient();

        // 1. Fetch Overall Payment History (paid_at vs due_date)
        const { data: overallHistoryData, error: overallHistoryError } =
          await supabase
            .from("invoices")
            .select("due_date, paid_at")
            .eq("client_id", clientId)
            .eq("status", "paid")
            .not("paid_at", "is", null)
            .not("due_date", "is", null); // Ensure due_date is also not null

        if (overallHistoryError) throw overallHistoryError;

        if (overallHistoryData && overallHistoryData.length > 0) {
          let totalDaysDiff = 0;
          overallHistoryData.forEach((inv) => {
            // Double check nulls although query filters them
            if (inv.paid_at && inv.due_date) {
              const paidDate = startOfDay(new Date(inv.paid_at));
              const dueDate = startOfDay(new Date(inv.due_date));
              totalDaysDiff += differenceInCalendarDays(paidDate, dueDate);
            }
          });
          setPaymentHistory({
            paidCount: overallHistoryData.length,
            avgDaysDiff: totalDaysDiff / overallHistoryData.length,
          });
        } else {
          setPaymentHistory({ paidCount: 0, avgDaysDiff: null });
        }

        // 2. Fetch Reminder Response History (paid_at vs sent_at) - (Existing logic)
        const { data: reminderData, error: reminderError } = await supabase
          .from("reminders")
          .select(
            `
            sent_at,
            invoices!inner (
              paid_at,
              client_id
            )
          `
          )
          .eq("invoices.client_id", clientId)
          .eq("invoices.status", "paid")
          .not("invoices.paid_at", "is", null)
          .not("sent_at", "is", null)
          .returns<ReminderResponseData[]>();

        if (reminderError) throw reminderError;

        if (reminderData && reminderData.length > 0) {
          let totalResponseDays = 0;
          let validPairs = 0;

          const validReminders = reminderData.filter((item) => {
            if (item.invoices && item.sent_at && item.invoices.paid_at) {
              const sentDate = startOfDay(new Date(item.sent_at));
              const paidDate = startOfDay(new Date(item.invoices.paid_at));
              // Ensure paid_at is strictly after sent_at
              return paidDate > sentDate;
            }
            return false;
          });

          validReminders.forEach((item) => {
            if (item.invoices && item.sent_at && item.invoices.paid_at) {
              const sentDate = startOfDay(new Date(item.sent_at));
              const paidDate = startOfDay(new Date(item.invoices.paid_at));
              totalResponseDays += differenceInCalendarDays(paidDate, sentDate);
              validPairs++;
            }
          });

          if (validPairs > 0) {
            setAvgReminderResponseTime(totalResponseDays / validPairs);
          } else {
            setAvgReminderResponseTime(null);
          }
        } else {
          setAvgReminderResponseTime(null);
        }
      } catch (err) {
        console.error("Error fetching history/response time:", err);
        setPaymentHistory({ paidCount: 0, avgDaysDiff: null });
        setAvgReminderResponseTime(null);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    processSelectedInvoice();
    // Ensure form is not in dependency array if it causes loops, only use specific form methods if needed
  }, [selectedInvoiceId, invoices, form.getValues, form.setValue]); // Adjusted dependencies

  // Trigger AI Generation - Updated Prompt Construction
  const triggerAiGeneration = async () => {
    const data = form.getValues();
    setMessage("");
    setSuggestedTiming(null); // Reset suggestion
    setError(null);
    const invoice = invoices.find((inv) => inv.id === data.invoiceId);

    if (!invoice || !invoice.clients) {
      const msg = "Selected invoice or client data not found.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // Format Overall Payment History
    let overallPaymentSummary = "not enough data";
    if (
      paymentHistory &&
      paymentHistory.paidCount > 0 &&
      paymentHistory.avgDaysDiff !== null
    ) {
      const avgDays = Math.round(paymentHistory.avgDaysDiff);
      if (avgDays === 0) overallPaymentSummary = "on time";
      else if (avgDays < 0)
        overallPaymentSummary = `${Math.abs(avgDays)} days early`;
      else overallPaymentSummary = `${avgDays} days late`;
    }

    // Format Reminder Response History
    let reminderResponseSummary = "not enough data";
    if (avgReminderResponseTime !== null) {
      reminderResponseSummary = `${Math.round(avgReminderResponseTime)} days`;
    }

    const daysOverdue = Math.max(
      0,
      differenceInCalendarDays(
        startOfDay(new Date()),
        startOfDay(new Date(invoice.due_date))
      )
    );

    const prompt = `You are an AI assistant for a small business owner. Your tasks are to:
1. Generate a payment reminder message.
2. Suggest the optimal time to send this reminder based on the client's payment history.

Client Name: ${invoice.clients.name}
Invoice Number: ${invoice.invoice_number}
Amount Due: ${formatCurrency(invoice.total)}
Due Date: ${format(new Date(invoice.due_date), "MMMM d, yyyy")}
${data.type === "overdue" ? `Days Overdue: ${daysOverdue}` : ""}
Desired Tone: ${data.tone}

Client Payment History Summary:
- Total Paid Invoices: ${paymentHistory?.paidCount ?? 0}
- Average Payment Time vs Due Date: ${overallPaymentSummary}
- Average Time from Reminder to Payment (when applicable): ${reminderResponseSummary}

---

Task 1: Write a ${data.type} payment reminder message with a ${
      data.tone
    } tone for the invoice details above. Adapt the message slightly based on the payment history context. Do not include a Subject line or any email formatting.

Task 2: Based *only* on the provided Client Payment History Summary, suggest the best time to send this specific reminder (e.g., 'Send 3 days before due date', 'Send immediately as it is overdue', 'Send on the due date'). Provide a brief reasoning based on the history.

---

Output Format:
Provide the reminder message first, followed by '--- SUGGESTION ---', then the suggested timing and reasoning.`;

    // Show the container *before* starting the completion
    setShowAiOutput(true);
    complete(prompt);
  };

  const sendReminder = async (data: ReminderFormValues) => {
    const finalMessage = message.trim();

    if (!finalMessage) {
      const msg = "Please generate or enter a reminder message.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("reminders").insert({
        invoice_id: data.invoiceId,
        type: data.type,
        message: finalMessage,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      toast.success("Reminder sent successfully!");
      form.reset({
        invoiceId: "",
        type: "upcoming",
        tone: "friendly",
        customMessage: "",
      });
      setMessage("");
      setPaymentHistory(null);
    } catch (err) {
      console.error("Error sending reminder:", err);
      const msg = "Failed to send reminder.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(sendReminder)} className="space-y-4">
          <FormField
            control={form.control}
            name="invoiceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Invoice</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {invoices.length === 0 && !error && (
                      <SelectItem value="loading" disabled>
                        Loading invoices...
                      </SelectItem>
                    )}
                    {error && (
                      <SelectItem value="error" disabled>
                        Error loading invoices
                      </SelectItem>
                    )}
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} -{" "}
                        {invoice.clients?.name || "N/A"} (
                        {formatCurrency(invoice.total)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
                {isFetchingHistory && (
                  <p className="text-sm text-muted-foreground pt-1">
                    Loading client history...
                  </p>
                )}
                {!isFetchingHistory &&
                  paymentHistory &&
                  paymentHistory.paidCount > 0 &&
                  paymentHistory.avgDaysDiff !== null && (
                    <div className="flex items-center text-sm text-muted-foreground pt-1">
                      <Info className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      <span>
                        Client typically pays
                        {paymentHistory.avgDaysDiff === 0 && " on time"}
                        {paymentHistory.avgDaysDiff < 0 &&
                          ` ~${Math.abs(
                            Math.round(paymentHistory.avgDaysDiff)
                          )} days early`}
                        {paymentHistory.avgDaysDiff > 0 &&
                          ` ~${Math.round(
                            paymentHistory.avgDaysDiff
                          )} days late`}
                        .
                        {avgReminderResponseTime !== null &&
                          ` Responds to reminders in ~${Math.round(
                            avgReminderResponseTime
                          )} days.`}
                      </span>
                    </div>
                  )}
                {!isFetchingHistory &&
                  paymentHistory &&
                  paymentHistory.paidCount === 0 && (
                    <div className="flex items-center text-sm text-muted-foreground pt-1">
                      <Info className="h-4 w-4 mr-1.5" />
                      <span>No payment history found for this client.</span>
                    </div>
                  )}
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Type</FormLabel>
                  <Select
                    onValueChange={(value: "upcoming" | "overdue") => {
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tone</FormLabel>
                  <Select
                    onValueChange={(value: "friendly" | "neutral" | "firm") => {
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="firm">Firm</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={
                  isGenerating || isFetchingHistory || !form.watch("invoiceId")
                }
                onClick={triggerAiGeneration}
              >
                {isFetchingHistory
                  ? "Loading History..."
                  : isGenerating
                    ? "Generating..."
                    : "Generate AI Message & Suggestion"}
              </Button>
            </div>
          </div>

          {showAiOutput && (
            <AnimatedContainer variant="slideUp" delay={0.1}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Generated message will appear here, or write your own..."
                          rows={6}
                          {...field}
                          value={message}
                          onChange={(e) => {
                            field.onChange(e);
                            setMessage(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {suggestedTiming && (
                  <AnimatedContainer variant="fadeIn" delay={0.2}>
                    <Alert className="bg-muted/50">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>AI Suggestion:</strong> {suggestedTiming}
                      </AlertDescription>
                    </Alert>
                  </AnimatedContainer>
                )}

                <FormDescription>
                  Edit the generated message or write your own. The AI
                  suggestion is based on historical data.
                </FormDescription>
              </div>
            </AnimatedContainer>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSending || isGenerating || !message.trim()}
            >
              {isSending ? "Sending..." : "Send Reminder"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
