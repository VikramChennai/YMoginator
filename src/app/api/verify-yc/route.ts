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

    if (!data.verified) {
      return NextResponse.json(
        { error: "Verification failed. This link may be invalid." },
        { status: 400 }
      );
    }

    // Extract the verification code from the URL
    const pathParts = parsed.pathname.split("/");
    const code = pathParts[pathParts.length - 1].replace(".json", "");

    // Expected fields from YC verification response:
    //   - name: string (top-level)
    //   - email: string (top-level)
    //   - companies: [{ name, url, batch, directory_url, title, tags }]
    //   - batches: [{ name, tag }]
    //   - linkedin, twitter (optional)
    const company = data.companies?.[0]?.name || "";
    const batch = data.companies?.[0]?.batch || data.batches?.[0]?.name || "";

    const result = {
      name: data.name || "",
      company,
      batch,
      email: data.email || "",
      code,
    };

    // Warn if company details are missing — user likely needs to enable
    // "Show company details" on their Bookface verification link
    if (!company || !batch) {
      return NextResponse.json({
        ...result,
        warning: "Company/batch info missing. Make sure 'Show company details' is enabled on your Bookface verification link.",
      });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to verify. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
