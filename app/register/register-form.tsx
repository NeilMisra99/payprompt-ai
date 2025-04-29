"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import Link from "next/link";
// Removed direct client import: import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Logo related imports removed
// import Image from "next/image";
// import { cn } from "@/lib/utils";
// import { uploadCompanyLogo } from "@/lib/supabase/client/storage";
import type { ProfileData } from "@/components/auth/otp-form"; // Keep ProfileData type
import { StepIndicator } from "@/components/auth/step-indicator";
import { toast } from "sonner";

const PENDING_PROFILE_DATA_KEY = "pendingProfileData";

export function RegisterForm() {
  const router = useRouter(); // Initialize router
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  // Logo state removed
  // const [logoFile, setLogoFile] = useState<File | null>(null);
  // const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [companyAddressStreet, setCompanyAddressStreet] = useState("");
  const [companyAddressLine2, setCompanyAddressLine2] = useState("");
  const [companyAddressCity, setCompanyAddressCity] = useState("");
  const [companyAddressState, setCompanyAddressState] = useState("");
  const [companyAddressPostalCode, setCompanyAddressPostalCode] = useState("");
  const [companyAddressCountry, setCompanyAddressCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Removed states related to showing OTP step in this form

  // Renamed handleNext to handleStepSubmit for clarity
  const handleStepSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Prevent default form submission if triggered by button
    setError(null);

    if (currentStep === 1) {
      // Validation for Step 1
      if (!email || !password || !fullName) {
        setError("Full Name, Email and Password are required.");
        return;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      setCurrentStep(2); // Move to step 2
    } else if (currentStep === 2) {
      // Validation for Step 2
      if (!companyName || !companyEmail) {
        setError("Please fill in company name and email.");
        return;
      }
      if (
        !companyAddressStreet ||
        !companyAddressCity ||
        !companyAddressState ||
        !companyAddressPostalCode ||
        !companyAddressCountry
      ) {
        setError(
          "Please fill in all required address fields (Street, City, State, Postal Code, Country)."
        );
        return;
      }
      if (!/\S+@\S+\.\S+/.test(companyEmail)) {
        setError("Please enter a valid company email address.");
        return;
      }
      // Step 2 is now the final data entry step, proceed to final submission
      await handleFinalSubmit();
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Combined final submission logic (no logo upload)
  const handleFinalSubmit = async () => {
    // Logo file check removed
    setIsLoading(true);
    setError(null);
    toast.dismiss();
    toast.info("Creating account...");

    // Renamed apiProfileData, removed logoUrl
    let profileDataFromApi: Omit<ProfileData, "logoUrl"> & { userId: string };

    try {
      // Step 1: Call API (no logo)
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("fullName", fullName);
      formData.append("companyName", companyName);
      formData.append("companyEmail", companyEmail);
      formData.append("companyAddressStreet", companyAddressStreet);
      formData.append("companyAddressLine2", companyAddressLine2);
      formData.append("companyAddressCity", companyAddressCity);
      formData.append("companyAddressState", companyAddressState);
      formData.append("companyAddressPostalCode", companyAddressPostalCode);
      formData.append("companyAddressCountry", companyAddressCountry);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.error || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }
      profileDataFromApi = result; // Contains userId etc.
      toast.success("Account created! Preparing verification...", {
        id: "account-created",
      });

      // Step 2: Logo upload removed

      // Step 3: Prepare data (without logoUrl) and store in localStorage before redirect
      const completeProfileData: ProfileData = {
        ...profileDataFromApi,
        logoUrl: null, // Explicitly set logoUrl to null
      };

      try {
        localStorage.setItem(
          PENDING_PROFILE_DATA_KEY,
          JSON.stringify(completeProfileData)
        );
      } catch (storageError) {
        console.error(
          "Failed to save pending profile data to localStorage:",
          storageError
        );
        throw new Error(
          "Failed to prepare verification step. Please try again."
        );
      }

      // Step 4: Redirect to OTP verification page
      toast.info("Redirecting to email verification...");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      console.error("Registration Process Error:", err);
      let errorMessage = "An unexpected error occurred during registration.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error("Registration Failed", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Logo specific handler removed
  // const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };

  return (
    <>
      <StepIndicator currentStep={currentStep} totalSteps={2} />{" "}
      {/* Updated total steps */}
      <Card>
        <CardHeader>
          <CardTitle>
            Step {currentStep}:{" "}
            {
              currentStep === 1 ? "Account Details" : "Company Information" // Step 2 is now Company Info
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {/* Form submission now happens on Step 2 */}
          <form onSubmit={handleStepSubmit} className="space-y-4">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    autoComplete="name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Company Info fields remain */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Inc."
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="contact@yourcompany.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddressStreet">Street Address</Label>
                  <Input
                    id="companyAddressStreet"
                    value={companyAddressStreet}
                    onChange={(e) => setCompanyAddressStreet(e.target.value)}
                    placeholder="123 Main St"
                    required
                    autoComplete="street-address"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddressLine2">
                    Address Line 2 (Optional)
                  </Label>
                  <Input
                    id="companyAddressLine2"
                    value={companyAddressLine2}
                    onChange={(e) => setCompanyAddressLine2(e.target.value)}
                    placeholder="Apt, Suite, etc."
                    autoComplete="address-line2"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="companyAddressCity">City</Label>
                    <Input
                      id="companyAddressCity"
                      value={companyAddressCity}
                      onChange={(e) => setCompanyAddressCity(e.target.value)}
                      placeholder="Anytown"
                      required
                      autoComplete="address-level2"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddressState">
                      State / Province
                    </Label>
                    <Input
                      id="companyAddressState"
                      value={companyAddressState}
                      onChange={(e) => setCompanyAddressState(e.target.value)}
                      placeholder="CA"
                      required
                      autoComplete="address-level1"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddressPostalCode">
                      Postal Code
                    </Label>
                    <Input
                      id="companyAddressPostalCode"
                      value={companyAddressPostalCode}
                      onChange={(e) =>
                        setCompanyAddressPostalCode(e.target.value)
                      }
                      placeholder="90210"
                      required
                      autoComplete="postal-code"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddressCountry">Country</Label>
                  <Input
                    id="companyAddressCountry"
                    value={companyAddressCountry}
                    onChange={(e) => setCompanyAddressCountry(e.target.value)}
                    placeholder="United States"
                    required
                    autoComplete="country"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Step 3 JSX (Logo Upload) removed */}

            {/* Form submission and navigation buttons */}
            <CardFooter className="flex justify-between px-0 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
              >
                Back
              </Button>
              {currentStep < 2 ? (
                <Button
                  type="button"
                  onClick={() => handleStepSubmit()}
                  disabled={isLoading}
                >
                  Next
                </Button>
              ) : (
                // Changed to submit button for Step 2
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Creating Account..."
                    : "Create Account & Verify Email"}
                </Button>
              )}
            </CardFooter>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-start text-sm">
          <p>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
