"use client";

import React, { useEffect, useRef } from "react";
import { animate } from "motion";

interface AnimatedNumberProps {
  value: number;
  isCurrency?: boolean;
  duration?: number;
  delay?: number;
}

function formatDisplayNumber(num: number, isCurrency: boolean): string {
  if (isCurrency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
  return Math.round(num).toLocaleString();
}

export function AnimatedNumber({
  value,
  isCurrency = false,
  duration = 0.8,
  delay = 0,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.textContent = formatDisplayNumber(0, isCurrency);

    const timeoutId = setTimeout(() => {
      const controls = animate(0, value, {
        duration: duration,
        ease: [0.25, 1, 0.5, 1],
        onUpdate: (latest) => {
          if (element) {
            element.textContent = formatDisplayNumber(latest, isCurrency);
          }
        },
      });
      return () => controls.stop();
    }, delay * 1000);

    return () => clearTimeout(timeoutId);
  }, [value, isCurrency, duration, delay]);

  return <span ref={ref}>{formatDisplayNumber(0, isCurrency)}</span>;
}
