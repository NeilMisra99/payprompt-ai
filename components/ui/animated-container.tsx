"use client";

import React, { useRef, useEffect } from "react";
import { inView } from "motion";
import { cn } from "@/lib/utils";

type AnimationVariant =
  | "fadeIn"
  | "slideUp"
  | "slideIn"
  | "scale"
  | "staggered";

interface AnimatedContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  variant?: AnimationVariant;
}

export function AnimatedContainer({
  children,
  className,
  delay = 0,
  variant = "fadeIn",
  ...props
}: AnimatedContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Use state to control visibility - prevents flicker on initial render
  const [isVisible, setIsVisible] = React.useState(false);

  // Apply initial styling
  const initialStyle: React.CSSProperties = {
    opacity: 0,
    transform:
      variant === "slideUp"
        ? "translateY(20px)"
        : variant === "slideIn"
          ? "translateX(-20px)"
          : variant === "scale"
            ? "scale(0.95)"
            : "none",
    transition: "opacity 0.5s ease, transform 0.5s ease",
    willChange: "opacity, transform",
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Listen for when the element comes into view
    const cleanupFn = inView(container, () => {
      // Add a slight delay to ensure styles are applied before animation
      setTimeout(() => {
        setIsVisible(true);

        // For staggered animation, handle children separately
        if (variant === "staggered" && container.children.length) {
          // First hide all children
          Array.from(container.children).forEach((child) => {
            const el = child as HTMLElement;
            el.style.opacity = "0";
            el.style.transform = "translateY(10px)";
            el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            el.style.willChange = "opacity, transform";
          });

          // Then animate them with staggered delays
          setTimeout(() => {
            Array.from(container.children).forEach((child, index) => {
              const el = child as HTMLElement;
              setTimeout(() => {
                el.style.opacity = "1";
                el.style.transform = "none";
              }, index * 100);
            });
          }, 50); // Small delay before starting staggered animations
        }
      }, delay * 1000);
    });

    return () => {
      cleanupFn();
    };
  }, [delay, variant]);

  // Apply the correct style based on visibility, regardless of variant
  const style = isVisible
    ? {
        opacity: 1,
        transform: "none",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }
    : initialStyle;

  return (
    <div ref={containerRef} className={cn(className)} style={style} {...props}>
      {children}
    </div>
  );
}
