"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MyBookings } from "@/components/booking/my-bookings";
import {
  AlertCircle,
  Flame,
  Trophy,
  Calendar,
  Building2,
  Mail,
  Link as LinkIcon,
} from "lucide-react";
import { getStreakBadge } from "@/lib/types";
import type { Booking } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function ProfilePage() {
  const { profile, loading, profileError, refreshProfile, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [linkingYC, setLinkingYC] = useState(false);
  const [ycUrl, setYcUrl] = useState("");

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings?user_only=true");
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && profile) {
      fetchBookings();
    }
  }, [loading, profile, fetchBookings]);

  const handleLinkYC = async () => {
    if (!ycUrl.trim()) return;
    setLinkingYC(true);
    try {
      const verifyRes = await fetch("/api/verify-yc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ycUrl.trim() }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || "Verification failed");
      }
      const ycData = await verifyRes.json();

      if (ycData.warning) {
        toast.warning(ycData.warning);
      }

      const patchRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ycData.name || profile?.name,
          company: ycData.company,
          batch: ycData.batch,
          yc_verification_code: ycData.code,
        }),
      });
      if (!patchRes.ok) throw new Error("Failed to update profile");
      await refreshProfile();
      setYcUrl("");
      if (!ycData.warning) toast.success("YC account linked!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link YC account");
    } finally {
      setLinkingYC(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!res.ok) throw new Error("Cancel failed");
    await fetchBookings();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto h-4 w-32" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Couldn&apos;t load your account</h2>
        <p className="max-w-sm text-muted-foreground">
          Something went wrong loading your profile. This might be a temporary
          issue — try again or sign out and log back in.
        </p>
        <div className="flex gap-2">
          <Button onClick={refreshProfile}>Try Again</Button>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const badge = getStreakBadge(profile.current_streak);
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="mx-auto max-w-md space-y-6 p-4 sm:p-6">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-20 w-20 text-2xl">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <h1 className="mt-3 text-2xl font-bold">{profile.name}</h1>
        {/* YC info is complete when all expected fields are populated */}
        {(profile.company && profile.batch) ? (
          <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{profile.company}</span>
            <Badge variant="secondary" className="text-xs">
              {profile.batch}
            </Badge>
          </div>
        ) : (
          <div className="mt-2 w-full max-w-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                placeholder="ycombinator.com/verify/..."
                value={ycUrl}
                onChange={(e) => setYcUrl(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleLinkYC()}
              />
              <Button
                size="sm"
                onClick={handleLinkYC}
                disabled={linkingYC || !ycUrl.trim()}
                className="shrink-0 gap-1.5"
              >
                <LinkIcon className={`h-3.5 w-3.5 ${linkingYC ? "animate-spin" : ""}`} />
                {linkingYC ? "..." : "Link"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <a href="https://bookface.ycombinator.com/verify" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Get your verification link on Bookface</a>
            </p>
          </div>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span>{profile.email}</span>
        </div>
        {badge && (
          <Badge className={`mt-3 text-white ${badge.color}`}>
            {badge.label}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <Flame className="h-6 w-6 text-orange-500" />
            <p className="mt-1 text-2xl font-bold">{profile.current_streak}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <Trophy className="h-6 w-6 text-amber-500" />
            <p className="mt-1 text-2xl font-bold">{profile.longest_streak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <Calendar className="h-6 w-6 text-blue-500" />
            <p className="mt-1 text-2xl font-bold">{profile.total_days}</p>
            <p className="text-xs text-muted-foreground">Total Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Upcoming Bookings</h2>
        {loadingBookings ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <MyBookings bookings={bookings} onCancel={handleCancel} />
        )}
      </section>


      {/* Member since */}
      <p className="text-center text-xs text-muted-foreground">
        Member since{" "}
        {format(parseISO(profile.created_at), "MMMM d, yyyy")}
        {profile.last_verified_date && (
          <>
            {" "}
            &middot; Last check-in{" "}
            {format(parseISO(profile.last_verified_date), "MMM d, yyyy")}
          </>
        )}
      </p>
    </div>
  );
}
