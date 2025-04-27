"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import Image from "next/image";

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: {
    regular: string;
    gradient: string;
  };
  description?: string | React.ReactNode; // Allow ReactNode for description
  ctaText?: string;
  ctaHref?: string;
  bottomImage?: {
    light: string;
    dark: string;
  };
  gridOptions?: {
    angle?: number;
    cellSize?: number;
    opacity?: number;
    lightLineColor?: string;
    darkLineColor?: string;
  };
}

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "hsl(var(--border))", // Use theme variable
  darkLineColor = "hsl(var(--border))", // Use theme variable
}) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        `opacity-[var(--opacity)]`
      )}
      style={gridStyles}
    >
      {/* Grid */}
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          // Use theme colors via variables for lines
          className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] dark:[background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw]"
        />
      </div>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent to-90%" />
    </div>
  );
};

const RetroHeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      title = "Build products for everyone",
      subtitle = {
        regular: "Designing your projects faster with ",
        gradient: "the largest figma UI kit.",
      },
      description = "Sed ut perspiciatis unde omnis iste natus voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae.",
      ctaText = "Browse courses",
      ctaHref = "#",
      bottomImage = {
        light: "/dashboard-light.png", // Path for light mode
        dark: "/dashboard-dark.png", // Path for dark mode
      },
      gridOptions,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn("relative overflow-hidden bg-background", className)}
        ref={ref}
        {...props}
      >
        {/* Background radial gradient - Only apply in dark mode */}
        <div className="absolute top-0 z-[0] h-screen w-screen bg-transparent dark:bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,hsl(0_0%_85%/0.15),transparent_80%)]" />

        <GridPattern
          width={60}
          height={60}
          x={-1}
          y={-1}
          className="absolute inset-0 h-full w-full stroke-muted-foreground/10 fill-muted-foreground/5 [mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] z-0"
        />

        <section className="relative max-w-full mx-auto z-10">
          <RetroGrid {...gridOptions} />
          <div className="max-w-screen-xl z-10 mx-auto px-4 py-20 pt-24 md:px-8 md:py-28 md:pt-36 gap-12">
            <div className="space-y-5 max-w-3xl mx-auto text-center">
              {title && (
                <h1 className="cursor-default text-sm text-muted-foreground group font-sans mx-auto px-5 py-2 bg-gradient-to-tr from-muted/50 via-muted/50 to-transparent border border-black dark:border-white rounded-full w-fit">
                  {title}
                </h1>
              )}
              <h2 className="text-4xl tracking-tight font-semibold font-sans text-foreground mx-auto md:text-6xl">
                {subtitle.regular}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                  {subtitle.gradient}
                </span>
              </h2>
              {/* Render description - allows passing ReactNode like the AnimatedTextCycle */}
              <div className="max-w-2xl mx-auto text-muted-foreground">
                {typeof description === "string" ? (
                  <p>{description}</p>
                ) : (
                  description
                )}
              </div>
              <div className="items-center justify-center gap-x-3 space-y-3 sm:flex sm:space-y-0">
                <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
                  {/* Spinning gradient border - Electric Blue & Lime Green HSL values */}
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,hsl(220_90%_60%)_0%,hsl(100_90%_60%)_50%,hsl(220_90%_60%)_100%)]" />
                  <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-background text-xs font-medium backdrop-blur-3xl">
                    <a
                      href={ctaHref}
                      // Keep button background subtle, adjust px for mobile
                      className="inline-flex rounded-full text-center group items-center w-full justify-center bg-background/80 hover:bg-background/90 text-foreground border border-transparent transition-all sm:w-auto py-4 px-6 sm:px-10"
                    >
                      {ctaText}
                    </a>
                  </div>
                </span>
              </div>
            </div>
            {bottomImage && (
              <div className="mt-12 mx-4 sm:mx-10 relative z-10">
                <Image
                  src={bottomImage.light}
                  className="w-full shadow-lg rounded-lg border border-border dark:hidden"
                  alt="App preview light"
                  width={1000}
                  height={1000}
                  priority={true}
                />
                <Image
                  src={bottomImage.dark}
                  className="hidden w-full shadow-lg rounded-lg border border-border dark:block"
                  alt="App preview dark"
                  width={1000}
                  height={1000}
                  priority={true}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }
);
RetroHeroSection.displayName = "RetroHeroSection";

export { RetroHeroSection };
