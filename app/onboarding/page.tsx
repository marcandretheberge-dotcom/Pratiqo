"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, Upload } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../components/AuthProvider";
import { getSupabaseClient } from "../../lib/supabase";

type Step = 1 | 2 | 3 | "done";
type Mode = "person" | "online" | "both";

const CATEGORY_OPTIONS = [
  "Musique",
  "Danse",
  "Arts martiaux",
  "Langues",
  "Yoga/Fitness",
  "Dessin/Arts",
  "Cuisine",
  "Autre",
] as const;

const LEVELS = ["Débutants", "Enfants", "Intermédiaires", "Avancés", "Tous"] as const;

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const SLOTS = ["Matin", "Après-midi", "Soir"] as const;

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, profile } = useAuth();
  const roleParam = searchParams.get("role");
  const stripeStatus = searchParams.get("stripe");
  const force = searchParams.get("force") === "true";

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [bio, setBio] = useState("");
  const [teachingSince, setTeachingSince] = useState<number | null>(null);

  // Step 2
  const [categories, setCategories] = useState<string[]>([]);
  const [discipline, setDiscipline] = useState("");
  const [teachingMode, setTeachingMode] = useState<Mode>("both");
  const [hourlyRate, setHourlyRate] = useState<number>(50);
  const [levels, setLevels] = useState<string[]>([]);

  // Step 3
  const [availability, setAvailability] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [homeEnabled, setHomeEnabled] = useState(false);
  const [homeRadius, setHomeRadius] = useState(25);
  const [homePrice, setHomePrice] = useState<number | null>(null);

  const disciplineForAi = categories.length > 0 ? categories.join(", ") : discipline.trim();
  const canGenerateAiBio = Boolean(disciplineForAi);

  async function generateDescription() {
    if (!disciplineForAi) {
      alert("Choisis au moins une discipline à l’étape 2 (tu peux y aller puis revenir à l’étape 1).");
      return;
    }
    setAiLoading(true);
    setMessage(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        alert("Session expirée. Reconnecte-toi.");
        return;
      }
      const res = await fetch("/api/ai/description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          discipline: disciplineForAi,
          specialite: discipline.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { description?: string; error?: string };
      if (!res.ok) {
        setMessage(data.error || "Génération impossible.");
        return;
      }
      if (data.description) setBio(data.description.slice(0, 300));
    } catch (e) {
      console.error(e);
      setMessage("Erreur réseau.");
    } finally {
      setAiLoading(false);
    }
  }

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 41 }, (_, i) => y - i);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/onboarding");
  }, [loading, user, router]);

  // If role=teacher in URL, ensure profile.role is teacher (client-side update)
  useEffect(() => {
    if (!user?.id) return;
    if (roleParam !== "teacher") return;
    if (profile?.role === "teacher") return;
    const supabase = getSupabaseClient();
    void supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);
  }, [user?.id, roleParam, profile?.role]);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    setName((profile?.name as string) || (user.user_metadata?.full_name as string) || "");
    setPhotoUrl((profile?.photo_url as string) || (user.user_metadata?.avatar_url as string) || "");
  }, [user, profile?.name, profile?.photo_url]);

  // Determine if already onboarded (simple heuristic)
  useEffect(() => {
    if (!user?.id) return;
    if (force) return;
    if (profile?.role !== "teacher") return;

    let cancelled = false;
    const supabase = getSupabaseClient();
    void (async () => {
      const { data: profRow } = await supabase
        .from("profiles")
        .select("teacher_onboarding_complete")
        .eq("id", user.id)
        .single();

      if (cancelled) return;
      if ((profRow as { teacher_onboarding_complete?: boolean } | null)?.teacher_onboarding_complete) {
        router.push("/dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.role, user?.id, force, router]);

  useEffect(() => {
    if (stripeStatus === "success") setMessage("Stripe configuré. Tes virements sont prêts.");
    if (stripeStatus === "refresh") setMessage("Reprends la configuration Stripe pour finaliser tes virements.");
  }, [stripeStatus]);

  const toggleAvail = (d: string, s: string) => {
    const key = `${d} ${s}`;
    setAvailability((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const connectStripe = async () => {
    if (!user) return;
    setStripeBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expirée.");
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error || "Impossible de créer le lien Stripe.");
      window.location.assign(j.url);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur Stripe");
    } finally {
      setStripeBusy(false);
    }
  };

  const saveAll = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expirée.");

      const payload = {
        role: "teacher",
        name,
        photo_url: photoUrl || null,
        bio,
        teaching_since: teachingSince,
        categories,
        discipline,
        teaching_mode: teachingMode,
        hourly_rate: hourlyRate,
        levels,
        availability,
        city,
        home_lesson_enabled: homeEnabled,
        home_lesson_radius_km: homeRadius,
        home_lesson_price: homePrice,
      };

      console.log("[onboarding] POST /api/onboarding/complete", payload);
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; role?: string; error?: string };
      console.log("[onboarding] response", { status: res.status, ok: res.ok, body: j });
      if (!res.ok || !j.ok) throw new Error(j.error || "Enregistrement impossible.");
      setStep("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-[var(--p-text-muted)]">
        <Loader2 className="h-9 w-9 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  if ((profile?.role as string) !== "teacher") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-[var(--p-text-muted)]">
          Cette page est réservée aux professeurs.
        </p>
        <Link href="/become-teacher" className="mt-4 text-sm font-semibold text-[#1D9E75] hover:underline">
          Devenir professeur →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header className="bg-white border-b border-[var(--p-border-light)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#1D9E75] hover:underline">
            ← Accueil
          </Link>
          <p className="text-sm font-bold text-[#2C2C2A]">Onboarding professeur</p>
          <Link href="/dashboard" className="text-sm font-semibold text-[#1D9E75] hover:underline">
            Tableau de bord
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-8">
        <div className="rounded-3xl border border-[var(--p-border-light)] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">Progression</p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--p-text)]">
                {step === "done" ? "Ton profil est prêt !" : step === 1 ? "Parle-nous de toi" : step === 2 ? "Ton enseignement" : "Tes disponibilités"}
              </h1>
              {stripeStatus ? (
                <p className="mt-2 text-sm text-[var(--p-text-muted)]">Stripe : {stripeStatus}</p>
              ) : (
                <p className="mt-2 text-sm text-[var(--p-text-muted)]">
                  Complète ton profil pour apparaître dans la recherche et recevoir tes paiements.
                </p>
              )}
            </div>
            {step !== "done" ? (
              <span className="text-xs font-bold text-[#1D9E75]">
                Étape {step}/3
              </span>
            ) : (
              <span className="text-xs font-bold text-[#1D9E75] inline-flex items-center gap-1">
                <CheckCircle2 size={16} /> Terminé
              </span>
            )}
          </div>

          <div className="mt-5 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-[#1D9E75] rounded-full transition-all"
              style={{ width: step === "done" ? "100%" : step === 1 ? "33%" : step === 2 ? "66%" : "92%" }}
            />
          </div>

          {message ? (
            <p className={cn("mt-4 text-sm", message.includes("impossible") || message.includes("Erreur") ? "text-rose-600" : "text-[#0f6d52]")}>
              {message}
            </p>
          ) : null}

          {step === 1 ? (
            <div className="mt-8 space-y-5">
              <Field label="Nom affiché">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Ton nom"
                />
              </Field>

              <Field label="Photo de profil (optionnel)">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div className="flex items-center gap-3">
                    <img
                      src={photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Pratiqo")}`}
                      alt=""
                      className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--p-text)]">Aperçu</p>
                      <p className="text-[11px] text-[var(--p-text-muted)]">Tu peux coller une URL d’image</p>
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="flex-1 w-full">
                    <input
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="https://…"
                    />
                  </div>
                </div>
              </Field>

              <Field label="Bio (max 300 caractères)">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  className="w-full min-h-[110px] rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Ton approche, ton expérience…"
                />
                <p className="mt-1 text-[11px] text-[var(--p-text-muted)]">{bio.length}/300</p>
                {profile?.role === "teacher" ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => void generateDescription()}
                      disabled={aiLoading || !canGenerateAiBio}
                      style={{
                        background: aiLoading ? "#9FE1CB" : "#E1F5EE",
                        color: "#085041",
                        border: "none",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "12px",
                        cursor: canGenerateAiBio ? "pointer" : "not-allowed",
                        opacity: canGenerateAiBio ? 1 : 0.5,
                      }}
                    >
                      {aiLoading ? "⏳ Génération..." : "✨ Générer avec l'IA"}
                    </button>
                    <p style={{ fontSize: "11px", color: "#888780", marginTop: "4px" }}>
                      Disponible une fois pendant la création de ton profil — indique d’abord tes disciplines (étape 2), puis reviens ici si besoin.
                    </p>
                  </div>
                ) : null}
              </Field>

              <Field label="Depuis quelle année enseignes-tu ?">
                <select
                  value={teachingSince ?? ""}
                  onChange={(e) => setTeachingSince(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">—</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-8 space-y-6">
              <Field label="Disciplines (multi-sélection)">
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((c) => {
                    const active = categories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setCategories((prev) => (active ? prev.filter((x) => x !== c) : [...prev, c]))
                        }
                        className={cn(
                          "px-4 py-2 rounded-full border text-xs font-semibold transition-colors",
                          active
                            ? "border-[#1D9E75] bg-[rgba(29,158,117,0.12)] text-[#0f6d52]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Sous-discipline (ex: Piano classique)">
                <input
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Ex: Piano classique"
                />
              </Field>

              <Field label="Modes d’enseignement">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "person", label: "En personne" },
                    { id: "online", label: "En ligne" },
                    { id: "both", label: "Les deux" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTeachingMode(m.id as Mode)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-xs font-semibold transition-colors",
                        teachingMode === m.id
                          ? "border-[#1D9E75] bg-[rgba(29,158,117,0.12)] text-[#0f6d52]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Tarif horaire ($)">
                <input
                  type="number"
                  min={10}
                  max={500}
                  step={1}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </Field>

              <Field label="Niveaux enseignés (multi-sélection)">
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((lvl) => {
                    const active = levels.includes(lvl);
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevels((prev) => (active ? prev.filter((x) => x !== lvl) : [...prev, lvl]))}
                        className={cn(
                          "px-4 py-2 rounded-full border text-xs font-semibold transition-colors",
                          active
                            ? "border-[#1D9E75] bg-[rgba(29,158,117,0.12)] text-[#0f6d52]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-8 space-y-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">Grille hebdo</p>
                <p className="mt-1 text-sm text-[var(--p-text-muted)]">Clique pour activer tes plages (Matin / Après-midi / Soir).</p>
                <div className="mt-4 overflow-x-auto">
                  <div className="min-w-[560px] grid grid-cols-[120px_repeat(7,1fr)] gap-2">
                    <div />
                    {DAYS.map((d) => (
                      <div key={d} className="text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center">
                        {d}
                      </div>
                    ))}
                    {SLOTS.map((s) => (
                      <React.Fragment key={s}>
                        <div className="text-sm font-semibold text-slate-700">{s}</div>
                        {DAYS.map((d) => {
                          const key = `${d} ${s}`;
                          const on = availability.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleAvail(d, s)}
                              className={cn(
                                "h-11 rounded-xl border transition-colors",
                                on
                                  ? "border-[#1D9E75] bg-[rgba(29,158,117,0.12)]"
                                  : "border-slate-200 bg-white hover:border-slate-300",
                              )}
                              aria-pressed={on}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <Field label="Ville / localisation">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="ex: Montréal"
                />
              </Field>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm font-semibold text-[var(--p-text)]">Cours à domicile</span>
                  <input
                    type="checkbox"
                    checked={homeEnabled}
                    onChange={(e) => setHomeEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-[#1D9E75] focus:ring-[#1D9E75]"
                  />
                </label>
                {homeEnabled ? (
                  <>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">
                        Rayon: {homeRadius} km
                      </p>
                      <input
                        type="range"
                        min={5}
                        max={50}
                        value={homeRadius}
                        onChange={(e) => setHomeRadius(Number(e.target.value))}
                        className="w-full accent-[#1D9E75]"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">
                        Tarif à domicile ($ / heure, optionnel)
                      </p>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={homePrice ?? ""}
                        onChange={(e) => setHomePrice(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        placeholder="ex: 65"
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[var(--p-text)]">Stripe Connect</p>
                    <p className="mt-1 text-sm text-[var(--p-text-muted)]">
                      Configure tes virements pour recevoir tes paiements.
                    </p>
                  </div>
                  <ShieldCheck size={20} className="text-[#1D9E75]" />
                </div>
                <button
                  type="button"
                  onClick={() => void connectStripe()}
                  disabled={stripeBusy}
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#1D9E75]/30 bg-[rgba(29,158,117,0.10)] px-5 text-sm font-bold text-[#0f6d52] hover:bg-[rgba(29,158,117,0.14)] disabled:opacity-60"
                >
                  <Upload size={18} />
                  {stripeBusy ? "Ouverture…" : "Configurer Stripe"}
                </button>
              </div>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="mt-8 rounded-2xl border border-[rgba(29,158,117,0.22)] bg-[rgba(29,158,117,0.08)] p-6">
              <p className="text-lg font-bold text-[#0f6d52]">Ton profil est prêt!</p>
              <p className="mt-2 text-sm text-[var(--p-text-muted)]">
                Tu peux maintenant apparaître dans la recherche et accepter des réservations.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/teacher/profile/${user.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#1D9E75] px-5 text-sm font-bold text-white hover:brightness-[0.98]"
                >
                  Voir mon profil
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[var(--p-text)] hover:border-[#1D9E75]/40 hover:text-[#1D9E75]"
                >
                  Aller au tableau de bord
                </Link>
              </div>
            </div>
          ) : null}

          {/* Footer buttons */}
          {step !== "done" ? (
            <div className="mt-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((prev) => (prev === 1 ? 1 : prev === 2 ? 1 : 2))}
                disabled={step === 1}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--p-text)] disabled:opacity-40"
              >
                <ChevronLeft size={18} /> Retour
              </button>
              {step === 3 ? (
                <button
                  type="button"
                  onClick={() => void saveAll()}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#1D9E75] px-5 text-sm font-bold text-white hover:brightness-[0.98] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 size={18} />}
                  Terminer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev === 1 ? 2 : 3))}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#1D9E75] px-5 text-sm font-bold text-white hover:brightness-[0.98]"
                >
                  Suivant <ChevronRight size={18} />
                </button>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">Chargement…</div>}>
      <OnboardingInner />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

