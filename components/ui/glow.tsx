import React from "react";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

// This component assumes HSL variables like --primary are defined in your CSS.

const glowVariants = cva("absolute w-full pointer-events-none", {
  // Added pointer-events-none
  variants: {
    variant: {
      top: "top-0",
      above: "-top-[128px]",
      bottom: "bottom-0",
      below: "-bottom-[128px]",
      center: "top-[50%]",
    },
  },
  defaultVariants: {
    variant: "top",
  },
});

const Glow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof glowVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(glowVariants({ variant }), className)}
    {...props}
    aria-hidden="true" // Add aria-hidden for accessibility
  >
    {/* Foreground Glow - Use primary color */}
    <div
      className={cn(
        "absolute left-1/2 h-[256px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.3)_10%,transparent_60%)] sm:h-[512px]",
        variant === "center" && "-translate-y-1/2"
      )}
    />
    {/* Background Glow - Use primary color with lower opacity */}
    <div
      className={cn(
        "absolute left-1/2 h-[128px] w-[40%] -translate-x-1/2 scale-[2] rounded-[50%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15)_10%,transparent_60%)] sm:h-[256px]",
        variant === "center" && "-translate-y-1/2"
      )}
    />
  </div>
));
Glow.displayName = "Glow";

export { Glow };
