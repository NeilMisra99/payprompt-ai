"use client";

import { motion } from "motion/react";
import {
  LucideIcon,
  FileText,
  Bell,
  PieChart,
  Shield,
  Send,
  LayoutDashboard,
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { GridPattern } from "@/components/ui/grid-pattern";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  delay: number;
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  delay,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay }}
      className="h-full list-none"
    >
      <div className="relative h-full rounded-[1.25rem] border border-border/60 p-2 md:rounded-[1.5rem] md:p-3">
        <GlowingEffect
          glow={true}
          disabled={false}
          proximity={80}
          inactiveZone={0.5}
          spread={30}
          borderWidth={1}
          movementDuration={1.5}
        />
        <div className="relative flex h-full flex-col justify-start gap-4 overflow-hidden rounded-xl border border-border/30 bg-background p-6 shadow-sm md:p-6">
          <div className="w-fit rounded-lg border border-border/50 bg-muted p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="pt-0.5 text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const features = [
    {
      title: "Professional Invoices",
      description:
        "Create and customize professional invoices with our easy-to-use templates in just minutes.",
      icon: FileText,
      delay: 0.1,
    },
    {
      title: "AI-Powered Reminders",
      description:
        "Let our AI generate personalized payment reminders via email to significantly increase your chances of getting paid on time.",
      icon: Bell,
      delay: 0.2,
    },
    {
      title: "Invoice & Payment Tracking",
      description:
        "Monitor invoice status (Draft, Sent, Paid, Overdue) and track payment history with our intuitive dashboard.",
      icon: PieChart,
      delay: 0.3,
    },
    {
      title: "Automated Sending",
      description:
        "Send finalized invoices directly to your clients via email, right from the application.",
      icon: Send,
      delay: 0.4,
    },
    {
      title: "Dashboard & Insights",
      description:
        "Get a clear overview of outstanding amounts, overdue invoices, and recent payment activity.",
      icon: LayoutDashboard,
      delay: 0.5,
    },
    {
      title: "Secure Platform",
      description:
        "Built on secure infrastructure, ensuring your sensitive financial data is protected and encrypted.",
      icon: Shield,
      delay: 0.6,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="relative w-full py-16 md:py-32 bg-background overflow-hidden flex flex-col items-center"
      id="features"
    >
      <GridPattern
        width={60}
        height={60}
        x={-1}
        y={-1}
        className="absolute inset-0 h-full w-full stroke-muted-foreground/10 fill-muted-foreground/5 [mask-image:linear-gradient(to_top,white,transparent)] z-0"
      />

      <div className="container relative z-10 px-6 sm:px-8 md:px-10 lg:px-16">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            All the tools you need to get paid faster
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            PayPrompt AI combines powerful invoicing features with intelligent
            reminders to help you maintain healthy cash flow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-16">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              delay={feature.delay}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
