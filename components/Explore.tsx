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
import { CATEGORIES, TEACHERS } from "../constants";
import { cn } from "../lib/utils";
import { getSupabaseClient } from "../lib/supabase";
import { teacherRowToTeacher, type TeacherRow } from "../lib/teacherMapper";
import { haversineDistance } from "../lib/geo";
import { spotsRemaining, type GroupSessionRow } from "../lib/groupSessions";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";

/** Colonnes nécessaires au mapper + cours à domicile (évite les réponses PostgREST incomplètes). */
const TEACHERS_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km";

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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Discipline | "All">("All");
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

  useEffect(() => {
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
      const { data, error } = await supabase.from("teachers").select(TEACHERS_SELECT).order("id");
      if (error || !data?.length) {
        console.warn("Supabase teachers load failed, using local TEACHERS.", error);
        setTeachers(TEACHERS);
        setLoading(false);
        return;
      }
      setTeachers(data.map((r) => teacherRowToTeacher(r as TeacherRow)));
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
      setGeoError("La géolocalisation n'est pas disponible sur ce navigateur.");
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
          setGeoError("Permission GPS refusée. Autorise la localisation puis réessaie.");
          setGeo(null);
          return;
        }
        setGeoError("Impossible de récupérer votre position.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const filteredTeachers = useMemo(() => {
    const base = teachers
      .filter((t) => {
        const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
        const matchesSearch =
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.discipline.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMode =
          teachingMode === "all" || t.teachingMode === teachingMode || t.teachingMode === "both";
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
      onlineOnly.sort((a, b) => (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0));
      return onlineOnly;
    }

    // "Tous" radius filter: ignore radius constraints.
    if (radiusFilter === "all") {
      const allTeachers = [...base];
      if (geo) {
        allTeachers.sort((a, b) => {
          const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
          const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;
          return (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0);
        });
      } else {
        allTeachers.sort((a, b) => (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0));
      }
      return allTeachers;
    }

    const withinRadius = geo
      ? base.filter((x) => x.distanceKm !== null && x.distanceKm <= radiusFilter)
      : base;

    // If geo is active, sort by closest first; otherwise (or if user denied GPS) sort by rating.
    if (geo) {
      withinRadius.sort((a, b) => {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0);
      });
    } else {
      withinRadius.sort((a, b) => (b.teacher.rating ?? 0) - (a.teacher.rating ?? 0));
    }

    return withinRadius;
  }, [teachers, selectedCategory, searchQuery, teachingMode, onlyVerified, geo, radiusFilter]);

  const filteredGroupSessions = useMemo(() => {
    return groupSessions.filter((s) => {
      const catOk = selectedCategory === "All" || s.discipline === selectedCategory;
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
          <p className="ds-label text-[var(--p-text-subtle)]">Marketplace</p>
          <h2 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">
            Recherche d’élève par géolocalisation
          </h2>
          <p className="text-[14px] text-[var(--p-text-muted)] max-w-[560px]">
            Active votre position pour voir en priorité les professeurs près de toi.
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
              Cours individuels
            </button>
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
              <UsersRound size={16} /> Cours de groupe
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={requestGeolocation}
            className={cn(
              "h-10 px-5 rounded-[22px] text-sm font-medium transition-all flex items-center gap-2",
              geo
                ? "bg-[rgba(29,158,117,0.12)] text-[#1D9E75] border border-[rgba(29,158,117,0.22)]"
                : "bg-[#1D9E75] text-white hover:brightness-[0.98]",
            )}
            disabled={geoLoading}
            title="Déclencher le GPS"
          >
            <MapPin size={14} />
            {geoLoading ? "Localisation…" : geo ? "Position active" : "Utiliser ma position"}
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
            <Filter size={14} /> Filtres
          </button>
          <div className="hidden sm:flex items-center gap-2 ds-pill">
            <CheckCircle2 size={12} />{" "}
            {exploreTab === "cours" ? filteredTeachers.length : filteredGroupSessions.length} disponibles
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
              ? "Rechercher un cours ou un professeur…"
              : "Rechercher un prof (nom, discipline)..."
          }
          className="w-full bg-transparent outline-none text-[14px] text-[var(--p-text)] placeholder:text-[var(--p-text-subtle)]"
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
                      )}
                    >
                      {mode === "all" ? "Tous" : mode === "online" ? "En ligne" : "Présentiel"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Confiance & Sécurité
                </p>
                <button
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                    onlyVerified
                      ? "bg-white border-brand-primary text-brand-primary"
                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} /> Profils Vérifiés
                  </span>
                  {onlyVerified && <X size={12} />}
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Rayon d'action
                </p>
                <div className="h-2 bg-slate-200 rounded-full relative">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-brand-primary rounded-full" />
                  <div className="absolute -top-1.5 left-1/2 w-5 h-5 bg-white border-2 border-brand-primary rounded-full shadow-md" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>0 km</span>
                  <span>50 km+</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        <CategoryPill label="Tous" active={selectedCategory === "All"} onClick={() => setSelectedCategory("All")} />
        {CATEGORIES.map((cat) => (
          <CategoryPill key={cat} label={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} />
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
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun cours de groupe</p>
              <p className="mt-3 text-[13px] text-[var(--p-text-muted)]">Essaie une autre discipline ou reviens plus tard.</p>
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
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun prof trouvé</p>
            <p className="mt-3 text-[13px] text-[var(--p-text-muted)] max-w-[520px] mx-auto">
              Aucun prof trouvé dans ce rayon. Essaie un rayon plus grand ou cherche en ligne.
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
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
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
              Réinitialiser les filtres
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
          title="Cours de groupe"
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
            <p className="text-[18px] font-semibold text-[#1D9E75]">${Number(session.price_per_person)}</p>
            <p className="text-[11px] text-[var(--p-text-muted)]">/ personne</p>
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
            {remaining > 0 ? `${remaining} place${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}` : "Complet"}
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
  const { user } = useAuth();
  const router = useRouter();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert("Veuillez vous connecter pour envoyer un message.");
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
      onClick={onViewProfile}
      className="ds-card p-5 hover:shadow-[0_22px_70px_rgba(15,110,86,0.12)] transition-all cursor-pointer flex gap-5 group relative"
    >
      <div className={cn("w-11 h-11 rounded-full flex items-center justify-center font-medium text-[14px]", avatarBgFor(teacher.category))}>
        {initialsFor(teacher.name)}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="ds-pill">{teacher.category}</span>
              {teacher.homeLessonEnabled && teacher.homeLessonPrice ? (
                <span className="badge-teal">À domicile disponible</span>
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
                  {distanceKm.toFixed(1)} km de vous
                </span>
              )}
              <span className={cn("px-3 py-1 rounded-[10px] text-[11px] font-medium", ratingPillFor(teacher.category))}>
                ★ {teacher.rating}
              </span>
            </div>
          </div>
          <h3 className="text-[18px] leading-tight text-[var(--p-text)] truncate group-hover:text-[var(--p-dark-teal)] transition-colors">
            {teacher.name}
          </h3>
          <p className="text-[13px] text-[var(--p-text-muted)] -mt-1">
            {teacher.discipline.split(",")[0]} · Montréal
          </p>
        </div>

        <div className="flex items-end justify-between mt-4 pt-4 border-t border-[var(--p-light-teal-bg)]">
          <div className="space-y-1">
            <p className="ds-label text-[var(--p-text-subtle)]">Prochain cours disponible</p>
            <div className="flex items-center gap-2">
              {teacher.isVerified && (
                <span className="ds-pill inline-flex items-center gap-1">
                  <ShieldCheck size={14} /> Vérifié
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-medium text-[var(--p-text)]">${teacher.pricePerLesson}</p>
            <p className="text-[12px] text-[var(--p-text-muted)]">/ heure</p>
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


