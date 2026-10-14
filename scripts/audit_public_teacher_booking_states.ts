import "next/dist/server/node-environment";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { fetchIndexableDiscoveryTeachers, buildLocalDiscoverySitemapEntries, teacherHasLocalDiscoverySupply } from "../lib/seo/localTeacherDiscoveryPages";
import { getTeacherListingBookability, getTeacherListingCapabilities } from "../lib/teachers/listingBookability";
import { teacherPaymentReadinessFailureReasons, teacherPayoutReadinessContractFailureReasons } from "../lib/teachers/readinessContracts";
import { validateMinimumLessonPriceDollars } from "../lib/pricing/validateMinimumLessonPrice";
import { formatPublicTeacherDisplayName } from "../lib/identity/displayName";
import { QC_CITIES } from "../lib/constants/cities";
import type { SupabaseClient } from "@supabase/supabase-js";

async function main() {
  const admin = getSupabaseAdmin();
  const cohort = await fetchIndexableDiscoveryTeachers();
  const ids = cohort.map(row => row.id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate_public_teacher");
  const { data: specialties, error: specialtiesError } = await admin.from("teacher_disciplines").select("teacher_id,discipline_id,specialite").in("teacher_id", ids);
  if (specialtiesError) throw new Error(`specialties_read_failed:${specialtiesError.code}`);
  console.log(JSON.stringify({ publicDisciplines: specialties }));
  const { data: teachers, error } = await admin.from("teachers").select("id,price_per_lesson,stripe_account_id,stripe_connect_onboarding_complete,stripe_connect_charges_enabled,stripe_connect_payouts_enabled,stripe_connect_requirements_due,stripe_connect_disabled_reason,availability,available_from_date,schedule_mode,default_lesson_duration_minutes,timezone,teaching_mode,home_lesson_min_duration,booking_buffer_before_minutes,booking_buffer_after_minutes").in("id", ids);
  if (error) throw new Error(`teacher_read_failed:${error.code}`);
  const readiness = await getTeacherListingBookability(admin, ids);
  const capabilities = await getTeacherListingCapabilities(admin, ids);
  console.log(JSON.stringify({ publicBookingActions: capabilities }));
  // Diagnostic counterfactual in memory only: separate calendar from payment eligibility.
  // Never call the slots HTTP endpoint: its hold-expiry helper can write to production.
  const calendarOnlyClient = { from(table: string) {
    if (table !== "teachers") return admin.from(table);
    return { select: () => ({ in: async () => ({ error: null, data: (teachers ?? []).map(row => ({
      ...row, stripe_account_id: "diagnostic-only", stripe_connect_onboarding_complete: true,
      stripe_connect_charges_enabled: true, stripe_connect_payouts_enabled: true,
      stripe_connect_requirements_due: [], stripe_connect_disabled_reason: null,
    })) }) }) };
  } } as unknown as SupabaseClient;
  const calendarReadiness = await getTeacherListingBookability(calendarOnlyClient, ids);
  const { data: offers, error: offersError } = await admin.from("teacher_offers").select("teacher_id,status,discipline_id,specialite").in("teacher_id", ids);
  const { error: requestsError } = await admin.from("teacher_booking_requests").select("id").limit(0);
  console.log(JSON.stringify({ at: new Date().toISOString(), runtimeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone, requestTableError: requestsError?.code ?? null, offersError: offersError?.code ?? null }));
  for (const profile of cohort) {
    const row = teachers?.find(row => row.id === profile.id);
    if (!row) throw new Error("cohort_row_missing");
    const payment = teacherPaymentReadinessFailureReasons(row);
    const payout = teacherPayoutReadinessContractFailureReasons(row);
    const calendar = { eligibleFutureSlotWithoutPaymentGate: calendarReadiness[profile.id], windowDays: 28 };
    console.log(JSON.stringify({ id: profile.id, name: formatPublicTeacherDisplayName(profile.name ?? ""), discipline: profile.discipline, disciplineIds: profile.disciplineIds, city: profile.city, localCities: QC_CITIES.filter(city => teacherHasLocalDiscoverySupply(profile, city)).map(city => city.name), teachingZones: (profile.teachingZones ?? []).length, public: true, discoverable: true, format: profile.teaching_mode, rate: row.price_per_lesson, validRate: validateMinimumLessonPriceDollars(Number(row.price_per_lesson)).ok, paymentBlockers: payment, payoutBlockers: payout, calendar, timezone: row.timezone, availableFrom: row.available_from_date, scheduleMode: row.schedule_mode, availabilityEntries: Array.isArray(row.availability) ? row.availability.length : null, publishedOffers: (offers ?? []).filter(offer => offer.teacher_id === profile.id && offer.status === "published").map(offer => ({ discipline: offer.discipline_id, specialty: offer.specialite })), listingReady: readiness[profile.id], endpointBranch: payment.length || payout.length ? "202 deferred request after date/slot selection; not payment" : "createPendingPaymentBooking validates concrete request", profilePath: `/professeurs/${profile.public_profile_slug}`, localPaths: buildLocalDiscoverySitemapEntries([profile]).map(entry => entry.path) }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "audit_failed"); process.exitCode = 1; });
