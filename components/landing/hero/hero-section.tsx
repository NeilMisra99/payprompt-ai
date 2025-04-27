"use client"; // Assuming AnimatedTextCycle might need client context

import { motion } from "motion/react"; // Import motion
import { RetroHeroSection } from "@/components/ui/retro-hero-section";
import AnimatedTextCycle from "@/components/ui/animated-text-cycle";

export function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <RetroHeroSection
        title="Automated Invoicing & AI Reminders"
        subtitle={{
          regular: "Get paid faster with ",
          gradient: "PayPrompt AI",
        }}
        description={
          <>
            Streamline your{" "}
            <AnimatedTextCycle
              words={["invoicing", "payments", "reminders", "workflow"]}
              interval={2500}
              className={"font-medium text-foreground inline-block"}
            />{" "}
            with intelligent, AI-powered payment reminders designed to get you
            paid faster.
          </>
        }
        ctaText="Get Started"
        ctaHref="/register"
        // Keeping the bottom image as per the RetroHero default for now
        // Or remove bottomImage prop if not desired: bottomImage={undefined}
      />
    </motion.div>
  );
}
