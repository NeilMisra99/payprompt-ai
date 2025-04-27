// import Link from "next/link"; // Removed unused import
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { GeistSans } from "geist/font/sans"; // Import GeistSans

// Import individual components
import { HeroSection } from "@/components/landing/hero/hero-section";
import { FeaturesSection } from "@/components/landing/features/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials/testimonials-section";
import { CtaSection } from "@/components/landing/cta/cta-section";
import { FooterSection } from "@/components/landing/footer/footer-section";
import { FloatingNav } from "@/components/ui/floating-nav"; // Import FloatingNav

// Define metadata for SEO
export const metadata: Metadata = {
  title: "PayPrompt AI — Get Paid Faster with AI-Powered Payment Reminders",
  description:
    "Streamline your invoicing workflow and improve cash flow with intelligent, AI-powered payment reminders that get results. Create professional invoices, send automated reminders, and track payments effortlessly.",
  keywords: [
    "invoice software",
    "payment reminders",
    "AI invoicing",
    "get paid faster",
    "cash flow management",
  ],
  openGraph: {
    title: "PayPrompt AI — Get Paid Faster with AI-Powered Payment Reminders",
    description:
      "Streamline your invoicing workflow and improve cash flow with intelligent, AI-powered payment reminders that get results.",
    url: "https://payprompt.ai",
    siteName: "PayPrompt AI",
    images: [
      {
        url: "https://payprompt.ai/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PayPrompt AI Homepage",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user is logged in, redirect them to the dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Define Nav Items for FloatingNav
  const navItems = [
    { name: "Features", link: "#features" },
    { name: "How it Works", link: "#how-it-works" },
    // Add Pricing link if section exists
    // { name: "Pricing", link: "#pricing" },
    { name: "Testimonials", link: "#testimonials" },
  ];

  // Otherwise, render the landing page with all sections
  return (
    <div className={`relative ${GeistSans.className}`}>
      <FloatingNav navItems={navItems} />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />

        {/* Create a wrapper for Testimonials and CTA with shared background */}
        <div className="relative overflow-hidden dark:bg-grid-white/[0.05]">
          {/* Background decorative elements moved from TestimonialsSection */}
          <div
            className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-[80px]"
            aria-hidden="true"
          />
          <div
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
            aria-hidden="true"
          />
          {/* Sections inside the wrapper */}
          <TestimonialsSection />
          <CtaSection />
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
