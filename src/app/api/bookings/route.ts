import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSlotEvent, addAttendee } from "@/lib/google-calendar";

function padHour(h: number) {
  return h.toString().padStart(2, "0");
}

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
      .select("date")
      .eq("status", "confirmed")
      .eq("location_id", locationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dates = [...new Set(data.map((b) => b.date))];
    return NextResponse.json(dates);
  }

  if (userOnly === "true") {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, location:locations(*)")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check-in status
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

  // Get location to compute slots from its hours
  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .single();

  if (locError || !location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Compute all possible 1-hour slots from location hours
  const computedSlots = [];
  for (let hour = location.opening_hour; hour < location.closing_hour; hour++) {
    computedSlots.push({
      start_time: `${padHour(hour)}:00:00`,
      end_time: `${padHour(hour + 1)}:00:00`,
    });
  }

  // Get confirmed bookings for this location + date
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, profile:profiles(id, name, company, batch, avatar_url)")
    .eq("location_id", locationId)
    .eq("date", date)
    .eq("status", "confirmed");

  // Get user's bookings for this date
  const { data: userBookings } = await supabase
    .from("bookings")
    .select("start_time")
    .eq("user_id", user.id)
    .eq("location_id", locationId)
    .eq("date", date)
    .eq("status", "confirmed");

  const userBookedTimes = new Set(
    userBookings?.map((b) => b.start_time) || []
  );

  const slotsWithBookings = computedSlots.map((slot) => {
    const slotBookings =
      bookings?.filter((b) => b.start_time === slot.start_time) || [];
    return {
      id: `${locationId}_${date}_${slot.start_time}`,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_capacity: location.max_capacity_per_slot,
      current_bookings: slotBookings.length,
      bookings: slotBookings,
      user_booked: userBookedTimes.has(slot.start_time),
    };
  });

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

  const { location_id, date, start_time } = await request.json();

  if (!location_id || !date || !start_time) {
    return NextResponse.json(
      { error: "location_id, date, and start_time are required" },
      { status: 400 }
    );
  }

  // Get location for capacity check
  const { data: location } = await supabase
    .from("locations")
    .select("max_capacity_per_slot, name, address, opening_hour, closing_hour")
    .eq("id", location_id)
    .single();

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Validate start_time is within location hours
  const hour = parseInt(start_time.split(":")[0]);
  if (hour < location.opening_hour || hour >= location.closing_hour) {
    return NextResponse.json(
      { error: "Time is outside location hours" },
      { status: 400 }
    );
  }

  // Check capacity
  const { count } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("location_id", location_id)
    .eq("date", date)
    .eq("start_time", start_time)
    .eq("status", "confirmed");

  if ((count ?? 0) >= location.max_capacity_per_slot) {
    return NextResponse.json(
      { error: "This time slot is full" },
      { status: 400 }
    );
  }

  // Compute end_time
  const endHour = hour + 1;
  const endTime = `${padHour(endHour)}:00:00`;

  const { data, error } = await supabase
    .from("bookings")
    .insert({ user_id: user.id, location_id, date, start_time })
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

  // Google Calendar sync (best-effort)
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const userEmail = profile?.email || user.email;

    // Check if another booking for this slot already has a Google event
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("google_event_id")
      .eq("location_id", location_id)
      .eq("date", date)
      .eq("start_time", start_time)
      .eq("status", "confirmed")
      .not("google_event_id", "is", null)
      .limit(1)
      .single();

    if (existingBooking?.google_event_id) {
      await addAttendee(existingBooking.google_event_id, userEmail!);
      // Store event ID on this booking too
      await supabase
        .from("bookings")
        .update({ google_event_id: existingBooking.google_event_id })
        .eq("id", data.id);
    } else {
      const locationStr = [location.name, location.address]
        .filter(Boolean)
        .join(", ");
      const eventId = await createSlotEvent({
        summary: `Gym Session @ ${location.name || "Gym"}`,
        description:
          "YCGYM gym session — let's get it!\n\nBooked via ycgym.com",
        location: locationStr,
        date,
        startTime: start_time,
        endTime: endTime,
        attendeeEmails: [userEmail!],
      });
      await supabase
        .from("bookings")
        .update({ google_event_id: eventId })
        .eq("id", data.id);
    }
  } catch (calError) {
    console.error("Calendar sync failed:", calError);
  }

  return NextResponse.json(data, { status: 201 });
}
