"use client";

import { useState, useEffect } from "react";
import { AvatarUploadTrigger } from "../../app/(dashboard)/settings/_components/avatar-upload-trigger";
import { CompanyLogoUploadTrigger } from "../../app/(dashboard)/settings/_components/company-logo-upload-trigger";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

interface AnimatedUploadSwitcherProps {
  userId: string;
  currentAvatarUrl: string | null;
  currentLogoUrl: string | null;
  userName: string;
}

export function AnimatedUploadSwitcher({
  userId,
  currentAvatarUrl,
  currentLogoUrl,
  userName,
}: AnimatedUploadSwitcherProps) {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;

    const targetIndex = !currentLogoUrl ? 1 : 0;

    const timer = setTimeout(() => {
      api.scrollTo(targetIndex, true);
    }, 50);

    return () => clearTimeout(timer);
  }, [api, currentLogoUrl]);

  return (
    <Carousel
      setApi={setApi}
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full max-w-xs"
    >
      <CarouselContent>
        <CarouselItem className="flex items-center justify-center">
          <div className="flex flex-col items-center space-y-2">
            <AvatarUploadTrigger
              userId={userId}
              currentAvatarUrl={currentAvatarUrl}
              userName={userName}
            />
            <span className="text-sm font-medium text-muted-foreground">
              Profile Picture
            </span>
          </div>
        </CarouselItem>

        <CarouselItem className="flex items-center justify-center">
          <CompanyLogoUploadTrigger
            userId={userId}
            currentLogoUrl={currentLogoUrl}
          />
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
