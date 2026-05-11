import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";

/** Presence-only: do not verify JWT at the edge. */
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
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
    "/dashboard",
    "/onboarding",
    "/profile",
    "/messages",
    "/loyalty",
    "/booking",
    "/upgrade",
    "/resolution",
    "/supabase",
    "/student",
  ];
  for (const root of protectedRoots) {
    if (pathname === root || pathname.startsWith(`${root}/`)) return true;
  }

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith(LOGIN_PATH)) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (hasSupabaseAuthCookie(req)) {
    return NextResponse.next();
  }

  const nextParam = `${pathname}${search ?? ""}`;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.search = "";
  loginUrl.searchParams.set("next", nextParam);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|css|js|mjs|map|woff2?|ttf|eot)$).*)",
  ],
};
