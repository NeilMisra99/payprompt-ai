"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  Bell,
  Clock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface SidebarProps {
  user: {
    id: string;
    email?: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Animation effect when component mounts
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Animate the sidebar links when they appear
    const links = sidebar.querySelectorAll("a");
    links.forEach((link, index) => {
      link.style.opacity = "0";
      link.style.transform = "translateX(-10px)";
      link.style.transition = "opacity 0.3s ease, transform 0.3s ease";

      setTimeout(
        () => {
          link.style.opacity = "1";
          link.style.transform = "translateX(0)";
        },
        100 + index * 80
      );
    });
  }, []);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (pathname.includes("/settings")) {
    return null;
  }

  // Get user initials for avatar
  const initials = user.email ? user.email.charAt(0).toUpperCase() : "U";

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Reminders", href: "/reminders", icon: Clock },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ];

  return (
    <div className="hidden lg:flex flex-col w-64 bg-sidebar" ref={sidebarRef}>
      <div className="p-4 border-b border-border mx-2 flex items-center">
        PayPrompt AI
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative overflow-hidden group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-primary"
              )}
            >
              <Icon
                className={cn(
                  "mr-3 h-5 w-5 transition-transform duration-200",
                  "group-hover:scale-110", // Scale up icon on hover
                  isActive && "text-primary"
                )}
              />
              <span>{link.name}</span>

              {/* Active indicator - animated dot */}
              {isActive && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Avatar and Popover */}
      <div className="p-2 mt-auto">
        <Popover>
          <PopoverTrigger className="flex w-full items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary transition-colors">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {user.email ?? "User"}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-56 mb-2" align="start" side="top">
            <div className="flex flex-col space-y-1">
              <Link
                href="/settings"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-primary transition-colors"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center px-3 py-2 text-sm font-medium text-destructive hover:bg-accent rounded-md transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
