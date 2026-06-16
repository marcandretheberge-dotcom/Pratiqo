import type { Teacher } from "@/types";
import { normalizeTeacherImageUrl, resolveTeacherPublicPhoto } from "@/lib/teacherPhoto";

export type TeacherPlansApiPayload = {
  plans?: Record<string, string>;
  photos?: Record<string, string | null>;
  /**
   * Marketplace-only eligibility from /api/teachers/plans.
   * When omitted or empty, callers that already read teachers_public must NOT
   * drop rows — SEO consent is unrelated to marketplace discovery.
   */
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
  const eligibleIds = body.eligibleTeacherIds;
  const eligible =
    Array.isArray(eligibleIds) && eligibleIds.length > 0 ? new Set(eligibleIds) : null;
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
