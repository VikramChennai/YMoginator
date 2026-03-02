"use client";

import Link from "next/link";
import type { Booking } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarX, MapPin, Clock, Loader2 } from "lucide-react";

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function bookingLabel(booking: Booking) {
  const slot = booking.time_slot;
  if (!slot) return "Unknown session";
  const location = slot.location?.name || "Gym";
  return `${location} — ${formatTime(slot.start_time)}–${formatTime(slot.end_time)}`;
}

interface BookingSelectorProps {
  bookings: Booking[];
  loading: boolean;
  selectedBookingId: string | null;
  onSelect: (id: string) => void;
}

export function BookingSelector({
  bookings,
  loading,
  selectedBookingId,
  onSelect,
}: BookingSelectorProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading your bookings...
          </span>
        </CardContent>
      </Card>
    );
  }

  // 0 bookings — block state
  if (bookings.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardContent className="py-4 text-center space-y-2">
          <CalendarX className="mx-auto h-8 w-8 text-amber-600" />
          <p className="font-medium text-amber-800 dark:text-amber-200">
            No recent bookings
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You need to book a gym session before you can check in.
          </p>
          <Link
            href="/book"
            className="inline-block mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Book a Session
          </Link>
        </CardContent>
      </Card>
    );
  }

  // 1 booking — auto-linked info card
  if (bookings.length === 1) {
    const booking = bookings[0];
    const slot = booking.time_slot;
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {slot?.location?.name || "Gym"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {slot
                  ? `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`
                  : "Unknown time"}
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Auto-linked
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // 2 bookings — dropdown selector
  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <p className="text-sm font-medium">Which session are you checking into?</p>
        <Select value={selectedBookingId || ""} onValueChange={onSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a session" />
          </SelectTrigger>
          <SelectContent>
            {bookings.map((booking) => (
              <SelectItem key={booking.id} value={booking.id}>
                {bookingLabel(booking)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
