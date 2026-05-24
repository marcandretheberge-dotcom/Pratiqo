import type { Teacher } from "@/types";
import { normalizeTeacherImageUrl, resolveTeacherPublicPhoto } from "@/lib/teacherPhoto";

export type TeacherPlansApiPayload = {
  plans?: Record<string, string>;
  photos?: Record<string, string | null>;
  eligibleTeacherIds?: string[];
};

/**
 * Merge `/api/teachers/plans` metadata onto listing teachers.
 * Never replaces a resolved profile photo with an empty plans payload value.
 */
export function applyTeacherListingMetadata(
  teachers: Teacher[],
  body: TeacherPlansApiPayload,
): Teacher[] {
  const plans = body.plans ?? {};
  const eligible = body.eligibleTeacherIds ? new Set(body.eligibleTeacherIds) : null;
  const photos = body.photos ?? {};

  return teachers
    .filter((teacher) => !eligible || eligible.has(teacher.id))
    .map((teacher) => {
      const baseImageUrl = normalizeTeacherImageUrl(teacher);

      return {
        ...teacher,
        imageUrl: resolveTeacherPublicPhoto(photos[teacher.id], baseImageUrl),
        profilePlan: plans[teacher.id] ?? teacher.profilePlan ?? "free",
      };
    });
}
