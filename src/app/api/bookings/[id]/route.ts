import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeAttendee } from "@/lib/google-calendar";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await request.json();

  if (status !== "cancelled") {
    return NextResponse.json(
      { error: 'Only "cancelled" status is supported' },
      { status: 400 }
    );
  }

  // Rollback any check-in linked to this booking before cancelling
  const { error: rollbackError } = await supabase.rpc(
    "rollback_checkin_for_booking",
    { p_booking_id: id, p_user_id: user.id }
  );
  if (rollbackError) {
    console.error("Checkin rollback failed:", rollbackError);
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Google Calendar sync — remove attendee (best-effort)
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (data.google_event_id && profile?.email) {
      await removeAttendee(data.google_event_id, profile.email);
    }
  } catch (calError) {
    console.error("Calendar sync failed:", calError);
  }

  return NextResponse.json(data);
}
