import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirectTo = request.nextUrl.clone();

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email",
    });

    if (!error) {
      redirectTo.pathname = "/profile";
      redirectTo.searchParams.delete("token_hash");
      redirectTo.searchParams.delete("type");
      return NextResponse.redirect(redirectTo);
    }
  }

  // Verification failed — send to login with error hint
  redirectTo.pathname = "/login";
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  return NextResponse.redirect(redirectTo);
}
