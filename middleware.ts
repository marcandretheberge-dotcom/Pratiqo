import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/become-teacher")) return true;
  if (pathname.startsWith("/legal")) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/.well-known")) return true;
  return false;
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
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
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (prof as { role?: string | null } | null)?.role ?? null;

  if (!role || (role !== "teacher" && role !== "student")) {
    if (pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return response;
  }

  if (role === "student") {
    if (pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (studentForbiddenPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (role === "teacher") {
    if (teacherForbiddenPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
