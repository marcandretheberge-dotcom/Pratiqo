import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolveProfileRoleOnAuth, type ProfileRole } from "@/lib/auth/admin";
import {
  primaryRoleForPreAuthIntent,
  resolveOAuthProfilePatch,
  type PreAuthOnboardingIntent,
} from "@/lib/auth/preAuthOnboardingIntent";

export type EnsuredAuthProfile = {
  id: string;
  email: string | null;
  name: string | null;
  display_name?: string | null;
  role: ProfileRole;
  teacher_onboarding_complete?: boolean | null;
  companion_chosen?: boolean | null;
  dashboard?: unknown;
};

type ExistingProfile = {
  email?: string | null;
  name?: string | null;
  display_name?: string | null;
  role?: string | null;
  teacher_onboarding_complete?: boolean | null;
  companion_chosen?: boolean | null;
  dashboard?: unknown;
};

export function parseProfileEnsureIntent(value: unknown): PreAuthOnboardingIntent | null {
  return value === "teacher" || value === "learner" ? value : null;
}

export function displayNameForAuthProfile(user: Pick<User, "email" | "user_metadata">): string | null {
  const metadata = user.user_metadata ?? {};
  const candidates = [
    metadata.display_name,
    metadata.name,
    user.email?.split("@")[0],
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function resolveEnsuredProfileRole(input: {
  intent?: PreAuthOnboardingIntent | null;
  existingRole?: string | null;
  email?: string | null;
  adminLoginEmails?: string[];
}): ProfileRole {
  if (input.intent) {
    return primaryRoleForPreAuthIntent(input.intent, input.existingRole);
  }
  return resolveProfileRoleOnAuth({
    existingRole: input.existingRole,
    signUpRoleParam: null,
    email: input.email,
    adminLoginEmails: input.adminLoginEmails,
  });
}

export async function ensureAuthProfileForUser(
  admin: SupabaseClient,
  user: User,
  options?: {
    intent?: PreAuthOnboardingIntent | null;
    displayName?: string | null;
    adminLoginEmails?: string[];
  },
): Promise<{ profile: EnsuredAuthProfile | null; error: unknown | null }> {
  const { data: existingProfile, error: readError } = await admin
    .from("profiles")
    .select("email, name, display_name, role, teacher_onboarding_complete, companion_chosen, dashboard")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return { profile: null, error: readError };
  }

  const existing = existingProfile as ExistingProfile | null;
  const intent = options?.intent ?? null;
  const resolvedRole = resolveEnsuredProfileRole({
    intent,
    existingRole: existing?.role,
    email: user.email,
    adminLoginEmails: options?.adminLoginEmails,
  });
  const displayName =
    options?.displayName?.trim() ||
    existing?.display_name?.trim() ||
    existing?.name?.trim() ||
    displayNameForAuthProfile(user);
  const intentPatch = resolveOAuthProfilePatch({
    intent,
    existingRole: existing?.role,
    existingDashboard: existing?.dashboard,
  });

  const profileUpsert: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? existing?.email ?? "",
    role: resolvedRole,
    updated_at: new Date().toISOString(),
  };

  if (!existing) {
    profileUpsert.name = displayName;
    profileUpsert.display_name = displayName;
    profileUpsert.companion_chosen = false;
    profileUpsert.teacher_onboarding_complete = false;
  } else {
    if (!existing.name && displayName) profileUpsert.name = displayName;
    if (!existing.display_name && displayName) profileUpsert.display_name = displayName;
  }

  if (intentPatch) {
    profileUpsert.dashboard = intentPatch.dashboard;
  }

  const { data: profile, error: upsertError } = await admin
    .from("profiles")
    .upsert(profileUpsert, { onConflict: "id" })
    .select("id, email, name, display_name, role, teacher_onboarding_complete, companion_chosen, dashboard")
    .single();

  if (upsertError) {
    return { profile: null, error: upsertError };
  }

  return {
    profile: profile as EnsuredAuthProfile,
    error: null,
  };
}
