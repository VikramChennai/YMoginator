"use client";

import { useEffect, useState, useMemo } from "react";
import type { Booking } from "@/lib/types";

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function slotToTimestamp(booking: Booking): number | null {
  const slot = booking.time_slot;
  if (!slot?.date || !slot?.start_time) return null;
  return new Date(`${slot.date}T${slot.start_time}`).getTime();
}

export function useTodaysBookings() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings?user_only=true");
        const data = await res.json();
        setAllBookings(Array.isArray(data) ? data : []);
      } catch {
        setAllBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const nearbyBookings = useMemo(() => {
    const now = Date.now();
    return allBookings
      .filter((b) => {
        if (b.status !== "confirmed") return false;
        const ts = slotToTimestamp(b);
        if (!ts) return false;
        return Math.abs(ts - now) <= WINDOW_MS;
      })
      .sort((a, b) => {
        // Sort by closest to now
        const diff = Math.abs((slotToTimestamp(a) ?? 0) - now) -
          Math.abs((slotToTimestamp(b) ?? 0) - now);
        return diff;
      });
  }, [allBookings]);

  // Auto-select: pre-select the closest booking to now
  useEffect(() => {
    if (loading || nearbyBookings.length === 0) return;
    if (!selectedBookingId) {
      setSelectedBookingId(nearbyBookings[0].id);
    }
  }, [loading, nearbyBookings, selectedBookingId]);

  return {
    bookings: nearbyBookings,
    loading,
    selectedBookingId,
    setSelectedBookingId,
  };
}
