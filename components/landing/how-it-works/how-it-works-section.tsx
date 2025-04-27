"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Bell,
  CreditCard,
  Brain,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { GridPattern } from "@/components/ui/grid-pattern";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefit: string;
  benefitIcon: React.ReactNode;
}

export function HowItWorksSection() {
  const steps: Step[] = [
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Create professional invoices in seconds",
      description:
        "Generate and send customized invoices directly to your clients via email with just a few clicks.",
      benefit: "Save 30+ minutes per invoice",
      benefitIcon: <Clock className="h-5 w-5 text-primary" />,
    },
    {
      icon: <Brain className="h-8 w-8 text-primary" />,
      title: "AI optimizes payment collection strategy",
      description:
        "Our AI analyzes client payment patterns and automatically sends personalized reminders at the optimal times to maximize response rates.",
      benefit: "Reduce follow-ups by 75%",
      benefitIcon: <Bell className="h-5 w-5 text-primary" />,
    },
    {
      icon: <CreditCard className="h-8 w-8 text-primary" />,
      title: "Get paid faster with smart payment options",
      description:
        "Clients can pay instantly via multiple payment methods, with AI-powered insights showing you which options lead to faster payments.",
      benefit: "Improve cash flow by 40%",
      benefitIcon: <TrendingUp className="h-5 w-5 text-primary" />,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative w-full py-20 md:py-32 bg-muted/30 overflow-hidden"
      id="how-it-works"
    >
      <GridPattern
        width={70}
        height={70}
        x={-1}
        y={-1}
        strokeDasharray={"4 2"}
        className="absolute inset-0 h-full w-full stroke-gray-500/10 fill-transparent [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]"
      />
      <div className="container relative z-10 px-6 sm:px-8 md:px-10 lg:px-16">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Badge className="mb-4">AI-powered payment collection</Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            How PayPrompt AI works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our AI-driven system helps you get paid faster with minimal effort,
            saving you time and improving your cash flow.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto mt-16">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/5 via-primary/30 to-primary/5 transform -translate-x-1/2 hidden md:block" />

            {/* Steps */}
            <div className="space-y-24 relative">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  {/* Timeline node */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                    <motion.div
                      className="w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-lg shadow-primary/20"
                      initial={{ scale: 0.8 }}
                      whileInView={{ scale: [0.8, 1.2, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
                    >
                      <span className="text-primary font-bold">
                        {index + 1}
                      </span>
                    </motion.div>
                  </div>

                  {/* Content card container */}
                  <div
                    className={`flex flex-col ${
                      index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    } gap-8 items-center`}
                  >
                    {/* Step number for mobile */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2 border-primary text-primary font-bold shadow-lg shadow-primary/20 md:hidden">
                      {index + 1}
                    </div>

                    {/* Existing Step content card - Add GlowingEffect INSIDE */}
                    <motion.div
                      className={`flex-1 bg-background rounded-xl p-6 border border-border shadow-lg relative ${
                        index % 2 === 0 ? "md:mr-8" : "md:ml-8"
                      }`}
                      whileHover={{
                        y: -5,
                        boxShadow:
                          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Place GlowingEffect inside and position it */}
                      <GlowingEffect
                        className="absolute inset-0"
                        glow={true}
                        disabled={false}
                        proximity={80}
                        inactiveZone={0.5}
                        spread={30}
                        borderWidth={1}
                        movementDuration={1.5}
                      />
                      {/* Ensure card content is relatively positioned or has higher z-index if needed */}
                      <div className="relative z-10 flex items-center gap-4 mb-3">
                        <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                          {step.icon}
                        </div>
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>

                      <p className="text-muted-foreground mb-4">
                        {step.description}
                      </p>

                      <div className="relative z-10 flex items-center gap-2 bg-primary/5 p-3 rounded-lg">
                        {step.benefitIcon}
                        <span className="font-medium text-primary">
                          {step.benefit}
                        </span>
                      </div>

                      {/* Arrow for desktop */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 hidden md:block ${
                          index % 2 === 0
                            ? "right-0 translate-x-full"
                            : "left-0 -translate-x-full rotate-180"
                        }`}
                      >
                        <ChevronRight className="h-6 w-6 text-primary" />
                      </div>
                    </motion.div>

                    {/* Empty div for layout on desktop */}
                    <div className="flex-1 hidden md:block"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Final call to action */}
          <motion.div
            className="mt-24 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <p className="text-xl font-medium mb-2">
              Start saving time and improving cash flow today
            </p>
            <p className="text-muted-foreground mb-6">
              Our AI handles the tedious follow-ups so you can focus on growing
              your business
            </p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
