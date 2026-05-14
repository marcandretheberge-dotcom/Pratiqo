"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Teacher } from "../../../../types";
import type { BookingInitialLessonKind } from "../../../../components/BookingModal";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Clock, Home, List, Map as MapIcon, MapPin, ShieldCheck, Star, Users, Video, X } from "lucide-react";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { getSupabaseClient } from "../../../../lib/supabase";
import { haversineDistance } from "../../../../lib/geo";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "../../../../lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "../../../../lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "../../../../lib/supabase/queries";
import { TeacherAvatar } from "../../../../components/TeacherAvatar";
import { TeacherPriceTag } from "../../../../components/TeacherPriceTag";
import { getVerificationLevel, isPratiqoVerified } from "../../../../lib/verification";
import type { Currency } from "../../../../lib/geoLocale";
import { VerificationBadge } from "../../../../components/VerificationBadge";
import type { City } from "../../../../lib/cities";
import type { MapBounds } from "../../../../components/SearchMapView";
import { useAuth } from "../../../../components/AuthProvider";
import type { StudentLocationPrefs } from "../../../../lib/studentLocationSearch";
import { applyRadiusFilter, buildTeacherSearchRows, filterTeacherPool, sortRows } from "../../../../lib/teacherSearchEngine";
import { fetchNearbyTeachers } from "../../../../lib/teacherNearby";
import { TeacherSearchAdvancedPanel, type AdvancedFilterValues } from "../../../../components/TeacherSearchAdvancedPanel";
import type { TeacherSearchFormat } from "../../../../lib/teacherSearchCriteria";
import { logSearchEvent } from "../../../../lib/searchAnalytics";
import { LandingSearchHero } from "@/components/marketing/LandingSearchHero";
import { LandingTeacherCardSkeleton } from "@/components/marketing/LandingTeacherCardSkeleton";
import type { LandingFormatFilter } from "@/lib/landingTeacherFilter";
import { formatTeacherCardShortName, teacherCardLocationPlace } from "@/lib/teacherDisplayName";

const TeacherProfile = dynamic(
  () => import("../../../../components/TeacherProfile").then((m) => m.TeacherProfile),
  { ssr: false, loading: () => <DynamicLoadingBlock /> },
);
const BookingModal = dynamic(
  () => import("../../../../components/BookingModal").then((m) => m.BookingModal),
  { ssr: false, loading: () => <DynamicLoadingBlock /> },
);
const SearchMapView = dynamic(
  () => import("../../../../components/SearchMapView").then((m) => m.SearchMapView),
  {
    ssr: false,
    loading: () => (
      <DynamicLoadingBlock map />
    ),
  },
);

function DynamicLoadingBlock({ map = false }: { map?: boolean }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-[#6B6A65]",
        map ? "min-h-[480px] border border-[#E8E6DF]" : "p-8",
      )}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      <p>{map ? t("loadingMap") : t("loading")}</p>
    </div>
  );
}

