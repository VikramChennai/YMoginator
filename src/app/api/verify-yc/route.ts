import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Verification URL is required" },
        { status: 400 }
      );
    }

    // SSRF protection: only allow ycombinator.com URLs
    const parsed = new URL(url);
    if (
      parsed.hostname !== "ycombinator.com" &&
      parsed.hostname !== "www.ycombinator.com"
    ) {
      return NextResponse.json(
        { error: "Invalid URL. Must be a ycombinator.com verification link." },
        { status: 400 }
      );
    }

    if (!parsed.pathname.startsWith("/verify/")) {
      return NextResponse.json(
        { error: "Invalid verification URL format." },
        { status: 400 }
      );
    }

    // Ensure it ends with .json
    const verifyUrl = url.endsWith(".json") ? url : `${url}.json`;

    const response = await fetch(verifyUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not verify YC founder status. Check your link." },
        { status: 404 }
      );
    }

    const data = await response.json();

    // Extract the verification code from the URL
    const pathParts = parsed.pathname.split("/");
    const code = pathParts[pathParts.length - 1].replace(".json", "");

    return NextResponse.json({
      name: data.name || "",
      company: data.company || "",
      batch: data.batch || "",
      email: data.email || "",
      code,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to verify. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
