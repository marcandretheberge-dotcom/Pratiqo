import type { SupabaseClient } from "@supabase/supabase-js";
import { getDisciplineById } from "@/lib/disciplines";
import { computeAvailableDaysForTeacher } from "@/lib/teacherSlotQueries";
import {
  diagnoseTeacherSearchVisibility,
  type TeacherSearchVisibilityBlockerCode,
  type TeacherSearchVisibilityWarningCode,
} from "@/lib/teachers/searchVisibilityDiagnostics";
import {
  deriveTeacherReadinessContract,
  type TeacherStripeReadinessBlocker,
} from "@/lib/teachers/readinessContracts";
import {
  describeStripeIdentityStatus,
  getTeacherIdentityVerificationSource,
  isTeacherIdentityVerified,
  type TeacherIdentityVerificationSource,
} from "@/lib/teachers/identity";

type AdminClient = SupabaseClient;

export type AdminTeacher360Action = {
  id: string;
  label: string;
  href: string | null;
  status: "link" | "coming_soon";
};

export type AdminTeacher360 = {
  identity: {
    id: string;
    email: string | null;
    displayName: string | null;
    role: string | null;
    isActive: boolean | null;
    onboardingComplete: boolean | null;
    createdAt: string | null;
    updatedAt: string | null;
    lastSignInAt: string | null;
  };
  publicProfile: {
    teacherId: string | null;
    isPublic: boolean | null;
    publicSlug: string | null;
    publicProfileUrl: string | null;
    hasPhoto: boolean;
    hasBio: boolean;
    subjects: string[];
    teachingMode: string | null;
    hourlyRate: number | null;
    introLessonEnabled: boolean | null;
    introLessonDurationMinutes: number | null;
    introLessonPriceCents: number | null;
  };
  visibility: {
    visibleInSearch: boolean;
    blockers: TeacherSearchVisibilityBlockerCode[];
    warnings: TeacherSearchVisibilityWarningCode[];
  };
  privateLocation: {
    label: "Adresse privée — visible admin seulement";
    addressLine: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
    lat: number | null;
    lng: number | null;
  };
  publicLocation: {
    city: string | null;
    region: string | null;
    countryCode: string | null;
    approximateZone: string | null;
    teachingRadiusKm: number | null;
    hasPublicMapSignal: boolean;
  };
  teachingCapabilities: {
    teachingMode: string | null;
    onlineCapable: boolean;
    inPersonCapable: boolean;
    homeLessonEnabled: boolean;
  };
  availability: {
    hasAvailability: boolean;
    summary: string | null;
    configuredDays: string[];
    availableWindowCount: number | null;
    nextAvailableSlot: string | null;
    availableFromDate: string | null;
    scheduleMode: "general" | "precise";
    preciseScheduleActivatedAt: string | null;
    rawPreview: string[];
  };
  payments: {
    stripeAccountExists: boolean;
    chargesEnabled: boolean | null;
    payoutsEnabled: boolean | null;
    requirementsDueCount: number | null;
    paymentReady: boolean;
    payoutReady: boolean;
    paymentBlockers: TeacherStripeReadinessBlocker[];
    payoutBlockers: TeacherStripeReadinessBlocker[];
  };
  activity: {
    bookingRequestsCount: number | null;
    confirmedBookingsCount: number | null;
    completedBookingsCount: number | null;
    cancelledBookingsCount: number | null;
    messagesCount: number | null;
    reviewsCount: number | null;
    rating: number | null;
    lastMarketplaceActivity: string | null;
  };
  identityVerification: {
    stripeStatus: ReturnType<typeof describeStripeIdentityStatus>;
    stripeIdentityStatus: string | null;
    identityVerified: boolean;
    identityStatus: string | null;
    manualVerified: boolean;
    manualVerifiedAt: string | null;
    manualVerifiedBy: string | null;
    manualNote: string | null;
    effectiveVerified: boolean;
    effectiveSource: TeacherIdentityVerificationSource;
  };
  recommendedActions: AdminTeacher360Action[];
};

