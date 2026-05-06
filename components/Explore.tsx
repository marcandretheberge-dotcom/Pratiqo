"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Filter,
  Loader2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Discipline, Teacher, TeachingMode } from "../types";
import { TEACHERS } from "../constants";
import { displayTeacherMarketplaceCategory, getEnabledDisciplines } from "../lib/disciplines";
import { isEnabled } from "../lib/features";
import { cn } from "../lib/utils";
import { getSupabaseClient } from "../lib/supabase";
import {
  fetchTeacherDisciplinesMap,
  mergeTeachersWithDisciplines,
  teacherMatchesExploreCategory,
  teacherMatchesExploreSearch,
} from "../lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "../lib/teacherMapper";
import { haversineDistance } from "../lib/geo";
import { spotsRemaining, type GroupSessionRow } from "../lib/groupSessions";
import { getVerificationLevel } from "../lib/verification";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { VerificationBadge } from "./VerificationBadge";
import { VerifiedBadge } from "./VerifiedBadge";
import { useLocale } from "@/lib/locale-context";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import { teacherPrefCompareStudents, type StudentLocationPrefs } from "@/lib/studentLocationSearch";

function verificationSortKey(t: Teacher) {
  return getVerificationLevel({
    plan: t.profilePlan,
    identity_verified: t.identityVerified,
    diploma_verified: t.diplomaVerified,
    is_verified: t.isVerified,
    verification_level: t.verificationLevel ?? null,
  });
}

function compareExploreTeachers(
  a: { teacher: Teacher; distanceKm: number | null },
  b: { teacher: Teacher; distanceKm: number | null },
  opts: { geo: boolean; sortMode: "default" | "reliable"; studentPrefs: StudentLocationPrefs | null },
) {
  const la = verificationSortKey(a.teacher);
  const lb = verificationSortKey(b.teacher);
  if (opts.sortMode === "reliable" && lb !== la) return lb - la;
  if (opts.geo && a.distanceKm != null && b.distanceKm != null) {
    const da = a.distanceKm;
    const db = b.distanceKm;
    if (da !== db) return da - db;
  }
  if (opts.sortMode === "default" && lb !== la) return lb - la;
  const prefDelta = teacherPrefCompareStudents(a.teacher, b.teacher, opts.studentPrefs);
  if (prefDelta !== 0) return prefDelta;
  return (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0);
}

type ExploreGroupSession = GroupSessionRow & {
  teachers?: { name: string; image_url: string | null } | null;
};

