"use client";

// Future PR: simplify app navigation by keeping primary actions visible and moving secondary items into a user menu.

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { getDisciplineLabel } from "../lib/disciplines";
import { isEnabled } from "../lib/features";
import { getSupabaseClient } from "../lib/supabase";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "../lib/teacherDisciplines";
import { isLaunchEligibleTeacherRow, teacherRowToTeacher, type TeacherRow } from "../lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_LIST_SELECT_LEGACY_PUBLIC, TEACHERS_PUBLIC_TABLE } from "../lib/supabase/queries";
import { applyTeacherListingMetadata } from "@/lib/teacherListingMetadata";
import { useLocale } from "../lib/locale-context";
import { useAuth } from "../components/AuthProvider";
import type { BookingInitialLessonKind } from "../components/BookingModal";
import type { TeacherBookContext } from "../components/TeacherProfile";
import type { MapBounds } from "../components/SearchMapView";
import { LandingDiscoverySearch } from "../components/marketing/LandingDiscoverySearch";
import { LandingTeacherListingCard } from "../components/marketing/LandingTeacherListingCard";
import { LandingResourcesSection } from "../components/marketing/LandingResourcesSection";
import { LandingHeadline } from "../components/marketing/LandingHeadline";
import { getTeacherPublicFormatIds } from "@/lib/teachers/display";
import type { LandingFormatFilter } from "../lib/landingTeacherFilter";
import { filterTeacherPool, buildTeacherSearchRows, sortRows } from "../lib/teacherSearchEngine";
import { teachersInLandingMapArea } from "@/lib/landingTeacherMap";
import { attachPublicTeachingZones, getTeacherMapCoords } from "@/lib/teacherTeachingZones";
import { TeacherSearchAdvancedPanel, type AdvancedFilterValues } from "../components/TeacherSearchAdvancedPanel";
import { logSearchEvent } from "../lib/searchAnalytics";
import {
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
      <div className="flex h-[var(--landing-map-height)] flex-col items-center justify-center gap-2 rounded-xl bg-[#F3F7F5] text-sm text-neutral-700">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        <MapLoadingLabel />
      </div>
    ),
  },
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

