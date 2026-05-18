import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type ProfileRole = "student" | "teacher" | "admin";

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

/**
 * Accept only same-origin relative paths (single leading slash, no protocol-relative URLs).
 */
export function sanitizeRelativeRedirectPath(path: string | null | undefined): string | null {
  if (path == null) return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed;
}

/** Admin post-login next param must stay under /admin. */
export function sanitizeAdminRedirectPath(path: string | null | undefined): string | null {
  const safe = sanitizeRelativeRedirectPath(path);
  if (!safe) return null;
  if (safe === "/admin" || safe.startsWith("/admin/")) return safe;
  return null;
}

export function resolvePostAuthRedirect(
  role: ProfileRole,
  profile: {
    teacher_onboarding_complete?: boolean | null;
    companion_chosen?: boolean | null;
  },
  nextPath?: string | null,
): string {
  const safeNext = sanitizeRelativeRedirectPath(nextPath);

  if (role === "admin") {
    return sanitizeAdminRedirectPath(safeNext) ?? "/admin";
  }
  if (role === "teacher") {
    if (!profile.teacher_onboarding_complete) return "/onboarding/teacher";
    return safeNext ?? "/dashboard";
  }
  if (!profile.companion_chosen) return "/student/choose-companion";
  return safeNext ?? "/dashboard";
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
