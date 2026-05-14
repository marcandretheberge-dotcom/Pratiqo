import { NextResponse, type NextRequest } from "next/server";

/**
 * Cookie-presence gate (edge-compatible).
 * This is Layer 1 — a fast check that a Supabase auth cookie exists.
 * Layer 2 (RSC layouts) does a real `getUser()` call that cryptographically
 * verifies the session before rendering any HTML.
 */
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export function middleware(req: NextRequest) {
  if (!hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.pathname;
    url.pathname = "/login";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  // Forward the current pathname as a request header so RSC layouts can read
  // it via `headers()` without needing usePathname (which is client-only).
  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  return res;
}

/**
 * Explicit allowlist — only app-shell routes that require authentication.
 * Public routes (/, /login, /auth/*, /api/*, /[locale]/*, /legal/*) are
 * never matched and never blocked.
 */
export const config = {
  matcher: [
    "/dashboard",
    "/student/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/messages/:path*",
    "/booking/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
    "/loyalty/:path*",
    "/resolution/:path*",
    "/upgrade/:path*",
    "/supabase/:path*",
  ],
};
