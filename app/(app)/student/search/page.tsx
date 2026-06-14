"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { Teacher } from "../../../../types";
import type { BookingInitialLessonKind } from "../../../../components/BookingModal";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Star, Users, Video } from "lucide-react";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { getSupabaseClient } from "../../../../lib/supabase";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "../../../../lib/teacherDisciplines";
import { isLaunchEligibleTeacherRow, teacherRowToTeacher, type TeacherRow } from "../../../../lib/teacherMapper";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "../../../../lib/supabase/queries";
import { TeacherAvatar } from "../../../../components/TeacherAvatar";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";
import type { City } from "../../../../lib/cities";
import type { MapBounds } from "../../../../components/SearchMapView";
import { useAuth } from "../../../../components/AuthProvider";
import type { StudentLocationPrefs } from "../../../../lib/studentLocationSearch";
import {
  formatApproxDistanceKm,
  parseStoredStudentLocation,
  studentLocationHasCoordinates,
  studentLocationSummary,
  type StudentSavedLocation,
} from "@/lib/studentLocation";
import { applyRadiusFilter, buildTeacherSearchRows, filterTeacherPool, sortRows } from "../../../../lib/teacherSearchEngine";
import { parseGooglePlace } from "../../../../lib/googleAddressParser";
import { TeacherSearchAdvancedPanel, type AdvancedFilterValues } from "../../../../components/TeacherSearchAdvancedPanel";
import type { TeacherSearchFormat } from "../../../../lib/teacherSearchCriteria";
import { logSearchEvent } from "../../../../lib/searchAnalytics";
import { applyTeacherListingMetadata } from "@/lib/teacherListingMetadata";
import { LandingSearchHero } from "@/components/marketing/LandingSearchHero";
import type { LandingFormatFilter } from "@/lib/landingTeacherFilter";
import { PriceDisplay } from "@/components/PriceDisplay";
import { TeacherBadgePill } from "@/components/TeacherBadgePill";
import { getCompactTeacherBadges } from "@/lib/teachers/badges";
import type { TranslationKey } from "@/lib/translations";

const TeacherProfile = dynamic(
  () => import("../../../../components/TeacherProfile").then((m) => m.TeacherProfile),
  { ssr: false, loading: () => <p className="p-4 text-center text-sm text-[#6B6A65]">Chargement…</p> },
);
const BookingModal = dynamic(
  () => import("../../../../components/BookingModal").then((m) => m.BookingModal),
  { ssr: false, loading: () => <p className="p-4 text-center text-sm text-[#6B6A65]">Chargement…</p> },
);
const SearchMapView = dynamic(
  () => import("../../../../components/SearchMapView").then((m) => m.SearchMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-2 min-h-[480px] rounded-2xl bg-[#F1EFE8] text-sm text-[#6B6A65]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        <p>Chargement…</p>
      </div>
    ),
  },
);

type SearchRadius = 5 | 10 | 25 | 50 | "all" | "online";

