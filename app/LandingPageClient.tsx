"use client";

// Future PR: simplify app navigation by keeping primary actions visible and moving secondary items into a user menu.

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { BookOpen, GraduationCap, LayoutGrid, LayoutList, Map, MapPin, Music, Sparkles } from "lucide-react";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { getFeaturedFilterDisciplines } from "../lib/disciplines";
import { isEnabled } from "../lib/features";
import { getSupabaseClient } from "../lib/supabase";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "../lib/teacherDisciplines";
import { isLaunchEligibleTeacherRow, teacherRowToTeacher, type TeacherRow } from "../lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_LIST_SELECT_LEGACY_PUBLIC, TEACHERS_PUBLIC_TABLE } from "../lib/supabase/queries";
import { applyTeacherListingMetadata } from "@/lib/teacherListingMetadata";
import { buildTeacherSignupLoginHref } from "@/lib/auth/teacherOnboardingIntent";
import { useLocale } from "../lib/locale-context";
import { useAuth } from "../components/AuthProvider";
import type { BookingInitialLessonKind } from "../components/BookingModal";
import type { MapBounds } from "../components/SearchMapView";
import { LandingDiscoverySearch } from "../components/marketing/LandingDiscoverySearch";
import { LandingHeroTrustStrip } from "../components/marketing/LandingHeroTrustStrip";
import { LandingNeighborhoodSignals } from "../components/marketing/LandingNeighborhoodSignals";
import { LandingTeacherListingCard } from "../components/marketing/LandingTeacherListingCard";
import { LandingResourcesSection } from "../components/marketing/LandingResourcesSection";
import type { TranslationKey } from "../lib/translations";
import type { LandingFormatFilter } from "../lib/landingTeacherFilter";
import { filterTeacherPool, buildTeacherSearchRows, sortRows } from "../lib/teacherSearchEngine";
import { TeacherSearchAdvancedPanel, type AdvancedFilterValues } from "../components/TeacherSearchAdvancedPanel";
import { logSearchEvent } from "../lib/searchAnalytics";
import {
  trackBookingStarted,
  trackSearchAvailabilityFilterUsed,
  trackSearchFormatSelected,
  trackSearchStarted,
  trackTeacherCardClicked,
  trackTeacherProfileViewed,
} from "@/lib/analytics/events";
import type { City } from "../lib/cities";

const TeacherProfile = dynamic(
  () => import("../components/TeacherProfile").then((m) => m.TeacherProfile),
  { ssr: false, loading: () => <InlineLoading /> },
);
const BookingModal = dynamic(
  () => import("../components/BookingModal").then((m) => m.BookingModal),
  { ssr: false, loading: () => <InlineLoading /> },
);

const SearchMapView = dynamic(
  () => import("../components/SearchMapView").then((m) => m.SearchMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-2 h-[480px] rounded-2xl bg-[#F1EFE8] text-sm text-neutral-700">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        <MapLoadingLabel />
      </div>
    ),
  },
);

const SocialProofTestimonials = dynamic(
  () => import("../components/marketing/SocialProofTestimonials").then((m) => m.SocialProofTestimonials),
  { loading: () => <div className="min-h-[280px] bg-[#FAFCFB] py-14 sm:min-h-[320px]" /> },
);

const TrustSafetySection = dynamic(
  () => import("../components/marketing/TrustSafetySection").then((m) => m.TrustSafetySection),
  { loading: () => <div className="min-h-[320px] border-t border-[#E8E6DF] bg-[#F8F6F1] py-14" /> },
);

const LandingHowItWorks = dynamic(
  () => import("../components/marketing/LandingHowItWorks").then((m) => m.LandingHowItWorks),
  { loading: () => <div className="min-h-[280px] border-t border-[#E8E6DF] bg-[#FAFCFB] py-14" /> },
);

const MarketplaceFinalCta = dynamic(
  () => import("../components/marketing/MarketplaceFinalCta").then((m) => m.MarketplaceFinalCta),
  { loading: () => <div className="min-h-[120px] bg-[#F8F6F1]" /> },
);

const TeacherQuiz = dynamic(
  () => import("../components/marketing/TeacherQuiz").then((m) => m.TeacherQuiz),
  { ssr: false, loading: () => null },
);

type HeroMode = "student" | "teacher";

