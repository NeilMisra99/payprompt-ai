import Sidebar from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex h-screen overflow-hidden py-4">
      <Sidebar user={user} />
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
