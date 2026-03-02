import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSlotEvent, addAttendee } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locationId = request.nextUrl.searchParams.get("location_id");
  const date = request.nextUrl.searchParams.get("date");
  const userOnly = request.nextUrl.searchParams.get("user_only");
  const bookedDates = request.nextUrl.searchParams.get("booked_dates");

  // Return distinct dates that have at least one confirmed booking for a location
  if (bookedDates === "true" && locationId) {
    const { data, error } = await supabase
      .from("bookings")
      .select("time_slot:time_slots!inner(date, location_id)")
      .eq("status", "confirmed")
      .eq("time_slot.location_id", locationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dates = [
      ...new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((b: any) => b.time_slot?.date).filter(Boolean)
      ),
    ];
    return NextResponse.json(dates);
  }

  if (userOnly === "true") {
    // Get current user's bookings
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        time_slot:time_slots(
          *,
          location:locations(*)
        )
      `
      )
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Separate query for check-in status
    const bookingIds = data.map((b) => b.id);
    const { data: checkins } = await supabase
      .from("gym_checkins")
      .select("booking_id")
      .in("booking_id", bookingIds.length > 0 ? bookingIds : ["__none__"]);

    const checkedInIds = new Set(
      checkins?.map((c) => c.booking_id).filter(Boolean) ?? []
    );

    const enriched = data.map((b) => ({
      ...b,
      checked_in: checkedInIds.has(b.id),
    }));
    return NextResponse.json(enriched);
  }

  if (!locationId || !date) {
    return NextResponse.json(
      { error: "location_id and date are required" },
      { status: 400 }
    );
  }

  // Get time slots with bookings for a location + date
  const { data: slots, error: slotsError } = await supabase
    .from("time_slots")
    .select("*")
    .eq("location_id", locationId)
    .eq("date", date)
    .order("start_time");

  if (slotsError) {
    return NextResponse.json({ error: slotsError.message }, { status: 500 });
  }

  // Get bookings for these slots with profile info
  const slotIds = slots.map((s) => s.id);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, profile:profiles(id, name, company, batch, avatar_url)")
    .in("time_slot_id", slotIds)
    .eq("status", "confirmed");

  // Get user's bookings for this date
  const { data: userBookings } = await supabase
    .from("bookings")
    .select("time_slot_id")
    .eq("user_id", user.id)
    .in("time_slot_id", slotIds)
    .eq("status", "confirmed");

  const userBookedSlotIds = new Set(
    userBookings?.map((b) => b.time_slot_id) || []
  );

  const slotsWithBookings = slots.map((slot) => ({
    ...slot,
    bookings: bookings?.filter((b) => b.time_slot_id === slot.id) || [],
    user_booked: userBookedSlotIds.has(slot.id),
  }));

  return NextResponse.json(slotsWithBookings);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { time_slot_id } = await request.json();

  if (!time_slot_id) {
    return NextResponse.json(
      { error: "time_slot_id is required" },
      { status: 400 }
    );
  }

  // Check capacity
  const { data: slot } = await supabase
    .from("time_slots")
    .select("*")
    .eq("id", time_slot_id)
    .single();

  if (!slot) {
    return NextResponse.json({ error: "Time slot not found" }, { status: 404 });
  }

  if (slot.current_bookings >= slot.max_capacity) {
    return NextResponse.json(
      { error: "This time slot is full" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({ user_id: user.id, time_slot_id })
    .select()
    .single();

  if (error) {
    if (error.message.includes("Maximum 2 bookings")) {
      return NextResponse.json(
        { error: "You can only book up to 2 slots per day" },
        { status: 400 }
      );
    }
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already booked this slot" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Google Calendar sync (best-effort, don't block booking on failure)
  try {
    // Get user's profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    // Get location info for event details
    const { data: location } = await supabase
      .from("locations")
      .select("name, address")
      .eq("id", slot.location_id)
      .single();

    const userEmail = profile?.email || user.email;

    if (slot.google_event_id) {
      // Event already exists — add this user as attendee
      await addAttendee(slot.google_event_id, userEmail!);
    } else {
      // Create new event for this time slot
      const locationStr = [location?.name, location?.address].filter(Boolean).join(", ");
      const eventId = await createSlotEvent({
        summary: `Gym Session @ ${location?.name || "Gym"}`,
        description: "YMoginator gym session — let's get it!\n\nBooked via ymoginator.com",
        location: locationStr,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        attendeeEmails: [userEmail!],
      });

      // Save event ID to the time slot
      await supabase
        .from("time_slots")
        .update({ google_event_id: eventId })
        .eq("id", time_slot_id);
    }
  } catch (calError) {
    // Log but don't fail the booking
    console.error("Calendar sync failed:", calError);
  }

  return NextResponse.json(data, { status: 201 });
}
