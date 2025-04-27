"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    // Set initial opacity
    page.style.opacity = "0";

    // Simple fade in transition
    const timeout = setTimeout(() => {
      page.style.transition = "opacity 0.5s ease";
      page.style.opacity = "1";
    }, 50);

    return () => {
      clearTimeout(timeout);
    };
  }, [pathname]); // Re-run when pathname changes (page navigation)

  return (
    <div ref={pageRef} className="min-h-full w-full">
      {children}
    </div>
  );
}
