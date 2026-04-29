"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { LayoutList, Map, MapPin, Star } from "lucide-react";
import type { Teacher } from "../types";
import { TEACHERS } from "../constants";
import { cn } from "../lib/utils";
import { getEnabledDisciplines } from "../lib/disciplines";
import { isEnabled } from "../lib/features";
import Logo from "../components/ui/Logo";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { getSupabaseClient } from "../lib/supabase";
import {
  fetchTeacherDisciplinesMap,
  mergeTeachersWithDisciplines,
  teacherMatchesExploreCategory,
  teacherMatchesExploreSearch,
} from "../lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "../lib/teacherMapper";
import { getVerificationLevel } from "../lib/verification";
import { VerificationBadge } from "../components/VerificationBadge";
import { useLocale } from "../lib/locale-context";
import { useAuth } from "../components/AuthProvider";
import { SmartSearchInput } from "../components/SmartSearchInput";
import type { BookingInitialLessonKind } from "../components/BookingModal";

const TeacherProfile = dynamic(
  () => import("../components/TeacherProfile").then((m) => m.TeacherProfile),
  { ssr: false, loading: () => <p className="p-4 text-center text-sm text-[#6B6A65]">Chargement…</p> },
);
const BookingModal = dynamic(
  () => import("../components/BookingModal").then((m) => m.BookingModal),
  { ssr: false, loading: () => <p className="p-4 text-center text-sm text-[#6B6A65]">Chargement…</p> },
);
import type { City } from "../lib/cities";

const SearchMapView = dynamic(
  () => import("../components/SearchMapView").then((m) => m.SearchMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-2 h-[480px] rounded-2xl bg-[#F1EFE8] text-sm text-[#6B6A65]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F6E56] border-t-transparent" />
        <p>Chargement…</p>
      </div>
    ),
  },
);

type HeroMode = "student" | "teacher";