function InlineLoading() {
  const { t } = useLocale();
  return <p className="p-4 text-center text-sm text-neutral-700">{t("loading")}</p>;
}

function MapLoadingLabel() {
  const { t } = useLocale();
  return <p>{t("loadingMap")}</p>;
}

function LandingHeroClientCopy() {
  const { t } = useLocale();
  return (
    <div suppressHydrationWarning>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-800">{t("landingEyebrowLocal")}</p>
      <p className="mt-3 text-[15px] font-semibold text-teal-700 lg:hidden">{t("landingMobileNearYou")}</p>
      <p className="mt-1 text-sm leading-snug text-neutral-700 lg:hidden">{t("landingMobileCornerHint")}</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#1a1f1d] sm:text-3xl lg:mt-2 lg:text-[2.15rem] lg:leading-[1.12]">
        {t("landingNeighborhoodHeadline")}
      </h1>
      <p className="mx-auto mt-3 hidden max-w-2xl text-[15px] leading-relaxed text-neutral-700 sm:text-base lg:block">
        {t("teacherGridCornerLesson")}
      </p>
    </div>
  );
}

function isMissingStripeIdentityStatus(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message ?? "") : "";
  return /stripe_identity_status/i.test(message);
}

/** Interactive landing body only: server-rendered hero copy is passed as `children` from app/page.tsx (RSC slot, not a heroHeading prop). */
export function LandingPageClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();
  const [clientHeroReady, setClientHeroReady] = useState(false);
  const [mode, setMode] = useState<HeroMode>("student");
  const [quizOpen, setQuizOpen] = useState(false);

  const CATEGORY_I18N: Record<string, TranslationKey> = {
    musique: "marketplaceCategoryMusic",
    langues: "marketplaceCategoryLanguages",
    tuteurs: "marketplaceCategoryAcademic",
  };

  const CATEGORY_ICON: Record<string, typeof Music> = {
    musique: Music,
    langues: BookOpen,
    tuteurs: GraduationCap,
  };

  // Teachers + search state
  const [locationSearch, setLocationSearch] = useState("");
  // Lieu typing intent — flipped to true the moment the user types any
  // non-empty text in the Lieu autocomplete (or selects a city). This
  // is what lets the page enter compact results mode while the user is
  // still typing "mont" / "saint" / "calg…" instead of waiting until
  // they pick a suggestion. The Lieu input owns this signal via its
  // onIntentChange callback; clearing the field flips it back to false.
  const [hasLieuTypingIntent, setHasLieuTypingIntent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Geo
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<"relevance" | "nearest">("relevance");

  // Map bounds (set when user clicks "Search this area"; null = show all)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const [formatFilter, setFormatFilter] = useState<LandingFormatFilter>("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adv, setAdv] = useState<AdvancedFilterValues>({
    minRating: "",
    maxPrice: "",
    verifiedOnly: false,
    language: "",
    level: "",
    availabilityDay: "",
    availabilityPeriod: "",
    teacherPreference: "",
    formatExtra: "",
  });

  // View
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Profile / booking modals
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<Teacher | null>(null);
  const [selectedMapTeacher, setSelectedMapTeacher] = useState<Teacher | null>(null);
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");

  const teacherResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setClientHeroReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Load teachers
  useEffect(() => {
    const supabase = getSupabaseClient();
    const load = async () => {
      const mergePlans = async (list: Teacher[]) => {
        const ids = list.map((t) => t.id).join(",");
        if (!ids) { setTeachers(list); return; }
        try {
          const pr = await fetch(`/api/teachers/plans?ids=${encodeURIComponent(ids)}`);
          if (!pr.ok) throw new Error("Teacher public metadata lookup failed");
          const body = (await pr.json()) as Parameters<typeof applyTeacherListingMetadata>[1];
          setTeachers(applyTeacherListingMetadata(list, body));
        } catch {
          setTeachers(list.map((t) => ({ ...t, profilePlan: "free" })));
        }
      };
      const queryPublicTeachers = (select: string) =>
        supabase
          .from(TEACHERS_PUBLIC_TABLE)
          .select(select)
          .order("verification_level", { ascending: false })
          .order("rating", { ascending: false });

      let response = await queryPublicTeachers(TEACHERS_LIST_SELECT);
      if (response.error && isMissingStripeIdentityStatus(response.error)) {
        response = await queryPublicTeachers(TEACHERS_LIST_SELECT_LEGACY_PUBLIC);
      }

      const { data, error } = response;
      if (error || !data?.length) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[LandingPageClient] teachers_public unavailable or empty; skipping demo teachers (IDs must be UUIDs).",
            error,
          );
        }
        await mergePlans([]);
        setLoadingTeachers(false);
        return;
      }
      const mapped = (data as unknown as TeacherRow[])
        .filter((r) => isLaunchEligibleTeacherRow(r))
        .map((r) => teacherRowToTeacher(r));
      const discMap = await fetchTeacherDisciplinesMap(supabase, mapped.map((t) => t.id));
      await mergePlans(mergeTeachersWithDisciplines(mapped, discMap));
      setLoadingTeachers(false);
    };
    void load();
  }, []);

  const requestGeo = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    if (geo) {
      setSortMode((m) => (m === "nearest" ? "relevance" : "nearest"));
      return;
    }
    setSortMode("nearest");
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [geo]);

  // Clear map-bounds filter whenever the user changes their text/category/format search
  useEffect(() => {
    const timer = window.setTimeout(() => setMapBounds(null), 0);
    return () => window.clearTimeout(timer);
  }, [searchQuery, activeCat, formatFilter, adv]);

  // Filter + sort (+ optional bounds filter when user has searched an area)
  const filtered = useMemo(() => {
    const fmtMain =
      formatFilter === "all"
        ? "no_preference"
        : formatFilter === "online"
          ? "online"
          : formatFilter === "in_person"
            ? "in_person"
            : "hybrid";
    const fmt = adv.formatExtra || fmtMain;
    const minR = adv.minRating.trim() ? Number(adv.minRating) : undefined;
    const maxP = adv.maxPrice.trim() ? Number(adv.maxPrice) : undefined;
    const pool = filterTeacherPool(teachers, {
      category: activeCat,
      searchQuery,
      format: fmt,
      minRating: typeof minR === "number" && Number.isFinite(minR) ? minR : undefined,
      maxPrice: typeof maxP === "number" && Number.isFinite(maxP) ? maxP : undefined,
      verifiedOnly: adv.verifiedOnly ? true : undefined,
      language: adv.language.trim() || undefined,
      level: adv.level.trim() || undefined,
      availabilityDay: adv.availabilityDay || undefined,
      availabilityPeriod: adv.availabilityPeriod || undefined,
      teacherPreference: adv.teacherPreference || undefined,
    });
    let rows = buildTeacherSearchRows(pool, { geo });

    if (mapBounds) {
      rows = rows.filter(({ teacher: tt }) => {
        const lat = tt.location?.lat;
        const lng = tt.location?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        const { ne, sw } = mapBounds;
        // Handle antimeridian wrapping for longitude
        const lngInBounds = ne.lng < sw.lng ? lng >= sw.lng || lng <= ne.lng : lng >= sw.lng && lng <= ne.lng;
        return lat >= sw.lat && lat <= ne.lat && lngInBounds;
      });
    }

    const sorted = sortRows(rows, { sortMode: sortMode === "nearest" ? "nearest" : "relevance", studentPrefs: null });
    return sorted.map((r) => r.teacher);
  }, [teachers, searchQuery, activeCat, sortMode, geo, mapBounds, formatFilter, adv]);

  const resultCountRef = useRef(0);
  useEffect(() => {
    resultCountRef.current = filtered.length;
  }, [filtered.length]);

  // PostHog: emit `teacher_card_clicked` + `teacher_profile_viewed`
  // whenever the profile modal opens, regardless of which surface
  // triggered it (search list, map, recommendations). One effect ≪ 4
  // touch points per render path.
  useEffect(() => {
    if (!selectedTeacherProfile?.id) return;
    trackTeacherCardClicked({
      source: "landing",
      teacher_id: selectedTeacherProfile.id,
      position: null,
    });
    trackTeacherProfileViewed({
      teacher_id: selectedTeacherProfile.id,
      source: "landing",
    });
  }, [selectedTeacherProfile?.id]);

  // PostHog: `booking_started` fires when the BookingModal mounts, which
  // is the canonical product-intent signal (user has chosen a teacher
  // and reached the booking surface). The downstream slot/checkout
  // events come from BookingModal itself.
  useEffect(() => {
    if (!bookingTeacher?.id) return;
    trackBookingStarted({
      teacher_id: bookingTeacher.id,
      lesson_type: bookingInitialKind,
    });
  }, [bookingTeacher?.id, bookingInitialKind]);

  const scrollToTeacherResults = useCallback(() => {
    teacherResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    logSearchEvent({
      source: "landing",
      category: activeCat === "All" ? null : activeCat,
      subject: searchQuery.trim() || null,
      format: formatFilter === "all" ? null : formatFilter,
      result_count: resultCountRef.current,
      filters: {
        minRating: adv.minRating,
        maxPrice: adv.maxPrice,
        verifiedOnly: adv.verifiedOnly,
        language: adv.language,
        level: adv.level,
        availabilityDay: adv.availabilityDay,
        availabilityPeriod: adv.availabilityPeriod,
        teacherPreference: adv.teacherPreference,
      },
    });
    // PostHog mirror: search_started + side-effect filter events. We do
    // NOT pass `searchQuery` itself — the property sanitizer in
    // lib/analytics/posthog.ts would also drop most freeform strings —
    // we send the length only so PostHog cohorts can split "typed
    // something" vs "browsed silently" without the raw query text.
    trackSearchStarted({ source: "landing" });
    if (formatFilter !== "all") {
      trackSearchFormatSelected({ source: "landing", format: formatFilter });
    }
    if (adv.availabilityDay || adv.availabilityPeriod) {
      trackSearchAvailabilityFilterUsed({
        source: "landing",
        day: adv.availabilityDay || null,
        period: adv.availabilityPeriod || null,
      });
    }
  }, [activeCat, searchQuery, formatFilter, adv]);

  // Selecting a place from the Lieu autocomplete must update *only* the
  // location/geo state. Writing the city name into `searchQuery` was the
  // root cause of the segmented-search bug where typing "piano" in Quoi
  // and then picking a city in Lieu silently replaced "piano" with the
  // city name. Subject and place are now fully independent.
  //
  // We also no longer clear `locationSearch` here — the dedicated Lieu
  // input echoes the formatted "City, PROV" label back into its own
  // value so the user can see which place is currently selected. If the
  // parent reset it to "" the user would lose that visual confirmation.
  const selectCityForSearch = useCallback((city: City) => {
    setGeo({ lat: city.lat, lng: city.lng });
    setSortMode("nearest");
  }, []);

  // ── Results-mode detection ──────────────────────────────────────────────
  // Once the user signals search intent (typed a subject, picked a category,
  // selected a place / format / advanced filter, or panned the map), the
  // landing page switches from "marketing discovery" to "results mode":
  // hero/quiz/trust blocks that sit between the search bar and the cards
  // are hidden so the results land directly under the filters. Pre-search
  // the page keeps its full premium discovery feel.
  const hasAdvancedFilter = useMemo(() => {
    return Boolean(
      adv.minRating.trim() ||
        adv.maxPrice.trim() ||
        adv.verifiedOnly ||
        adv.language.trim() ||
        adv.level.trim() ||
        adv.availabilityDay ||
        adv.availabilityPeriod ||
        adv.teacherPreference ||
        adv.formatExtra,
    );
  }, [adv]);
  const hasSearchIntent = useMemo(() => {
    if (searchQuery.trim()) return true;
    if (activeCat && activeCat !== "All") return true;
    if (geo) return true;
    if (formatFilter && formatFilter !== "all") return true;
    if (mapBounds) return true;
    // Lieu typing intent: results mode must engage *while* the user is
    // typing in Lieu, not only after they pick a suggestion. Without
    // this signal "mont"/"saint"/"calg…" would still leave the quiz
    // CTA + trust strip between the filters and the cards, recreating
    // the giant vertical gap we just fixed for the Quoi side.
    if (hasLieuTypingIntent) return true;
    return hasAdvancedFilter;
  }, [searchQuery, activeCat, geo, formatFilter, mapBounds, hasLieuTypingIntent, hasAdvancedFilter]);

  // Display the selected place label only when it's been *committed* via the
  // Lieu autocomplete (formatted as "City, PROV"). Mid-typing strings are
  // ignored so the summary row stays accurate while the user types.
  const committedPlaceLabel = useMemo(() => {
    const trimmed = locationSearch.trim();
    return /,\s+[A-Z]{2}$/.test(trimmed) ? trimmed : null;
  }, [locationSearch]);
  const subjectLabel = searchQuery.trim();

  return (
    <>
      {/* ── HERO (student / teacher toggle; motion deferred — no motion/react in this module) ── */}
      <section className="relative overflow-hidden">
          {mode === "student" ? (
            <div key="student" className="bg-[#FAFCFB] text-[#2C2C2A]">
              <div className="relative border-b border-[#E8E6DF]/80 bg-[#FAFCFB] lg:bg-gradient-to-b lg:from-[#EFF8F4] lg:via-[#FAFCFB] lg:to-[#FAFCFB]">
                <div
                  className={cn(
                    "relative mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:pt-8",
                    // Results mode: shrink the hero's bottom padding so the
                    // results section sits directly under the filters with
                    // a deliberate, tight visual rhythm.
                    hasSearchIntent ? "pb-3 sm:pb-4" : "pb-8 lg:pb-10",
                  )}
                >
                  <div className="mb-6 flex justify-center">
                    <div className="flex flex-wrap justify-center gap-1 rounded-2xl border border-[#E8E6DF] bg-white p-1 shadow-sm">
                      <ToggleSegment active onClick={() => setMode("student")}>
                        {t("iAmStudent")}
                      </ToggleSegment>
                      <ToggleSegment active={false} onClick={() => setMode("teacher")}>
                        {t("iAmTeacher")}
                      </ToggleSegment>
                    </div>
                  </div>

                  <div className="mx-auto max-w-4xl space-y-5 text-center">
                    {clientHeroReady ? <LandingHeroClientCopy /> : children}
                    <LandingDiscoverySearch
                      teachersForSearch={teachers}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      locationSearch={locationSearch}
                      onLocationSearchChange={setLocationSearch}
                      geo={geo}
                      onSelectTeacher={(teacher) => setSelectedTeacherProfile(teacher)}
                      onSelectDiscipline={(label) => {
                        setActiveCat(label);
                        setSearchQuery("");
                      }}
                      onSelectCity={selectCityForSearch}
                      onLieuIntentChange={setHasLieuTypingIntent}
                      formatFilter={formatFilter}
                      onFormatFilterChange={setFormatFilter}
                      onSearchSubmit={scrollToTeacherResults}
                      searchInputPlaceholderKey="landingSearchDisciplinePlaceholder"
                    />
                  </div>

                  <div className="mx-auto mt-5 max-w-4xl">
                    <div className="flex flex-wrap justify-center gap-2">
                      {getFeaturedFilterDisciplines().map((d) => {
                        const catKey = CATEGORY_I18N[d.id];
                        const Icon = CATEGORY_ICON[d.id];
                        const active = activeCat === d.label;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setActiveCat(active ? "All" : d.label)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                              active
                                ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                                : "border-[#E0DED5] bg-white text-[#2C2C2A] hover:border-teal-700/35 hover:bg-[#F9F8F5]",
                            )}
                          >
                            {Icon ? <Icon size={15} aria-hidden strokeWidth={2.25} /> : null}
                            {catKey ? t(catKey) : d.label}
                          </button>
                        );
                      })}
                      {isEnabled("group_sessions") ? (
                        <Link
                          href="/group-sessions"
                          className="inline-flex items-center rounded-full border border-[#E0DED5] bg-white px-4 py-2 text-xs font-semibold text-[#2C2C2A] transition-colors hover:border-teal-700/35 hover:bg-[#F9F8F5]"
                        >
                          {t("groupCoursesLink")}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setActiveCat("All")}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                          activeCat === "All"
                            ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                            : "border-[#E0DED5] bg-white text-[#2C2C2A] hover:border-teal-700/35",
                        )}
                      >
                        <LayoutGrid size={15} aria-hidden strokeWidth={2.25} />
                        {t("filterAll")}
                      </button>
                    </div>
                    <p className="mt-3 text-center text-[11px] text-neutral-700">{t("otherDisciplines")}</p>
                    <div className="mx-auto mt-4 max-w-xl">
                      <TeacherSearchAdvancedPanel
                        open={advancedOpen}
                        onToggle={() => setAdvancedOpen((o) => !o)}
                        values={adv}
                        onChange={(patch) => setAdv((a) => ({ ...a, ...patch }))}
                        t={t}
                      />
                    </div>
                  </div>

                  {/* Quiz CTA + hero trust strip live here only when the
                      user has not signalled search intent. In results mode
                      they would push the cards far below the fold and break
                      the search → results visual rhythm. */}
                  {hasSearchIntent ? null : (
                    <div className="mx-auto mt-10 w-full max-w-lg px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setQuizOpen(true)}
                        className="inline-flex min-h-[52px] w-full max-w-md items-center justify-center gap-2.5 rounded-2xl border-2 border-[#C5E7DB] bg-white px-6 py-3.5 text-sm font-bold text-teal-700 shadow-md transition-all hover:border-teal-700/40 hover:bg-[#FAFFFC] hover:shadow-lg lg:shadow-[0_10px_36px_rgba(15,110,86,0.08)] lg:hover:shadow-[0_14px_40px_rgba(15,110,86,0.12)] motion-safe:active:scale-[0.99]"
                      >
                        <Sparkles size={20} className="shrink-0 text-[#F4B400]" strokeWidth={2.25} aria-hidden />
                        {t("marketplaceQuizCta")}
                      </button>
                      <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-neutral-700">{t("landingQuizHelper")}</p>
                      <LandingHeroTrustStrip className="mt-8" />
                    </div>
                  )}
                </div>
              </div>

              <div
                ref={teacherResultsRef}
                id="teacher-results"
                className="scroll-mt-24 bg-[#F3FAF6]"
              >
                <div
                  className={cn(
                    "mx-auto max-w-[1440px] px-4 sm:px-6",
                    // Results mode: trim top padding so the cards begin
                    // within ~24-32 px of the filters above, preserving a
                    // generous bottom for breathing room.
                    hasSearchIntent
                      ? "pt-4 pb-10 sm:pt-5 sm:pb-12"
                      : "py-8 sm:py-10",
                  )}
                >
                  {hasSearchIntent ? null : (
                    <LandingNeighborhoodSignals className="mb-4" />
                  )}

                  <div
                    className={cn(
                      "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
                      hasSearchIntent ? "mb-4" : "mb-6",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-700">
                        {loadingTeachers
                          ? t("loading")
                          : `${filtered.length} ${filtered.length !== 1 ? t("profilesPlural") : t("profileSingular")}`}
                      </p>
                      <span aria-hidden className="hidden h-3 w-px shrink-0 bg-[#D3D1C7] sm:inline-block" />
                      <span className="text-sm font-semibold text-[#2C2C2A]">
                        <LandingResultsHeading
                          hasSearchIntent={hasSearchIntent}
                          subject={subjectLabel}
                          place={committedPlaceLabel}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={requestGeo}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors",
                          sortMode === "nearest" && geo
                            ? "bg-teal-500/15 text-teal-700"
                            : "text-neutral-700 hover:text-teal-700",
                        )}
                        aria-pressed={sortMode === "nearest" && !!geo}
                      >
                        <MapPin size={11} aria-hidden /> {t("findNearMe")}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 self-stretch rounded-xl border border-[#E8E6DF] bg-white p-1 sm:self-auto sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:min-h-0 sm:flex-initial",
                          viewMode === "list"
                            ? "bg-teal-700 text-white shadow-sm"
                            : "text-neutral-700 hover:text-[#2C2C2A]",
                        )}
                      >
                        <LayoutList size={13} aria-hidden /> {t("viewList")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("map");
                          setMapLoaded(true);
                        }}
                        className={cn(
                          "flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:min-h-0 sm:flex-initial",
                          viewMode === "map"
                            ? "bg-teal-700 text-white shadow-sm"
                            : "text-neutral-700 hover:text-[#2C2C2A]",
                        )}
                      >
                        <Map size={13} aria-hidden /> {t("viewMap")}
                      </button>
                    </div>
                  </div>

                  {viewMode === "list" ? (
                    loadingTeachers ? (
                      <div className="flex justify-center py-14">
                        <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <LandingResultsEmptyState
                        hasSearchIntent={hasSearchIntent}
                        subject={subjectLabel}
                        place={committedPlaceLabel}
                      />
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                          {filtered.slice(0, 9).map((teacher, index) => (
                            <div key={teacher.id} className={cn(index >= 4 && "hidden lg:block")}>
                              <LandingTeacherListingCard
                                teacher={teacher}
                                geo={geo}
                                isHighlighted={selectedMapTeacher?.id === teacher.id}
                                onOpen={() => setSelectedTeacherProfile(teacher)}
                              />
                            </div>
                          ))}
                        </div>
                        {filtered.length > 4 ? (
                          <div className="mt-8 text-center">
                            <Link
                              href="/login?next=/student/search"
                              prefetch={false}
                              className="inline-flex h-11 items-center rounded-2xl bg-teal-700 px-6 text-sm font-semibold text-white hover:brightness-105"
                            >
                              {t("viewAllTeachers")}
                            </Link>
                          </div>
                        ) : null}
                      </>
                    )
                  ) : null}

                  {viewMode === "map" && mapLoaded ? (
                    <div className="mt-2 h-[min(520px,calc(100dvh-12rem))] overflow-hidden rounded-3xl border border-[#E8E6DF] bg-white shadow-sm">
                      {/*
                       * Future enhancement: sync visible teacher results with current map bounds.
                       */}
                      <SearchMapView
                        teachers={filtered}
                        userLat={geo?.lat ?? null}
                        userLng={geo?.lng ?? null}
                        selectedTeacher={selectedMapTeacher}
                        onTeacherSelect={(tt) => setSelectedMapTeacher(tt)}
                        onViewProfile={(tt) => setSelectedTeacherProfile(tt)}
                        onCloseSelected={() => setSelectedMapTeacher(null)}
                        onBoundsSearch={(bounds) => setMapBounds(bounds)}
                        highlightedTeacherId={selectedMapTeacher?.id ?? null}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

          ) : (
            <div key="teacher" className="bg-[#2C2C2A] text-white">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
                <div className="mb-6 flex flex-wrap justify-center gap-2 rounded-2xl bg-black/20 p-1 sm:inline-flex">
                  <TogglePill active={false} onClick={() => setMode("student")} darkMode>{t("iAmStudent")}</TogglePill>
                  <TogglePill active onClick={() => setMode("teacher")} darkMode>{t("iAmTeacher")}</TogglePill>
                </div>

                <h2 className="text-center text-2xl font-bold leading-tight sm:text-4xl">
                  {t("homeTeacherH1")}
                  <br />
                  <span className="text-white/75">{t("homeTeacherH1Sub")}</span>
                </h2>
                <p className="mt-4 text-center text-sm text-white/80 max-w-xl mx-auto">
                  {t("homeTeacherSub")}
                </p>

                {/* 3-stat row */}
                <div className="mx-auto mt-10 grid max-w-3xl gap-3 grid-cols-3">
                  <StatCard label={t("homeStatCommFree")} value="12-15%" />
                  <StatCard label={t("homeStatCommPro")} value="3.5-5%" />
                  <StatCard label={t("homeStatRistourne")} value="5% profits" />
                </div>

                <ul className="mx-auto mt-8 max-w-xl space-y-2.5 text-sm text-white/85">
                  {[
                    t("homeBullet1"),
                    t("homeBullet2"),
                    t("homeBullet3"),
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex flex-col items-center gap-3">
                  <Link href="/become-teacher" className="inline-flex h-12 items-center justify-center rounded-2xl bg-teal-700 px-8 text-sm font-bold text-white hover:brightness-105">
                    {t("homeTeacherSeePlans")}
                  </Link>
                  <Link href={buildTeacherSignupLoginHref()} prefetch={false} className="text-sm font-medium text-white/80 underline underline-offset-2 hover:text-white">
                    {t("joinFree")}
                  </Link>
                </div>
              </div>
            </div>
          )}
      </section>

      <SocialProofTestimonials className="bg-[#FAFCFB] py-14 sm:py-20" />
      <TrustSafetySection className="border-t border-[#E8E6DF] bg-[#F8F6F1] py-14 sm:py-20" />
      <LandingHowItWorks className="border-t border-[#E8E6DF] bg-[#FAFCFB] py-14 sm:py-20" />

      <div className="mx-auto max-w-[1440px] bg-[#F8F6F1] pb-6 text-center">
        <p className="mx-auto max-w-xl px-4 text-xs leading-relaxed text-neutral-700">{t("creditsDisclaimer")}</p>
      </div>

      <LandingResourcesSection />

      <MarketplaceFinalCta />

      {selectedTeacherProfile ? (
        <TeacherProfile
          key={selectedTeacherProfile.id}
          teacher={selectedTeacherProfile}
          onClose={() => setSelectedTeacherProfile(null)}
          onBook={(kind) => {
            if (!user) {
              router.push(`/login?next=${encodeURIComponent("/student/search")}`);
              return;
            }
            setBookingInitialKind(kind);
            setBookingTeacher(selectedTeacherProfile);
            setSelectedTeacherProfile(null);
          }}
          onSendMessage={
            selectedTeacherProfile.userId
              ? () => {
                  const uid = selectedTeacherProfile.userId!;
                  if (!user) {
                    router.push(`/login?next=${encodeURIComponent(`/messages?peer=${encodeURIComponent(uid)}`)}`);
                    return;
                  }
                  router.push(`/messages?peer=${encodeURIComponent(uid)}`);
                }
              : undefined
          }
        />
      ) : null}

      {bookingTeacher ? (
        <BookingModal
          key={`${bookingTeacher.id}-${bookingInitialKind}`}
          teacher={bookingTeacher}
          initialLessonKind={bookingInitialKind}
          onClose={() => { setBookingTeacher(null); setBookingInitialKind("standard"); }}
        />
      ) : null}

      {quizOpen ? <TeacherQuiz onClose={() => setQuizOpen(false)} /> : null}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToggleSegment({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[128px] rounded-xl px-4 py-2.5 text-xs font-bold transition-colors",
        active ? "bg-teal-700 text-white shadow-sm" : "text-neutral-700 hover:bg-[#f0f0eb]",
      )}
    >
      {children}
    </button>
  );
}