type ProfileRow = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  teacher_onboarding_complete?: boolean | null;
  is_active?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  anonymized_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TeacherRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  discipline: string | null;
  category: string | null;
  bio: string | null;
  image_url: string | null;
  availability: unknown;
  price_per_lesson: number | string | null;
  teaching_mode: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  location: unknown;
  is_public: boolean | null;
  is_demo: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  identity_verified: boolean | null;
  identity_status: string | null;
  stripe_identity_status: string | null;
  stripe_identity_failed_reason: string | null;
  identity_verified_manually: boolean | null;
  identity_verified_manually_at: string | null;
  identity_verified_manually_by: string | null;
  identity_manual_verification_note: string | null;
  diploma_verified: boolean | null;
  phone_verified: boolean | null;
  is_verified: boolean | null;
  location_verification_status: string | null;
  cv_summary: string | null;
  cv_verification_status: string | null;
  home_lesson_enabled: boolean | null;
  home_lesson_radius_km: number | null;
  default_lesson_duration_minutes: number | null;
  available_from_date: string | null;
  schedule_mode: string | null;
  precise_schedule_activated_at: string | null;
  intro_session_enabled: boolean | null;
  intro_session_duration_minutes: number | string | null;
  intro_session_price_cents: number | string | null;
  public_profile_slug: string | null;
  stripe_account_id: string | null;
  stripe_connect_onboarding_complete: boolean | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_payouts_enabled: boolean | null;
  stripe_connect_requirements_due: unknown;
  stripe_connect_disabled_reason: string | null;
  rating: number | null;
  reviews: number | null;
  updated_at: string | null;
};

const TEACHER_360_SELECT = [
  "id",
  "user_id",
  "name",
  "discipline",
  "category",
  "bio",
  "image_url",
  "availability",
  "price_per_lesson",
  "teaching_mode",
  "city",
  "region",
  "country_code",
  "location",
  "is_public",
  "is_demo",
  "deactivated_at",
  "deleted_at",
  "identity_verified",
  "identity_status",
  "stripe_identity_status",
  "stripe_identity_failed_reason",
  "identity_verified_manually",
  "identity_verified_manually_at",
  "identity_verified_manually_by",
  "identity_manual_verification_note",
  "diploma_verified",
  "phone_verified",
  "is_verified",
  "location_verification_status",
  "cv_summary",
  "cv_verification_status",
  "home_lesson_enabled",
  "home_lesson_radius_km",
  "default_lesson_duration_minutes",
  "available_from_date",
  "schedule_mode",
  "precise_schedule_activated_at",
  "intro_session_enabled",
  "intro_session_duration_minutes",
  "intro_session_price_cents",
  "public_profile_slug",
  "stripe_account_id",
  "stripe_connect_onboarding_complete",
  "stripe_connect_charges_enabled",
  "stripe_connect_payouts_enabled",
  "stripe_connect_requirements_due",
  "stripe_connect_disabled_reason",
  "rating",
  "reviews",
  "updated_at",
].join(", ");

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRequirementsDue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return normalizeRequirementsDue(JSON.parse(trimmed) as unknown);
    } catch {
      return [trimmed];
    }
  }
  return [];
}

function availabilityList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function availabilitySummary(list: string[]): {
  hasAvailability: boolean;
  summary: string | null;
  configuredDays: string[];
  availableWindowCount: number | null;
  rawPreview: string[];
} {
  const days = Array.from(new Set(list.map((item) => item.split(" ")[0]).filter(Boolean)));
  return {
    hasAvailability: list.length > 0,
    summary: list.length > 0 ? `${list.length} fenetre(s) hebdomadaire(s) configuree(s)` : null,
    configuredDays: days,
    availableWindowCount: list.length,
    rawPreview: list.slice(0, 12),
  };
}

function publicProfileUrl(teacher: TeacherRow): string | null {
  const slug = teacher.public_profile_slug?.trim();
  if (slug) return `/professeurs/${encodeURIComponent(slug)}`;
  if (teacher.id) return `/teacher/profile/${encodeURIComponent(teacher.id)}`;
  return null;
}

function teachingCapability(mode: string | null, homeLessonEnabled: boolean | null) {
  const normalized = String(mode ?? "").trim().toLowerCase();
  return {
    teachingMode: mode,
    onlineCapable: normalized === "online" || normalized === "both" || normalized === "all",
    inPersonCapable:
      normalized === "person" ||
      normalized === "both" ||
      normalized === "home" ||
      normalized === "all" ||
      homeLessonEnabled === true,
    homeLessonEnabled: homeLessonEnabled === true,
  };
}

function extractPrivateLocation(teacher: TeacherRow): AdminTeacher360["privateLocation"] {
  const location = asRecord(teacher.location);
  const privateBlock = asRecord(location.private);
  return {
    label: "Adresse privée — visible admin seulement",
    addressLine: cleanString(privateBlock.address_line1),
    addressLine2: cleanString(privateBlock.address_line2),
    city: teacher.city ?? cleanString(privateBlock.city),
    region: teacher.region ?? cleanString(privateBlock.region),
    postalCode: cleanString(privateBlock.postal_code),
    countryCode: teacher.country_code ?? cleanString(privateBlock.country_code),
    lat: cleanNumber(privateBlock.lat),
    lng: cleanNumber(privateBlock.lng),
  };
}

