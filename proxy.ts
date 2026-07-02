import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildLoginHrefForProtectedReturn } from "@/lib/auth/preAuthOnboardingIntent";

const LOGIN_PATH = "/login";
const CONNEXION_PATH = "/connexion";

/** Presence-only: do not verify JWT at the edge. */
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export function isBlockedSupabaseDemoPath(pathname: string): boolean {
  return pathname === "/supabase" || pathname.startsWith("/supabase/");
}

/**
 * Protected app surface only. Everything else stays public (marketing, SEO, public teacher/group pages).
 */
function isProtectedPath(pathname: string): boolean {
  // Post-payment group session page
  if (/^\/group-sessions\/[^/]+\/success/.test(pathname)) return true;

  // Teacher app area — not public profiles
  if (pathname === "/teacher" || pathname.startsWith("/teacher/")) {
    if (pathname === "/teacher/profile" || pathname.startsWith("/teacher/profile/")) return false;
    return true;
  }

  const protectedRoots = [
    "/admin",
    "/dashboard",
    "/onboarding",
    "/profile",
    "/messages",
    "/loyalty",
    "/booking",
    "/upgrade",
    "/resolution",
    "/student",
  ];
  for (const root of protectedRoots) {
    if (pathname === root || pathname.startsWith(`${root}/`)) return true;
  }

  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isBlockedSupabaseDemoPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Supabase may deliver the PKCE ?code= on Site URL (/) when redirect_to is not matched.
  // Forward any stray OAuth codes to the server callback route before other routing.
  if (!pathname.startsWith("/auth/callback") && req.nextUrl.searchParams.has("code")) {
    const callbackUrl = new URL("/auth/callback", req.url);
    req.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(callbackUrl);
  }

  if (pathname.startsWith(LOGIN_PATH) || pathname.startsWith(CONNEXION_PATH)) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (hasSupabaseAuthCookie(req)) {
    return NextResponse.next();
  }

  const nextParam = `${pathname}${req.nextUrl.search ?? ""}`;
  const loginUrl = new URL(buildLoginHrefForProtectedReturn(nextParam), req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|css|js|mjs|map|woff2?|ttf|eot)$).*)",
  ],
};
