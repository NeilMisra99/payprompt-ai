import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  // Redirect to the login page on the same origin
  const redirectUrl = new URL("/login", requestUrl.origin);

  return NextResponse.redirect(redirectUrl, {
    status: 302,
  });
}
