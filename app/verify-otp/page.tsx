"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OtpForm } from "@/components/auth/otp-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  if (!email) {
    // Handle case where email is missing - maybe redirect to register or show an error
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            Missing email address. Please return to the registration page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your Email</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to <strong>{email}</strong> to complete
          your registration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* OtpForm now only needs the email, it will fetch profile data */}
        <OtpForm email={email} />
      </CardContent>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    // Suspense is required when using useSearchParams in a page component
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md p-4">
          <VerifyOtpContent />
        </div>
      </div>
    </Suspense>
  );
}
