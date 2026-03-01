"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isAfter } from "date-fns";
import { CalendarDays, Clock, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/lib/types";

interface MyBookingsProps {
  bookings: Booking[];
  onCancel: (bookingId: string) => Promise<void>;
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export function MyBookings({ bookings, onCancel }: MyBookingsProps) {
  const upcoming = bookings.filter(
    (b) =>
      b.time_slot &&
      isAfter(parseISO(b.time_slot.date), new Date(new Date().setHours(0, 0, 0, 0) - 1))
  );

  if (upcoming.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No upcoming bookings. Book a slot above to get started!
      </p>
    );
  }

  const handleCancel = async (bookingId: string) => {
    try {
      await onCancel(bookingId);
      toast.success("Booking cancelled");
    } catch {
      toast.error("Failed to cancel booking");
    }
  };

  return (
    <div className="space-y-2">
      {upcoming.map((booking) => (
        <Card key={booking.id}>
          <CardContent className="flex items-center justify-between p-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {booking.time_slot?.location?.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Confirmed
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {booking.time_slot &&
                    format(parseISO(booking.time_slot.date), "EEE, MMM d")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {booking.time_slot &&
                    `${formatTime(booking.time_slot.start_time)} - ${formatTime(booking.time_slot.end_time)}`}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {booking.time_slot?.location?.city}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCancel(booking.id)}
              title="Cancel booking"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