function TogglePill({ children, active, onClick, darkMode }: { children: React.ReactNode; active: boolean; onClick: () => void; darkMode?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[130px] rounded-xl px-4 py-2.5 text-xs font-bold transition-colors",
        active
          ? darkMode ? "bg-white text-[#2C2C2A] shadow-sm" : "bg-white text-teal-700 shadow-sm"
          : "bg-transparent text-white/85 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/75">{label}</p>
      <p className="mt-2 text-xl font-bold text-[#7FE0C3]">{value}</p>
    </div>
  );
}

/**
 * Renders the contextual heading shown in the results filter row.
 *
 * Pre-search: keeps the neutral "Teachers near you" framing, so the
 * landing still feels like discovery.
 *
 * In results mode: composes a sentence from the committed subject /
 * place state. The locale templates use {subject} and {place} tokens
 * which are substituted with the same string interpolation pattern the
 * rest of the codebase uses (see `t("distanceFromYouKm").replace(...)`).
 */
function LandingResultsHeading({
  hasSearchIntent,
  subject,
  place,
}: {
  hasSearchIntent: boolean;
  subject: string;
  place: string | null;
}) {
  const { t } = useLocale();
  if (!hasSearchIntent) {
    return <>{t("landingResultsHeadingDefault")}</>;
  }
  if (subject && place) {
    return (
      <>
        {t("landingResultsHeadingForNear")
          .replace("{subject}", subject)
          .replace("{place}", place)}
      </>
    );
  }
  if (subject) {
    return <>{t("landingResultsHeadingFor").replace("{subject}", subject)}</>;
  }
  if (place) {
    return <>{t("landingResultsHeadingNear").replace("{place}", place)}</>;
  }
  return <>{t("landingResultsHeadingFiltered")}</>;
}

/**
 * Empty-results panel shown when the filter pipeline returns nothing.
 * Mirrors the heading templates so the message stays specific to what
 * the student searched for, plus a generic "widen filters" hint.
 */
function LandingResultsEmptyState({
  hasSearchIntent,
  subject,
  place,
}: {
  hasSearchIntent: boolean;
  subject: string;
  place: string | null;
}) {
  const { t } = useLocale();
  let message = t("landingResultsEmptyDefault");
  if (hasSearchIntent) {
    if (subject && place) {
      message = t("landingResultsEmptyForNear")
        .replace("{subject}", subject)
        .replace("{place}", place);
    } else if (subject) {
      message = t("landingResultsEmptyFor").replace("{subject}", subject);
    } else if (place) {
      message = t("landingResultsEmptyNear").replace("{place}", place);
    }
  }
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-semibold text-[#2C2C2A]">{message}</p>
      {hasSearchIntent ? (
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-neutral-700">
          {t("landingResultsEmptyHint")}
        </p>
      ) : null}
    </div>
  );
}
