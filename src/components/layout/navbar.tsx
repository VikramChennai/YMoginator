"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Trophy,
  Camera,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/book", label: "Book", icon: CalendarDays },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/checkin", label: "Check In", icon: Camera },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicPages = ["/", "/login", "/signup", "/verify"];
  if (!user && publicPages.includes(pathname)) return null;

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-1.5 font-bold">
          <svg viewBox="0 0 48 48" className="h-6 w-6 shrink-0 rounded-lg">
            <rect width="48" height="48" rx="10" fill="#FF6600" />
            <g transform="rotate(-45 24 24)">
              <rect x="14" y="21" width="20" height="6" rx="3" fill="white" />
              <rect x="10" y="17.5" width="7" height="13" rx="2.5" fill="white" />
              <rect x="31" y="17.5" width="7" height="13" rx="2.5" fill="white" />
            </g>
          </svg>
          <span>Y Moginator</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant={pathname === href ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-1.5")}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          {profile && (
            <span className="text-sm text-muted-foreground">
              {profile.name}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Log out</span>
          </Button>
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t p-2 sm:hidden">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
              <Button
                variant={pathname === href ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      )}
    </nav>
  );
}
