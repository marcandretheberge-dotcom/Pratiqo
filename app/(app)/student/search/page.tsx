"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Teacher } from "../../../../types";
import type { BookingInitialLessonKind } from "../../../../components/BookingModal";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Map as MapIcon, MapPin, ShieldCheck } from "lucide-react";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { getSupabaseClient } from "../../../../lib/supabase";
import { isPratiqoVerified } from "../../../../lib/verification";
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
import type { LandingFormatFilter } from "@/lib/landingTeacherFilter";
import { applyMapBoundsFilter, fetchPublicMarketplaceTeachers, MarketplaceMapPanel, MarketplaceResultsGrid } from "@/features/marketplace";

const TeacherProfile = dynamic(
  () => import("../../../../components/TeacherProfile").then((m) => m.TeacherProfile),
  { ssr: false, loading: () => <DynamicLoadingBlock /> },
);
const BookingModal = dynamic(
  () => import("../../../../components/BookingModal").then((m) => m.BookingModal),
  { ssr: false, loading: () => <DynamicLoadingBlock /> },
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
  const { t } = useLocale();
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
  const [desktopMapEnabled, setDesktopMapEnabled] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
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
    if (q) queueMicrotask(() => setSearchQuery(q));
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
      const marketplaceTeachers = await fetchPublicMarketplaceTeachers(supabase, "student/search");
      setTeachers(marketplaceTeachers);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setDesktopMapEnabled(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
    queueMicrotask(() => setMapBounds(null));
  }, [searchQuery, activeCat, radius, adv]);

  // PostGIS-backed nearby lookup. Runs whenever radius is a concrete number and geo is set.
  // We deliberately don't block render — the client-side haversine path handles the gap
  // (and stays the fallback if the RPC isn't deployed yet).
  useEffect(() => {
    if (!geo || typeof radius !== "number") {
      queueMicrotask(() => setNearbyServerResult(null));
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

    filtered = applyMapBoundsFilter(filtered, mapBounds);

    // Unify sorting across search surfaces. Keep existing modes, but fold in student prefs.
    const rows = sortRows(filtered, { sortMode, studentPrefs });
    return rows;
  }, [teachers, activeCat, searchQuery, geo, radius, sortMode, mapBounds, studentPrefs, adv.verifiedOnly, nearbyServerResult]);

  const resetFilters = () => {
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
  };

  const resultsList = (
    <MarketplaceResultsGrid
      loading={loadingTeachers}
      rows={results}
      highlightedTeacherId={selectedMapTeacher?.id ?? null}
      onOpenTeacher={(teacher) => setSelectedTeacherProfile(teacher)}
      onResetFilters={resetFilters}
    />
  );

  const mapPanel = (
    <MarketplaceMapPanel
      loading={loadingTeachers}
      teachers={results.map((x) => x.teacher)}
      geo={geo}
      selectedTeacher={selectedMapTeacher}
      highlightedTeacherId={selectedMapTeacher?.id ?? null}
      mapBounds={mapBounds}
      onTeacherSelect={(teacher) => setSelectedMapTeacher(teacher)}
      onCloseSelected={() => setSelectedMapTeacher(null)}
      onViewProfile={(teacher) => setSelectedTeacherProfile(teacher)}
      onBoundsSearch={(bounds) => setMapBounds(bounds)}
      onBoundsFilterCleared={() => setMapBounds(null)}
    />
  );

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
              {(
                [
                  { v: 5 as const, label: "5km" },
                  { v: 10 as const, label: "10km" },
                  { v: 25 as const, label: "25km" },
                  { v: 50 as const, label: "50km" },
                  { v: "all" as const, label: t("radiusAll") },
                  { v: "online" as const, label: t("radiusOnline") },
                ] satisfies ReadonlyArray<{ v: 5 | 10 | 25 | 50 | "all" | "online"; label: string }>
              ).map((opt) => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setRadius(opt.v)}
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

            <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(500px,0.9fr)]">
              <div className={cn(viewMode === "map" ? "hidden lg:block" : "block")}>
                {resultsList}
              </div>

              <div className={cn(viewMode === "map" ? "block" : "hidden lg:block", "lg:sticky lg:top-20")}>
                {viewMode === "map" || desktopMapEnabled ? mapPanel : null}
              </div>
            </div>
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

