import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/verify", "/auth/confirm", "/api/verify-yc"];

function redirectWithCookies(
  url: URL,
  sourceResponse: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  // API routes handle their own auth — don't redirect them
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  if (isApiRoute) {
    return supabaseResponse;
  }

  const isPublic = publicPaths.some(
    (p) =>
      request.nextUrl.pathname === p ||
      request.nextUrl.pathname.startsWith("/api/verify-yc")
  );

  const authPages = ["/", "/login", "/signup", "/verify"];
  const isAuthPage = authPages.includes(request.nextUrl.pathname);

  // Logged-in users hitting landing/auth pages → send to profile
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile";
    return redirectWithCookies(url, supabaseResponse);
  }

  // Not logged in and hitting a protected page → send to login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
