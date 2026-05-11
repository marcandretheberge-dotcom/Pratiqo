import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";

/** Presence-only: do not verify JWT at the edge. */
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

function isPublicTeacherProfile(pathname: string): boolean {
  return pathname === "/teacher/profile" || pathname.startsWith("/teacher/profile/");
}

/** Public: listing + detail; not /group-sessions/:id/success */
function isPublicGroupSessionsPath(pathname: string): boolean {
  if (pathname === "/group-sessions" || pathname === "/group-sessions/") return true;
  return /^\/group-sessions\/[^/]+\/?$/.test(pathname);
}

function isGroupSessionSuccessPath(pathname: string): boolean {
  return /^\/group-sessions\/[^/]+\/success/.test(pathname);
}

function requiresAuthForPath(pathname: string): boolean {
  if (isPublicTeacherProfile(pathname)) return false;
  if (isPublicGroupSessionsPath(pathname)) return false;

  if (isGroupSessionSuccessPath(pathname)) return true;

  const protectedPrefixes = [
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
  for (const p of protectedPrefixes) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return true;
  }

  if (pathname.startsWith("/teacher")) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith(LOGIN_PATH)) {
    return NextResponse.next();
  }

  if (!requiresAuthForPath(pathname)) {
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