export default function StudentSearchPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [radius, setRadius] = useState<5 | 10 | 25 | 50 | "all" | "online">("all");
  // Server-side PostGIS lookup result. `null` = not used (no geo, "all"/"online" radius, or RPC unavailable).
  // When populated, takes precedence over the client-side haversine path for both filtering and distance display.
  const [nearbyServerResult, setNearbyServerResult] = useState<Map<string, number> | null>(null);
  const [sortMode, setSortMode] = useState<"relevance" | "nearest" | "trusted">("relevance");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMapTeacher, setSelectedMapTeacher] = useState<Teacher | null>(null);
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<Teacher | null>(null);
  const [landingLocQuery, setLandingLocQuery] = useState("");
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [studentPrefs, setStudentPrefs] = useState<StudentLocationPrefs | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adv, setAdv] = useState<AdvancedFilterValues>({
    minRating: "",
    maxPrice: "",
    verifiedOnly: false,
    language: "",
    level: "",
    availability: "",
    teacherPreference: "",
    formatExtra: "",
  });

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;
    const loadPrefs = async () => {
      if (!user?.id) {
        setStudentPrefs(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("country_code, timezone, currency, city, region, preferred_learning_format")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        const row = data as {
          country_code?: string | null;
          timezone?: string | null;
          currency?: string | null;
          city?: string | null;
          region?: string | null;
          preferred_learning_format?: string | null;
        } | null;
        setStudentPrefs(
          row
            ? {
                country_code: row.country_code ?? null,
                timezone: row.timezone ?? null,
                currency: row.currency ?? null,
                city: row.city ?? null,
                region: row.region ?? null,
                preferred_learning_format: row.preferred_learning_format ?? null,
              }
            : null,
        );
      }
    };
    void loadPrefs();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const load = async () => {
      const { data, error } = await supabase
        .from(TEACHERS_PUBLIC_TABLE)
        .select(TEACHERS_LIST_SELECT)
        .order("verification_level", { ascending: false })
        .order("rating", { ascending: false });

      if (error || !data?.length) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[student/search] teachers_public unavailable or empty; skipping demo teachers (IDs must be UUIDs).",
            error,
          );
        }
        setTeachers([]);
        setLoadingTeachers(false);
        return;
      }

      const mapped = data.map((r) => teacherRowToTeacher(r as TeacherRow));
      const ids = mapped.map((x) => x.id).join(",");
      if (!ids) {
        setTeachers(mapped);
        setLoadingTeachers(false);
        return;
      }

      let merged: Teacher[];
      try {
        const [discMap, plansRes] = await Promise.all([
          fetchTeacherDisciplinesMap(supabase, mapped.map((x) => x.id)),
          fetch(`/api/teachers/plans?ids=${encodeURIComponent(ids)}`).then((r) => r.json() as Promise<{ plans?: Record<string, string> }>),
        ]);
        const plans = plansRes.plans ?? {};
        merged = mergeTeachersWithDisciplines(mapped, discMap).map((x) => ({
          ...x,
          profilePlan: plans[x.id] ?? "free",
        }));
      } catch {
        merged = mergeTeachersWithDisciplines(mapped, new Map()).map((x) => ({ ...x, profilePlan: "free" as const }));
      }
      setTeachers(merged);
      setLoadingTeachers(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (teachers.length === 0) return;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const run = () => void import("../../../../components/SearchMapView");
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(run, 1200);
    }
    return () => {
      if (idleId != null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [teachers.length]);

  const requestGeolocation = () => {
    if (!("geolocation" in navigator)) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        setSortMode("nearest");
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Clear map-bounds filter whenever the user changes their text/category/radius search
  useEffect(() => {
    setMapBounds(null);
  }, [searchQuery, activeCat, radius, adv]);

  // PostGIS-backed nearby lookup. Runs whenever radius is a concrete number and geo is set.
  // We deliberately don't block render — the client-side haversine path handles the gap
  // (and stays the fallback if the RPC isn't deployed yet).
  useEffect(() => {
    if (!geo || typeof radius !== "number") {
      setNearbyServerResult(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      const result = await fetchNearbyTeachers({
        lat: geo.lat,
        lng: geo.lng,
        radiusKm: radius,
        signal: controller.signal,
      });
      if (cancelled) return;
      if (!result || result.length === 0) {
        // Empty RPC result must NOT become an empty Map — a truthy empty Map
        // would still take the "server path" in results and filter every UUID
        // teacher out (RPC uses teachers.location_point; legacy rows or
        // teachers without a synced point return nothing while teachers_public
        // still has JSON lat/lng). Treat like "unavailable" and use haversine.
        setNearbyServerResult(null);
        return;
      }
      const map = new Map<string, number>();
      for (const row of result) map.set(row.id, row.distanceKm);
      setNearbyServerResult(map);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [geo, radius]);

  const formatValue = useMemo((): LandingFormatFilter => {
    const raw = (adv.formatExtra || "").trim() as TeacherSearchFormat | "";
    if (raw === "online" || raw === "in_person" || raw === "hybrid" || raw === "at_home") return raw;
    return "all";
  }, [adv.formatExtra]);

  const setFormatValue = (v: LandingFormatFilter) => {
    const fmt: TeacherSearchFormat | "" =
      v === "all" ? "" : (v as unknown as TeacherSearchFormat);
    setAdv((a) => ({ ...a, formatExtra: fmt }));
  };

  const verifiedTeacherCount = useMemo(
    () =>
      teachers.filter((t) =>
        isPratiqoVerified({
          isVerified: t.isVerified,
          identityVerified: t.identityVerified,
          verificationLevel: t.verificationLevel ?? null,
        }),
      ).length,
    [teachers],
  );

  const results = useMemo(() => {
    const pool = filterTeacherPool(teachers, {
      category: activeCat,
      searchQuery,
      verifiedOnly: adv.verifiedOnly || undefined,
    });
    const base = buildTeacherSearchRows(pool, { geo });

    // Server-side path: use the PostGIS RPC result both for filtering AND
    // for authoritative distance values (handles antimeridian/curvature
    // correctly, which the client haversine approximates).
    let filtered: typeof base;
    if (nearbyServerResult && nearbyServerResult.size > 0 && geo && typeof radius === "number") {
      const serverFiltered = base
        .filter(({ teacher }) => nearbyServerResult.has(teacher.id))
        .map((row) => ({
          ...row,
          distanceKm: nearbyServerResult.get(row.teacher.id) ?? row.distanceKm,
        }));
      // RPC can return legacy demo ids (short keys) not present in
      // teachers_public (UUID-filtered view). Intersection is then empty while
      // the pool still has real teachers with JSON coords — fall back.
      filtered =
        serverFiltered.length === 0 && base.length > 0
          ? applyRadiusFilter(base, radius)
          : serverFiltered;
    } else {
      // Client haversine fallback (no geo, RPC unavailable, empty RPC, or "all"/"online").
      filtered = applyRadiusFilter(base, geo ? radius : radius === "online" ? "online" : "all");
    }

    // Apply map-bounds filter when the user has clicked "Search this area"
    if (mapBounds) {
      filtered = filtered.filter(({ teacher: tt }) => {
        const lat = tt.location?.lat;
        const lng = tt.location?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        const { ne, sw } = mapBounds;
        // Handle antimeridian wrapping for longitude
        const lngInBounds =
          ne.lng < sw.lng
            ? lng >= sw.lng || lng <= ne.lng
            : lng >= sw.lng && lng <= ne.lng;
        return lat >= sw.lat && lat <= ne.lat && lngInBounds;
      });
    }

    // Unify sorting across search surfaces. Keep existing modes, but fold in student prefs.
    const rows = sortRows(filtered, { sortMode, studentPrefs });
    return rows;
  }, [teachers, activeCat, searchQuery, geo, radius, sortMode, mapBounds, studentPrefs, adv.verifiedOnly, nearbyServerResult]);

  return (
    <>
      <div className="min-h-[100vh] bg-[#F3FAF6]">
        <LandingSearchHero
          query={searchQuery}
          onQueryChange={setSearchQuery}
          teachers={teachers}
          geo={geo}
          onSelectTeacher={(teacher) => setSelectedTeacherProfile(teacher)}
          onSelectDiscipline={(label) => {
            setSearchQuery(label);
          }}
          locationQuery={landingLocQuery}
          onLocationQueryChange={setLandingLocQuery}
          onSelectCity={(city: City) => {
            setGeo({ lat: city.lat, lng: city.lng });
            setSortMode("nearest");
            setLandingLocQuery("");
          }}
          formatValue={formatValue}
          onFormatChange={setFormatValue}
          onSubmit={() => {
            logSearchEvent({
              source: "student_search",
              category: activeCat,
              format: formatValue,
              subject: searchQuery,
              filters: { radius },
            });
            document.getElementById("student-search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          selectedCategory={activeCat}
          onCategoryChange={(cat) => {
            setActiveCat(cat);
            // Keep subject input; only reset when switching away from current chip.
            if (cat !== activeCat && cat !== "All") setSearchQuery("");
          }}
          advancedOpen={advancedOpen}
          onToggleAdvanced={() => setAdvancedOpen((o) => !o)}
          showIntentToggle={false}
          showQuizCta={false}
          extraUnderAdvanced={
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { v: 5, label: "5km" },
                { v: 10, label: "10km" },
                { v: 25, label: "25km" },
                { v: 50, label: "50km" },
                { v: "all", label: t("radiusAll") },
                { v: "online", label: t("radiusOnline") },
              ].map((opt) => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setRadius(opt.v as any)}
                  className={cn(
                    "h-11 rounded-full border px-4 text-sm font-semibold shadow-sm transition-colors",
                    radius === opt.v
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-[#DCEAE3] bg-white text-[#2C2C2A] hover:bg-[#FAFCFB]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => requestGeolocation()}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border border-[#DCEAE3] bg-white px-4 text-sm font-semibold text-[#2C2C2A] shadow-sm hover:bg-[#FAFCFB]",
                  geoLoading && "opacity-80",
                )}
              >
                <MapPin size={14} className="text-teal-700" aria-hidden />
                {t("nearMe")}
              </button>
              <button
                type="button"
                onClick={() => setAdv((a) => ({ ...a, verifiedOnly: !a.verifiedOnly }))}
                aria-pressed={adv.verifiedOnly}
                title={t("verifiedPillTooltip")}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition-colors",
                  adv.verifiedOnly
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-[#DCEAE3] bg-white text-[#2C2C2A] hover:bg-[#FAFCFB]",
                )}
              >
                <ShieldCheck size={14} strokeWidth={2.5} aria-hidden />
                <span>{t("verifiedPillLabel")}</span>
                {verifiedTeacherCount > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold leading-none",
                      adv.verifiedOnly ? "bg-white/20 text-white" : "bg-teal-50 text-teal-700",
                    )}
                  >
                    {verifiedTeacherCount}
                  </span>
                ) : null}
              </button>
            </div>
          }
        />

        <div className="bg-[#F3FAF6] px-4 pb-2 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            <TeacherSearchAdvancedPanel
              open={advancedOpen}
              onToggle={() => setAdvancedOpen((o) => !o)}
              values={adv}
              onChange={(patch) => setAdv((a) => ({ ...a, ...patch }))}
              t={t}
              hideTrigger
            />
          </div>
        </div>

        <div id="student-search-results" className="bg-[#F3FAF6] px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#2C2C2A]">
                {results.length} {t("searchResults")}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-[#2C2C2A]">
                  <span className="text-[#6B6A65]">{t("sortLabel")}</span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                    className="h-10 rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm font-semibold text-[#2C2C2A] outline-none"
                  >
                    <option value="relevance">{t("sortRelevance")}</option>
                    <option value="nearest">{t("sortNearest")}</option>
                    <option value="trusted">{t("sortTrusted")}</option>
                  </select>
                </label>

                <button
                  type="button"
                  aria-label={viewMode === "map" ? t("listView") : t("mapView")}
                  aria-pressed={viewMode === "map"}
                  onClick={() => {
                    setViewMode((v) => {
                      const next = v === "list" ? "map" : "list";
                      if (next === "map") setMapLoaded(true);
                      return next;
                    });
                  }}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold transition-colors",
                    viewMode === "map"
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-[#DCEAE3] bg-white text-[#2C2C2A] hover:bg-[#FAFCFB]",
                  )}
                >
                  {viewMode === "map" ? <List size={14} aria-hidden /> : <MapIcon size={14} aria-hidden />}
                  {viewMode === "map" ? t("listView") : t("mapView")}
                </button>
              </div>
            </div>

            {viewMode === "list" ? (
              loadingTeachers ? (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <LandingTeacherCardSkeleton key={i} />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-[#DCEAE3] bg-white p-8 text-center shadow-[0_12px_40px_rgba(44,44,42,0.05)]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <MapPin size={22} />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-[#2C2C2A]">{t("noTeachersFound")}</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#6B6A65]">
                    {t("studentSearchEmptyHint")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCat("All");
                      setRadius("all");
                      setMapBounds(null);
                      setAdv({
                        minRating: "",
                        maxPrice: "",
                        verifiedOnly: false,
                        language: "",
                        level: "",
                        availability: "",
                        teacherPreference: "",
                        formatExtra: "",
                      });
                    }}
                    className="mt-5 inline-flex h-11 items-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800"
                  >
                    {t("studentSearchResetFilters")}
                  </button>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map(({ teacher, distanceKm }) => (
                    <TeacherCard
                      key={teacher.id}
                      teacher={teacher}
                      distanceKm={distanceKm}
                      t={t}
                      onOpen={() => setSelectedTeacherProfile(teacher)}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="mt-5">
                {!mapLoaded ? null : (
                  <>
                    {loadingTeachers ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        {t("loading")}
                      </div>
                    ) : (
                      <>
                        {mapBounds ? (
                          <div className="mb-2 flex justify-center sm:mb-3">
                            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-teal-600/25 bg-teal-50/95 px-3 py-1.5 text-[11px] font-semibold text-teal-900 shadow-sm sm:text-xs">
                              <MapPin size={12} className="shrink-0 text-teal-700" aria-hidden />
                              <span className="truncate">{t("mapBoundsFilterActiveLabel")}</span>
                              <button
                                type="button"
                                onClick={() => setMapBounds(null)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800 ring-1 ring-teal-700/15 hover:bg-white"
                                aria-label={t("mapBoundsClearFilterAria")}
                              >
                                <X size={12} strokeWidth={2.5} aria-hidden />
                                <span className="hidden sm:inline">{t("mapBoundsClearFilter")}</span>
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <SearchMapView
                          teachers={results.map((x) => x.teacher)}
                          userLat={geo?.lat ?? null}
                          userLng={geo?.lng ?? null}
                          selectedTeacher={selectedMapTeacher}
                          onTeacherSelect={(teacher) => setSelectedMapTeacher(teacher)}
                          onCloseSelected={() => setSelectedMapTeacher(null)}
                          onViewProfile={(teacher) => setSelectedTeacherProfile(teacher)}
                          onBoundsSearch={(bounds) => setMapBounds(bounds)}
                          boundsFilterActive={!!mapBounds}
                          onBoundsFilterCleared={() => setMapBounds(null)}
                          mapHeight="min(520px, calc(100dvh - 14rem))"
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTeacherProfile && (
        <TeacherProfile
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
                  if (!user) {
                    const uid = selectedTeacherProfile.userId!;
                    router.push(`/login?next=${encodeURIComponent(`/messages?peer=${encodeURIComponent(uid)}`)}`);
                    return;
                  }
                  const uid = selectedTeacherProfile.userId!;
                  setSelectedTeacherProfile(null);
                  router.push(`/messages?peer=${encodeURIComponent(uid)}`);
                }
              : undefined
          }
        />
      )}

      {bookingTeacher && (
        <BookingModal
          key={`${bookingTeacher.id}-${bookingInitialKind}`}
          teacher={bookingTeacher}
          initialLessonKind={bookingInitialKind}
          onClose={() => {
            setBookingTeacher(null);
            setBookingInitialKind("standard");
          }}
        />
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-xs font-bold transition",
        active ? "bg-white text-teal-700" : "bg-white/15 text-white hover:bg-white/25",
      )}
    >
      {children}
    </button>
  );
}

function RadiusPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-xs font-bold transition",
        active ? "bg-white text-teal-700" : "bg-white/15 text-white hover:bg-white/25",
      )}
    >
      {children}
    </button>
  );
}

function TeacherCard({
  teacher,
  distanceKm,
  onOpen,
  t,
}: {
  teacher: Teacher;
  distanceKm: number | null;
  onOpen: () => void;
  t: (key: any) => string;
}) {
  const availability = teacher.availability?.[0] ? String(teacher.availability[0]) : null;
  const supportsOnline = ["online", "both", "all"].includes(teacher.teachingMode);
  const supportsInPerson = ["person", "both", "all"].includes(teacher.teachingMode);
  const supportsHome = Boolean(teacher.homeLessonEnabled);
  const formatLabels = [
    supportsOnline ? t("bookingOnline") : null,
    supportsInPerson ? t("inPerson") : null,
    supportsHome ? t("modeHome") : null,
  ].filter(Boolean) as string[];
  const introDuration = teacher.introSessionDurationMinutes ?? 45;

  const verificationLevel = getVerificationLevel({
    plan: teacher.profilePlan,
    identity_verified: teacher.identityVerified,
    diploma_verified: teacher.diplomaVerified,
    is_verified: teacher.isVerified,
    verification_level: teacher.verificationLevel ?? null,
  });

  const neighborhoodHint = teacher.location?.neighborhood?.trim();
  const placeFallback = teacherCardLocationPlace(teacher);
  const cardShortName = formatTeacherCardShortName(teacher.name);
  const distancePrimary =
    distanceKm != null
      ? t("distanceFromYouEmphasis").replace("{{n}}", String(Math.round(distanceKm)))
      : placeFallback
        ? t("teacherCardBasedInPlace").replace("{{place}}", placeFallback)
        : neighborhoodHint
          ? t("teacherCardNearPlace").replace("{{place}}", neighborhoodHint)
          : t("teacherCardDistanceNeedGeo");
  const distanceLineIsGeoHint = distanceKm == null && !placeFallback && !neighborhoodHint;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group block min-h-[168px] w-full rounded-3xl border border-[#E8E6DF] bg-white p-3.5 text-left shadow-[0_12px_40px_rgba(44,44,42,0.06)]",
        "cursor-pointer transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-teal-500/35 hover:shadow-[0_18px_46px_rgba(44,44,42,0.10)]",
        "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeacherAvatar name={teacher.name} category={teacher.category} imageUrl={teacher.imageUrl} size={48} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[15px] font-bold text-[#2C2C2A]">{cardShortName}</p>
              <VerificationBadge level={verificationLevel} size="sm" showLabel={false} className="shrink-0 scale-90" />
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-[#6B6A65]">{teacher.discipline}</p>
            <p
              className={cn(
                "mt-1 flex min-h-[1.125rem] items-center gap-1.5 text-[13px] tabular-nums",
                distanceLineIsGeoHint ? "font-semibold text-[#6B6A65]" : "font-bold text-teal-800",
              )}
            >
              <MapPin size={14} className={cn("shrink-0", distanceLineIsGeoHint ? "text-neutral-500" : "text-teal-700")} aria-hidden />
              <span className="min-w-0 truncate">{distancePrimary}</span>
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          <Star size={12} fill="currentColor" aria-hidden />
          {teacher.rating}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6B6A65]">
        {formatLabels.slice(0, 3).map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-[#F3FAF6] px-2.5 py-1 font-semibold text-[#2C2C2A]">
            {label === t("bookingOnline") ? <Video size={12} aria-hidden /> : label === t("modeHome") ? <Home size={12} aria-hidden /> : <Users size={12} aria-hidden />}
            {label}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#E8E6DF] pt-2.5">
        <div className="min-w-0">
          <TeacherPriceTag
            amount={Number(teacher.pricePerLesson)}
            teacherCurrency={(teacher.currency as Currency | undefined) ?? null}
            perHour
            primaryClassName="text-base font-extrabold text-teal-700"
          />
          <p className="mt-1 text-[11px] font-medium text-[#6B6A65]">
            {teacher.reviews > 0
              ? t("teacherCardReviews").replace("{count}", String(teacher.reviews))
              : t("teacherCardNoReviewsYet")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-teal-700 transition-transform group-hover:translate-x-0.5">
          {t("teacherCardViewProfile")}
          <ChevronRight size={14} aria-hidden />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {teacher.introSessionEnabled ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#DCEAE3] bg-[#F3FAF6] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">
            <Clock size={11} aria-hidden />
            {t("introSessionBadge").replace("{n}", String(introDuration))}
          </span>
        ) : null}
        {availability ? (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {availability}
          </span>
        ) : null}
        {String(teacher.profilePlan || "").toLowerCase() === "enterprise" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase text-[#6B6A65]">
            <ShieldCheck size={11} className="text-teal-700" aria-hidden /> {t("sortTrusted")}
          </span>
        ) : null}
      </div>
    </button>
  );
}

