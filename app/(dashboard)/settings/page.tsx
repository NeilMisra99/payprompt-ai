import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
// Removed Avatar imports, now handled in AvatarUploadForm
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tab";
import { ProfileForm, type Profile } from "./_components/profile-form";
import { InvoiceSettingsForm } from "./_components/invoice-settings-form";
// import { AvatarUploadForm } from "./_components/avatar-upload-form"; // Old form - Remove
import { AnimatedUploadSwitcher } from "../../../components/ui/animated-upload-switcher"; // New import
// import { CompanyLogoUploadForm } from "./_components/company-logo-upload-form"; // Old form - Remove
// import { CompanyLogoUploadTrigger } from "./_components/company-logo-upload-trigger"; // New trigger
import { Button } from "@/components/ui/button";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server"; // Use server client for user ID

// Update Profile type to include id (assuming fetchProfile returns it)
// interface Profile {
//   id: string;
//   // ... other fields
// }

// Assuming fetchProfile returns at least id, avatar_url, full_name
// And we fetch the full User object separately for the AvatarUploadForm
async function fetchProfileData(token: string): Promise<Profile | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/profile`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token, // Pass cookies for authentication
      },
      cache: "force-cache", // Remove this - rely on revalidatePath
      next: { tags: ["profile"] }, // Revalidation might be better handled by router cache invalidation after update
    });

    if (response.status === 401) return null;
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }
    const data = await response.json();
    // Ensure ID is present - adjust based on actual API response structure
    if (!data?.id) {
      console.error("Profile data fetched successfully but missing user ID.");
      return null;
    }
    return data as Profile;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

export default async function SettingsPage() {
  const token = await cookies();
  const supabase = await createClient(); // Use server client

  // Fetch user session AND profile data
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userProfile = user ? await fetchProfileData(token.toString()) : null;

  // Redirect if no user session or profile fetch fails
  if (!user || !userProfile) {
    redirect("/login");
  }

  // Now we have both user object (for ID in AvatarUploadForm) and profile details
  const userNameForFallback = userProfile.full_name ?? user.email; // Use email as secondary fallback

  return (
    <div className="-mt-16">
      <div className="flex flex-col space-y-6 p-4 md:p-8">
        {/* Back Button */}
        <AnimatedContainer variant="fadeIn" delay={0.1}>
          <Button variant="outline" asChild className="w-fit mb-4">
            <Link href="/dashboard" prefetch={true}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </AnimatedContainer>

        {/* Main Content Area: Flex row on medium+ screens */}
        <div className="flex flex-col md:flex-row md:space-x-8 lg:space-x-12 space-y-8 md:space-y-0">
          {/* Left Column: Animated Image Upload Switcher */}
          <div className="flex flex-col items-center md:w-auto md:pt-4 mt-4">
            {/* Removed individual triggers and replaced with the switcher */}
            <AnimatedUploadSwitcher
              userId={user.id}
              currentAvatarUrl={userProfile.avatar_url ?? null}
              currentLogoUrl={userProfile.company_logo_url ?? null}
              userName={userNameForFallback || "User"}
            />
            {/* Conditionally render Alert outside the switcher */}
            {!userProfile.company_logo_url && (
              <Alert
                variant="destructive"
                className="w-full max-w-xs text-center mt-4"
              >
                <Info className="h-4 w-4" />
                <AlertTitle className="text-sm">
                  Company Logo Recommended
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Upload logo for more professional invoices.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column: Settings Tabs */}
          <div className="flex-1">
            <AnimatedContainer variant="slideUp" delay={0.2}>
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
                </TabsList>

                {/* Profile Tab Content */}
                <TabsContent value="profile" className="mt-6 space-y-6">
                  {/* Remove the h3 and Separator from here, they are part of the form now conceptually */}
                  {/* <h3 className="text-lg font-medium">Profile Settings</h3> */}
                  {/* The image upload triggers are now in the left column */}
                  {/* <Separator /> */}
                  <ProfileForm profile={userProfile} />
                </TabsContent>

                {/* Invoice Tab Content */}
                <TabsContent value="invoice" className="mt-6 space-y-6">
                  {/* <h3 className="text-lg font-medium">Invoice Settings</h3> */}
                  <InvoiceSettingsForm profile={userProfile} />
                </TabsContent>
              </Tabs>
            </AnimatedContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
