// Pratiqo product analytics — event taxonomy.
//
// Why this file exists
// --------------------
// Every product event Pratiqo emits to PostHog (or any future analytics
// destination) flows through this module. Hard-coding event names at the
// call-site is forbidden — drift between e.g. "search_started" and
// "search-started" would silently shard funnels in PostHog and corrupt
// every downstream cohort.
//
// Privacy contract (also pinned by tests)
// ---------------------------------------
// - NEVER pass message bodies, raw addresses, precise coordinates, payment
//   secrets, full email addresses, or any auth token through these helpers.
// - The capture path (`lib/analytics/posthog.ts`) re-runs a property
//   sanitizer that drops anything whose key matches a forbidden fragment
//   (`password`, `token`, `secret`, `address`, `lat`, `lng`, `body`,
//   `content`, `email`, `auth`, `cookie`, `card`, …) AND truncates large
//   strings. The two layers are defense in depth.
//
// How to add a new event
// ----------------------
// 1. Add the name to `ANALYTICS_EVENTS` below. Use snake_case.
// 2. Add a `(properties: …) => void` helper at the bottom for IDE typing.
// 3. Document it in `docs/ANALYTICS_AND_MONITORING.md` (event taxonomy
//    section) — the regression test asserts this doc-sync.

import { capturePostHogEvent } from "@/lib/analytics/posthog";

// ─── Event names ─────────────────────────────────────────────────────────────

