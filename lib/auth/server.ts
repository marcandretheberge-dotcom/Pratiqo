import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ServerProfile = {
  id: string;
  role: string | null;
};

export type AppRole = "student" | "teacher" | "admin";

export type ServerAuthResult = {
  supabase: SupabaseClient;
  user: User | null;
};

/**
 * Server-side auth helper for RSC layouts and Route Handlers.
 *
 * Uses @supabase/ssr createServerClient so the JWT is read from cookies and
 * cryptographically verified by Supabase, not just presence-checked.
 *
 * Usage in a Server Component layout:
 *   const { user } = await getCurrentUserServer();
 *   if (!user) redirect('/login');
 *
 * The returned `supabase` client inherits the user's session and respects RLS,
 * making it safe for profile lookups without elevating to service role.
 */
export async function getCurrentUserServer(): Promise<ServerAuthResult> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Layouts are read-only, so token refresh writes are intentionally no-ops.
        // Route handlers that need to refresh tokens should handle setAll themselves.
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function requireCurrentUserServer(nextPath = "/dashboard"): Promise<ServerAuthResult & { user: User }> {
  const auth = await getCurrentUserServer();

  if (!auth.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return auth as ServerAuthResult & { user: User };
}

export async function getCurrentProfileServer(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServerProfile | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth/server] profile lookup failed", { userId });
    return null;
  }

  return (profile as ServerProfile | null) ?? null;
}

function isAppRole(role: string | null | undefined): role is AppRole {
  return role === "student" || role === "teacher" || role === "admin";
}

function homeForRole(role: string | null | undefined): string {
  if (role === "admin") return "/admin/operations";
  if (role === "teacher" || role === "student") return "/dashboard";
  return "/onboarding";
}

export async function requireRoleServer(
  role: AppRole,
  nextPath = "/dashboard",
): Promise<
  ServerAuthResult & {
    user: User;
    profile: ServerProfile & { role: AppRole };
  }
> {
  const auth = await requireCurrentUserServer(nextPath);
  const profile = await getCurrentProfileServer(auth.supabase, auth.user.id);

  if (!isAppRole(profile?.role)) {
    redirect("/onboarding");
  }

  if (profile.role !== role) {
    redirect(homeForRole(profile.role));
  }

  return { ...auth, profile: profile as ServerProfile & { role: AppRole } };
}

export async function requireAnyRoleServer(
  roles: readonly AppRole[],
  nextPath = "/dashboard",
): Promise<
  ServerAuthResult & {
    user: User;
    profile: ServerProfile & { role: AppRole };
  }
> {
  const auth = await requireCurrentUserServer(nextPath);
  const profile = await getCurrentProfileServer(auth.supabase, auth.user.id);

  if (!isAppRole(profile?.role)) {
    redirect("/onboarding");
  }

  if (!roles.includes(profile.role)) {
    redirect(homeForRole(profile.role));
  }

  return { ...auth, profile: profile as ServerProfile & { role: AppRole } };
}

export async function requireAdminServer(nextPath = "/admin/operations"): Promise<
  ServerAuthResult & {
    user: User;
    profile: ServerProfile;
  }
> {
  const auth = await requireCurrentUserServer(nextPath);
  const profile = await getCurrentProfileServer(auth.supabase, auth.user.id);

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { ...auth, profile };
}
