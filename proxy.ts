import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLocaleFromPath, stripLocale } from "@/lib/i18n/routing";
import {
  isUnprefixedMarketingPath,
  legacyMarketingRedirectPath,
  localizedMarketingSlugRedirect,
} from "@/lib/i18n/marketingPaths";

/**
 * Edge-runtime request proxy (Next 16 convention).
 *
 * Responsibilities:
 *   - 301-redirect unprefixed marketing URLs to `/{locale}/…` (step 1.3).
 *   - Gate the authenticated app surface behind a Supabase auth-cookie check.
 */

const LOGIN_PATH = "/login";

/** Presence-only: do not verify JWT at the edge. */
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

/**
 * Protected app surface only. Pass **pathname without locale prefix** once
 * marketing routes are prefixed; bare paths like `/dashboard` stay supported
 * until step 1.4 migrates the app tree.
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
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith(LOGIN_PATH)) {
    return NextResponse.next();
  }

  const pathForAuth = getLocaleFromPath(pathname) ? stripLocale(pathname) : pathname;

  // ── Marketing locale prefix (301) ─────────────────────────────────────────
  if (!getLocaleFromPath(pathname) && isUnprefixedMarketingPath(pathname)) {
    const target = legacyMarketingRedirectPath(pathname, search);
    const dest = new URL(target, req.url);
    return NextResponse.redirect(dest, 301);
  }

  const wrongLocaleSlugTarget = localizedMarketingSlugRedirect(pathname, search);
  if (wrongLocaleSlugTarget) {
    return NextResponse.redirect(new URL(wrongLocaleSlugTarget, req.url), 301);
  }

  if (!isProtectedPath(pathForAuth)) {
    return NextResponse.next();
  }

  if (hasSupabaseAuthCookie(req)) {
    // Forward the pathname as a header so RSC layouts can read it via
    // next/headers — needed for the /legal bypass in app/(app)/layout.tsx.
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathForAuth);
    return res;
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
