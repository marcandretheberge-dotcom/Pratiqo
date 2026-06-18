import type { SupabaseClient } from "@supabase/supabase-js";
import { deactivatePublicPresence } from "@/lib/accountDeletion";

export type ProfileDeactivationAction =
  | "deactivate"
  | "reactivate"
  | "mark_deletion_requested"
  | "remove_public_teacher";

export type ProfileDeactivationSnapshot = {
  userId: string;
  role: string;
  isActive: boolean;
  profileDeactivatedAt: string | null;
  profileDeletedAt: string | null;
  profileAnonymizedAt: string | null;
  deletionRequestedAt: string | null;
  teacher: {
    id: string;
    isPublic: boolean;
    deactivatedAt: string | null;
    publicProfileEnabled: boolean;
    searchIndexingConsent: boolean;
    publicProfileSlug: string | null;
  } | null;
};

type AdminClient = SupabaseClient;

const TEACHER_SEO_CLEAR_FIELDS = {
  public_profile_enabled: false,
  search_indexing_consent: false,
  public_profile_last_indexable_at: null,
} as const;

export async function loadProfileDeactivationSnapshot(
  admin: AdminClient,
  userId: string,
): Promise<ProfileDeactivationSnapshot | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, role, is_active, deactivated_at, deleted_at, anonymized_at, deletion_requested_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const row = profile as {
    id: string;
    role: string;
    is_active: boolean | null;
    deactivated_at: string | null;
    deleted_at: string | null;
    anonymized_at: string | null;
    deletion_requested_at: string | null;
  };

  let teacher: ProfileDeactivationSnapshot["teacher"] = null;
  if (row.role === "teacher") {
    const { data: teacherRow } = await admin
      .from("teachers")
      .select(
        "id, is_public, deactivated_at, public_profile_enabled, search_indexing_consent, public_profile_slug",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (teacherRow) {
      const t = teacherRow as {
        id: string;
        is_public: boolean | null;
        deactivated_at: string | null;
        public_profile_enabled: boolean | null;
        search_indexing_consent: boolean | null;
        public_profile_slug: string | null;
      };
      teacher = {
        id: t.id,
        isPublic: t.is_public !== false,
        deactivatedAt: t.deactivated_at,
        publicProfileEnabled: t.public_profile_enabled === true,
        searchIndexingConsent: t.search_indexing_consent === true,
        publicProfileSlug: t.public_profile_slug,
      };
    }
  }

  return {
    userId: row.id,
    role: row.role,
    isActive: row.is_active !== false,
    profileDeactivatedAt: row.deactivated_at,
    profileDeletedAt: row.deleted_at,
    profileAnonymizedAt: row.anonymized_at,
    deletionRequestedAt: row.deletion_requested_at,
    teacher,
  };
}

async function clearTeacherSeoOnly(admin: AdminClient, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("teachers")
    .update({
      is_public: false,
      updated_at: now,
      ...TEACHER_SEO_CLEAR_FIELDS,
    })
    .eq("user_id", userId);
}

/** Full profile deactivation: hides from marketplace/SEO and blocks account activity. */
export async function adminDeactivateProfile(
  admin: AdminClient,
  userId: string,
  options?: { markDeletionRequested?: boolean },
): Promise<void> {
  const now = new Date().toISOString();

  await deactivatePublicPresence(userId);

  const profileUpdate: Record<string, unknown> = { updated_at: now };
  if (options?.markDeletionRequested) {
    profileUpdate.deletion_requested_at = now;
  }
  if (Object.keys(profileUpdate).length > 1) {
    await admin.from("profiles").update(profileUpdate).eq("id", userId);
  }

  await admin
    .from("teachers")
    .update({
      updated_at: now,
      ...TEACHER_SEO_CLEAR_FIELDS,
    })
    .eq("user_id", userId);
}

/** Teacher-only: remove from marketplace/search/SEO without deactivating the login account. */
export async function adminRemovePublicTeacherProfile(
  admin: AdminClient,
  userId: string,
): Promise<void> {
  await clearTeacherSeoOnly(admin, userId);
}

/** Reactivate profile when safe (not hard-deleted or anonymized). */
export async function adminReactivateProfile(admin: AdminClient, userId: string): Promise<void> {
  const now = new Date().toISOString();

  await admin
    .from("profiles")
    .update({
      is_active: true,
      deactivated_at: null,
      deletion_requested_at: null,
      updated_at: now,
    })
    .eq("id", userId);

  await admin
    .from("teachers")
    .update({
      is_public: true,
      deactivated_at: null,
      updated_at: now,
    })
    .eq("user_id", userId);
}

export function isProfileReactivationAllowed(snapshot: ProfileDeactivationSnapshot): boolean {
  if (snapshot.profileDeletedAt || snapshot.profileAnonymizedAt) return false;
  return !snapshot.isActive || Boolean(snapshot.profileDeactivatedAt || snapshot.deletionRequestedAt);
}

export function auditReasonForAction(
  action: ProfileDeactivationAction,
  reason: string | null | undefined,
): string {
  const trimmed = reason?.trim();
  const base = `profile-${action.replace(/_/g, "-")}`;
  return trimmed ? `${base}: ${trimmed}` : base;
}
