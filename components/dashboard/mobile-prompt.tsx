"use client";

import { useEffect, useState } from "react";
import { MonitorSmartphone, TabletSmartphone } from "lucide-react";

export function MobilePrompt() {
  const [isMobileSize, setIsMobileSize] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    function checkDeviceState() {
      // Check width OR height to determine if it's a mobile-like screen size
      const mobileWidthQuery = window.matchMedia("(max-width: 767px)");
      const mobileHeightQuery = window.matchMedia("(max-height: 479px)"); // Use 479px for < 480px
      const portraitMediaQuery = window.matchMedia("(orientation: portrait)");

      setIsMobileSize(mobileWidthQuery.matches || mobileHeightQuery.matches);
      setIsPortrait(portraitMediaQuery.matches);
    }

    // Initial check
    checkDeviceState();

    // Listen for changes
    window.addEventListener("resize", checkDeviceState);
    window.addEventListener("orientationchange", checkDeviceState);

    // Cleanup listeners
    return () => {
      window.removeEventListener("resize", checkDeviceState);
      window.removeEventListener("orientationchange", checkDeviceState);
    };
  }, []);

  if (!isMobileSize && !isPortrait) {
    // Desktop or Tablet Landscape: Don't render anything
    return null;
  }

  return (
    // Remove md:hidden, component logic now handles visibility
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-6 text-center">
      {isMobileSize ? (
        // Mobile View (Small Width OR Small Height)
        <div className="space-y-4">
          <MonitorSmartphone className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">
            Please Switch to a Larger Screen
          </h2>
          <p className="text-muted-foreground">
            This application is designed for optimal use on tablet or desktop
            devices. Some features may be limited on smaller screens.
          </p>
        </div>
      ) : (
        // Tablet Portrait View (Larger Width AND Larger Height, but Portrait)
        <div className="space-y-4">
          <TabletSmartphone className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">
            Please Rotate to Landscape Mode
          </h2>
          <p className="text-muted-foreground">
            For the best experience on a tablet, please rotate your device to
            landscape orientation.
          </p>
        </div>
      )}
    </div>
  );
}
