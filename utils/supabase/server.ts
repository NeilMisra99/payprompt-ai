import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // cookieOptions: {
      //   domain:
      //     process.env.NODE_ENV === "development"
      //       ? "localhost"
      //       : ".summations.com", // Allow summations.com and all subdomains
      //   secure: process.env.NODE_ENV === "development" ? false : true,
      //   sameSite: "lax",
      //   path: "/",
      //   maxAge: 60 * 60 * 24 * 30,
      // },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
