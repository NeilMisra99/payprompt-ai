import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-gray-600">Sign up for PayPrompt AI</p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
