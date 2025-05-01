"use client";

import { useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFieldArray } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";

// Import the server actions
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/app/actions/invoiceActions";

// Define types for client and profile
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  user_id: string;
}

export interface Profile {
  id: string;
  company_name?: string;
  company_address?: string;
  company_logo?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

// Define type for invoice items
export interface InvoiceItem {
  id?: string; // Optional for new items
  description: string;
  quantity: number;
  price: number;
}

// Define the type for the invoice data including nested client and items
// This should match the structure returned by the `/invoices/:id/edit-data` endpoint
export interface InvoiceWithItemsAndClient {
  id: string;
  invoice_number: string;
  issue_date: string; // Dates might be strings from API
  due_date: string;
  total: number;
  status: string; // API returns string status
  payment_terms?: string | null;
  notes?: string | null;
  tax?: number | null;
  discount?: number | null;
  user_id: string;
  created_at: string;
  client: Client; // Nested client object
  items: InvoiceItem[]; // Array of items
}

// Define type for AI Suggestion data based on schema
// Match field names from AISuggestedInvoiceSchema in the hook
interface AISuggestedData {
  invoiceNumber: string;
  dueDate: string; // Expecting string YYYY-MM-DD
  lineItems: Array<{ description: string; qty: number; unitPrice: number }>;
  notes?: string;
  discounts?: Array<{ description: string; amount: number }>;
  // Add other fields if needed
}

interface InvoiceFormProps {
  clients: Client[];
  defaultInvoiceNumber?: string; // Make optional, not needed when editing
  profile?: Profile;
  initialData?: AISuggestedData | null;
  existingInvoice?: InvoiceWithItemsAndClient | null; // Add prop for editing
  onClientChange?: (clientId: string | null) => void;
  onInvoiceSubmitSuccess?: (invoiceId: string, wasAIassisted: boolean) => void;
  isLoading?: boolean;
}

const invoiceFormSchema = z.object({
  client_id: z.string({
    required_error: "Please select a client",
  }),
  invoice_number: z.string().min(1, "Invoice number is required"),
  issue_date: z.date({
    required_error: "Issue date is required",
  }),
  due_date: z.date({
    required_error: "Due date is required",
  }),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce
          .number()
          .min(0.01, "Quantity must be greater than 0"),
        price: z.coerce.number().min(0.01, "Price must be greater than 0"),
      })
    )
    .min(1, "At least one item is required"),
  tax: z.coerce.number().min(0, "Tax cannot be negative").optional(),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function InvoiceForm({
  clients,
  defaultInvoiceNumber,
  initialData,
  existingInvoice, // Destructure the new prop
  onClientChange,
  onInvoiceSubmitSuccess,
  isLoading: isLoadingAI,
}: InvoiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const wasAIassisted = !!initialData;
  const isEditing = !!existingInvoice;

  // Memoize defaultValues to prevent unnecessary recalculations and effect triggers
  const defaultValues: Partial<InvoiceFormValues> = useMemo(() => {
    if (isEditing && existingInvoice) {
      // Calculate subtotal from existing items to derive percentages
      const itemsForCalc = existingInvoice.items ?? [];
      const subtotalForCalc = itemsForCalc.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
        0
      );
      const taxAmountForCalc = existingInvoice.tax ?? 0;
      const discountAmountForCalc = existingInvoice.discount ?? 0;

      // Calculate percentages from amounts, handle division by zero
      const taxPercent =
        subtotalForCalc > 0
          ? parseFloat(((taxAmountForCalc / subtotalForCalc) * 100).toFixed(2))
          : 0;
      const discountPercent =
        subtotalForCalc > 0
          ? parseFloat(
              ((discountAmountForCalc / subtotalForCalc) * 100).toFixed(2)
            )
          : 0;

      return {
        client_id: existingInvoice.client?.id,
        invoice_number: existingInvoice.invoice_number,
        issue_date: existingInvoice.issue_date
          ? new Date(existingInvoice.issue_date + "T00:00:00")
          : new Date(),
        due_date: existingInvoice.due_date
          ? new Date(existingInvoice.due_date + "T00:00:00")
          : new Date(),
        payment_terms: existingInvoice.payment_terms ?? "Net 30",
        notes: existingInvoice.notes ?? "",
        items: existingInvoice.items?.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
        })) ?? [{ description: "", quantity: 1, price: 0 }],
        tax: taxPercent, // Use calculated percentage
        discount: discountPercent, // Use calculated percentage
      };
    } else {
      // Original default values for new invoice
      return {
        invoice_number: defaultInvoiceNumber,
        issue_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        payment_terms: "Net 30",
        items: [{ description: "", quantity: 1, price: 0 }],
        tax: 0,
        discount: 0,
      };
    }
    // Dependencies for useMemo: only recalculate if these change
  }, [isEditing, existingInvoice, defaultInvoiceNumber]);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!isEditing) {
      if (initialData) {
        form.reset({
          ...defaultValues, // Start with base defaults (includes correct invoice_number)
          client_id: form.getValues("client_id"), // Keep current client_id
          issue_date: new Date(), // Always reset issue date to today for new invoices
          due_date: initialData.dueDate
            ? new Date(initialData.dueDate + "T00:00:00") // Parse AI date string
            : defaultValues.due_date, // Fallback to default due date
          notes: initialData.notes || defaultValues.notes || "",
          items: initialData.lineItems.map((item) => ({
            description: item.description,
            quantity: item.qty,
            price: item.unitPrice,
          })),
          tax: defaultValues.tax || 0,
          discount: defaultValues.discount || 0,
        });
      } else {
        // Reset form to base default values, but keep the selected client_id and clear notes
        form.reset({
          ...defaultValues,
          client_id: form.getValues("client_id"), // Preserve selected client
          notes: "", // Explicitly clear notes when AI suggestion is removed
        });
      }
    }
  }, [initialData, isEditing, defaultInvoiceNumber, defaultValues, form]);

  useFieldArray({ control: form.control, name: "items" });

  const watchedItems = form.watch("items") || [];
  const watchedTax = form.watch("tax") || 0;
  const watchedDiscount = form.watch("discount") || 0;

  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.price || 0);
  }, 0);

  const taxAmount = (subtotal * watchedTax) / 100;
  const discountAmount = (subtotal * watchedDiscount) / 100;
  const total = subtotal + taxAmount - discountAmount;

  // Wrapper function to handle form submission via server action
  async function handleFormSubmit(
    data: InvoiceFormValues,
    status: "draft" | "sent"
  ) {
    startTransition(async () => {
      try {
        // Prepare data for the action, ensuring defaults if optional fields are undefined
        const actionData = {
          ...data,
          tax: data.tax ?? 0,
          discount: data.discount ?? 0,
          wasAIassisted,
        };

        let result;
        if (isEditing && existingInvoice) {
          // Call update action if editing
          result = await updateInvoiceAction(
            existingInvoice.id,
            actionData,
            status
          );
        } else {
          // Call create action if new
          result = await createInvoiceAction(actionData, status);
        }

        if (result.success && result.invoiceId) {
          toast.success(
            `Invoice ${
              isEditing
                ? "updated"
                : status === "sent"
                  ? "sent"
                  : "saved as draft"
            } successfully`
          );
          if (onInvoiceSubmitSuccess) {
            onInvoiceSubmitSuccess(result.invoiceId, wasAIassisted);
          }

          // Check for warning from server action (e.g., email function failed)
          if (result.warning) {
            toast.warning(result.warning);
          }
        } else {
          console.error("Server Action Error:", result.error);
          toast.error(
            result.error || "Failed to save invoice. Please try again."
          );
        }
      } catch (error) {
        console.error("Error submitting invoice:", error);
        toast.error(
          "An unexpected error occurred while submitting the invoice."
        );
      }
    });
  }

  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (onClientChange) {
                        onClientChange(value || null);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client: Client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isPending}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                            disabled={isPending}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={isPending}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    {isLoadingAI ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                              disabled={isPending}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={isPending}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    {isLoadingAI ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <Textarea rows={3} {...field} disabled={isPending} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingAI ? (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <Skeleton className="h-10 col-span-6" />
                  <Skeleton className="h-10 col-span-2" />
                  <Skeleton className="h-10 col-span-3" />
                  <Skeleton className="h-10 col-span-1" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2 mb-2 font-medium text-sm">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-3">Price</div>
                  <div className="col-span-1"></div>
                </div>

                {watchedItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-6">
                      <Input
                        placeholder="Description"
                        {...form.register(`items.${index}.description`)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="any"
                        placeholder="Quantity"
                        {...form.register(`items.${index}.quantity`)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        {...form.register(`items.${index}.price`)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (watchedItems.length > 1) {
                            form.setValue(
                              "items",
                              watchedItems.filter((_, i) => i !== index)
                            );
                          }
                        }}
                        disabled={watchedItems.length <= 1 || isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    form.setValue("items", [
                      ...watchedItems,
                      { description: "", quantity: 1, price: 0 },
                    ]);
                  }}
                  disabled={isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </>
            )}

            <div className="mt-6 space-y-2">
              <div className="flex justify-end space-x-4">
                <div className="w-1/4">
                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-1/4">
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-between border-t pt-4">
                <span className="font-medium">Subtotal:</span>
                <span>
                  <AnimatedNumber
                    value={subtotal}
                    isCurrency={true}
                    duration={0.5}
                  />
                </span>
              </div>
              {watchedTax > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({watchedTax}%):</span>
                  <span>
                    <AnimatedNumber
                      value={taxAmount}
                      isCurrency={true}
                      duration={0.5}
                    />
                  </span>
                </div>
              )}
              {watchedDiscount > 0 && (
                <div className="flex justify-between">
                  <span>Discount ({watchedDiscount}%):</span>
                  <span>
                    -
                    <AnimatedNumber
                      value={discountAmount}
                      isCurrency={true}
                      duration={0.5}
                    />
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-4 font-bold text-lg">
                <span>Total:</span>
                <span>
                  <AnimatedNumber
                    value={total}
                    isCurrency={true}
                    duration={0.5}
                  />
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/invoices")}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit((data) =>
                handleFormSubmit(data, "draft")
              )}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit((data) =>
                handleFormSubmit(data, "sent")
              )}
              disabled={isPending || !form.formState.isValid}
            >
              {isPending ? "Sending..." : "Save and Send"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
