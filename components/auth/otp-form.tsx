"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { createProfile } from "@/app/actions/profileActions";

// Key used in RegisterForm to store data
const PENDING_PROFILE_DATA_KEY = "pendingProfileData";

const OTPSchema = z.object({
  otp: z
    .string()
    .min(6, { message: "Your one-time password must be 6 characters." }),
});

type OTPSchemaType = z.infer<typeof OTPSchema>;

// ProfileData definition remains the same, used internally now
export interface ProfileData {
  userId: string;
  fullName: string;
  companyName: string;
  companyEmail: string;
  companyAddressStreet: string;
  companyAddressLine2?: string;
  companyAddressCity: string;
  companyAddressState: string;
  companyAddressPostalCode: string;
  companyAddressCountry: string;
  logoUrl?: string | null;
}

interface OtpFormProps {
  email: string;
  // profileData prop removed
}

export function OtpForm({ email }: OtpFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [resendIsLoading, setResendIsLoading] = useState(false);
  const [retrievedProfileData, setRetrievedProfileData] =
    useState<ProfileData | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

  // Effect to load profile data from localStorage on mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(PENDING_PROFILE_DATA_KEY);
      if (storedData) {
        const parsedData: ProfileData = JSON.parse(storedData);
        // Basic validation to check if essential parts exist
        if (parsedData && parsedData.userId && parsedData.fullName) {
          setRetrievedProfileData(parsedData);
        } else {
          throw new Error("Stored profile data is incomplete or invalid.");
        }
      } else {
        throw new Error(
          "Pending registration data not found. Please restart the registration process."
        );
      }
    } catch (error: unknown) {
      console.error("Failed to load profile data from storage:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load necessary data.";
      setInitializationError(message);
      toast.error("Initialization Error", { description: message });
    }
  }, []); // Run only once on mount

  const form = useForm<OTPSchemaType>({
    resolver: zodResolver(OTPSchema),
    defaultValues: {
      otp: "",
    },
  });

  async function onSubmit(data: OTPSchemaType) {
    if (initializationError || !retrievedProfileData) {
      toast.error("Cannot proceed due to initialization error.", {
        description: initializationError || "Profile data is missing.",
      });
      return;
    }

    setIsLoading(true);
    toast.dismiss();
    toast.info("Verifying code...");

    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
        email,
        token: data.otp,
        type: "signup", // Ensure type matches what Supabase expects
      });

    if (verifyError || !verifyData.user) {
      setIsLoading(false);
      toast.error("Verification failed", {
        description:
          verifyError?.message ||
          "Invalid or expired OTP, or user session not found.",
      });
      form.setError("otp", {
        type: "manual",
        message: verifyError?.message ?? "Verification Error",
      });
      return;
    }

    // User verified, now create the profile using the retrieved data
    toast.success("Email verified successfully! Creating profile...");

    // Ensure the userId from verification matches the stored data (optional but good practice)
    if (verifyData.user.id !== retrievedProfileData.userId) {
      console.error("User ID mismatch after OTP verification:", {
        verified: verifyData.user.id,
        stored: retrievedProfileData.userId,
      });
      toast.error("Verification Mismatch", {
        description:
          "User identity could not be confirmed. Please contact support.",
      });
      setIsLoading(false);
      return;
    }

    const { success: profileSuccess, error: profileError } =
      await createProfile(retrievedProfileData); // Call the new action

    setIsLoading(false);

    if (!profileSuccess) {
      toast.error("Profile creation failed", {
        description:
          profileError ||
          "Your email is verified, but we failed to save your profile information. Please contact support or try updating in Settings later.",
      });
      // Clean up localStorage even if profile creation failed, as OTP is used
      localStorage.removeItem(PENDING_PROFILE_DATA_KEY);
      // Decide whether to redirect or keep user here
      // Redirecting might be better UX, user can fix profile later
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.success("Account created and verified!");
      // Clean up localStorage on full success
      localStorage.removeItem(PENDING_PROFILE_DATA_KEY);
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleResendOtp() {
    if (initializationError) {
      toast.error("Cannot resend OTP due to initialization error.");
      return;
    }
    setResendIsLoading(true);
    toast.dismiss();
    // Resend OTP using the email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });
    // Note: Supabase client resend might be preferred if available/simpler
    // const { error } = await supabase.auth.signInWithOtp({ email });
    setResendIsLoading(false);

    if (error) {
      toast.error("Failed to resend OTP", {
        description: error.message || "Please try again later.",
      });
    } else {
      toast.info("New OTP sent", {
        description: "Check your email for the new verification code.",
      });
    }
  }

  // Render error state if initialization failed
  if (initializationError) {
    return (
      <p className="text-destructive text-center">
        Error: {initializationError}
      </p>
    );
  }

  // Optional: Render loading state while fetching from localStorage
  if (!retrievedProfileData) {
    return (
      <p className="text-muted-foreground text-center">
        Loading verification details...
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <FormLabel>One-Time Password</FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field} disabled={isLoading}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormDescription className="text-xs font-extralight">
                Please enter the 6-digit code sent to {email}.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Verifying..." : "Verify Account"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleResendOtp}
          disabled={resendIsLoading || isLoading}
          className="w-full"
        >
          {resendIsLoading ? "Sending..." : "Resend Code"}
        </Button>
      </form>
    </Form>
  );
}
