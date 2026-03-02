import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  if (userOnly === "true") {
    // Get current user's upcoming bookings
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
    return NextResponse.json(data);
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

  return NextResponse.json(data, { status: 201 });
}
