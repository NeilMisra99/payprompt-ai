"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const MotionDiv = motion.div;

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex justify-center mb-8 w-full px-4 sm:px-0">
      <div className="flex items-center justify-between w-full max-w-md">
        {[...Array(totalSteps)].map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLastStep = stepNumber === totalSteps;

          return (
            <React.Fragment key={stepNumber}>
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 shrink-0",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground",
                  isCurrent &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {stepNumber}
              </div>
              {!isLastStep && (
                <div className="flex-grow h-1 bg-muted mx-1 relative overflow-hidden rounded-full">
                  <MotionDiv
                    className="absolute left-0 top-0 bottom-0 h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
