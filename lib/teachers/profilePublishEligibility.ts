import { isTeacherMarketSupported } from "@/lib/config/markets";
import {
  buildTeacherSetupChecklist,
  type TeacherSetupChecklistItem,
  type TeacherSetupSectionId,
} from "@/lib/teachers/teacherSetupProgress";
import { isTeacherMarketplaceVisibleRow } from "@/lib/teachers/marketplaceVisibility";

export type TeacherProfileVisibilityStatus =
  | "admin_hidden"
  | "public"
  | "incomplete"
  | "ready_to_publish"
  | "private_draft";

export type TeacherProfilePublishInput = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  bio?: string | null;
  disciplineCount?: number;
  price_per_lesson?: number | null;
  availability?: unknown[] | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  is_public?: boolean | null;
  is_demo?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  identity_status?: string | null;
  profile_is_active?: boolean | null;
  profile_deactivated_at?: string | null;
  profile_deleted_at?: string | null;
  profile_anonymized_at?: string | null;
};

export type TeacherProfilePublishEvaluation = {
  status: TeacherProfileVisibilityStatus;
  checklist: TeacherSetupChecklistItem[];
  missingSectionIds: TeacherSetupSectionId[];
  canPublish: boolean;
  canUnpublish: boolean;
  marketplaceVisible: boolean;
  blockers: string[];
};

function isAdminOrProfileBlocked(input: TeacherProfilePublishInput): boolean {
  if (input.profile_is_active === false) return true;
  if (input.profile_deactivated_at || input.profile_deleted_at || input.profile_anonymized_at) return true;
  if (input.deactivated_at || input.deleted_at) return true;
  return false;
}

export function evaluateTeacherProfilePublishEligibility(
  input: TeacherProfilePublishInput,
): TeacherProfilePublishEvaluation {
  const checklist = buildTeacherSetupChecklist({
    name: input.name,
    bio: input.bio,
    disciplineCount: input.disciplineCount ?? 0,
    pricePerLesson: Number(input.price_per_lesson) || 0,
    availabilityCount: Array.isArray(input.availability) ? input.availability.length : 0,
    city: input.city,
    region: input.region,
  });
  const missingSectionIds = checklist.filter((item) => !item.done).map((item) => item.id);
  const setupComplete = missingSectionIds.length === 0;
  const countryCode = String(input.country_code ?? "").trim().toUpperCase();
  const marketSupported = isTeacherMarketSupported(countryCode);

  const blockers: string[] = [];
  if (isAdminOrProfileBlocked(input)) blockers.push("admin_or_profile_blocked");
  if (!setupComplete) blockers.push("setup_incomplete");
  if (!marketSupported) blockers.push("unsupported_market");
  if ((input.identity_status ?? "none") === "failed") blockers.push("identity_failed");

  const marketplaceVisible = isTeacherMarketplaceVisibleRow({
    id: input.id,
    user_id: input.user_id,
    is_public: input.is_public,
    is_demo: input.is_demo,
    deactivated_at: input.deactivated_at,
    deleted_at: input.deleted_at,
    identity_status: input.identity_status,
    profile_is_active: input.profile_is_active,
    profile_deactivated_at: input.profile_deactivated_at,
    profile_deleted_at: input.profile_deleted_at,
    profile_anonymized_at: input.profile_anonymized_at,
  });

  let status: TeacherProfileVisibilityStatus;
  if (isAdminOrProfileBlocked(input)) {
    status = "admin_hidden";
  } else if (input.is_public === true) {
    status = "public";
  } else if (!setupComplete) {
    status = "incomplete";
  } else if (setupComplete) {
    status = "ready_to_publish";
  } else {
    status = "private_draft";
  }

  const canPublish =
    !isAdminOrProfileBlocked(input) &&
    setupComplete &&
    marketSupported &&
    input.is_public !== true &&
    (input.identity_status ?? "none") !== "failed";

  const canUnpublish = input.is_public === true && !isAdminOrProfileBlocked(input);

  return {
    status,
    checklist,
    missingSectionIds,
    canPublish,
    canUnpublish,
    marketplaceVisible,
    blockers,
  };
}

export function teacherProfileVisibilityStatusLabelKey(
  status: TeacherProfileVisibilityStatus,
): string {
  switch (status) {
    case "admin_hidden":
      return "teacherProfileVisibilityStatusAdminHidden";
    case "public":
      return "teacherProfileVisibilityStatusPublic";
    case "incomplete":
      return "teacherProfileVisibilityStatusIncomplete";
    case "ready_to_publish":
      return "teacherProfileVisibilityStatusReady";
    default:
      return "teacherProfileVisibilityStatusPrivateDraft";
  }
}

export function teacherProfileVisibilityStatusBodyKey(
  status: TeacherProfileVisibilityStatus,
): string {
  switch (status) {
    case "admin_hidden":
      return "teacherProfileVisibilityStatusAdminHiddenBody";
    case "public":
      return "teacherProfileVisibilityStatusPublicBody";
    case "incomplete":
      return "teacherProfileVisibilityStatusIncompleteBody";
    case "ready_to_publish":
      return "teacherProfileVisibilityStatusReadyBody";
    default:
      return "teacherProfileVisibilityStatusPrivateDraftBody";
  }
}