const SUBJECT_EXAMPLES = ["piano", "francais", "mathematiques"] as const;
const EMPTY_FILTERS: AdvancedFilterValues = {
  minRating: "", maxPrice: "", verifiedOnly: false, language: "", level: "",
  availabilityDay: "", availabilityPeriod: "", teacherPreference: "", formatExtra: "",
};

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
      <LandingHeadline title={t("landingNeighborhoodHeadline")} accent={t("landingHomepageHeadlineAccent")} />
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-700 sm:text-base">
        {t("landingHomepageIntro")}
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
  const { t, locale } = useLocale();
  const [clientHeroReady, setClientHeroReady] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  // Teachers + search state
  const [locationSearch, setLocationSearch] = useState("");
  // Lieu autocomplete (formatted as "City, PROV"). Mid-typing strings are
  // ignored so the summary row stays accurate while the user types.
  const committedPlaceLabel = useMemo(() => {
    const trimmed = locationSearch.trim();
    return /,\s+[A-Z]{2}$/.test(trimmed) ? trimmed : null;
  }, [locationSearch]);
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
  const [teacherLoadFailed, setTeacherLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Geo
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<"relevance" | "nearest">("relevance");

  // Map bounds (set when user clicks "Search this area"; null = show all)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const [formatFilter, setFormatFilter] = useState<LandingFormatFilter>("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adv, setAdv] = useState<AdvancedFilterValues>(EMPTY_FILTERS);

  const [highlightedTeacherId, setHighlightedTeacherId] = useState<string | null>(null);

  // Profile / booking modals
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<Teacher | null>(null);
  const [selectedMapTeacher, setSelectedMapTeacher] = useState<Teacher | null>(null);
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");
  const [bookingContext, setBookingContext] = useState<TeacherBookContext | undefined>();

  const teacherResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setClientHeroReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Load teachers
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();
    const load = async () => {
      setLoadingTeachers(true);
      setTeacherLoadFailed(false);
      const updateTeachers = (list: Teacher[]) => { if (!cancelled) setTeachers(list); };
      const mergePlans = async (list: Teacher[]) => {
        const ids = list.map((t) => t.id).join(",");
        if (!ids) { updateTeachers(list); return; }
        try {
          const pr = await fetch(`/api/teachers/plans?ids=${encodeURIComponent(ids)}`);
          if (!pr.ok) throw new Error("Teacher public metadata lookup failed");
          const body = (await pr.json()) as Parameters<typeof applyTeacherListingMetadata>[1];
          updateTeachers(applyTeacherListingMetadata(list, body));
        } catch {
          updateTeachers(list.map((t) => ({ ...t, profilePlan: "free" })));
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
      if (error) throw new Error("Public teacher lookup failed");
      if (!data?.length) {
        await mergePlans([]);
        return;
      }
      const mapped = (data as unknown as TeacherRow[])
        .filter((r) => isLaunchEligibleTeacherRow(r))
        .map((r) => teacherRowToTeacher(r));
      const mappedWithZones = await attachPublicTeachingZones(supabase, mapped);
      const discMap = await fetchTeacherDisciplinesMap(supabase, mappedWithZones.map((t) => t.id));
      await mergePlans(mergeTeachersWithDisciplines(mappedWithZones, discMap));
    };
    void load().catch(() => {
      if (!cancelled) {
        setTeachers([]);
        setTeacherLoadFailed(true);
      }
    }).finally(() => { if (!cancelled) setLoadingTeachers(false); });
    return () => { cancelled = true; };
  }, [loadAttempt]);

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
    const rows = mapBounds && fmt !== "online" ? teachersInLandingMapArea(pool, mapBounds) : buildTeacherSearchRows(pool, {
      geo,
      locationText: { city: committedPlaceLabel ?? (locationSearch.trim() || null), region: null },
    });

    const sorted = sortRows(rows, {
      sortMode: sortMode === "nearest" ? "nearest" : "relevance",
      searchQuery,
      format: fmt,
      hasLocationContext: Boolean(geo || mapBounds),
      studentPrefs: null,
    });
    return sorted.map((r) => r.teacher);
  }, [teachers, searchQuery, activeCat, sortMode, geo, mapBounds, formatFilter, adv, committedPlaceLabel, locationSearch]);

  // Online-only profiles stay in the results, never as in-person map pins.
  const mapTeachers = useMemo(() => (adv.formatExtra || formatFilter) === "online" ? [] : filtered.filter((teacher) => (
    getTeacherPublicFormatIds(teacher).some((format) => format !== "online") && getTeacherMapCoords(teacher) != null
  )), [filtered, formatFilter, adv.formatExtra]);

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
    setMapBounds(null);
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

  const subjectLabel = searchQuery.trim() || (activeCat === "All" ? "" : getDisciplineLabel(activeCat, locale));

  return (
    <>
      <section className="relative">
            <div className="bg-[#FAFCFB] text-[#2C2C2A]">
              <div className="relative border-b border-[#E8E6DF]/80 bg-[#FAFCFB]">
                <div
                  className={cn(
                    "relative mx-auto max-w-[1440px] px-4 pt-8 sm:px-6",
                    // Results mode: shrink the hero's bottom padding so the
                    // results section sits directly under the filters with
                    // a deliberate, tight visual rhythm.
                    hasSearchIntent ? "pb-3 sm:pb-4" : "pb-8 lg:pb-10",
                  )}
                >
                  <div className="mx-auto max-w-3xl space-y-6 text-center">
                    {clientHeroReady ? <LandingHeroClientCopy /> : children}
                    <LandingDiscoverySearch
                      teachersForSearch={teachers}
                      searchQuery={searchQuery}
                      onSearchQueryChange={(query) => {
                        setActiveCat("All");
                        setSearchQuery(query);
                      }}
                      locationSearch={locationSearch}
                      onLocationSearchChange={(place) => {
                        setMapBounds(null);
                        setLocationSearch(place);
                      }}
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

                  {hasSearchIntent ? null : (
                    <div className="mx-auto mt-3 max-w-3xl text-center">
                      <div className="flex flex-wrap items-center justify-center gap-x-4" aria-label={t("landingHomepageExamples")}>
                        <span className="text-xs text-neutral-500">{t("landingHomepageExamples")}</span>
                        {SUBJECT_EXAMPLES.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setActiveCat("All");
                              setSearchQuery(getDisciplineLabel(id, locale));
                            }}
                            className="min-h-11 text-sm font-medium text-teal-800 underline decoration-teal-800/30 underline-offset-4 hover:decoration-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
                          >
                            {getDisciplineLabel(id, locale)}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuizOpen(true)}
                        className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                      >
                        <Sparkles size={16} className="shrink-0" aria-hidden />
                        {t("landingHomepageQuizCta")}
                      </button>
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
                          : teacherLoadFailed ? t("landingHomepageLoadErrorTitle") : `${filtered.length} ${filtered.length !== 1 ? t("profilesPlural") : t("profileSingular")}`}
                      </p>
                      <span aria-hidden className="hidden h-3 w-px shrink-0 bg-[#D3D1C7] sm:inline-block" />
                      <h2 className="text-base font-semibold text-[#2C2C2A]">
                        <LandingResultsHeading
                          hasSearchIntent={hasSearchIntent}
                          subject={subjectLabel}
                          place={committedPlaceLabel}
                        />
                      </h2>
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
                    <div className="flex items-center self-start sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => setAdvancedOpen((open) => !open)}
                        aria-expanded={advancedOpen}
                        aria-controls="advanced-search-filters"
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E8E6DF] bg-white px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700"
                      >
                        <SlidersHorizontal size={16} aria-hidden />
                        {t("landingHomepageFilters")}
                        {hasAdvancedFilter ? <span className="h-2 w-2 rounded-full bg-teal-700"><span className="sr-only">{t("landingHomepageFiltersActive")}</span></span> : null}
                      </button>
                    </div>
                  </div>

                  {hasSearchIntent ? (
                    <button
                      type="button"
                      className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-teal-800 underline underline-offset-4"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCat("All");
                        setLocationSearch("");
                        setHasLieuTypingIntent(false);
                        setGeo(null);
                        setSortMode("relevance");
                        setFormatFilter("all");
                        setAdv(EMPTY_FILTERS);
                        setMapBounds(null);
                      }}
                    >
                      <X size={14} aria-hidden /> {t("landingHomepageReset")}
                    </button>
                  ) : null}
                  <div className={advancedOpen ? "mb-6" : undefined}>
                    <TeacherSearchAdvancedPanel
                      hideTrigger
                      open={advancedOpen}
                      onToggle={() => setAdvancedOpen((open) => !open)}
                      values={adv}
                      onChange={(patch) => setAdv((a) => ({ ...a, ...patch }))}
                      t={t}
                    />
                    {advancedOpen && isEnabled("group_sessions") ? (
                      <Link href="/group-sessions" className="mt-3 inline-flex min-h-11 items-center text-sm text-teal-800 underline">{t("groupCoursesLink")}</Link>
                    ) : null}
                  </div>

                  <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-6">
                    <section
                      aria-label={t("landingHomepageMapTitle")}
                      data-testid="landing-map"
                      className="min-w-0 [--landing-map-height:320px] sm:[--landing-map-height:400px] lg:sticky lg:top-20 lg:[--landing-map-height:560px]"
                    >
                      <SearchMapView
                        teachers={mapTeachers}
                        userLat={geo?.lat ?? null}
                        userLng={geo?.lng ?? null}
                        selectedTeacher={mapTeachers.find((teacher) => teacher.id === selectedMapTeacher?.id) ?? null}
                        onTeacherSelect={setSelectedMapTeacher}
                        onViewProfile={setSelectedTeacherProfile}
                        onCloseSelected={() => setSelectedMapTeacher(null)}
                        onBoundsSearch={(adv.formatExtra || formatFilter) === "online" ? undefined : (bounds) => {
                          setLocationSearch("");
                          setGeo(null);
                          setHasLieuTypingIntent(false);
                          setMapBounds(bounds);
                        }}
                        highlightedTeacherId={highlightedTeacherId ?? selectedMapTeacher?.id ?? null}
                        mapHeight="var(--landing-map-height)"
                        requestLocationOnMount={false}
                        fitTeachersOnLoad
                      />
                      {!loadingTeachers && !teacherLoadFailed ? <p className="mt-2 text-xs text-neutral-600">{mapTeachers.length ? t("landingHomepageMapCount").replace("{count}", String(mapTeachers.length)) : t("landingHomepageMapEmpty")}</p> : null}
                    </section>
                    <div className="min-w-0" data-testid="landing-teacher-cards">
                    {loadingTeachers ? (
                      <div className="flex justify-center py-14">
                        <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                      </div>
                    ) : teacherLoadFailed ? (
                      <div role="alert" className="py-8 text-sm text-neutral-700">
                        <p>{t("landingHomepageLoadError")}</p>
                        <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-3 min-h-11 font-semibold text-teal-800 underline underline-offset-4">{t("landingHomepageRetry")}</button>
                      </div>
                    ) : filtered.length === 0 ? (
                      <LandingResultsEmptyState
                        hasSearchIntent={hasSearchIntent}
                        subject={subjectLabel}
                        place={committedPlaceLabel}
                      />
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                          {filtered.slice(0, 4).map((teacher) => (
                            <div key={teacher.id}>
                              <LandingTeacherListingCard
                                teacher={teacher}
                                geo={geo}
                                isHighlighted={selectedMapTeacher?.id === teacher.id || highlightedTeacherId === teacher.id}
                                onHoverChange={setHighlightedTeacherId}
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
                    )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

      </section>

      <LandingHowItWorks className="border-t border-[#E8E6DF] bg-[#FAFCFB] py-10 sm:py-12" />

      <details className="mx-auto max-w-5xl border-t border-[#E8E6DF] px-4 py-2 sm:px-6">
        <summary className="cursor-pointer py-4 text-sm font-semibold text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700">{t("landingHomepageTrustDetails")}</summary>
        <TrustSafetySection className="py-6" />
        <p className="mx-auto max-w-xl pb-4 text-center text-xs leading-relaxed text-neutral-700">{t("creditsDisclaimer")}</p>
      </details>

      <LandingResourcesSection />

      <MarketplaceFinalCta />

      {selectedTeacherProfile ? (
        <TeacherProfile
          key={selectedTeacherProfile.id}
          teacher={selectedTeacherProfile}
          onClose={() => setSelectedTeacherProfile(null)}
          onBook={(kind, context) => {
            if (!user) {
              router.push(`/login?next=${encodeURIComponent("/student/search")}`);
              return;
            }
            setBookingInitialKind(kind);
            setBookingContext(context);
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
          key={`${bookingTeacher.id}-${bookingInitialKind}-${bookingContext?.selectedOfferId ?? "none"}`}
          teacher={bookingTeacher}
          initialLessonKind={bookingInitialKind}
          initialSelectedOfferId={bookingContext?.selectedOfferId ?? null}
          publicOffers={bookingContext?.publicOffers}
          onClose={() => {
            setBookingTeacher(null);
            setBookingInitialKind("standard");
            setBookingContext(undefined);
          }}
        />
      ) : null}

      {quizOpen ? <TeacherQuiz onClose={() => setQuizOpen(false)} /> : null}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
