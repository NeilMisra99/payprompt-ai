"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FloatingIconProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  // Options for animation variation
  duration?: number; // animation duration in seconds
  delay?: number; // delay before animation starts in seconds
  distance?: "small" | "medium" | "large"; // how far the icon floats
}

export function FloatingIcon({
  children,
  className,
  duration = 3,
  delay = 0,
  distance = "small",
  ...props
}: FloatingIconProps) {
  // Calculate animation duration and delay
  const animDuration = `${duration}s`;
  const animDelay = delay ? `${delay}s` : "0s";

  return (
    <div
      className={cn(
        "animate-float transition-all",
        // Apply different classes based on distance
        distance === "small" && "animate-float-small",
        distance === "medium" && "animate-float-medium",
        distance === "large" && "animate-float-large",
        className
      )}
      style={{
        animation: `float ${animDuration} ease-in-out infinite`,
        animationDelay: animDelay,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// Add the float animation keyframes to your globals.css file:
// @keyframes float {
//   0% { transform: translateY(0px); }
//   50% { transform: translateY(-8px); }
//   100% { transform: translateY(0px); }
// }
