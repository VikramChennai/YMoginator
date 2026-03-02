import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("gym_checkins")
    .select(`
      *,
      booking:bookings(
        id,
        time_slot:time_slots(
          start_time,
          end_time,
          date,
          location:locations(name)
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photo_url, verified, verification_result, booking_id } =
    await request.json();

  if (!photo_url) {
    return NextResponse.json(
      { error: "photo_url is required" },
      { status: 400 }
    );
  }

  if (!booking_id) {
    return NextResponse.json(
      { error: "booking_id is required — please select a booked session" },
      { status: 400 }
    );
  }

  // Validate booking belongs to user and is confirmed
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, user_id, status")
    .eq("id", booking_id)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: "Booking not found" },
      { status: 404 }
    );
  }

  if (booking.user_id !== user.id) {
    return NextResponse.json(
      { error: "Booking does not belong to you" },
      { status: 403 }
    );
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "Booking is not confirmed" },
      { status: 400 }
    );
  }

  // Create check-in
  const { data, error } = await supabase
    .from("gym_checkins")
    .insert({
      user_id: user.id,
      photo_url,
      verified: verified || false,
      verification_result: verification_result || "",
      booking_id,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("Maximum 2 verified check-ins")) {
      return NextResponse.json(
        { error: "You can only check in twice per day" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If verified, update streak
  if (verified) {
    const { error: streakError } = await supabase.rpc("update_streak", {
      p_user_id: user.id,
    });
    if (streakError) {
      console.error("Streak update failed:", streakError);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
