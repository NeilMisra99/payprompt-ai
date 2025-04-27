import { createClient } from "@/utils/supabase/server"; // Re-added for user ID
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import RemindersForm from "./_components/reminders-form";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { cookies } from "next/headers"; // Added

// Define nested types based on API response
interface ReminderClientStub {
  name: string | null;
}

interface ReminderInvoiceStub {
  invoice_number: string | null;
  total: number | null;
  clients: ReminderClientStub | null;
}

interface Reminder {
  id: string;
  user_id: string;
  invoice_id: string;
  type: string; // e.g., 'upcoming', 'overdue'
  status: string; // e.g., 'draft', 'sent', 'failed'
  sent_at: string | null;
  created_at: string;
  invoices: ReminderInvoiceStub | null;
}

// Function to fetch reminders from the API endpoint
async function fetchReminders(token: string): Promise<Reminder[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/reminders`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token,
      },
      cache: "force-cache",
      next: { tags: ["reminders"] }, // Tag for revalidation
    });

    if (response.status === 401) {
      console.warn("Unauthorized fetching reminders");
      return [];
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch reminders: ${response.statusText}`);
    }

    const data: Reminder[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return [];
  }
}

export default async function RemindersPage() {
  // Create supabase client to get user ID from session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle case where user is not logged in
  if (!user) {
    return null;
  }

  const token = await cookies();
  const reminders = await fetchReminders(token.toString());

  return (
    <div className="space-y-6">
      <AnimatedContainer variant="fadeIn" delay={0.1}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Reminders</h1>
          <p className="text-muted-foreground">
            Generate and manage payment reminders
          </p>
        </div>
      </AnimatedContainer>

      <div className="grid gap-6 md:grid-cols-20">
        <AnimatedContainer
          variant="slideIn"
          delay={0.2}
          className="md:col-span-9"
        >
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Generate Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Pass the fetched user ID */}
              <RemindersForm userId={user.id} />
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer
          variant="slideUp"
          delay={0.3}
          className="md:col-span-11"
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              {reminders && reminders.length > 0 ? (
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminders.map((reminder) => (
                        <TableRow key={reminder.id}>
                          <TableCell>
                            {reminder.invoices?.clients?.name ?? "N/A"}
                          </TableCell>
                          <TableCell>
                            {reminder.invoices?.invoice_number ?? "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                reminder.type === "upcoming"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={cn(
                                "capitalize border",
                                // Light mode
                                reminder.type === "upcoming" &&
                                  "bg-blue-100 text-blue-800 border-blue-200",
                                reminder.type === "overdue" &&
                                  "bg-red-100 text-red-800 border-red-200",
                                // Dark mode
                                reminder.type === "upcoming" &&
                                  "dark:bg-blue-800/20 dark:text-blue-400 dark:border-blue-800/30",
                                reminder.type === "overdue" &&
                                  "dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/30"
                              )}
                            >
                              {reminder.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {reminder.sent_at
                              ? formatDate(reminder.sent_at)
                              : "Not sent"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                reminder.status === "sent"
                                  ? "secondary"
                                  : reminder.status === "failed"
                                    ? "destructive"
                                    : "outline" // Default for others
                              }
                              className={cn(
                                "capitalize border",
                                // Light mode
                                reminder.status === "sent" &&
                                  "bg-blue-100 text-blue-800 border-blue-200",
                                reminder.status === "failed" &&
                                  "bg-red-100 text-red-800 border-red-200",
                                !["sent", "failed"].includes(reminder.status) &&
                                  "bg-gray-100 text-gray-700 border-gray-200", // Default/other status
                                // Dark mode
                                reminder.status === "sent" &&
                                  "dark:bg-blue-800/20 dark:text-blue-400 dark:border-blue-800/30",
                                reminder.status === "failed" &&
                                  "dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/30",
                                !["sent", "failed"].includes(reminder.status) &&
                                  "dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-700/60"
                              )}
                            >
                              {reminder.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground py-4">
                  No reminders have been sent yet.
                </p>
              )}
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>
    </div>
  );
}
