"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarUploadTrigger } from "./avatar-upload-trigger";
import { CompanyLogoUploadTrigger } from "./company-logo-upload-trigger";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnimatedUploadSwitcherProps {
  userId: string;
  currentAvatarUrl: string | null;
  currentLogoUrl: string | null;
  userName: string;
}

type ActiveUploader = "avatar" | "logo";

export function AnimatedUploadSwitcher({
  userId,
  currentAvatarUrl,
  currentLogoUrl,
  userName,
}: AnimatedUploadSwitcherProps) {
  const [activeUploader, setActiveUploader] =
    useState<ActiveUploader>("avatar");

  const switcherVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="flex w-full flex-col items-center space-y-4 md:w-auto">
      {/* Control Buttons */}
      <div className="flex space-x-2 rounded-md bg-muted p-1">
        <Button
          variant={activeUploader === "avatar" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveUploader("avatar")}
          className={cn(
            "transition-colors",
            activeUploader !== "avatar" && "hover:bg-background/60"
          )}
        >
          Profile Picture
        </Button>
        <Button
          variant={activeUploader === "logo" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveUploader("logo")}
          className={cn(
            "transition-colors",
            activeUploader !== "logo" && "hover:bg-background/60"
          )}
        >
          Company Logo
        </Button>
      </div>

      {/* Animated Uploader Section */}
      <div className="relative h-60 w-full overflow-hidden">
        {" "}
        {/* Adjust height as needed */}
        <AnimatePresence mode="wait" initial={false}>
          {activeUploader === "avatar" && (
            <motion.div
              key="avatar"
              variants={switcherVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex justify-center" // Center content
            >
              <AvatarUploadTrigger
                userId={userId}
                currentAvatarUrl={currentAvatarUrl}
                userName={userName}
              />
            </motion.div>
          )}

          {activeUploader === "logo" && (
            <motion.div
              key="logo"
              variants={switcherVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex justify-center" // Center content
            >
              <CompanyLogoUploadTrigger
                userId={userId}
                currentLogoUrl={currentLogoUrl}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
