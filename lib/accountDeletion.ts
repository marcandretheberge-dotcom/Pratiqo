import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ACTIVE_BOOKING_STATUSES = ["pending_payment", "confirmed"] as const;
const ACTIVE_GROUP_SESSION_STATUSES = ["open", "confirmed"] as const;
const ACTIVE_GROUP_REGISTRATION_STATUSES = ["confirmed"] as const;

type DeletionResult = {
  activeBookingsPending: boolean;
};

export async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("teachers").select("id").eq("user_id", userId).maybeSingle();
  return typeof data?.id === "string" ? data.id : null;
}

export async function hasActiveBookings(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const teacherId = await getTeacherIdForUser(userId);

  const studentBookings = admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", userId)
    .in("status", [...ACTIVE_BOOKING_STATUSES]);

  const teacherBookings = teacherId
    ? admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .in("status", [...ACTIVE_BOOKING_STATUSES])
    : null;

  const groupRegistrations = admin
    .from("group_registrations")
    .select("id", { count: "exact", head: true })
    .eq("student_id", userId)
    .in("status", [...ACTIVE_GROUP_REGISTRATION_STATUSES]);

  const groupSessions = teacherId
    ? admin
        .from("group_sessions")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .in("status", [...ACTIVE_GROUP_SESSION_STATUSES])
    : null;

  const [studentRes, teacherRes, groupRegistrationRes, groupSessionRes] = await Promise.all([
    studentBookings,
    teacherBookings,
    groupRegistrations,
    groupSessions,
  ]);

  return Boolean(
    (studentRes.count ?? 0) > 0 ||
      ((teacherRes && (teacherRes.count ?? 0) > 0) ?? false) ||
      (groupRegistrationRes.count ?? 0) > 0 ||
      ((groupSessionRes && (groupSessionRes.count ?? 0) > 0) ?? false),
  );
}

export async function deactivatePublicPresence(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  await admin
    .from("profiles")
    .update({
      is_active: false,
      deactivated_at: now,
      updated_at: now,
    })
    .eq("id", userId);

  await admin
    .from("teachers")
    .update({
      is_public: false,
      deactivated_at: now,
      updated_at: now,
    })
    .eq("user_id", userId);
}

export async function requestAccountDeletion(userId: string): Promise<DeletionResult> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const activeBookingsPending = await hasActiveBookings(userId);

  await admin
    .from("profiles")
    .update({
      is_active: false,
      deactivated_at: now,
      deletion_requested_at: now,
      updated_at: now,
    })
    .eq("id", userId);

  await admin
    .from("teachers")
    .update({
      is_public: false,
      deactivated_at: now,
      updated_at: now,
    })
    .eq("user_id", userId);

  // TODO: Full anonymization must be reviewed before changing historical
  // financial, Stripe, booking, refund, dispute, review, or message records.
  return { activeBookingsPending };
}

export async function anonymizeProfileIfSafe(_userId: string): Promise<{ skipped: true }> {
  // V1 intentionally does not anonymize automatically. Data retention rules
  // need an admin/legal review before personal fields are stripped.
  return { skipped: true };
}