export const ANALYTICS_EVENTS = {
  // PostHog reserved event — its stock Insights / Funnels / Paths
  // dashboards key off this exact name. Emitted on every navigation by
  // `components/analytics/PostHogPageView.tsx`. Sending the string
  // verbatim ("$pageview") is intentional — PostHog will not match
  // "pageview" or "page_view".
  pageView: "$pageview",

  // Core marketplace web
  landingViewed: "landing_viewed",
  searchStarted: "search_started",
  searchSubjectSelected: "search_subject_selected",
  searchLocationSelected: "search_location_selected",
  searchFormatSelected: "search_format_selected",
  searchAvailabilityFilterUsed: "search_availability_filter_used",
  teacherCardClicked: "teacher_card_clicked",
  teacherProfileViewed: "teacher_profile_viewed",

  // Booking
  bookingStarted: "booking_started",
  bookingSlotSelected: "booking_slot_selected",
  bookingCheckoutStarted: "booking_checkout_started",
  bookingCompleted: "booking_completed",
  bookingCancelStarted: "booking_cancel_started",
  bookingCancelCompleted: "booking_cancel_completed",

  // Messaging
  messageSent: "message_sent",
  messageThreadOpened: "message_thread_opened",
  messageEmailNotificationQueued: "message_email_notification_queued",
  messageEmailNotificationFailed: "message_email_notification_failed",

  // YoPratiqo
  yopratiqoLandingViewed: "yopratiqo_landing_viewed",
  yopratiqoIntroStarted: "yopratiqo_intro_started",
  yopratiqoLessonStarted: "yopratiqo_lesson_started",
  yopratiqoLessonCompleted: "yopratiqo_lesson_completed",
  yopratiqoPrintableOpened: "yopratiqo_printable_opened",

  // Admin (zero PII in properties — see helpers below)
  adminUsersViewed: "admin_users_viewed",
  adminRoleChangeStarted: "admin_role_change_started",
  adminRoleChangeCompleted: "admin_role_change_completed",
  adminRoleChangeFailed: "admin_role_change_failed",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// ─── Property shapes ─────────────────────────────────────────────────────────
//
// All payloads are deliberately small. Optional fields use null to make
// PostHog cohorts work cleanly (PostHog distinguishes "missing" from
// "explicit null" in some filters).

export type SearchStartedProps = {
  source: "landing" | "student_search" | "quiz" | "map";
};

export type SearchSubjectSelectedProps = {
  source: SearchStartedProps["source"];
  // Canonical subject id from lib/search/subjectBuckets.ts when known;
  // free-text query otherwise (capped + sanitized downstream).
  subject_id?: string | null;
  query_length?: number | null;
};

export type SearchLocationSelectedProps = {
  source: SearchStartedProps["source"];
  // Region/country only — NEVER raw address or precise coordinates.
  region?: string | null;
  country_code?: string | null;
};

export type SearchFormatSelectedProps = {
  source: SearchStartedProps["source"];
  format: "online" | "in_person" | "domicile" | "any" | string;
};

export type SearchAvailabilityFilterUsedProps = {
  source: SearchStartedProps["source"];
  day?: string | null; // monday | tuesday | … | null
  period?: string | null; // morning | afternoon | evening | null
};

export type TeacherCardClickedProps = {
  source: SearchStartedProps["source"];
  teacher_id: string;
  position?: number | null;
};

export type TeacherProfileViewedProps = {
  teacher_id: string;
  source?: string | null;
};

export type BookingProps = {
  teacher_id: string;
  lesson_type?: string | null;
  teaching_mode?: "online" | "domicile" | "studio" | string | null;
  // Price is OK (already public-ish in the product). Address / coords are NOT.
  price_cad?: number | null;
};

export type BookingSlotSelectedProps = BookingProps & {
  weekday?: string | null;
  period?: string | null;
};

export type MessageEventProps = {
  thread_id: string; // hashed/conversation id is fine; we never send body
  peer_role?: "student" | "teacher" | "admin" | null;
};

export type YoPratiqoLandingProps = {
  language: string; // "espagnol" | "anglais" | … (canonical slug)
  locale: "fr" | "en" | "es" | string;
  module?: string | null;
};

export type YoPratiqoLessonProps = {
  language: string;
  locale: string;
  module: string;
  lesson_id?: string | null;
};

export type AdminUsersViewedProps = {
  // Page-level cohort. We send the total count rendered (already shown
  // in the UI) so PostHog dashboards can correlate growth, but NEVER the
  // user list itself.
  rendered_count: number;
};

export type AdminRoleChangeProps = {
  // Identifies the transition without exposing the target user's email.
  previous_role: "student" | "teacher" | "admin" | string;
  new_role: "student" | "teacher" | "admin" | string;
  // Optional opaque target id (UUID, not PII on its own); omit if your
  // privacy posture forbids even ids. The test pins that we NEVER send
  // target_email or message content from admin events.
  target_id?: string | null;
  result?: "ok" | "error";
  // Error reason is product-shaped only (e.g. "self_mutation",
  // "invalid_role"), never a raw exception/string from the server.
  reason_code?: string | null;
};

// ─── Typed capture helpers ───────────────────────────────────────────────────
//
// One thin wrapper per event so call-sites stay readable and TypeScript
// catches typos:
//
//   trackSearchStarted({ source: "landing" });
//
// Every helper goes through `capturePostHogEvent`, which re-sanitizes
// properties and no-ops when PostHog env is missing.

function track<P extends Record<string, unknown>>(name: AnalyticsEventName, props: P): void {
  capturePostHogEvent(name, props as Record<string, unknown>);
}

/**
 * Emit PostHog's reserved `$pageview` event. This is the universal
 * pageview floor — every Next.js navigation should fire it once so
 * PostHog's stock dashboards (Insights / Funnels / Path analysis)
 * actually have data to render. The narrower product events
 * (`landing_viewed`, `yopratiqo_landing_viewed`, …) are still emitted
 * alongside it for funnel-quality cohorts.
 *
 * The capture path (`lib/analytics/posthog.ts`) automatically attaches
 * `$current_url`, `$host`, and `$pathname` to every event so the
 * `path` property here is a typed convenience — PostHog will use the
 * `$pathname` auto-property for its built-in widgets either way.
 */
export const trackPageView = (props: { path: string }) =>
  track(ANALYTICS_EVENTS.pageView, props);

export const trackLandingViewed = (props: { path: string }) =>
  track(ANALYTICS_EVENTS.landingViewed, props);

export const trackSearchStarted = (props: SearchStartedProps) =>
  track(ANALYTICS_EVENTS.searchStarted, props);

export const trackSearchSubjectSelected = (props: SearchSubjectSelectedProps) =>
  track(ANALYTICS_EVENTS.searchSubjectSelected, props);

export const trackSearchLocationSelected = (props: SearchLocationSelectedProps) =>
  track(ANALYTICS_EVENTS.searchLocationSelected, props);

export const trackSearchFormatSelected = (props: SearchFormatSelectedProps) =>
  track(ANALYTICS_EVENTS.searchFormatSelected, props);

export const trackSearchAvailabilityFilterUsed = (props: SearchAvailabilityFilterUsedProps) =>
  track(ANALYTICS_EVENTS.searchAvailabilityFilterUsed, props);

export const trackTeacherCardClicked = (props: TeacherCardClickedProps) =>
  track(ANALYTICS_EVENTS.teacherCardClicked, props);

export const trackTeacherProfileViewed = (props: TeacherProfileViewedProps) =>
  track(ANALYTICS_EVENTS.teacherProfileViewed, props);

export const trackBookingStarted = (props: BookingProps) =>
  track(ANALYTICS_EVENTS.bookingStarted, props);

export const trackBookingSlotSelected = (props: BookingSlotSelectedProps) =>
  track(ANALYTICS_EVENTS.bookingSlotSelected, props);

export const trackBookingCheckoutStarted = (props: BookingProps) =>
  track(ANALYTICS_EVENTS.bookingCheckoutStarted, props);

export const trackBookingCompleted = (props: BookingProps) =>
  track(ANALYTICS_EVENTS.bookingCompleted, props);

export const trackBookingCancelStarted = (props: BookingProps) =>
  track(ANALYTICS_EVENTS.bookingCancelStarted, props);

export const trackBookingCancelCompleted = (props: BookingProps) =>
  track(ANALYTICS_EVENTS.bookingCancelCompleted, props);

export const trackMessageSent = (props: MessageEventProps) =>
  track(ANALYTICS_EVENTS.messageSent, props);

export const trackMessageThreadOpened = (props: MessageEventProps) =>
  track(ANALYTICS_EVENTS.messageThreadOpened, props);

export const trackMessageEmailNotificationQueued = (props: { thread_id: string }) =>
  track(ANALYTICS_EVENTS.messageEmailNotificationQueued, props);

export const trackMessageEmailNotificationFailed = (props: { thread_id: string; reason_code?: string }) =>
  track(ANALYTICS_EVENTS.messageEmailNotificationFailed, props);

export const trackYopratiqoLandingViewed = (props: YoPratiqoLandingProps) =>
  track(ANALYTICS_EVENTS.yopratiqoLandingViewed, props);

export const trackYopratiqoIntroStarted = (props: YoPratiqoLandingProps) =>
  track(ANALYTICS_EVENTS.yopratiqoIntroStarted, props);

export const trackYopratiqoLessonStarted = (props: YoPratiqoLessonProps) =>
  track(ANALYTICS_EVENTS.yopratiqoLessonStarted, props);

export const trackYopratiqoLessonCompleted = (props: YoPratiqoLessonProps) =>
  track(ANALYTICS_EVENTS.yopratiqoLessonCompleted, props);

export const trackYopratiqoPrintableOpened = (props: YoPratiqoLessonProps) =>
  track(ANALYTICS_EVENTS.yopratiqoPrintableOpened, props);

export const trackAdminUsersViewed = (props: AdminUsersViewedProps) =>
  track(ANALYTICS_EVENTS.adminUsersViewed, props);

export const trackAdminRoleChangeStarted = (props: Pick<AdminRoleChangeProps, "previous_role" | "new_role">) =>
  track(ANALYTICS_EVENTS.adminRoleChangeStarted, props);

export const trackAdminRoleChangeCompleted = (props: AdminRoleChangeProps) =>
  track(ANALYTICS_EVENTS.adminRoleChangeCompleted, { ...props, result: "ok" });

export const trackAdminRoleChangeFailed = (
  props: Pick<AdminRoleChangeProps, "previous_role" | "new_role" | "reason_code">,
) => track(ANALYTICS_EVENTS.adminRoleChangeFailed, { ...props, result: "error" });
