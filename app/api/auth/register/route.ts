import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { ProfileData } from "@/components/auth/otp-form";

export const runtime = "edge";

// Updated response interface: logoUrl is no longer handled here.
interface RegistrationApiResponse extends Omit<ProfileData, "logoUrl"> {
  userId: string;
  // logoUrl removed
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  let userId: string | undefined;

  try {
    const formData = await request.formData();

    // Removed logoFile extraction
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const companyName = formData.get("companyName") as string;
    const companyEmail = formData.get("companyEmail") as string;
    const companyAddressStreet = formData.get("companyAddressStreet") as string;
    const companyAddressCity = formData.get("companyAddressCity") as string;
    const companyAddressState = formData.get("companyAddressState") as string;
    const companyAddressPostalCode = formData.get(
      "companyAddressPostalCode"
    ) as string;
    const companyAddressCountry = formData.get(
      "companyAddressCountry"
    ) as string;
    const companyAddressLine2 = formData.get("companyAddressLine2") as
      | string
      | null;

    // Validation remains the same, excluding logo checks
    if (
      !email ||
      !password ||
      !fullName ||
      !companyName ||
      !companyEmail ||
      !companyAddressStreet ||
      !companyAddressCity ||
      !companyAddressState ||
      !companyAddressPostalCode ||
      !companyAddressCountry
    ) {
      return NextResponse.json(
        { error: "Missing required registration fields." },
        { status: 400 }
      );
    }
    if (!/\S+@\S+\.\S+/.test(email) || !/\S+@\S+\.\S+/.test(companyEmail)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 1. Sign up the user (remains the same)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
      }
    );

    if (signUpError) {
      if (signUpError.message.includes("User already registered")) {
        return NextResponse.json(
          { error: "This email is already registered. Try logging in." },
          { status: 409 }
        );
      }
      console.error("Supabase Sign Up Error:", signUpError);
      throw new Error(`Authentication error: ${signUpError.message}`);
    }

    if (!signUpData.user) {
      throw new Error("User registration failed unexpectedly.");
    }
    userId = signUpData.user.id;

    // 2. Logo upload logic removed

    // 3. Prepare profile data for the client (without logoUrl)
    const responseData: RegistrationApiResponse = {
      userId, // userId is guaranteed to be a string here
      fullName,
      companyName,
      companyEmail,
      companyAddressStreet,
      companyAddressLine2: companyAddressLine2 || undefined,
      companyAddressCity,
      companyAddressState,
      companyAddressPostalCode,
      companyAddressCountry,
      // logoUrl removed
    };

    // 4. Return success response
    return NextResponse.json(responseData, { status: 200 });
  } catch (error: unknown) {
    console.error("Registration API Error:", error);
    let errorMessage = "An unexpected error occurred during registration.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