const TEACHERS_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, home_lesson_enabled, home_lesson_price, home_lesson_radius_km, home_lesson_min_duration, home_lesson_requires_confirmation, home_lesson_force_2h_over_20km, verification_level, identity_verified, diploma_verified, phone_verified";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, formatPrice } = useLocale();
  const [mode, setMode] = useState<HeroMode>("student");

  // Teachers + search state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Geo
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<"relevance" | "nearest">("relevance");

  // View
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Profile / booking modals
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<Teacher | null>(null);
  const [selectedMapTeacher, setSelectedMapTeacher] = useState<Teacher | null>(null);
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");

  // Auth redirect for logged-in users
  useEffect(() => {
    if (authLoading || !user) return;
    const checkRole = async () => {
      const supabase = getSupabaseClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, teacher_onboarding_complete, companion_chosen")
        .eq("id", user.id)
        .maybeSingle();
      const row = profile as { role?: string | null; teacher_onboarding_complete?: boolean | null; companion_chosen?: boolean | null } | null;
      if (row?.role === "teacher") {
        router.push(row.teacher_onboarding_complete ? "/dashboard" : "/onboarding");
      } else if (!row?.companion_chosen) {
        router.push("/student/choose-companion");
      } else {
        router.push("/dashboard");
      }
    };
    void checkRole();
  }, [user, authLoading, router]);

  // Load teachers
  useEffect(() => {
    const supabase = getSupabaseClient();
    const load = async () => {
      const mergePlans = async (list: Teacher[]) => {
        const ids = list.map((t) => t.id).join(",");
        if (!ids) { setTeachers(list); return; }
        try {
          const pr = await fetch(`/api/teachers/plans?ids=${encodeURIComponent(ids)}`);
          const body = (await pr.json()) as { plans?: Record<string, string> };
          const plans = body.plans ?? {};
          setTeachers(list.map((t) => ({ ...t, profilePlan: plans[t.id] ?? "free" })));
        } catch {
          setTeachers(list.map((t) => ({ ...t, profilePlan: "free" })));
        }
      };
      const { data, error } = await supabase.from("teachers").select(TEACHERS_SELECT).order("verification_level", { ascending: false }).order("rating", { ascending: false });
      if (error || !data?.length) { await mergePlans(TEACHERS); setLoadingTeachers(false); return; }
      const mapped = data.map((r) => teacherRowToTeacher(r as TeacherRow));
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

  // Filter + sort
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = teachers.filter((t) => {
      const catOk = teacherMatchesExploreCategory(t, activeCat);
      const qOk = !q || teacherMatchesExploreSearch(t, searchQuery);
      return catOk && qOk;
    });
    if (sortMode === "nearest" && geo) {
      return [...list].sort((a, b) => {
        const da = a.location?.lat && a.location?.lng ? Math.hypot(a.location.lat - geo.lat, a.location.lng - geo.lng) : 999;
        const db = b.location?.lat && b.location?.lng ? Math.hypot(b.location.lat - geo.lat, b.location.lng - geo.lng) : 999;
        return da - db;
      });
    }
    return list;
  }, [teachers, searchQuery, activeCat, sortMode, geo]);

  if (authLoading) return null;
  if (user) return null;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pratiqo",
    url: "https://pratiqo.ca",
    logo: "https://pratiqo.ca/logo-email.png",
    description: "Marketplace québécoise de cours particuliers",
    address: { "@type": "PostalAddress", addressCountry: "CA", addressRegion: "QC" },
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

      {/* ── HEADER ─────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#D3D1C7] h-14 flex items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo variant="dark" size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link href="/login" className="text-sm text-[#0F6E56] font-medium hover:underline">
            {t("signIn")}
          </Link>
        </div>
      </header>

      {/* ── HERO (animated student/teacher toggle) ── */}
      <section className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "student" ? (
            <motion.div
              key="student"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0F6E56] text-white"
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-8">
                {/* Mode toggle */}
                <div className="mb-8 flex flex-wrap justify-center gap-2 rounded-2xl bg-black/20 p-1 sm:inline-flex">
                  <TogglePill active onClick={() => setMode("student")}>{t("iAmStudent")}</TogglePill>
                  <TogglePill active={false} onClick={() => setMode("teacher")}>{t("iAmTeacher")}</TogglePill>
                </div>

                <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{t("heroStudentTitle")}</h1>
                <p className="mt-2 text-center text-sm text-white/80 sm:text-base">{t("heroStudentSubtitle")}</p>

                {/* Smart search */}
                <div className="mx-auto mt-7 max-w-xl">
                  <SmartSearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    teachers={teachers}
                    geo={geo}
                    onSelectTeacher={(teacher) => setSelectedTeacherProfile(teacher)}
                    onSelectDiscipline={(label) => {
                      setActiveCat(label);
                      setSearchQuery("");
                    }}
                    onSelectCity={(city: City) => {
                      setGeo({ lat: city.lat, lng: city.lng });
                      setSortMode("nearest");
                      setSearchQuery(city.name);
                    }}
                  />
                </div>

                {/* Discipline chips */}
                <div className="mx-auto mt-5 max-w-3xl">
                  <div className="flex flex-wrap justify-center gap-2">
                    {getEnabledDisciplines().map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setActiveCat(activeCat === d.label ? "All" : d.label)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                          activeCat === d.label
                            ? "border-white bg-white text-[#0F6E56]"
                            : "border-white/30 bg-white/15 text-white hover:bg-white/20",
                        )}
                      >
                        {d.emoji} {d.label}
                      </button>
                    ))}
                    {isEnabled("group_sessions") ? (
                      <Link href="/group-sessions" className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20">
                        Cours groupe
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setActiveCat("All")}
                      className={cn("rounded-full border px-4 py-2 text-xs font-semibold", activeCat === "All" ? "border-white bg-white text-[#0F6E56]" : "border-white/30 bg-white/15 text-white hover:bg-white/20")}
                    >
                      Tous
                    </button>
                  </div>
                  <p className="mt-3 text-center text-[11px] text-white/50">D&apos;autres disciplines arrivent bientôt 🚀</p>
                </div>
              </div>

              {/* ── TEACHER LIST / MAP ─────────── */}
              <div className="bg-[#F1EFE8]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">

                  {/* List/map toggle header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">
                        {loadingTeachers ? "Chargement…" : `${filtered.length} profil${filtered.length !== 1 ? "s" : ""}`}
                      </p>
                      <button
                        type="button"
                        onClick={requestGeo}
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-semibold rounded-lg px-2 py-1 transition-colors",
                          sortMode === "nearest" && geo
                            ? "text-[#0F6E56] bg-[rgba(29,158,117,0.1)]"
                            : "text-[#6B6760] hover:text-[#0F6E56]",
                        )}
                        aria-pressed={sortMode === "nearest" && !!geo}
                      >
                        <MapPin size={11} /> Trouver des profs près de moi
                      </button>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-white border border-[#E8E6DF] p-1">
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", viewMode === "list" ? "bg-[#0F6E56] text-white shadow-sm" : "text-[#6B6760] hover:text-[#2C2C2A]")}
                      >
                        <LayoutList size={13} /> Liste
                      </button>
                      <button
                        type="button"
                        onClick={() => { setViewMode("map"); setMapLoaded(true); }}
                        className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors", viewMode === "map" ? "bg-[#0F6E56] text-white shadow-sm" : "text-[#6B6760] hover:text-[#2C2C2A]")}
                      >
                        <Map size={13} /> Carte
                      </button>
                    </div>
                  </div>

                  {/* List view */}
                  {viewMode === "list" ? (
                    loadingTeachers ? (
                      <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {filtered.slice(0, 9).map((teacher) => (
                            <LandingTeacherCard
                              key={teacher.id}
                              teacher={teacher}
                              formatPrice={formatPrice}
                              onOpen={() => setSelectedTeacherProfile(teacher)}
                            />
                          ))}
                        </div>
                        {filtered.length === 0 ? (
                          <p className="text-center py-10 text-sm text-[#6B6760]">Aucun prof trouvé pour cette recherche.</p>
                        ) : filtered.length > 9 ? (
                          <div className="mt-6 text-center">
                            <Link href="/login?next=/student/search" className="inline-flex h-11 items-center rounded-2xl bg-[#0F6E56] px-6 text-sm font-semibold text-white hover:brightness-105">
                              Voir tous les profs →
                            </Link>
                          </div>
                        ) : null}
                      </>
                    )
                  ) : null}

                  {/* Map view (lazy) */}
                  {viewMode === "map" && mapLoaded ? (
                    <div className="h-[480px] rounded-2xl overflow-hidden border border-[#E8E6DF] shadow-sm">
                      <SearchMapView
                        teachers={filtered}
                        userLat={geo?.lat ?? null}
                        userLng={geo?.lng ?? null}
                        selectedTeacher={selectedMapTeacher}
                        onTeacherSelect={(t) => setSelectedMapTeacher(t)}
                        onViewProfile={(t) => setSelectedTeacherProfile(t)}
                        onCloseSelected={() => setSelectedMapTeacher(null)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ── VALUE PROPS (student) ────────── */}
              <div className="bg-white border-t border-[#E8E6DF] min-h-[400px]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
                  <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#6B6760] mb-8">
                    Pourquoi Pratiqo
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[200px]">
                    <ValueProp emoji="🐣" title="Compagnon évolutif" desc="Gagne 5$/10$/15$/25$ aux paliers de 5, 15, 30 et 50 cours." />
                    <ValueProp emoji="⭐" title="+1$ par évaluation" desc="Chaque avis laissé sur un prof te rapporte 1$ de crédit." />
                    <ValueProp emoji="💌" title="+1$ par parrainage" desc="Invite un ami. Vous gagnez tous les deux. Plafonné à 20$/an." />
                    <ValueProp emoji="🍁" title="D&apos;ici, pour ici" desc="Profs locaux vérifiés. Vision Québec et Canada." />
                  </div>
                  <p className="mt-6 text-center text-xs text-slate-600">
                    Les crédits sont utilisables sur Pratiqo uniquement. Aucun cashback récurrent.
                  </p>
                </div>
              </div>
            </motion.div>

          ) : (
            <motion.div
              key="teacher"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#2C2C2A] text-white"
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
                <div className="mb-6 flex flex-wrap justify-center gap-2 rounded-2xl bg-black/20 p-1 sm:inline-flex">
                  <TogglePill active={false} onClick={() => setMode("student")} darkMode>{t("iAmStudent")}</TogglePill>
                  <TogglePill active onClick={() => setMode("teacher")} darkMode>{t("iAmTeacher")}</TogglePill>
                </div>

                <h2 className="text-center text-2xl font-bold leading-tight sm:text-4xl">
                  Enseigne sur Pratiqo.
                  <br />
                  <span className="text-white/60">Pas un employé. Un partenaire.</span>
                </h2>
                <p className="mt-4 text-center text-sm text-white/70 max-w-xl mx-auto">
                  Fixe tes tarifs, horaires et méthodes. Commission dégressive selon ton volume. Ristourne annuelle pour les profs Pro.
                </p>

                {/* 3-stat row */}
                <div className="mx-auto mt-10 grid max-w-3xl gap-3 grid-cols-3">
                  <StatCard label="Commission Gratuit" value="7-10%" />
                  <StatCard label="Commission Pro" value="3.5-5%" />
                  <StatCard label="Ristourne annuelle" value="5% profits" />
                </div>

                <ul className="mx-auto mt-8 max-w-xl space-y-2.5 text-sm text-white/80">
                  {[
                    "Commission dégressive Bronze → Platine",
                    "Paiements automatiques via Stripe",
                    "Cours en ligne, en studio ou à domicile",
                  ].map((b) => (
                    <li key={b} className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex flex-col items-center gap-3">
                  <Link href="/become-teacher" className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0F6E56] px-8 text-sm font-bold text-white hover:brightness-105">
                    Voir les plans et commissions →
                  </Link>
                  <Link href="/login?role=teacher" className="text-sm font-medium text-white/70 underline underline-offset-2 hover:text-white">
                    {t("joinFree")}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── STAT BAR ───────────────────────────── */}
      <div className="border-y border-[#E8E6DF] bg-[#F1EFE8] py-4 text-center text-xs font-bold uppercase tracking-widest text-[#2C2C2A]">
        <span className="text-[#0F6E56]">{t("statProfCount").split(" ")[0]}</span>{" "}
        {t("statProfCount").split(" ").slice(1).join(" ")}
        <span className="mx-3 text-[#D3D1C7]">·</span>
        {t("statWorldwide")}
        <span className="mx-3 text-[#D3D1C7]">·</span>
        <span className="text-[#0F6E56]">{t("statCashback")}</span>
        <span className="mx-3 text-[#D3D1C7]">·</span>
        {t("statRistourne")}
      </div>

      {/* ── DUAL CTA FOOTER ────────────────────── */}
      <div className="bg-white border-t border-[#E8E6DF] py-6 px-4">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0F6E56] px-6 text-sm font-bold text-white hover:brightness-105 w-full sm:w-auto">
            Je cherche un prof →
          </Link>
          <Link href="/become-teacher" className="inline-flex h-11 items-center justify-center rounded-2xl border-2 border-[#2C2C2A] px-6 text-sm font-bold text-[#2C2C2A] hover:bg-[#2C2C2A] hover:text-white transition-colors w-full sm:w-auto">
            Je veux enseigner →
          </Link>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="bg-white border-t border-[#E8E6DF]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B6760]">
          <Link href="/legal/cgu" className="hover:text-[#2C2C2A] hover:underline">CGU</Link>
          <Link href="/legal/confidentialite" className="hover:text-[#2C2C2A] hover:underline">Confidentialité</Link>
          <Link href="/legal/annulation" className="hover:text-[#2C2C2A] hover:underline">Annulation</Link>
          <span className="text-[#D3D1C7]">·</span>
          <span>© 2026 Pratiqo inc.</span>
        </div>
      </footer>

      {/* ── MODALS ─────────────────────────────── */}
      <AnimatePresence>
        {selectedTeacherProfile ? (
          <TeacherProfile
            key={selectedTeacherProfile.id}
            teacher={selectedTeacherProfile}
            onClose={() => setSelectedTeacherProfile(null)}
            onBook={(kind) => {
              setBookingInitialKind(kind);
              setBookingTeacher(selectedTeacherProfile);
              setSelectedTeacherProfile(null);
            }}
            onSendMessage={
              selectedTeacherProfile.userId
                ? () => router.push(`/login?next=${encodeURIComponent(`/messages?peer=${selectedTeacherProfile.userId!}`)}`)
                : undefined
            }
          />
        ) : null}
      </AnimatePresence>

      {bookingTeacher ? (
        <BookingModal
          key={`${bookingTeacher.id}-${bookingInitialKind}`}
          teacher={bookingTeacher}
          initialLessonKind={bookingInitialKind}
          onClose={() => { setBookingTeacher(null); setBookingInitialKind("standard"); }}
        />
      ) : null}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TogglePill({ children, active, onClick, darkMode }: { children: React.ReactNode; active: boolean; onClick: () => void; darkMode?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[130px] rounded-xl px-4 py-2.5 text-xs font-bold transition-colors",
        active
          ? darkMode ? "bg-white text-[#2C2C2A] shadow-sm" : "bg-white text-[#0F6E56] shadow-sm"
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
      <p className="mt-2 text-xl font-bold text-[#7FE0C3]">{value}</p>
    </div>
  );
}

function ValueProp({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-[#FAFCFB] p-5 space-y-2">
      <span className="text-2xl">{emoji}</span>
      <p className="font-bold text-sm text-[#2C2C2A]">{title}</p>
      <p className="text-xs text-[#6B6760] leading-relaxed">{desc}</p>
    </div>
  );
}

function LandingTeacherCard({
  teacher,
  formatPrice,
  onOpen,
}: {
  teacher: Teacher;
  formatPrice: (n: number) => string;
  onOpen: () => void;
}) {
  const initials = teacher.name.split(" ").slice(0, 2).map((x) => x[0]?.toUpperCase()).join("");
  const avatarBg =
    teacher.category === "Musique" ? "bg-[rgba(29,158,117,0.14)] text-[#085041]"
    : teacher.category === "Arts Martiaux" ? "bg-[rgba(255,153,102,0.18)] text-[#C2462E]"
    : teacher.category === "Langues" ? "bg-[rgba(146,106,255,0.16)] text-[#5B3EC8]"
    : "bg-[rgba(29,158,117,0.14)] text-[#085041]";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full text-left rounded-2xl bg-white p-4 border border-[#E8E6DF] shadow-[0_8px_32px_rgba(44,44,42,0.05)] hover:shadow-[0_12px_40px_rgba(44,44,42,0.08)] transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", avatarBg)}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="truncate font-semibold text-[#2C2C2A] text-sm">{teacher.name}</p>
              <VerificationBadge
                level={getVerificationLevel({ plan: teacher.profilePlan, identity_verified: teacher.identityVerified, diploma_verified: teacher.diplomaVerified, is_verified: teacher.isVerified, verification_level: teacher.verificationLevel ?? null })}
                size="sm"
                showLabel={false}
                className="shrink-0 scale-90"
              />
            </div>
            <p className="truncate text-xs text-[#6B6760]">{teacher.discipline}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#2C2C2A] border border-[#E8E6DF] flex items-center gap-0.5">
          <Star size={10} className="text-amber-400 fill-amber-400" /> {teacher.rating}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#6B6760]">
        <span>{teacher.teachingMode === "online" ? "En ligne" : "Présentiel / mixte"}</span>
        <span className="font-bold text-[#0F6E56]">{formatPrice(Number(teacher.pricePerLesson))}/h</span>
      </div>
    </button>
  );
}
