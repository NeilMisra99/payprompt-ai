"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 bg-background h-16">
      <div className="flex items-center lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">PayPrompt AI</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </div>
            </div>
            <nav className="flex flex-col p-4 space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/invoices"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Invoices
              </Link>
              <Link
                href="/clients"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Clients
              </Link>
              <Link
                href="/settings"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </Link>
            </nav>
            <div className="p-4 border-t border-border">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center px-3 py-2 text-sm font-medium text-destructive hover:bg-accent rounded-md"
              >
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 flex justify-end items-center space-x-4">
        {/* Removed Notification Button */}
      </div>
    </header>
  );
}
