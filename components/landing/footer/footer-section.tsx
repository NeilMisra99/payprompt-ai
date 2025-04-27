"use client";

import Link from "next/link";
import { motion } from "motion/react";
import /* Github, Twitter, Linkedin, Mail, Facebook */ "lucide-react";

const currentYear = new Date().getFullYear();

export function FooterSection() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 1.0, delay: 0.2 }}
      className="bg-muted/20 py-8 md:py-10 border-t"
    >
      <div className="container mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="flex items-center mb-2 md:mb-0"
              prefetch={true}
            >
              <span className="font-bold text-xl">PayPrompt AI</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Streamline your invoicing workflow and improve cash flow with
              intelligent, AI-powered payment reminders that get results.
            </p>
          </motion.div>

          <motion.p
            className="text-sm text-muted-foreground text-center md:text-right"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            © {currentYear} PayPrompt AI. All rights reserved.
          </motion.p>
        </div>
      </div>
    </motion.footer>
  );
}
