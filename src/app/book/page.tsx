"use client";

import { useCallback, useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationPicker } from "@/components/booking/location-picker";
import { TimeSlotGrid } from "@/components/booking/time-slot-grid";
import type { Location } from "@/lib/types";

export default function BookPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any[]
  >([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/locations");
        const data = await res.json();
        const locs = Array.isArray(data) ? data : [];
        setLocations(locs);
        if (locs.length > 0) {
          setSelectedLocation(locs[0]);
        }
      } catch {
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!selectedLocation) return;
    setLoadingSlots(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const res = await fetch(
      `/api/bookings?location_id=${selectedLocation.id}&date=${dateStr}`
    );
    const data = await res.json();
    setSlots(Array.isArray(data) ? data : []);
    setLoadingSlots(false);
  }, [selectedLocation, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBook = async (slotId: string) => {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time_slot_id: slotId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchSlots();
  };

  const today = new Date();
  const maxDate = addDays(today, 30);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Book a Gym Session</h1>
        <p className="text-muted-foreground">
          Pick a location, date, and time slot. Max 2 bookings per day.
        </p>
      </div>

      {/* Location Picker */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">1. Choose a gym</h2>
        {loadingLocations ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <LocationPicker
            locations={locations}
            selected={selectedLocation}
            onSelect={setSelectedLocation}
          />
        )}
      </section>

      {/* Date + Time Slots side by side */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">2. Pick a date & time</h2>
        <div className="flex gap-4 items-start">
          {/* Calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            disabled={(date) => date < today || date > maxDate}
            className="shrink-0 rounded-md border w-fit h-fit"
          />

          {/* Time Slots */}
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="mb-2 text-sm text-muted-foreground">
              {selectedLocation?.name} &middot;{" "}
              {format(selectedDate, "EEE, MMM d")}
            </p>
            <div className="min-h-0 flex-1">
              {loadingSlots ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : (
                <TimeSlotGrid
                  slots={slots}
                  onBook={handleBook}
                  loading={loadingSlots}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
