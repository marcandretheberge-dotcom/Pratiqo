"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Teacher } from "../../../../types";
import { BookingModal, type BookingInitialLessonKind } from "../../../../components/BookingModal";
import { TeacherProfile } from "../../../../components/TeacherProfile";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Search, Star, Users, Video } from "lucide-react";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { getEnabledDisciplines, type Discipline } from "../../../../lib/disciplines";
import { getSupabaseClient } from "../../../../lib/supabase";
import { haversineDistance } from "../../../../lib/geo";
import {
  fetchTeacherDisciplinesMap,
  mergeTeachersWithDisciplines,
  teacherMatchesExploreCategory,
  teacherMatchesExploreSearch,
} from "../../../../lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "../../../../lib/teacherMapper";
import { TEACHERS } from "../../../../constants";
import { getVerificationLevel } from "../../../../lib/verification";
import { VerificationBadge } from "../../../../components/VerificationBadge";
import { SearchMapView } from "../../../../components/SearchMapView";

export default function StudentSearchPage() {
  const router = useRouter();
  const { t, formatPrice, locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [radius, setRadius] = useState<5 | 10 | 25 | 50 | "all" | "online">("all");
  const [sortMode, setSortMode] = useState<"relevance" | "nearest" | "trusted">("relevance");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMapTeacher, setSelectedMapTeacher] = useState<Teacher | null>(null);
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<Teacher | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

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
          const body = (await pr.json()) as { plans?: Record<string, string> };
          const plans = body.plans ?? {};
          setTeachers(list.map((x) => ({ ...x, profilePlan: plans[x.id] ?? "free" })));
        } catch {
          setTeachers(list.map((x) => ({ ...x, profilePlan: "free" })));
        }
      };

      const TEACHERS_SELECT =
        "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km, verification_level, identity_verified, diploma_verified, phone_verified";

      const { data, error } = await supabase
        .from("teachers")
        .select(TEACHERS_SELECT)
        .order("verification_level", { ascending: false })
        .order("rating", { ascending: false });

      if (error || !data?.length) {
        await mergePlans(TEACHERS);
        setLoadingTeachers(false);
        return;
      }

      const mapped = data.map((r) => teacherRowToTeacher(r as TeacherRow));
      const discMap = await fetchTeacherDisciplinesMap(
        supabase,
        mapped.map((x) => x.id),
      );
      await mergePlans(mergeTeachersWithDisciplines(mapped, discMap));
      setLoadingTeachers(false);
    };
    void load();
  }, []);

  useEffect(() => {
    const near = searchParams.get("near");
    if (near === "1") {
      requestGeolocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const enabledDisciplines = useMemo(() => getEnabledDisciplines(), []);

  const disciplineLabel = (d: Discipline) => {
    if (locale === "en-CA") return d.labelEn ?? d.label;
    if (locale === "es") return d.labelEs ?? d.label;
    return d.label;
  };

  const results = useMemo(() => {
    const base = teachers
      .filter((tt) => {
        const catOk = teacherMatchesExploreCategory(tt, activeCat);
        const qOk = teacherMatchesExploreSearch(tt, searchQuery);
        return catOk && qOk;
      })
      .map((tt) => ({
        teacher: tt,
        distanceKm:
          geo && teacherHasCoords(tt) ? haversineDistance(geo.lat, geo.lng, tt.location.lat, tt.location.lng) : null,
      }));

    let filtered = base;

    if (radius === "online") {
      filtered = filtered.filter((x) => x.teacher.teachingMode === "online" || x.teacher.teachingMode === "both");
    } else if (radius !== "all") {
      // Only apply physical radius if we actually have geo.
      if (geo) {
        filtered = filtered.filter((x) => x.distanceKm != null && x.distanceKm <= radius);
      }
    }

    filtered.sort((a, b) => compareTeachers(a, b, { geo: Boolean(geo), sortMode }));
    return filtered;
  }, [teachers, activeCat, searchQuery, geo, radius, sortMode]);

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#F1EFE8" }}>
        {/* Hero - full width */}
        <div style={{ background: "#0F6E56", width: "100%", padding: "32px 24px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{t("heroStudentTitle")}</h1>
            <p className="mt-3 text-center text-sm text-white/85 sm:text-base">{t("heroStudentSubtitle")}</p>

            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[#2C2C2A] shadow-sm">
                <Search size={18} className="shrink-0 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setSortMode("relevance")}
                  placeholder={t("searchInputPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={() => requestGeolocation()}
                className={cn(
                  "h-12 shrink-0 rounded-2xl bg-white px-5 text-sm font-bold text-[#0F6E56] hover:bg-white/95",
                  geoLoading && "opacity-80",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <MapPin size={16} />
                  {t("nearMe")}
                </span>
              </button>
            </div>

            <div className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-2">
              <Chip active={activeCat === "All"} onClick={() => setActiveCat("All")}>
                {t("radiusAll")}
              </Chip>
              {enabledDisciplines.map((d) => {
                const label = disciplineLabel(d);
                return (
                  <Chip key={d.id} active={activeCat === label} onClick={() => setActiveCat(label)}>
                    {label}
                  </Chip>
                );
              })}
            </div>

            <div className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-2">
              <RadiusPill active={radius === 5} onClick={() => setRadius(5)}>
                5km
              </RadiusPill>
              <RadiusPill active={radius === 10} onClick={() => setRadius(10)}>
                10km
              </RadiusPill>
              <RadiusPill active={radius === 25} onClick={() => setRadius(25)}>
                25km
              </RadiusPill>
              <RadiusPill active={radius === 50} onClick={() => setRadius(50)}>
                50km
              </RadiusPill>
              <RadiusPill active={radius === "all"} onClick={() => setRadius("all")}>
                {t("radiusAll")}
              </RadiusPill>
              <RadiusPill active={radius === "online"} onClick={() => setRadius("online")}>
                {t("radiusOnline")}
              </RadiusPill>
            </div>
          </div>
        </div>

        {/* Results - full width with padding */}
        <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto", paddingBottom: 80 }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#2C2C2A]">
                {results.length} {t("searchResults")}
              </p>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-[#2C2C2A]">
                  <span className="text-[#888780]">{t("sortLabel")}</span>
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
                  onClick={() => {
                    setViewMode((v) => (v === "list" ? "map" : "list"));
                    setMapLoaded(true);
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
                    background: viewMode === "map" ? "#1D9E75" : "white",
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
                        formatPrice={formatPrice}
                        t={t}
                        onOpen={() => setSelectedTeacherProfile(teacher)}
                      />
                    ))}
              </div>
            ) : (
              <div className="mt-5">
                {!mapLoaded ? null : (
                  <>
                    {loadingTeachers ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#0F6E56]">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
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
                        onViewProfile={(teacher) => setSelectedTeacherProfile(teacher)}
                      />
                    )}
                  </>
                )}
              </div>
            )}
        </div>
      </div>

      {selectedTeacherProfile && (
        <TeacherProfile
          teacher={selectedTeacherProfile}
          onClose={() => setSelectedTeacherProfile(null)}
          onBook={(kind) => {
            setBookingInitialKind(kind);
            setBookingTeacher(selectedTeacherProfile);
            setSelectedTeacherProfile(null);
          }}
          onSendMessage={
            selectedTeacherProfile.userId
              ? () => {
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
        active ? "bg-white text-[#0F6E56]" : "bg-white/15 text-white hover:bg-white/25",
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
        active ? "bg-white text-[#0F6E56]" : "bg-white/15 text-white hover:bg-white/25",
      )}
    >
      {children}
    </button>
  );
}

function teacherHasCoords(t: Teacher) {
  const { lat, lng } = t.location || ({} as Teacher["location"]);
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

function verificationSortKey(t: Teacher) {
  return getVerificationLevel({
    plan: t.profilePlan,
    identity_verified: t.identityVerified,
    diploma_verified: t.diplomaVerified,
    is_verified: t.isVerified,
    verification_level: t.verificationLevel ?? null,
  });
}

function compareTeachers(
  a: { teacher: Teacher; distanceKm: number | null },
  b: { teacher: Teacher; distanceKm: number | null },
  opts: { geo: boolean; sortMode: "relevance" | "nearest" | "trusted" },
) {
  const va = verificationSortKey(a.teacher);
  const vb = verificationSortKey(b.teacher);

  if (opts.sortMode === "trusted") {
    if (vb !== va) return vb - va;
    return (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0);
  }

  if (opts.sortMode === "nearest") {
    if (opts.geo && a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    if (vb !== va) return vb - va;
    return (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0);
  }

  // relevance
  if (vb !== va) return vb - va;
  return (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0);
}

function TeacherCard({
  teacher,
  distanceKm,
  onOpen,
  formatPrice,
  t,
}: {
  teacher: Teacher;
  distanceKm: number | null;
  onOpen: () => void;
  formatPrice: (amount: number) => string;
  t: (key: any) => string;
}) {
  const initials = teacher.name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const avatarBg =
    teacher.category === "Musique"
      ? "bg-[rgba(29,158,117,0.14)] text-[#085041]"
      : teacher.category === "Arts Martiaux"
        ? "bg-[rgba(255,153,102,0.18)] text-[#C2462E]"
        : teacher.category === "Langues"
          ? "bg-[rgba(146,106,255,0.16)] text-[#5B3EC8]"
          : "bg-[rgba(29,158,117,0.14)] text-[#085041]";

  const availability = teacher.availability?.[0] ? String(teacher.availability[0]) : null;

  const verificationLevel = getVerificationLevel({
    plan: teacher.profilePlan,
    identity_verified: teacher.identityVerified,
    diploma_verified: teacher.diplomaVerified,
    is_verified: teacher.isVerified,
    verification_level: teacher.verificationLevel ?? null,
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block w-full rounded-2xl bg-white p-4 text-left transition",
        "border border-[#E8E6DF] shadow-[0_12px_40px_rgba(44,44,42,0.06)] hover:shadow-[0_16px_55px_rgba(44,44,42,0.08)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", avatarBg)}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="truncate font-semibold text-[#2C2C2A]">{teacher.name}</p>
              <VerificationBadge level={verificationLevel} size="sm" showLabel={false} className="shrink-0 scale-90" />
            </div>
            <p className="truncate text-xs text-[#888780]">{teacher.discipline}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#2C2C2A] border border-[#E8E6DF]">
          ★ {teacher.rating}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#888780]">
        <span className="inline-flex items-center gap-2">
          {teacher.teachingMode === "online" ? <Video size={12} /> : <Users size={12} />}
          {teacher.teachingMode === "online" ? t("bookingOnline") : t("inPerson")}
          {distanceKm != null ? <span className="text-[#D3D1C7]">·</span> : null}
          {distanceKm != null ? <span>{Math.round(distanceKm)}km</span> : null}
        </span>
        <span className="font-bold text-[#1D9E75]">{formatPrice(Number(teacher.pricePerLesson))}/h</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {availability ? (
          <span className="inline-flex items-center rounded-full bg-[#E1F5EE] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#085041]">
            {availability}
          </span>
        ) : null}
        {String(teacher.profilePlan || "").toLowerCase() === "enterprise" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#888780]">
            <Star size={12} className="text-[#1D9E75]" /> {t("sortTrusted")}
          </span>
        ) : null}
      </div>
    </button>
  );
}

