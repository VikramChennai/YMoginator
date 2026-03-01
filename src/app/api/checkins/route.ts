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
    .select("*")
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

  const { photo_url, verified, verification_result } = await request.json();

  if (!photo_url) {
    return NextResponse.json(
      { error: "photo_url is required" },
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
