"use client";

import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QuoteIcon } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
  initials: string;
}

export function TestimonialsSection() {
  const testimonials: Testimonial[] = [
    {
      quote:
        "PayPrompt AI has completely transformed our invoicing process. We've seen a 40% decrease in late payments since implementing their AI reminders.",
      author: "Sarah Johnson",
      role: "CFO",
      company: "TechStart Inc.",
      initials: "SJ",
    },
    {
      quote:
        "The automated reminders have saved me hours each week. I used to spend my Fridays following up on payments, but now PayPrompt AI handles it all.",
      author: "Michael Rodriguez",
      role: "Freelance Designer",
      company: "MR Designs",
      initials: "MR",
    },
    {
      quote:
        "As a small business owner, cash flow is everything. PayPrompt AI has reduced our average payment time from 45 days to just 12 days.",
      author: "Priya Patel",
      role: "Owner",
      company: "Stellar Services",
      initials: "PP",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      id="testimonials"
      className="relative w-full overflow-hidden py-16 md:py-32 antialiased bg-transparent"
    >
      <div className="container px-6 sm:px-8 md:px-10 lg:px-16 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Trusted by businesses of all sizes
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            See what our customers have to say about how PayPrompt AI has helped
            them improve their cash flow and reduce administrative work.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-colors duration-300">
                <CardContent className="p-6 flex flex-col h-full">
                  <QuoteIcon className="h-8 w-8 text-primary/20 mb-4 flex-shrink-0" />
                  <p className="text-muted-foreground mb-6 italic flex-grow">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center flex-shrink-0">
                    <Avatar className="h-10 w-10 mr-4">
                      {testimonial.avatar && (
                        <AvatarImage
                          src={testimonial.avatar}
                          alt={testimonial.author}
                        />
                      )}
                      <AvatarFallback>{testimonial.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
