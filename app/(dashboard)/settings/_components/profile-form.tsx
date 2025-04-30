"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/actions/profileActions";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";

// Define InvoiceSettings structure
export interface InvoiceSettings {
  default_payment_terms?: string;
  default_tax_rate?: number;
  auto_send_reminders?: boolean;
  reminder_days_before?: number;
  reminder_days_after?: number;
}

export interface Profile {
  id: string;
  full_name?: string | null; // Make optional to match potential DB state
  username?: string | null;
  company_name?: string | null;
  company_email?: string | null; // Added company email
  company_address_street?: string | null;
  company_address_line2?: string | null;
  company_address_city?: string | null;
  company_address_state?: string | null;
  company_address_postal_code?: string | null;
  company_address_country?: string | null;
  avatar_url?: string | null;
  company_logo_url?: string | null;
  invoice_settings?: InvoiceSettings; // Add optional invoice_settings
  timezone?: string | null; // <-- Add timezone field
}

// Updated schema slightly: explicitly allow null for optional fields
// Ensure this matches the database schema and updateProfile action expectations
const profileFormSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .or(z.literal(null))
    .or(z.literal("")),
  username: z.string().nullish(),
  company_name: z.string().nullish(),
  // Include company_email if it's meant to be editable here
  company_email: z
    .string()
    .email("Invalid email format")
    .nullish()
    .or(z.literal("")),
  company_address_street: z.string().nullish(),
  company_address_line2: z.string().nullish(),
  company_address_city: z.string().nullish(),
  company_address_state: z.string().nullish(),
  company_address_postal_code: z.string().nullish(),
  company_address_country: z.string().nullish(),
  timezone: z.string().nullish(), // <-- Add timezone schema
  // company_logo_url removed - handled by dedicated component
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const defaultValues: Partial<ProfileFormValues> = {
    full_name: profile?.full_name,
    username: profile?.username,
    company_name: profile?.company_name,
    company_email: profile?.company_email,
    company_address_street: profile?.company_address_street,
    company_address_line2: profile?.company_address_line2,
    company_address_city: profile?.company_address_city,
    company_address_state: profile?.company_address_state,
    company_address_postal_code: profile?.company_address_postal_code,
    company_address_country: profile?.company_address_country,
    timezone: profile?.timezone ?? "Etc/UTC",
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange", // Validate on change for better UX
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    toast.info("Updating profile...");

    try {
      // Create FormData from the validated form data
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        // Append timezone explicitly
        if (key === "timezone") {
          formData.append(key, value || "UTC"); // Ensure UTC if null/empty
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        } else {
          formData.append(key, "");
        }
      });

      // Call the server action
      const result = await updateProfile(formData);

      if (result.success) {
        toast.success("Profile updated successfully!");
        router.refresh(); // Re-fetch server data
      } else {
        throw new Error(result.error || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal & Company Information</CardTitle>
        <CardDescription>
          Update your personal and company details.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your full name"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your username"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <FormLabel>Default Timezone</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            align="center"
                            className="max-w-[400px]"
                          >
                            <p className="text-sm">
                              Sets the default timezone for calculating invoice
                              due dates. Reminders are also sent based on this
                              timezone.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <TimezoneCombobox
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-6">
              <h3 className="text-lg font-medium">Company Information</h3>
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your company name"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@yourcompany.com"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label>Company Address</Label>
              </div>
              <FormField
                control={form.control}
                name="company_address_street"
                render={({ field }) => (
                  <FormItem className="mt-0">
                    <FormLabel className="sr-only">Street Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Street Address"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Address Line 2</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Address Line 2 (Optional)"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company_address_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_address_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">
                        State / Province
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="State / Province"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company_address_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Postal Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Postal Code"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_address_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Country</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Country"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
