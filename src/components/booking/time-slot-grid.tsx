"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Clock, Check } from "lucide-react";
import { toast } from "sonner";

interface SlotBooking {
  profile?: { id: string; name: string; company?: string; batch?: string; avatar_url: string | null };
}

interface TimeSlotData {
  id: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
  bookings: SlotBooking[];
  user_booked: boolean;
}

interface TimeSlotGridProps {
  slots: TimeSlotData[];
  onBook: (startTime: string) => Promise<void>;
  loading: boolean;
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function getSlotState(slot: TimeSlotData) {
  if (slot.user_booked) return "booked";
  if (slot.current_bookings >= slot.max_capacity) return "full";
  if (slot.current_bookings >= slot.max_capacity * 0.75) return "almost-full";
  return "available";
}

export function TimeSlotGrid({ slots, onBook, loading }: TimeSlotGridProps) {
  const [confirmSlot, setConfirmSlot] = useState<TimeSlotData | null>(null);
  const [booking, setBooking] = useState(false);

  const handleConfirm = async () => {
    if (!confirmSlot) return;
    setBooking(true);
    try {
      await onBook(confirmSlot.start_time);
      toast.success("Booked! See you at the gym.");
      setConfirmSlot(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to book slot"
      );
    } finally {
      setBooking(false);
    }
  };

  if (slots.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No time slots available for this date.
      </p>
    );
  }

  return (
    <>
      <div className="max-h-[268px] overflow-y-auto rounded-lg border p-1">
        <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => {
            const state = getSlotState(slot);
            const spotsLeft = slot.max_capacity - slot.current_bookings;
            return (
              <button
                key={slot.id}
                disabled={state === "full" || state === "booked" || loading}
                onClick={() => setConfirmSlot(slot)}
                className={cn(
                  "flex flex-col rounded-md border px-2.5 py-2 text-left transition-all",
                  state === "available" &&
                    "border-green-200 bg-green-50 hover:border-green-400 dark:border-green-900 dark:bg-green-950",
                  state === "almost-full" &&
                    "border-amber-200 bg-amber-50 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950",
                  state === "full" &&
                    "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900",
                  state === "booked" &&
                    "cursor-default border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Clock className="h-3 w-3" />
                    {formatTime(slot.start_time)} &ndash; {formatTime(slot.end_time)}
                  </div>
                  {state === "booked" && (
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{slot.current_bookings}/{slot.max_capacity}</span>
                  <span>
                    {state === "booked"
                      ? "You're in!"
                      : state === "full"
                        ? "Full"
                        : `${spotsLeft} left`}
                  </span>
                </div>

                {/* Booked users */}
                {slot.bookings.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-1.5 text-[11px] text-muted-foreground">
                    {slot.bookings.slice(0, 3).map((b, i) => (
                      <span key={i}>
                        {b.profile?.name?.split(" ")[0] || "?"}
                        {(b.profile?.company || b.profile?.batch) && (
                          <span className="opacity-70">
                            {" "}({[b.profile?.company, b.profile?.batch].filter(Boolean).join(", ")})
                          </span>
                        )}
                        {i < Math.min(slot.bookings.length, 3) - 1 && " · "}
                      </span>
                    ))}
                    {slot.bookings.length > 3 && (
                      <span className="opacity-70">+{slot.bookings.length - 3} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!confirmSlot} onOpenChange={() => setConfirmSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              {confirmSlot && (
                <>
                  Book the {formatTime(confirmSlot.start_time)} &ndash;{" "}
                  {formatTime(confirmSlot.end_time)} slot? You&apos;ll get a
                  confirmation and it&apos;ll show up in your bookings.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSlot(null)}
              disabled={booking}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={booking}>
              {booking ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