export function Explore({
  onBook,
  onViewProfile,
  searchQuery,
  onSearchChange,
}: {
  onBook: (teacher: Teacher) => void;
  onViewProfile: (teacher: Teacher) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const { user } = useAuth();
  const { formatPrice, t } = useLocale();
  const [studentPrefs, setStudentPrefs] = useState<StudentLocationPrefs | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [teachingMode, setTeachingMode] = useState<TeachingMode | "all">("all");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState<5 | 10 | 25 | 50 | 500 | "all" | "online">(500);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [exploreTab, setExploreTab] = useState<"cours" | "groupe">("cours");
  const [groupSessions, setGroupSessions] = useState<ExploreGroupSession[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [sortMode, setSortMode] = useState<"default" | "reliable">("default");

  useEffect(() => {
    if (!isEnabled("group_sessions") && exploreTab === "groupe") {
      setExploreTab("cours");
    }
  }, [exploreTab]);

  useEffect(() => {
    if (!isEnabled("group_sessions")) {
      setGroupSessions([]);
      setLoadingGroups(false);
      return;
    }
    const supabase = getSupabaseClient();
    const loadGroups = async () => {
      const { data, error } = await supabase
        .from("group_sessions")
        .select("*, teachers(name, image_url)")
        .in("status", ["open", "full"])
        .order("date", { ascending: true });
      if (!error && data) setGroupSessions(data as ExploreGroupSession[]);
      setLoadingGroups(false);
    };
    void loadGroups();
    const ch = supabase
      .channel("explore-group-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_sessions" }, () => void loadGroups())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const load = async () => {
      const mergePlans = async (list: Teacher[]) => {
        const ids = list.map((t) => t.id).join(",");
        if (!ids) {
          setTeachers(list);
          return;
        }
        try {
          const pr = await fetch(`/api/teachers/plans?ids=${encodeURIComponent(ids)}`);
          const body = (await pr.json()) as { plans?: Record<string, string> };
          const plans = body.plans ?? {};
          setTeachers(list.map((t) => ({ ...t, profilePlan: plans[t.id] ?? "free" })));
        } catch {
          setTeachers(list.map((t) => ({ ...t, profilePlan: "free" })));
        }
      };

      const { data, error } = await supabase
        .from(TEACHERS_PUBLIC_TABLE)
        .select(TEACHERS_LIST_SELECT)
        .order("verification_level", { ascending: false })
        .order("rating", { ascending: false });
      if (error || !data?.length) {
        console.warn("Supabase teachers load failed, using local TEACHERS.", error);
        await mergePlans(TEACHERS);
        setLoading(false);
        return;
      }
      const mapped = data.map((r) => teacherRowToTeacher(r as TeacherRow));
      const discMap = await fetchTeacherDisciplinesMap(
        supabase,
        mapped.map((t) => t.id),
      );
      const withDisc = mergeTeachersWithDisciplines(mapped, discMap);
      await mergePlans(withDisc);
      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel("teachers-explore")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teachers" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const requestGeolocation = () => {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError(t("geoNotAvailable"));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(t("geoPermissionDenied"));
          setGeo(null);
          return;
        }
        setGeoError(t("geoPositionError"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const filteredTeachers = useMemo(() => {
    const sortOpts = (geo: boolean) => ({ geo, sortMode, studentPrefs } as const);
    const base = teachers
      .filter((t) => {
        const matchesCategory = teacherMatchesExploreCategory(t, selectedCategory);
        const matchesSearch = teacherMatchesExploreSearch(t, searchQuery);
        const matchesMode =
          teachingMode === "all" ||
          t.teachingMode === teachingMode ||
          t.teachingMode === "both" ||
          t.teachingMode === "all";
        const matchesVerified = !onlyVerified || t.isVerified;
        return matchesCategory && matchesSearch && matchesMode && matchesVerified;
      })
      .map((t) => ({
        teacher: t,
        distanceKm:
          geo && teacherHasCoords(t)
            ? haversineDistance(geo.lat, geo.lng, t.location.lat, t.location.lng)
            : null,
      }));

    // "En ligne" radius filter: ignore geo + distances, just show online/both.
    if (radiusFilter === "online") {
      const onlineOnly = base.filter(
        (x) => x.teacher.teachingMode === "online" || x.teacher.teachingMode === "both",
      );
      onlineOnly.sort((a, b) => compareExploreTeachers(a, b, sortOpts(false)));
      return onlineOnly;
    }

    // "Tous" radius filter: ignore radius constraints.
    if (radiusFilter === "all") {
      const allTeachers = [...base];
      if (geo) {
        allTeachers.sort((a, b) => compareExploreTeachers(a, b, sortOpts(true)));
      } else {
        allTeachers.sort((a, b) => compareExploreTeachers(a, b, sortOpts(false)));
      }
      return allTeachers;
    }

    const withinRadius = geo
      ? base.filter((x) => x.distanceKm !== null && x.distanceKm <= radiusFilter)
      : base;

    // If geo is active, sort by closest first; otherwise (or if user denied GPS) sort by rating.
    withinRadius.sort((a, b) => compareExploreTeachers(a, b, sortOpts(Boolean(geo))));

    return withinRadius;
  }, [teachers, selectedCategory, searchQuery, teachingMode, onlyVerified, geo, radiusFilter, sortMode, studentPrefs]);

  const filteredGroupSessions = useMemo(() => {
    return groupSessions.filter((s) => {
      const sessionCat = displayTeacherMarketplaceCategory(s.discipline);
      const catOk =
        selectedCategory === "All" || sessionCat === selectedCategory || s.discipline === selectedCategory;
      const q = searchQuery.toLowerCase();
      const name = s.teachers?.name?.toLowerCase() ?? "";
      const searchOk = !q || s.title.toLowerCase().includes(q) || name.includes(q);
      return catOk && searchOk;
    });
  }, [groupSessions, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="ds-label text-[var(--p-text-subtle)]">{t("exploreMarketplaceLabel")}</p>
          <h2 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">
            Recherche d’élève par géolocalisation
          </h2>
          <p className="text-[14px] text-[var(--p-text-muted)] max-w-[560px]">
            {t("exploreSubtitle")}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => setExploreTab("cours")}
              className={cn(
                "h-10 px-4 rounded-full text-sm font-semibold transition-all border",
                exploreTab === "cours"
                  ? "bg-[#1D9E75] text-white border-[#1D9E75]"
                  : "bg-[var(--p-surface)] text-[var(--p-text-muted)] border-[var(--p-border-light)] hover:border-[#1D9E75]/40",
              )}
            >
              {t("individualCourses")}
            </button>
            {isEnabled("group_sessions") ? (
              <button
                type="button"
                onClick={() => setExploreTab("groupe")}
                className={cn(
                  "h-10 px-4 rounded-full text-sm font-semibold transition-all border inline-flex items-center gap-2",
                  exploreTab === "groupe"
                    ? "bg-[#1D9E75] text-white border-[#1D9E75]"
                    : "bg-[var(--p-surface)] text-[var(--p-text-muted)] border-[var(--p-border-light)] hover:border-[#1D9E75]/40",
                )}
              >
                <UsersRound size={16} /> {t("groupClasses")}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--p-text-muted)]">
            <span className="hidden sm:inline">Tri</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value === "reliable" ? "reliable" : "default")}
              className="h-10 rounded-[14px] border border-[var(--p-border-light)] bg-white px-3 text-sm font-medium text-[var(--p-text)] outline-none focus:border-[#1D9E75]"
            >
              <option value="default">{t("sortRelevance")}</option>
              <option value="reliable">{t("sortMostReliable")}</option>
            </select>
          </label>
          <button
            onClick={requestGeolocation}
            className={cn(
              "h-10 px-5 rounded-[22px] text-sm font-medium transition-all flex items-center gap-2",
              geo
                ? "bg-[rgba(29,158,117,0.12)] text-[#1D9E75] border border-[rgba(29,158,117,0.22)]"
                : "bg-[#1D9E75] text-white hover:brightness-[0.98]",
            )}
            disabled={geoLoading}
            title={t("useMyLocation")}
          >
            <MapPin size={14} />
            {geoLoading ? t("locating") : geo ? t("locationActive") : t("useMyLocation")}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-10 px-5 rounded-[22px] border text-sm font-medium transition-all flex items-center gap-2",
              showFilters
                ? "bg-[var(--p-text)] border-[var(--p-text)] text-white"
                : "bg-white border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[rgba(225,245,238,0.6)]",
            )}
          >
            <Filter size={14} /> {t("filtersButton")}
          </button>
          <div className="hidden sm:flex items-center gap-2 ds-pill">
            <CheckCircle2 size={12} />{" "}
            {exploreTab === "cours" ? filteredTeachers.length : filteredGroupSessions.length} {t("countAvailable")}
          </div>
        </div>
      </section>

      {geoError && (
        <div className="bg-[#FFF2F0] border border-[#FFD6CF] text-[#7B2B1C] rounded-[14px] p-4 text-sm font-medium">
          {geoError}
        </div>
      )}

      <section className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {([5, 10, 25, 50, 500] as const).map((km) => (
          <RadiusPill
            key={km}
            label={`${km} km`}
            active={radiusFilter === km}
            onClick={() => setRadiusFilter(km)}
          />
        ))}
        <RadiusPill label="Tous" active={radiusFilter === "all"} onClick={() => setRadiusFilter("all")} />
        <RadiusPill
          label="En ligne"
          active={radiusFilter === "online"}
          onClick={() => setRadiusFilter("online")}
        />
      </section>

      <div className="ds-search w-full flex items-center px-4">
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            exploreTab === "groupe"
              ? t("searchGroupPlaceholder")
              : t("searchIndividualPlaceholder")
          }
          className="w-full bg-transparent outline-none text-[14px] text-slate-800 placeholder:text-slate-400"
        />
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Mode de cours
                </p>
                <div className="flex gap-2">
                  {(["all", "online", "person"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTeachingMode(mode)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                        teachingMode === mode
                          ? "bg-brand-primary border-brand-primary text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {mode === "all" ? t("filterAll") : mode === "online" ? t("filterOnline") : t("filterInPerson")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Confiance & Sécurité
                </p>
                <button
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                    onlyVerified
                      ? "bg-white border-brand-primary text-brand-primary"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} /> {t("verifiedProfiles")}
                  </span>
                  {onlyVerified && <X size={12} />}
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {t("searchRadius")}
                </p>
                <div className="h-2 bg-slate-200 rounded-full relative">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-brand-primary rounded-full" />
                  <div className="absolute -top-1.5 left-1/2 w-5 h-5 bg-white border-2 border-brand-primary rounded-full shadow-md" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-600 uppercase">
                  <span>0 km</span>
                  <span>50 km+</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        <CategoryPill label={t("filterAll")} active={selectedCategory === "All"} onClick={() => setSelectedCategory("All")} />
        {getEnabledDisciplines().map((d) => (
          <CategoryPill
            key={d.id}
            label={d.label}
            active={selectedCategory === d.label}
            onClick={() => setSelectedCategory(d.label)}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 min-h-[400px]">
        {exploreTab === "groupe" ? (
          loadingGroups ? (
            <div className="col-span-full flex items-center justify-center p-20">
              <Loader2 className="animate-spin text-brand-primary" size={32} />
            </div>
          ) : filteredGroupSessions.length === 0 ? (
            <div className="col-span-full text-center p-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">{t("noGroupSessions")}</p>
              <p className="mt-3 text-[13px] text-[var(--p-text-muted)]">{t("noGroupSessionsSub")}</p>
            </div>
          ) : (
            filteredGroupSessions.map((s, index) => <ExploreGroupCard key={s.id} session={s} index={index} />)
          )
        ) : loading ? (
          <div className="col-span-full flex items-center justify-center p-20">
            <Loader2 className="animate-spin text-brand-primary" size={32} />
          </div>
        ) : filteredTeachers.length === 0 && geo && radiusFilter !== "all" && radiusFilter !== "online" ? (
          <div className="col-span-full text-center p-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">{t("noTeachersFound")}</p>
            <p className="mt-3 text-[13px] text-[var(--p-text-muted)] max-w-[520px] mx-auto">
              {t("noTeachersFoundRadius")}
            </p>
            <button
              onClick={() => setRadiusFilter("all")}
              className="mt-5 h-10 px-5 rounded-[22px] text-sm font-medium bg-[#1D9E75] text-white hover:brightness-[0.98]"
            >
              Voir tous les profs
            </button>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="col-span-full text-center p-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">
              Aucun professeur trouvé
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setTeachingMode("all");
                setOnlyVerified(false);
                onSearchChange("");
              }}
              className="mt-4 text-brand-primary text-xs font-bold hover:underline"
            >
              {t("resetFilters")}
            </button>
          </div>
        ) : (
          filteredTeachers.map(({ teacher, distanceKm }, index) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              index={index}
              onBook={() => onBook(teacher)}
              onViewProfile={() => onViewProfile(teacher)}
              distanceKm={distanceKm}
            />
          ))
        )}
      </section>
    </div>
  );
}

function ExploreGroupCard({ session, index }: { session: ExploreGroupSession; index: number }) {
  const router = useRouter();
  const { formatPrice, t } = useLocale();
  const max = Number(session.max_participants);
  const cur = Number(session.current_participants);
  const remaining = spotsRemaining(session);
  const ratio = max > 0 ? remaining / max : 0;
  const barColor =
    remaining === 0 ? "bg-amber-500" : ratio > 0.5 ? "bg-[#1D9E75]" : ratio < 0.25 ? "bg-amber-500" : "bg-[#1D9E75]/70";
  const teacherName = session.teachers?.name ?? "Professeur";
  const img = session.teachers?.image_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => router.push(`/group-sessions/${session.id}`)}
      className="ds-card p-5 hover:shadow-[0_22px_70px_rgba(15,110,86,0.12)] transition-all cursor-pointer flex gap-5 group relative border-l-4 border-l-[#1D9E75]"
    >
      <div className="relative shrink-0">
        {img ? (
          <img src={img} alt="" className="w-14 h-14 rounded-full object-cover border border-[var(--p-border-light)]" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[var(--p-light-teal-bg)] flex items-center justify-center text-[15px] font-semibold text-[var(--p-dark-teal)]">
            {initialsFor(teacherName)}
          </div>
        )}
        <span
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center border-2 border-white shadow-sm"
          title={t("groupClasses")}
        >
          <UsersRound size={14} />
        </span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ds-pill">{session.discipline}</span>
              {session.is_recurring ? (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                  Récurrent
                </span>
              ) : null}
            </div>
            <h3 className="text-[17px] font-semibold leading-snug text-[var(--p-text)] group-hover:text-[var(--p-dark-teal)] transition-colors line-clamp-2">
              {session.title}
            </h3>
            <p className="text-[13px] text-[var(--p-text-muted)] truncate">{teacherName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[18px] font-semibold text-[#1D9E75]">{formatPrice(Number(session.price_per_person))}</p>
            <p className="text-[11px] text-[var(--p-text-muted)]">{t("perPerson")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--p-text-muted)]">
          <span>
            {session.date} · {session.time}
          </span>
          <span>{session.duration_minutes} min</span>
          <span className="inline-flex items-center gap-1 text-[var(--p-text)]">
            <Users size={12} className="text-[#1D9E75]" />
            {cur}/{max} inscrits
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${max ? (remaining / max) * 100 : 0}%` }} />
          </div>
          <p className="text-[11px] text-[var(--p-text-muted)]">
            {remaining > 0 ? `${remaining} place${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}` : t("groupSessionFull")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap text-[11px] font-medium rounded-[10px] px-4 py-2 border transition-all",
        active
          ? "bg-[var(--p-light-teal-bg)] border-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)]"
          : "bg-white border-[var(--p-border-light)] text-[var(--p-text-muted)] hover:text-[var(--p-text)] hover:bg-[rgba(225,245,238,0.6)]",
      )}
    >
      {label}
    </button>
  );
}

function RadiusPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap text-[11px] font-medium rounded-[10px] px-4 py-2 border transition-all",
        active
          ? "bg-[rgba(29,158,117,0.12)] border-[rgba(29,158,117,0.22)] text-[#1D9E75]"
          : "bg-white border-[var(--p-border-light)] text-[var(--p-text-muted)] hover:text-[var(--p-text)] hover:bg-[rgba(225,245,238,0.6)]",
      )}
    >
      {label}
    </button>
  );
}

function TeacherCard({
  teacher,
  index,
  onBook,
  onViewProfile,
  distanceKm,
}: {
  teacher: Teacher;
  index: number;
  onBook: () => void;
  onViewProfile: () => void;
  distanceKm: number | null;
}) {
  const { formatPrice, t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const marketplaceCategory = displayTeacherMarketplaceCategory(teacher.category);

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert(t("loginToMessage"));
      return;
    }

    setIsStartingChat(true);
    try {
      const supabase = getSupabaseClient();
      const chatId = [user.id, teacher.id].sort().join("_");
      const { data: existing } = await supabase.from("chats").select("id").eq("id", chatId).maybeSingle();
      if (!existing) {
        await supabase.from("chats").insert({
          id: chatId,
          participant_ids: [user.id, teacher.id],
          last_message: "",
        });
      }
      router.push("/messages");
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      role="button"
      tabIndex={0}
      onClick={onViewProfile}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewProfile();
        }
      }}
      className={cn(
        "ds-card group relative flex cursor-pointer gap-5 p-5 transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:scale-[1.015] hover:border-[#1D9E75]/30 hover:shadow-xl",
        "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/40",
      )}
    >
      <TeacherAvatar name={teacher.name} category={teacher.category} imageUrl={teacher.imageUrl} size={44} />

      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="ds-pill">{marketplaceCategory}</span>
              {teacher.homeLessonEnabled && teacher.homeLessonPrice ? (
                <span className="badge-teal">À domicile disponible</span>
              ) : null}
              {String(teacher.profilePlan || "").toLowerCase() === "enterprise" ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[rgba(29,158,117,0.14)] text-[#0f6d52] border border-[rgba(29,158,117,0.35)]"
                  title={t("verifiedStudioTitle")}
                >
                  <MapPin size={12} className="shrink-0 text-[#1D9E75]" />
                  Studio vérifié
                </span>
              ) : null}
              {teacher.teachingMode === "online" && <Video size={12} className="text-indigo-400" />}
              {teacher.teachingMode === "person" && <Users size={12} className="text-emerald-400" />}
              {teacher.teachingMode === "both" && (
                <div className="flex gap-1">
                  <Video size={10} className="text-indigo-300" />
                  <Users size={10} className="text-emerald-300" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {distanceKm !== null && (
                <span className="px-3 py-1 rounded-[10px] text-[11px] font-medium bg-[rgba(29,158,117,0.12)] text-[#1D9E75]">
                  {distanceKm.toFixed(1)} {t("kmFromYou")}
                </span>
              )}
              <span className={cn("px-3 py-1 rounded-[10px] text-[11px] font-medium", ratingPillFor(teacher.category))}>
                ★ {teacher.rating}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[18px] leading-tight text-[var(--p-text)] truncate group-hover:text-[var(--p-dark-teal)] transition-colors">
              {teacher.name}
            </h3>
            <VerificationBadge
              level={verificationSortKey(teacher)}
              size="sm"
              showLabel={false}
              className="shrink-0"
            />
          </div>
          <p className="text-[13px] text-[var(--p-text-muted)] -mt-1 flex flex-wrap items-center gap-2">
            <span>{teacher.discipline} · Montréal</span>
            {(teacher.additionalDisciplines?.length ?? 0) > 0 ? (
              <span className="inline-flex items-center rounded-full border border-[rgba(29,158,117,0.35)] bg-[rgba(29,158,117,0.1)] px-2 py-0.5 text-[11px] font-bold text-[#0f6d52]">
                {teacher.additionalDisciplines!.length === 1
                  ? "+ 1 autre"
                  : `+ ${teacher.additionalDisciplines!.length} autres`}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-end justify-between mt-4 pt-4 border-t border-[var(--p-light-teal-bg)]">
          <div className="space-y-1">
            <p className="ds-label text-[var(--p-text-subtle)]">{t("nextAvailableLesson")}</p>
            <div className="flex items-center gap-2">
              <VerifiedBadge
              verified={teacher.isVerified || Boolean(teacher.identityVerified)}
            />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-medium text-[var(--p-text)]">{formatPrice(Number(teacher.pricePerLesson))}</p>
            <p className="text-[12px] text-[var(--p-text-muted)]">{t("perHourSuffix")}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
}

function ratingPillFor(category: Discipline) {
  if (category === "Musique") return "bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)]";
  if (category === "Arts Martiaux") return "bg-[#FFE7E1] text-[#C2462E]";
  if (category === "Langues") return "bg-[#EFE8FF] text-[#5B3EC8]";
  return "bg-[rgba(225,245,238,0.6)] text-[var(--p-dark-teal)]";
}

function avatarBgFor(category: Discipline) {
  if (category === "Musique") return "bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)]";
  if (category === "Arts Martiaux") return "bg-[#FFE7E1] text-[#C2462E]";
  if (category === "Langues") return "bg-[#EFE8FF] text-[#5B3EC8]";
  return "bg-[rgba(225,245,238,0.6)] text-[var(--p-dark-teal)]";
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


