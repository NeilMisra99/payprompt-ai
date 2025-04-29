import Sidebar from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { MobilePrompt } from "@/components/dashboard/mobile-prompt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile data based on user ID - ADD company_logo_url
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, company_logo_url") // Select needed fields including logo url
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    // Log error if it's not just "profile not found"
    console.error("Error fetching profile for sidebar:", profileError);
    // Handle potentially critical error? For now, proceed without profile data.
  }

  // Construct the props for the Sidebar, merging user and profile data
  const sidebarUserProps = {
    id: user.id,
    email: user.email,
    full_name: profileData?.full_name ?? null, // Use fetched or null
    avatar_url: profileData?.avatar_url ?? null, // Use fetched or null
    company_logo_url: profileData?.company_logo_url ?? null, // Add company logo url
  };

  return (
    <div className="flex h-screen overflow-hidden py-4 bg-sidebar">
      <MobilePrompt />
      <Sidebar user={sidebarUserProps} />
      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden px-4 md:px-6 rounded-l-xl bg-background shadow-lg shadow-black/20 border border-border">
        <main className="flex-1 min-h-0 overflow-y-auto">
          <PageTransition>
            <div className="px-4 pt-16 md:px-6">{children}</div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