export default function StudentSearchPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [radius, setRadius] = useState<SearchRadius>("all");
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
  const [studentLocation, setStudentLocation] = useState<StudentSavedLocation | null>(null);
  const [locationEditing, setLocationEditing] = useState(false);
  const [locationDraft, setLocationDraft] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.google?.maps?.places),
  );
  // Tracks when the Places library failed to load (missing API key, network
  // error, etc.). We surface this inline so the student knows autocomplete
  // is unavailable rather than silently typing into a dead input.
  const [placesUnavailable, setPlacesUnavailable] = useState(false);
  const [selectedProfileDistanceKm, setSelectedProfileDistanceKm] = useState<number | null>(null);
  const studentAddressRef = useRef<HTMLInputElement | null>(null);
  const placeConfirmedRef = useRef(false);
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

  // Load Google Places library once so autocomplete is available for the student address input.
  // Uses the same @googlemaps/js-api-loader already used by SearchMapView — no second script tag.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setPlacesUnavailable(true);
      return;
    }
    if (typeof window !== "undefined" && window.google?.maps?.places) {
      setGoogleReady(true);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        setOptions({ key, v: "weekly" });
        await importLibrary("places");
        if (cancelled) return;
        if (typeof window !== "undefined" && window.google?.maps?.places) {
          setGoogleReady(true);
        } else {
          setPlacesUnavailable(true);
        }
      } catch {
        if (!cancelled) setPlacesUnavailable(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wire up Google Places Autocomplete when the address input is open and the API is ready.
  useEffect(() => {
    if (!googleReady || !locationEditing) return;
    const el = studentAddressRef.current;
    if (!el || !("google" in window)) return;
    placeConfirmedRef.current = false;
    const ac = new google.maps.places.Autocomplete(el, {
      fields: ["address_components", "formatted_address", "geometry", "place_id"],
      types: ["address"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const parsed = parseGooglePlace(place);
      if (!parsed.formattedAddress && parsed.latitude == null) return;
      placeConfirmedRef.current = true;
      if (parsed.formattedAddress) setLocationDraft(parsed.formattedAddress);
      void saveStudentLocation({
        address: parsed.formattedAddress,
        city: parsed.city,
        region: parsed.region,
        country: parsed.countryCode,
        lat: parsed.latitude,
        lng: parsed.longitude,
        place_id: typeof place?.place_id === "string" ? place.place_id : null,
      });
    });
    // Autocomplete binds to the DOM element; it cleans itself up when the element unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, locationEditing]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;
    const loadPrefs = async () => {
      if (!user?.id) {
        setStudentPrefs(null);
        return;
      }
      // Saved location is sourced from the owner-only student_private_locations
      // table (migration 073), never from profiles, so teacher-peer RLS can't
      // reach it. Profile prefs stay on profiles where they're owner-readable.
      const [{ data: prefsRow }, { data: locRow }] = await Promise.all([
        supabase
          .from("profiles")
          .select("country_code, timezone, currency, city, region, preferred_learning_format")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("student_private_locations")
          .select("location")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!cancelled) {
        const row = prefsRow as {
          country_code?: string | null;
          timezone?: string | null;
          currency?: string | null;
          city?: string | null;
          region?: string | null;
          preferred_learning_format?: string | null;
        } | null;
        const parsedLocation = parseStoredStudentLocation(
          (locRow as { location?: unknown } | null)?.location,
        );
        setStudentLocation(parsedLocation);
        setLocationDraft(studentLocationSummary(parsedLocation));
        // Saved location is the authoritative learner origin when it has
        // coordinates: always seed `geo` from it on load so the map opens
        // near the student's saved address and teacher cards immediately
        // show distance, instead of waiting for a browser-geo prompt.
        if (studentLocationHasCoordinates(parsedLocation)) {
          setGeo({ lat: parsedLocation.lat, lng: parsedLocation.lng });
          setSortMode((current) => (current === "relevance" ? "nearest" : current));
        }
        setStudentPrefs(
          row
            ? {
                country_code: row.country_code ?? null,
                timezone: row.timezone ?? null,
                currency: row.currency ?? null,
                city: row.city ?? null,
                region: row.region ?? null,
                preferred_learning_format: row.preferred_learning_format ?? null,
                student_location: parsedLocation,
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
      const mergePlans = async (list: Teacher[]) => {
        const ids = list.map((x) => x.id).join(",");
        if (!ids) {
          setTeachers(list);
          return;
        }
        try {
          const pr = await fetch(`/api/teachers/plans?ids=${encodeURIComponent(ids)}`);
          if (!pr.ok) throw new Error("Teacher public metadata lookup failed");
          const body = (await pr.json()) as Parameters<typeof applyTeacherListingMetadata>[1];
          setTeachers(applyTeacherListingMetadata(list, body));
        } catch {
          setTeachers(list.map((x) => ({ ...x, profilePlan: "free" })));
        }
      };

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
        await mergePlans([]);
        setLoadingTeachers(false);
        return;
      }

      const mapped = data
        .filter((r) => isLaunchEligibleTeacherRow(r as TeacherRow))
        .map((r) => teacherRowToTeacher(r as TeacherRow));
      const discMap = await fetchTeacherDisciplinesMap(
        supabase,
        mapped.map((x) => x.id),
      );
      await mergePlans(mergeTeachersWithDisciplines(mapped, discMap));
      setLoadingTeachers(false);
    };
    void load();
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

  const saveStudentLocation = async (location: Partial<StudentSavedLocation> | null) => {
    if (!user?.id) {
      router.push(`/login?next=${encodeURIComponent("/student/search")}`);
      return;
    }
    setLocationBusy(true);
    setLocationError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(t("bookingSessionExpired"));

      const res = await fetch("/api/student/location", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(location ? { location } : { clear: true }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        location?: unknown;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || t("studentLocationSaveError"));

      const parsed = parseStoredStudentLocation(body.location ?? null);
      setStudentLocation(parsed);
      setLocationDraft(studentLocationSummary(parsed));
      setStudentPrefs((current) => (current ? { ...current, student_location: parsed } : current));
      if (studentLocationHasCoordinates(parsed)) {
        setGeo({ lat: parsed.lat, lng: parsed.lng });
        setSortMode("nearest");
      }
      setLocationEditing(false);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : t("studentLocationSaveError"));
    } finally {
      setLocationBusy(false);
    }
  };

  const saveCurrentBrowserLocation = () => {
    if (!("geolocation" in navigator)) return;
    setLocationBusy(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeo(coords);
        setSortMode("nearest");
        void saveStudentLocation(coords);
      },
      () => {
        setLocationBusy(false);
        setLocationError(t("studentLocationSaveError"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Clear map-bounds filter whenever the user changes their text/category/radius search
  useEffect(() => {
    setMapBounds(null);
  }, [searchQuery, activeCat, radius, adv]);

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

  const results = useMemo(() => {
    const pool = filterTeacherPool(teachers, { category: activeCat, searchQuery });
    const base = buildTeacherSearchRows(pool, { geo });
    let filtered = applyRadiusFilter(base, geo ? radius : radius === "online" ? "online" : "all");

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
  }, [teachers, activeCat, searchQuery, geo, radius, sortMode, mapBounds, studentPrefs]);

  // Open a teacher profile and carry the current distanceKm from the results list.
  const openTeacherProfile = useCallback((teacher: Teacher) => {
    const row = results.find((r) => r.teacher.id === teacher.id);
    setSelectedProfileDistanceKm(row?.distanceKm ?? null);
    setSelectedTeacherProfile(teacher);
  }, [results]);

  return (
    <>
      <div className="min-h-[100dvh] bg-[#F3FAF6]">
        <LandingSearchHero
          query={searchQuery}
          onQueryChange={setSearchQuery}
          teachers={teachers}
          geo={geo}
          onSelectTeacher={(teacher) => openTeacherProfile(teacher)}
          onSelectDiscipline={(label) => {
            setSearchQuery(label);
          }}
          locationQuery={landingLocQuery}
          onLocationQueryChange={setLandingLocQuery}
          onSelectCity={(city: City) => {
            // Subject/place independence (search PR #63): never touch
            // the subject query here. We also no longer clear the Lieu
            // input — the LandingLocationSearch component echoes the
            // formatted "City, PROV" label back so the student can see
            // which place is currently selected.
            setGeo({ lat: city.lat, lng: city.lng });
            setSortMode("nearest");
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
                  onClick={() => setRadius(opt.v as SearchRadius)}
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
                  "h-11 rounded-full border border-[#DCEAE3] bg-white px-4 text-sm font-semibold text-[#2C2C2A] shadow-sm hover:bg-[#FAFCFB]",
                  geoLoading && "opacity-80",
                )}
              >
                📍 {t("nearMe")}
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
            <div className="mb-4 rounded-3xl border border-[#DCEAE3] bg-white p-4 shadow-[0_16px_40px_rgba(29,158,117,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <MapPin size={20} aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#2C2C2A]">{t("studentLocationSearchTitle")}</p>
                    {studentLocation ? (
                      <p className="mt-1 text-xs leading-relaxed text-[#6B6A65]">
                        {t("studentLocationSearchAround").replace(
                          "{location}",
                          studentLocationSummary(studentLocation) || t("nearMe"),
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs leading-relaxed text-[#6B6A65]">
                        {t("studentLocationSearchDescription")}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] leading-relaxed text-[#6B6A65]">{t("studentLocationPrivateNotice")}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {locationEditing ? (
                    <label className="sr-only" htmlFor="student-location-address">
                      {t("studentLocationAddAddress")}
                    </label>
                  ) : null}
                  {locationEditing ? (
                    <div className="flex flex-col gap-1">
                      <input
                        id="student-location-address"
                        ref={studentAddressRef}
                        value={locationDraft}
                        onChange={(e) => {
                          setLocationDraft(e.target.value);
                          placeConfirmedRef.current = false;
                        }}
                        placeholder={t("bookingAddressPlaceholder")}
                        autoComplete="off"
                        data-testid="student-location-address-input"
                        className="h-11 min-w-0 rounded-2xl border border-[#DCEAE3] bg-white px-3 text-sm outline-none focus:border-teal-500 sm:w-72"
                      />
                      {googleReady ? (
                        <p className="text-[10px] leading-snug text-[#6B6A65]">
                          {t("studentLocationSelectFromSuggestions")}
                        </p>
                      ) : placesUnavailable ? (
                        <p
                          role="status"
                          className="text-[10px] leading-snug font-semibold text-amber-700"
                          data-testid="student-location-places-unavailable"
                        >
                          {t("studentLocationPlacesUnavailable")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {locationEditing ? (
                    <button
                      type="button"
                      disabled={locationBusy || !locationDraft.trim()}
                      onClick={() => void saveStudentLocation({ address: locationDraft.trim() })}
                      className="h-11 rounded-2xl bg-teal-700 px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {locationBusy ? t("avatarUploading") : t("save")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLocationEditing(true)}
                      className="h-11 rounded-2xl border border-[#DCEAE3] bg-white px-4 text-sm font-bold text-[#2C2C2A] hover:bg-[#FAFCFB]"
                    >
                      {studentLocation ? t("studentLocationEdit") : t("studentLocationAddAddress")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={locationBusy}
                    onClick={saveCurrentBrowserLocation}
                    className="h-11 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] px-4 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                  >
                    {t("studentLocationUseCurrentLocation")}
                  </button>
                  {studentLocation ? (
                    <button
                      type="button"
                      disabled={locationBusy}
                      onClick={() => void saveStudentLocation(null)}
                      className="h-11 rounded-2xl px-3 text-sm font-semibold text-[#6B6A65] hover:bg-[#F3FAF6] disabled:opacity-50"
                    >
                      {t("studentLocationClear")}
                    </button>
                  ) : null}
                </div>
              </div>
              {locationError ? (
                <p role="alert" className="mt-3 text-xs font-semibold text-red-700">
                  {locationError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#2C2C2A]">
                {results.length} {t("searchResults")}
              </p>

              <div className="flex items-center gap-2">
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "0.5px solid #D3D1C7",
                    background: viewMode === "map" ? "var(--palette-teal-600)" : "white",
                    color: viewMode === "map" ? "white" : "#2C2C2A",
                    transition: "all 0.2s",
                  }}
                >
                  {viewMode === "map" ? `☰ ${t("listView")}` : `🗺️ ${t("mapView")}`}
                </button>
              </div>
            </div>

            {viewMode === "list" ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loadingTeachers
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[140px] rounded-2xl border border-[#E8E6DF] bg-white shadow-[0_12px_40px_rgba(44,44,42,0.06)]"
                      />
                    ))
                  : results.map(({ teacher, distanceKm }) => (
                      <TeacherCard
                        key={teacher.id}
                        teacher={teacher}
                        distanceKm={distanceKm}
                        t={t}
                        onOpen={() => openTeacherProfile(teacher)}
                      />
                    ))}
              </div>
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
                      <SearchMapView
                        teachers={results.map((x) => x.teacher)}
                        userLat={geo?.lat ?? null}
                        userLng={geo?.lng ?? null}
                        selectedTeacher={selectedMapTeacher}
                        onTeacherSelect={(teacher) => setSelectedMapTeacher(teacher)}
                        onCloseSelected={() => setSelectedMapTeacher(null)}
                        onViewProfile={(teacher) => openTeacherProfile(teacher)}
                        onBoundsSearch={(bounds) => setMapBounds(bounds)}
                      />
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
          distanceKm={selectedProfileDistanceKm}
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
  t: (key: TranslationKey) => string;
}) {
  const availability = teacher.availability?.[0] ? String(teacher.availability[0]) : null;

  const badges = getCompactTeacherBadges({
    teacherId: teacher.id,
    identityVerified: teacher.identityVerified,
    identityStatus: teacher.identityStatus,
    stripeIdentityStatus: teacher.stripeIdentityStatus,
    diplomaVerified: teacher.diplomaVerified,
    profilePlan: teacher.profilePlan,
    reviewCount: teacher.reviews,
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block w-full rounded-2xl border border-[#E8E6DF] bg-white p-4 text-left shadow-[0_12px_40px_rgba(44,44,42,0.06)]",
        "cursor-pointer transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:scale-[1.015] hover:border-teal-500/30 hover:shadow-xl",
        "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <TeacherAvatar name={teacher.name} category={teacher.category} imageUrl={teacher.imageUrl} size={44} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#2C2C2A]">{publicFirstNameWithInitial(teacher.name)}</p>
            {badges.length > 0 ? (
              <div className="mt-1 flex max-w-full gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
                {badges.map((badge) => (
                  <TeacherBadgePill key={badge.id} badge={badge} compact className="shrink-0" />
                ))}
              </div>
            ) : null}
            <p className="truncate text-xs text-[#6B6A65]">{teacher.discipline}</p>
          </div>
        </div>
        {Number(teacher.reviews ?? 0) > 0 ? (
          <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#2C2C2A] border border-[#E8E6DF]">
            ★ {Number(teacher.rating).toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#6B6A65]">
        <span className="inline-flex items-center gap-2">
          {teacher.teachingMode === "online" ? <Video size={12} /> : <Users size={12} />}
          {teacher.teachingMode === "online" ? t("bookingOnline") : t("inPerson")}
          {distanceKm != null ? <span className="text-[#D3D1C7]">·</span> : null}
          {distanceKm != null ? (
            <span>
              {t("studentApproxDistanceFromYou").replace("{distance}", formatApproxDistanceKm(distanceKm))}
            </span>
          ) : null}
        </span>
        <span className="font-bold text-teal-700">
          <PriceDisplay
            amount={Number(teacher.pricePerLesson)}
            sourceCurrency={teacher.currency ?? "CAD"}
            perHour
            primaryClassName="font-bold text-teal-700"
            secondaryClassName="block w-full text-[9px] font-semibold text-slate-500"
            className="justify-end"
          />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {availability ? (
          <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">
            {availability}
          </span>
        ) : null}
        {String(teacher.profilePlan || "").toLowerCase() === "enterprise" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#6B6A65]">
            <Star size={12} className="text-teal-700" /> {t("sortTrusted")}
          </span>
        ) : null}
      </div>
    </button>
  );
}

