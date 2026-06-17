import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  sanitizeAdminRedirectPath,
  sanitizeRelativeRedirectPath,
} from "@/lib/auth/redirects";
import type { ProfileRole } from "@/lib/auth/postAuthRedirect";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";

// Re-exported for back-compat with existing callers (route handlers, tests).
// New code should prefer importing directly from `@/lib/auth/redirects`.
export { sanitizeAdminRedirectPath, sanitizeRelativeRedirectPath };
export type { ProfileRole };
export { resolvePostAuthRedirect };

export type AdminSessionResult =
  | { status: "ok"; userId: string; role: "admin" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; userId: string };

/** Parse ADMIN_LOGIN_EMAILS (comma/semicolon/newline separated), lowercase + trim. */
export function parseAdminLoginEmails(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const normalized = part.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    emails.push(normalized);
  }
  return emails;
}

export function isAllowlistedAdminEmail(
  email: string | null | undefined,
  allowlist: string[],
): boolean {
  if (!email?.trim() || allowlist.length === 0) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

/**
 * Resolve profiles.role after OAuth callback.
 * Admin rows and allowlisted emails win; never demote admin to student.
 */
export function resolveProfileRoleOnAuth(input: {
  existingRole: string | null | undefined;
  signUpRoleParam: string | null | undefined;
  email: string | null | undefined;
  adminLoginEmails?: string[];
}): ProfileRole {
  const allowlist = input.adminLoginEmails ?? parseAdminLoginEmails(process.env.ADMIN_LOGIN_EMAILS);

  if (input.existingRole === "admin") return "admin";
  if (isAllowlistedAdminEmail(input.email, allowlist)) return "admin";
  if (input.signUpRoleParam === "teacher") return "teacher";
  if (input.existingRole === "teacher" || input.existingRole === "student") {
    return input.existingRole;
  }
  return "student";
}

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          cookieStore.set(c.name, c.value, c.options);
        }
      },
    },
  });
}

/** Server-side admin session check (service-role profile read). */
export async function getAdminSession(): Promise<AdminSessionResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { status: "unauthenticated" };

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { status: "unauthenticated" };

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[auth/admin] profile read failed", profileErr.message);
    return { status: "forbidden", userId: user.id };
  }

  if ((profile as { role?: string } | null)?.role === "admin") {
    return { status: "ok", userId: user.id, role: "admin" };
  }

  return { status: "forbidden", userId: user.id };
}

/** Redirect unauthenticated users to login and non-admins away from admin routes. */
export async function requireAdminPage(nextPath = "/admin"): Promise<void> {
  const session = await getAdminSession();
  if (session.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (session.status === "forbidden") {
    redirect("/dashboard");
  }
}

export function isAdminProfile(profile: { role?: string | null } | null | undefined): boolean {
  return profile?.role === "admin";
}

// ── Admin API route guard ─────────────────────────────────────────────────────
//
// Shared helper for /api/admin/* route handlers. Mirrors the inline
// requireAdmin() that already lives in /api/admin/review/route.ts but
// centralizes it so future admin endpoints can't drift on the auth check.
//
// Flow:
//   1. Parse `Authorization: Bearer <token>` from the incoming request.
//   2. Validate the JWT with the Supabase anon client (auth.getUser(token)).
//   3. Read profiles.role through the service-role client.
//   4. Return a typed result; on failure also surface a NextResponse the
//      caller can `return` directly to keep route bodies short.

export type AdminApiAuthResult =
  | {
      status: "ok";
      user: { id: string; email: string | null };
      admin: ReturnType<typeof getSupabaseAdmin>;
    }
  | { status: "error"; response: NextResponse };

export async function requireAdminApi(req: Request): Promise<AdminApiAuthResult> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return {
      status: "error",
      response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return {
      status: "error",
      response: NextResponse.json({ error: "Configuration manquante." }, { status: 500 }),
    };
  }

  const supabaseUser = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return {
      status: "error",
      response: NextResponse.json({ error: "Session invalide." }, { status: 401 }),
    };
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { role?: string } | null)?.role !== "admin") {
    return {
      status: "error",
      response: NextResponse.json({ error: "Accès refusé. Rôle admin requis." }, { status: 403 }),
    };
  }

  return {
    status: "ok",
    user: { id: user.id, email: user.email ?? null },
    admin,
  };
}

// ── Role-change audit insert ─────────────────────────────────────────────────
//
// Append-only writer for public.admin_role_change_audit (migration 079).
// Always called through the service-role client; never throws — audit
// failures must not block the role mutation itself, but they ARE logged
// to stderr so monitoring can flag silent forensic gaps.

export async function insertAdminRoleChangeAudit(
  admin: ReturnType<typeof getSupabaseAdmin>,
  input: {
    actorId: string;
    actorEmail: string | null;
    targetId: string;
    targetEmail: string | null;
    previousRole: string | null;
    newRole: ProfileRole;
    reason?: string | null;
    source?: string;
  },
): Promise<void> {
  try {
    const { error } = await admin.from("admin_role_change_audit").insert({
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      target_id: input.targetId,
      target_email: input.targetEmail,
      previous_role: input.previousRole,
      new_role: input.newRole,
      reason: input.reason?.trim() || null,
      source: input.source ?? "admin/users",
    });
    if (error) {
      console.error("[auth/admin] admin_role_change_audit insert failed", error.message);
    }
  } catch (e) {
    console.error("[auth/admin] admin_role_change_audit insert threw", e);
  }
}

// ── Role validation ──────────────────────────────────────────────────────────
//
// Centralized list of role values an admin is allowed to assign through the
// admin/users surface. Mirrors ProfileRole exactly; kept as a typed Set so
// the API route can do constant-time membership checks and so the test
// suite can pin the allowlist as a contract (no future "owner" / "super"
// roles sneaking in without explicit migration).

export const ADMIN_ASSIGNABLE_ROLES: ReadonlySet<ProfileRole> = new Set([
  "student",
  "teacher",
  "admin",
]);

export function isAssignableRole(value: unknown): value is ProfileRole {
  return typeof value === "string" && ADMIN_ASSIGNABLE_ROLES.has(value as ProfileRole);
}