function extractPublicLocation(teacher: TeacherRow): AdminTeacher360["publicLocation"] {
  const location = asRecord(teacher.location);
  const publicBlock = asRecord(location.public);
  const publicLat = cleanNumber(publicBlock.lat) ?? cleanNumber(location.lat) ?? cleanNumber(location.fuzzed_lat);
  const publicLng = cleanNumber(publicBlock.lng) ?? cleanNumber(location.lng) ?? cleanNumber(location.fuzzed_lng);
  return {
    city: teacher.city ?? cleanString(publicBlock.city) ?? cleanString(location.city),
    region: teacher.region ?? cleanString(publicBlock.region) ?? cleanString(location.region),
    countryCode: teacher.country_code ?? cleanString(publicBlock.country_code) ?? cleanString(location.country),
    approximateZone: cleanString(location.neighborhood) ?? teacher.city ?? null,
    teachingRadiusKm: cleanNumber(teacher.home_lesson_radius_km),
    hasPublicMapSignal: publicLat !== null && publicLng !== null,
  };
}

async function safeCount(
  label: string,
  run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number | null> {
  try {
    const { count, error } = await run();
    if (error) {
      console.error(`[admin/teacher360] ${label} failed`, error.message);
      return null;
    }
    return typeof count === "number" ? count : null;
  } catch (error) {
    console.error(`[admin/teacher360] ${label} threw`, error);
    return null;
  }
}

async function fetchLastSignInAt(admin: AdminClient, userId: string): Promise<string | null> {
  try {
    const result = await admin.auth.admin.getUserById(userId);
    return result.data.user?.last_sign_in_at ?? null;
  } catch {
    return null;
  }
}

async function fetchSubjectLabels(admin: AdminClient, teacher: TeacherRow): Promise<string[]> {
  const labels = new Set<string>();
  if (teacher.discipline?.trim()) labels.add(teacher.discipline.trim());
  if (teacher.category?.trim()) labels.add(teacher.category.trim());

  const { data, error } = await admin
    .from("teacher_disciplines")
    .select("discipline_id, specialite, sort_order")
    .eq("teacher_id", teacher.id)
    .order("sort_order", { ascending: true });

  if (!error && data) {
    for (const row of data as Array<{ discipline_id?: string | null; specialite?: string | null }>) {
      const discipline = row.discipline_id ? getDisciplineById(row.discipline_id) : null;
      const parts = [discipline?.label ?? row.discipline_id, row.specialite].filter(Boolean);
      if (parts.length > 0) labels.add(parts.join(" - "));
    }
  }

  return Array.from(labels);
}

async function fetchActivity(admin: AdminClient, teacher: TeacherRow): Promise<AdminTeacher360["activity"]> {
  const teacherId = teacher.id;
  const userId = teacher.user_id;
  const [
    bookingRequestsCount,
    confirmedBookingsCount,
    completedBookingsCount,
    cancelledBookingsCount,
    messagesSentCount,
    messagesReceivedCount,
    reviewsCount,
    latestBooking,
    latestMessage,
  ] = await Promise.all([
    safeCount("booking requests count", () =>
      admin.from("bookings").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("status", "pending_payment"),
    ),
    safeCount("confirmed bookings count", () =>
      admin.from("bookings").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("status", "confirmed"),
    ),
    safeCount("completed bookings count", () =>
      admin.from("bookings").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("status", "completed"),
    ),
    safeCount("cancelled bookings count", () =>
      admin.from("bookings").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).like("status", "cancelled%"),
    ),
    userId
      ? safeCount("messages sent count", () =>
          admin.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", userId),
        )
      : Promise.resolve(null),
    userId
      ? safeCount("messages received count", () =>
          admin.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId),
        )
      : Promise.resolve(null),
    safeCount("reviews count", () =>
      admin.from("reviews").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
    ),
    admin
      .from("bookings")
      .select("created_at")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    userId
      ? admin
          .from("messages")
          .select("created_at")
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const bookingAt = (latestBooking.data as { created_at?: string | null } | null)?.created_at ?? null;
  const messageAt = (latestMessage.data as { created_at?: string | null } | null)?.created_at ?? null;
  const lastMarketplaceActivity = [bookingAt, messageAt].filter(Boolean).sort().at(-1) ?? null;

  return {
    bookingRequestsCount,
    confirmedBookingsCount,
    completedBookingsCount,
    cancelledBookingsCount,
    messagesCount:
      messagesSentCount === null && messagesReceivedCount === null
        ? null
        : (messagesSentCount ?? 0) + (messagesReceivedCount ?? 0),
    reviewsCount: reviewsCount ?? teacher.reviews ?? null,
    rating: cleanNumber(teacher.rating),
    lastMarketplaceActivity,
  };
}

function buildRecommendedActions(input: {
  teacher: TeacherRow;
  visibleInSearch: boolean;
  blockers: TeacherSearchVisibilityBlockerCode[];
  warnings: TeacherSearchVisibilityWarningCode[];
  paymentReady: boolean;
  payoutReady: boolean;
}): AdminTeacher360Action[] {
  const actions: AdminTeacher360Action[] = [];
  const { teacher, blockers, warnings } = input;

  if (blockers.includes("BLOCKER_PROFILE_NOT_PUBLISHED")) {
    actions.push({ id: "publish-profile", label: "Publier le profil", href: null, status: "coming_soon" });
  }
  if (blockers.includes("BLOCKER_MISSING_BASE_RATE")) {
    actions.push({ id: "add-rate", label: "Ajouter un tarif", href: `/admin/users/${teacher.user_id ?? ""}`, status: "coming_soon" });
  }
  if (blockers.includes("BLOCKER_MISSING_SUBJECT")) {
    actions.push({ id: "add-subject", label: "Ajouter une matiere", href: `/admin/users/${teacher.user_id ?? ""}`, status: "coming_soon" });
  }
  if (warnings.includes("WARNING_NO_AVAILABILITY")) {
    actions.push({ id: "add-availability", label: "Ajouter des disponibilites", href: null, status: "coming_soon" });
  }
  if (!input.paymentReady || !input.payoutReady) {
    actions.push({ id: "stripe-follow-up", label: "Relancer Stripe", href: null, status: "coming_soon" });
  }
  if (warnings.includes("WARNING_IDENTITY_NOT_VERIFIED")) {
    actions.push({
      id: "verify-identity",
      label: "Verifier l'identite",
      href: teacher.user_id ? `/admin/users/${teacher.user_id}` : null,
      status: "link",
    });
  }
  if (teacher.id) {
    actions.push({ id: "view-public-profile", label: "Voir le profil public", href: publicProfileUrl(teacher), status: "link" });
  }

  return actions.slice(0, 6);
}

export async function loadAdminTeacher360(
  admin: AdminClient,
  targetUserId: string,
): Promise<AdminTeacher360 | null> {
  const [{ data: profileData, error: profileError }, { data: teacherData, error: teacherError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, email, name, role, teacher_onboarding_complete, is_active, deactivated_at, deleted_at, anonymized_at, created_at, updated_at",
        )
        .eq("id", targetUserId)
        .maybeSingle(),
      admin.from("teachers").select(TEACHER_360_SELECT).eq("user_id", targetUserId).maybeSingle(),
    ]);

  if (profileError) {
    console.error("[admin/teacher360] profile load failed", profileError.message);
    return null;
  }
  if (teacherError) {
    console.error("[admin/teacher360] teacher load failed", teacherError.message);
  }
  if (!profileData || !teacherData) return null;

  const profile = profileData as ProfileRow;
  const teacher = teacherData as unknown as TeacherRow;
  const [subjects, lastSignInAt, publicViewResult] = await Promise.all([
    fetchSubjectLabels(admin, teacher),
    fetchLastSignInAt(admin, profile.id),
    admin.from("teachers_public").select("id").eq("id", teacher.id).maybeSingle(),
  ]);

  const visibility = diagnoseTeacherSearchVisibility({
    profile,
    teacher,
    disciplineCount: subjects.length,
    inTeachersPublicView: Boolean(publicViewResult.data),
  });
  const readiness = deriveTeacherReadinessContract({
    ...teacher,
    profileVisibilityReady: visibility.visibleInSearch,
    hasBookableAvailability: availabilityList(teacher.availability).length > 0,
    requiresOnlinePayment: true,
  });
  const availability = availabilitySummary(availabilityList(teacher.availability));
  let nextAvailableSlot: string | null = null;
  try {
    const computed = await computeAvailableDaysForTeacher(
      admin,
      teacher.id,
      4,
      teacher.default_lesson_duration_minutes,
    );
    const firstDay = Object.keys(computed.days).sort()[0];
    nextAvailableSlot = firstDay ? `${firstDay} (${computed.days[firstDay]} creneau(x))` : null;
  } catch (error) {
    console.error("[admin/teacher360] next availability failed", error);
  }

  const activity = await fetchActivity(admin, teacher);
  const requirementsDue = normalizeRequirementsDue(teacher.stripe_connect_requirements_due);

  return {
    identity: {
      id: profile.id,
      email: profile.email ?? null,
      displayName: profile.name ?? teacher.name ?? null,
      role: profile.role ?? null,
      isActive:
        profile.is_active === false ||
        Boolean(profile.deactivated_at || profile.deleted_at || profile.anonymized_at)
          ? false
          : true,
      onboardingComplete: profile.teacher_onboarding_complete ?? null,
      createdAt: profile.created_at ?? null,
      updatedAt: profile.updated_at ?? null,
      lastSignInAt,
    },
    identityVerification: {
      stripeStatus: describeStripeIdentityStatus(teacher.stripe_identity_status),
      stripeIdentityStatus: teacher.stripe_identity_status ?? null,
      identityVerified: Boolean(teacher.identity_verified),
      identityStatus: teacher.identity_status ?? null,
      manualVerified: Boolean(teacher.identity_verified_manually),
      manualVerifiedAt: teacher.identity_verified_manually_at ?? null,
      manualVerifiedBy: teacher.identity_verified_manually_by ?? null,
      manualNote: teacher.identity_manual_verification_note ?? null,
      effectiveVerified: isTeacherIdentityVerified({
        identityVerified: teacher.identity_verified,
        identityStatus: teacher.identity_status,
        stripeIdentityStatus: teacher.stripe_identity_status,
        identityVerifiedManually: teacher.identity_verified_manually,
      }),
      effectiveSource: getTeacherIdentityVerificationSource({
        identityVerified: teacher.identity_verified,
        identityStatus: teacher.identity_status,
        stripeIdentityStatus: teacher.stripe_identity_status,
        identityVerifiedManually: teacher.identity_verified_manually,
      }),
    },
    publicProfile: {
      teacherId: teacher.id,
      isPublic: teacher.is_public ?? null,
      publicSlug: teacher.public_profile_slug ?? null,
      publicProfileUrl: publicProfileUrl(teacher),
      hasPhoto: Boolean(teacher.image_url?.trim()),
      hasBio: Boolean(teacher.bio?.trim()),
      subjects,
      teachingMode: teacher.teaching_mode,
      hourlyRate: cleanNumber(teacher.price_per_lesson),
      introLessonEnabled: teacher.intro_session_enabled ?? null,
      introLessonDurationMinutes: cleanNumber(teacher.intro_session_duration_minutes),
      introLessonPriceCents: cleanNumber(teacher.intro_session_price_cents),
    },
    visibility: {
      visibleInSearch: visibility.visibleInSearch,
      blockers: visibility.blockingReasonCodes,
      warnings: visibility.warningReasonCodes,
    },
    privateLocation: extractPrivateLocation(teacher),
    publicLocation: extractPublicLocation(teacher),
    teachingCapabilities: teachingCapability(teacher.teaching_mode, teacher.home_lesson_enabled),
    availability: {
      ...availability,
      nextAvailableSlot,
      availableFromDate: cleanString(teacher.available_from_date)?.slice(0, 10) ?? null,
      scheduleMode:
        teacher.schedule_mode === "precise_intervals" ? "precise" : "general",
      preciseScheduleActivatedAt: cleanString(teacher.precise_schedule_activated_at) ?? null,
    },
    payments: {
      stripeAccountExists: Boolean(teacher.stripe_account_id?.trim()),
      chargesEnabled: teacher.stripe_connect_charges_enabled ?? null,
      payoutsEnabled: teacher.stripe_connect_payouts_enabled ?? null,
      requirementsDueCount: requirementsDue.length,
      paymentReady: readiness.paymentReady,
      payoutReady: readiness.payoutReady,
      paymentBlockers: readiness.paymentBlockers,
      payoutBlockers: readiness.payoutBlockers,
    },
    activity,
    recommendedActions: buildRecommendedActions({
      teacher,
      visibleInSearch: visibility.visibleInSearch,
      blockers: visibility.blockingReasonCodes,
      warnings: visibility.warningReasonCodes,
      paymentReady: readiness.paymentReady,
      payoutReady: readiness.payoutReady,
    }),
  };
}
