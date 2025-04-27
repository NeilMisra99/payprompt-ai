"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Profile } from "./profile-form";

const invoiceSettingsSchema = z.object({
  default_payment_terms: z.string(),
  default_tax_rate: z.coerce.number().min(0, "Tax rate cannot be negative"),
  auto_send_reminders: z.boolean(),
  reminder_days_before: z.coerce.number().min(1, "Must be at least 1 day"),
  reminder_days_after: z.coerce.number().min(1, "Must be at least 1 day"),
});

type InvoiceSettingsFormValues = z.infer<typeof invoiceSettingsSchema>;

export function InvoiceSettingsForm({ profile }: { profile: Profile }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const currentSettings = profile?.invoice_settings || {};

  const defaultValues: InvoiceSettingsFormValues = {
    default_payment_terms: currentSettings.default_payment_terms || "Net 30",
    default_tax_rate: currentSettings.default_tax_rate ?? 0,
    auto_send_reminders: currentSettings.auto_send_reminders ?? false,
    reminder_days_before: currentSettings.reminder_days_before ?? 3,
    reminder_days_after: currentSettings.reminder_days_after ?? 1,
  };

  const form = useForm<InvoiceSettingsFormValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues,
  });

  async function onSubmit(data: InvoiceSettingsFormValues) {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          invoice_settings: data,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Invoice settings updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating invoice settings:", error);
      toast.error("Failed to update invoice settings");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Settings</CardTitle>
        <CardDescription>
          Configure default invoice options and reminder preferences
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="default_payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Payment Terms</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Net 7">Net 7</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                        <SelectItem value="Due on Receipt">
                          Due on Receipt
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Default payment terms for all new invoices
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Default tax rate applied to new invoices
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium">Reminder Settings</h3>

              <FormField
                control={form.control}
                name="auto_send_reminders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Automatic Reminders
                      </FormLabel>
                      <FormDescription>
                        Automatically send payment reminders for upcoming and
                        overdue invoices
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pt-6">
                <FormField
                  control={form.control}
                  name="reminder_days_before"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Before Due Date</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Send reminder this many days before invoice is due
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminder_days_after"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days After Due Date</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Send reminder this many days after invoice is overdue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end pt-6">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
