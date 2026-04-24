import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

/** Paths that skip auth entirely. `/onboarding` is handled below so élèves connectés peuvent être redirigés. */
const publicPaths = ["/", "/login", "/become-teacher", "/auth/callback", "/legal"];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/.well-known")) return true;
  if (pathname.startsWith("/teacher/profile/")) return true;
  if (pathname.startsWith("/group-sessions")) return true;
  if (pathname.startsWith("/auth/")) return true;

  return publicPaths.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(`${p}/`);
  });
}

/** Onboarding is readable without session; role rules apply once a user exists. */
function isOnboardingPath(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

/** Public marketplace teacher page: /teacher/profile/:id (not the teacher index). */
function isPublicTeacherProfileView(pathname: string) {
  return /^\/teacher\/profile\/[^/]+$/.test(pathname);
}

function studentForbiddenPath(pathname: string) {
  if (pathname === "/loyalty" || pathname.startsWith("/loyalty/")) return true;
  if (pathname.startsWith("/teacher/settings")) return true;
  if (pathname.startsWith("/teacher/progress")) return true;
  if (pathname.startsWith("/teacher/group-sessions")) return true;
  if (pathname.startsWith("/teacher/verification")) return true;
  if (pathname === "/teacher/profile") return true;
  if (pathname.startsWith("/teacher/") && !isPublicTeacherProfileView(pathname)) return true;
  return false;
}

function teacherForbiddenPath(pathname: string) {
  if (pathname.startsWith("/student")) return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/group-sessions" || pathname.startsWith("/group-sessions/")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isOnboardingPath(pathname)) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (prof as { role?: string | null } | null)?.role ?? null;

  if (!role || (role !== "teacher" && role !== "student")) {
    if (pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return response;
  }

  if (role === "student") {
    if (pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (studentForbiddenPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return response;
  }

  if (role === "teacher") {
    if (teacherForbiddenPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
