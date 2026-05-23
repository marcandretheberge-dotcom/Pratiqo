/**
 * Contact-sharing gate for internal messaging.
 *
 * The gate is "open" between a sender/receiver pair once they have at least
 * one completed lesson together. Until then, `sanitizeContactInfo` masks
 * contact details and the UI shows a soft notice.
 *
 * Companion-style completed lesson convention (see
 * `lib/companion/rewards.ts::COMPLETED_LESSON_FOR_COMPANION_FILTER`):
 *   status = 'completed' OR completed_at IS NOT NULL
 * Reusing this filter keeps every product surface aligned with the same
 * definition of "the pair has lessoned together".
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { COMPLETED_LESSON_FOR_COMPANION_FILTER } from "@/lib/companion/rewards";

/**
 * Look up the teachers row id for a given auth user id, if any.
 * Returns null when the user has no teacher row (i.e. is a student).
 */
async function lookupTeacherRowId(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as { id?: string } | null;
  return typeof row?.id === "string" && row.id ? row.id : null;
}

/**
 * True iff `senderId` and `receiverId` have at least one completed booking
 * together. The pair is treated as (student auth user id, teacher row id):
 *   - exactly one of the two users must be a teacher
 *   - the other is the student
 *
 * If neither is a teacher (e.g. two students DMing — currently impossible
 * through the API but defended against here), the gate stays closed.
 * If both lookups return a teacher row (impossible by data model, but
 * defended against here), the gate also stays closed — there is no
 * meaningful "student id" in that pair.
 */
export async function hasCompletedLessonBetween(
  admin: SupabaseClient,
  senderId: string,
  receiverId: string,
): Promise<boolean> {
  if (!senderId || !receiverId || senderId === receiverId) return false;

  const [senderTeacherId, receiverTeacherId] = await Promise.all([
    lookupTeacherRowId(admin, senderId),
    lookupTeacherRowId(admin, receiverId),
  ]);

  // Exactly one side must be the teacher for a (student, teacher) pair.
  if ((senderTeacherId && receiverTeacherId) || (!senderTeacherId && !receiverTeacherId)) {
    return false;
  }

  const teacherRowId = senderTeacherId ?? receiverTeacherId!;
  const studentUserId = senderTeacherId ? receiverId : senderId;

  const { data, error } = await admin
    .from("bookings")
    .select("id")
    .eq("student_id", studentUserId)
    .eq("teacher_id", teacherRowId)
    .or(COMPLETED_LESSON_FOR_COMPANION_FILTER)
    .limit(1);

  if (error) {
    // Fail closed: if we can't determine the gate, keep masking. The
    // sender still gets their message through (just masked), so this
    // never blocks legitimate marketplace usage.
    console.warn("[messaging/contactGate] gate query failed, defaulting to closed", error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}
