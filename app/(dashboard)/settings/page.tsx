import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tab";
import { ProfileForm, type Profile } from "./_components/profile-form";
import { InvoiceSettingsForm } from "./_components/invoice-settings-form";
import { Button } from "@/components/ui/button";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { cookies } from "next/headers";

// Define the profile type based on your API response or database schema

// Function to fetch profile from the API endpoint
async function fetchProfile(token: string): Promise<Profile | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/hono/profile`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: token, // Pass cookies for authentication
      },
      cache: "force-cache", // Cache the data
      next: { tags: ["profile"] }, // Tag for revalidation
    });

    if (response.status === 401) {
      // User is likely not logged in, redirect handled below
      return null;
    }

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }

    const data: Profile = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    // Decide how to handle errors, maybe return null or throw
    return null; // Returning null to allow redirect below
  }
}

export default async function SettingsPage() {
  const token = await cookies(); // Get cookies string
  const userProfile = await fetchProfile(token.toString());

  // Redirect if profile fetch fails or user is unauthorized
  if (!userProfile) {
    redirect("/login");
  }

  // Use email from cookies/session if needed and profile has no name/avatar?
  // This depends on whether the Hono endpoint reliably returns fallbacks.
  // Assuming the Hono endpoint handles fallbacks correctly based on user data.
  const displayName = userProfile.full_name ?? "User"; // Use a default if needed
  const displayAvatar = userProfile.avatar_url ?? undefined;

  return (
    <div className="flex flex-col space-y-6 p-4 md:p-8">
      {/* Animated Back Button */}
      <AnimatedContainer variant="fadeIn" delay={0.1}>
        <Button variant="outline" asChild className="w-fit mb-4">
          <Link href="/dashboard" prefetch={true}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </AnimatedContainer>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Animated Left Column: Profile Info */}
        <AnimatedContainer variant="slideIn" delay={0.2}>
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-64 w-64">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback>
                {displayName?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-semibold">{displayName}</h2>
              {/* If email is needed and not in profile, might need to fetch user separately or pass via props */}
              {/* <p className="text-sm text-muted-foreground">{user.email}</p> */}
            </div>
            {/* Add other left-side elements like Message Usage, Keyboard Shortcuts if needed */}
          </div>
        </AnimatedContainer>

        {/* Animated Right Column: Settings Tabs */}
        <AnimatedContainer
          variant="slideUp"
          delay={0.3}
          className="md:col-span-2"
        >
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
              {/* Add more tabs as needed, e.g., Subscription, Danger Zone */}
            </TabsList>
            <TabsContent value="profile" className="mt-6">
              {/* Pass the fetched profile data */}
              <ProfileForm profile={userProfile} />
            </TabsContent>
            <TabsContent value="invoice" className="mt-6">
              {/* Pass the fetched profile data */}
              <InvoiceSettingsForm profile={userProfile} />
            </TabsContent>
            {/* Add more TabsContent for other settings sections */}
          </Tabs>
          {/* Danger Zone Section - Can be placed outside or inside tabs depending on design */}
          {/* <div className="mt-8 rounded-lg border border-destructive p-4">
             <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
             <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
             <Button variant="destructive" className="mt-4">Delete Account</Button>
           </div> */}
        </AnimatedContainer>
      </div>
    </div>
  );
}
