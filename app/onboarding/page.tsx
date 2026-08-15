"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, Upload } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../components/AuthProvider";
import { getSupabaseClient } from "../../lib/supabase";
import { getDisciplineLabel, getEnabledDisciplines, MAX_TEACHER_DISCIPLINES } from "../../lib/disciplines";
import { useLocale } from "../../lib/locale-context";
import { TeacherHourlyRatePreview } from "../../components/teacher/TeacherHourlyRatePreview";
import { validateMinimumLessonPriceDollars } from "@/lib/pricing/validateMinimumLessonPrice";

type Step = 1 | 2 | 3 | 4 | "done";
type Mode = "person" | "online" | "both";

const MAX_DISCIPLINES = MAX_TEACHER_DISCIPLINES;

type SelectedDiscipline = {
  id: string;
  label: string;
  emoji: string;
  specialite: string;
};

const LEVELS = ["Débutants", "Enfants", "Intermédiaires", "Avancés", "Tous"] as const;

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const SLOTS = ["Matin", "Après-midi", "Soir"] as const;

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, profile } = useAuth();
  const { t, locale } = useLocale();
  const roleParam = searchParams.get("role");
  const stripeStatus = searchParams.get("stripe");
  const force = searchParams.get("force") === "true";

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roleSelectionKeyRef = useRef<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [bio, setBio] = useState("");
  const [teachingSince, setTeachingSince] = useState<number | null>(null);

  const [selectedDisciplines, setSelectedDisciplines] = useState<SelectedDiscipline[]>([]);
  const [disciplineQuery, setDisciplineQuery] = useState("");
  const [teachingMode, setTeachingMode] = useState<Mode>("both");
  const [hourlyRate, setHourlyRate] = useState<number>(50);
  const [levels, setLevels] = useState<string[]>([]);

  // Step 3
  const [availability, setAvailability] = useState<string[]>([]);

  // Step 4 — tax acknowledgment
  const [taxAck1, setTaxAck1] = useState(false);
  const [taxAck2, setTaxAck2] = useState(false);
  const [taxAck3, setTaxAck3] = useState(false);
  const allTaxAcknowledged = taxAck1 && taxAck2 && taxAck3;
  const [city, setCity] = useState("");
  const [homeEnabled, setHomeEnabled] = useState(false);
  const [homeRadius, setHomeRadius] = useState(25);
  const [homePrice, setHomePrice] = useState<number | null>(null);

  const disciplineForAi =
    selectedDisciplines.length > 0
      ? selectedDisciplines.map((s) => `${s.label}: ${s.specialite.trim() || "…"}`).join(" · ")
      : "";
  const canGenerateAiBio = Boolean(disciplineForAi);

  async function generateDescription() {
    if (!disciplineForAi) {
      alert("Choisis au moins une discipline à l’étape 1.");
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
          specialite: selectedDisciplines[0]?.specialite.trim() || undefined,
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

  async function handlePhotoUpload(file: File) {
    if (!user?.id) return;
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("L’image est trop volumineuse (max 5 Mo).");
      return;
    }
    if (!file.type.startsWith("image/")) return;

    let blobPreview: string | null = null;
    try {
      setPhotoUploading(true);
      setMessage(null);
      blobPreview = URL.createObjectURL(file);
      setPhotoUrl(blobPreview);

      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "photo";
      const path = `${user.id}/${Date.now()}-${safe}`;
      const supabase = getSupabaseClient();
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      if (blobPreview) {
        URL.revokeObjectURL(blobPreview);
        blobPreview = null;
      }
      setPhotoUrl(pub.publicUrl);
    } catch (e) {
      console.error(e);
      if (blobPreview) URL.revokeObjectURL(blobPreview);
      const fallback =
        (typeof profile?.photo_url === "string" && profile.photo_url) ||
        (typeof user?.user_metadata?.avatar_url === "string" && (user.user_metadata.avatar_url as string)) ||
        "";
      setPhotoUrl(fallback);
      setMessage("Envoi de la photo impossible. Vérifie le bucket Storage « avatars » (public) dans Supabase.");
    } finally {
      setPhotoUploading(false);
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

  // If role=teacher in URL, ensure profile.role is teacher through a narrow server route.
  useEffect(() => {
    if (!user?.id) return;
    if (roleParam !== "teacher") return;
    if (profile?.role === "teacher") return;
    if (profile?.role === "admin") return;
    const key = `${user.id}:teacher`;
    if (roleSelectionKeyRef.current === key) return;
    roleSelectionKeyRef.current = key;
    void (async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Session expirée.");

        const res = await fetch("/api/onboarding/select-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: "teacher" }),
        });
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          roleSelectionKeyRef.current = null;
          setMessage(payload.error || t("anErrorOccurred"));
        }
      } catch (e) {
        roleSelectionKeyRef.current = null;
        setMessage(e instanceof Error ? e.message : t("anErrorOccurred"));
      }
    })();
  }, [user?.id, roleParam, profile?.role, t]);

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
    if (!validateMinimumLessonPriceDollars(hourlyRate).ok) {
      setMessage(`${t("pricingMinLessonPrice")} ${t("pricingMinLessonPriceSuggestion")}`);
      return;
    }
    // Same root-cause fix as the modern wizard (`/onboarding/teacher`):
    // a teacher who enables "Cours à domicile" but leaves the optional
    // home-rate field blank previously triggered the 20 $ blocker on
    // the server side because the row was persisted with
    // home_lesson_enabled=true / home_lesson_price=null. Default the
    // home rate to the standard hourly rate when missing so the row is
    // coherent end-to-end (validator AND checkout charger).
    const effectiveHomePrice =
      homeEnabled
        ? homePrice != null
          ? homePrice
          : hourlyRate
        : null;
    if (
      homeEnabled &&
      effectiveHomePrice != null &&
      !validateMinimumLessonPriceDollars(effectiveHomePrice).ok
    ) {
      setMessage(`${t("pricingMinLessonPrice")} ${t("pricingMinLessonPriceSuggestion")}`);
      return;
    }
    setSaving(true);
    setMessage(null);
    console.log("[onboarding] Submitting onboarding...");
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expirée. Reconnecte-toi.");

      const payload = {
        role: "teacher",
        name,
        photo_url: photoUrl || null,
        bio,
        teaching_since: teachingSince,
        categories: selectedDisciplines.map((s) => s.label),
        discipline: selectedDisciplines[0]?.specialite.trim() || "",
        disciplines: selectedDisciplines.map((s) => ({
          discipline_id: s.id,
          specialite: s.specialite.trim(),
        })),
        teaching_mode: teachingMode,
        hourly_rate: hourlyRate,
        levels,
        availability,
        city,
        home_lesson_enabled: homeEnabled,
        home_lesson_radius_km: homeRadius,
        home_lesson_price: effectiveHomePrice,
        tax_status_acknowledged: taxAck1,
        no_exclusivity_acknowledged: taxAck2,
        no_income_guarantee_acknowledged: taxAck3,
      };

      console.log("[onboarding] Payload ready, calling /api/onboarding/complete");
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("[onboarding] Raw response:", res.status, text);

      let j: { ok?: boolean; role?: string; error?: string } = {};
      try { j = JSON.parse(text) as typeof j; } catch { /* non-JSON body */ }

      if (!res.ok || !j.ok) {
        throw new Error(j.error || `Erreur ${res.status}`);
      }

      console.log("[onboarding] Onboarding complete, redirecting to /dashboard...");
      setStep("done");
      router.push("/dashboard");
    } catch (e) {
      console.error("[onboarding] Error:", e);
      setMessage(e instanceof Error ? e.message : "Erreur inattendue. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-[var(--p-text-muted)]">
        <Loader2 className="h-9 w-9 animate-spin text-teal-700" />
      </div>
    );
  }

  if ((profile?.role as string) !== "teacher") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-[var(--p-text-muted)]">
          Cette page est réservée aux professeurs.
        </p>
        <Link href="/become-teacher" className="mt-4 text-sm font-semibold text-teal-700 hover:underline">
          Devenir professeur →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header className="bg-white border-b border-[var(--p-border-light)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-teal-700 hover:underline">
            ← Accueil
          </Link>
          <p className="text-sm font-bold text-[#2C2C2A]">Onboarding professeur</p>
          <Link href="/dashboard" className="text-sm font-semibold text-teal-700 hover:underline">
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
                {step === "done"
                  ? "Ton profil est prêt !"
                  : step === 1
                    ? "Parle-nous de toi"
                    : step === 2
                      ? "Ton enseignement"
                      : step === 3
                        ? "Tes disponibilités"
                        : "Statut de travailleur autonome"}
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
              <span className="text-xs font-bold text-teal-700">
                Étape {step}/4
              </span>
            ) : (
              <span className="text-xs font-bold text-teal-700 inline-flex items-center gap-1">
                <CheckCircle2 size={16} /> Terminé
              </span>
            )}
          </div>

          <div className="mt-5 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-teal-600 rounded-full transition-all"
              style={{ width: step === "done" ? "100%" : step === 1 ? "25%" : step === 2 ? "50%" : step === 3 ? "75%" : "92%" }}
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

              <Field label={t("whatDoYouTeach")}>
                <p className="text-sm text-slate-600 mb-1">{t("selectUpToFiveDisciplines")}</p>
                <p className="text-xs text-slate-500 mb-2">{t("disciplineSearchExamples")}</p>
                <p className="text-xs font-semibold text-[#0f6d52] mb-2">
                  {selectedDisciplines.length}/{MAX_DISCIPLINES} {t("maxDisciplines").toLowerCase()}
                </p>
                <input
                  value={disciplineQuery}
                  onChange={(e) => setDisciplineQuery(e.target.value)}
                  placeholder={t("disciplineSearchExamples")}
                  className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-100 p-2">
                  {getEnabledDisciplines()
                    .filter((d) => {
                      const q = disciplineQuery
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase()
                        .trim();
                      if (!q) return true;
                      const hay = `${d.label} ${d.labelEn} ${d.labelEs} ${d.id}`
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();
                      return hay.includes(q);
                    })
                    .map((d) => {
                    const active = selectedDisciplines.some((x) => x.id === d.id);
                    const atMax = selectedDisciplines.length >= MAX_DISCIPLINES;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!active && atMax}
                        onClick={() =>
                          setSelectedDisciplines((prev) => {
                            const exists = prev.find((x) => x.id === d.id);
                            if (exists) return prev.filter((x) => x.id !== d.id);
                            if (prev.length >= MAX_DISCIPLINES) return prev;
                            return [...prev, { id: d.id, label: d.label, emoji: d.emoji, specialite: "" }];
                          })
                        }
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                          active
                            ? "border-teal-500 bg-teal-500/15 text-[#0f6d52]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          !active && atMax ? "opacity-45 cursor-not-allowed" : "",
                        )}
                      >
                        <span aria-hidden>{d.emoji}</span>
                        <span>{getDisciplineLabel(d, locale)}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedDisciplines.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {selectedDisciplines.map((s) => (
                      <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <p className="text-xs font-bold text-slate-700 mb-1.5">
                          {s.emoji} {getDisciplineLabel(s.id, locale) || s.label}
                        </p>
                        <input
                          value={s.specialite}
                          onChange={(e) =>
                            setSelectedDisciplines((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, specialite: e.target.value } : x)),
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                          placeholder={t("disciplineApproachExample")}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-xs italic text-[#6B6A65]">Tu peux modifier tes disciplines dans Paramètres.</p>
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
                <TeacherHourlyRatePreview
                  hourlyRate={hourlyRate}
                  defaultDurationMinutes={null}
                  currency="CAD"
                />
              </Field>

              <Field label="Photo de profil (optionnel)">
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) void handlePhotoUpload(file);
                  }}
                  onClick={() => !photoUploading && fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? "var(--palette-teal-500)" : "#D3D1C7"}`,
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                    cursor: photoUploading ? "wait" : "pointer",
                    background: isDragging ? "#E8F5F3" : "#F4F4F3",
                    transition: "all 0.2s",
                    opacity: photoUploading ? 0.75 : 1,
                    position: "relative",
                  }}
                >
                  {photoUploading ? (
                    <div className="flex flex-col items-center gap-2 py-1">
                      <Loader2 className="animate-spin text-teal-700" size={28} />
                      <p style={{ fontSize: "12px", color: "var(--palette-teal-800)", margin: 0 }}>Envoi en cours…</p>
                    </div>
                  ) : photoUrl ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
                      <img
                        src={photoUrl}
                        alt=""
                        style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
                        referrerPolicy="no-referrer"
                      />
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 4px" }}>Photo ajoutée ✓</p>
                        <p style={{ fontSize: "11px", color: "#6B6A65", margin: 0 }}>Clique ou glisse pour changer</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#2C2C2A", margin: "0 0 4px" }}>
                        Glisse ta photo ici
                      </p>
                      <p style={{ fontSize: "11px", color: "#6B6A65", margin: 0 }}>
                        ou clique pour choisir · JPG, PNG · Max 5MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePhotoUpload(file);
                    e.target.value = "";
                  }}
                />
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
                        background: aiLoading ? "var(--palette-teal-200)" : "#E8F5F3",
                        color: "var(--palette-teal-800)",
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
                    <p style={{ fontSize: "11px", color: "#6B6A65", marginTop: "4px" }}>
                      Disponible une fois pendant la création de ton profil — choisis tes disciplines ci-dessus, puis reviens ici si besoin.
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
                          ? "border-teal-500 bg-teal-500/15 text-[#0f6d52]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
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
                            ? "border-teal-500 bg-teal-500/15 text-[#0f6d52]"
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
                                  ? "border-teal-500 bg-teal-500/15"
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
                    className="h-5 w-5 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
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
                        className="w-full accent-teal-500"
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
                  <ShieldCheck size={20} className="text-teal-700" />
                </div>
                <button
                  type="button"
                  onClick={() => void connectStripe()}
                  disabled={stripeBusy}
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-teal-500/30 bg-teal-500/10 px-5 text-sm font-bold text-teal-700 hover:bg-teal-500/15 disabled:opacity-60"
                >
                  <Upload size={18} />
                  {stripeBusy ? "Ouverture…" : "Configurer Stripe"}
                </button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-8 space-y-5">
              <p className="text-sm text-[var(--p-text-muted)]">
                Avant de continuer, il est important que tu comprennes ton statut sur Pratiqo.
              </p>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-4">
                {[
                  {
                    state: taxAck1,
                    setter: setTaxAck1,
                    text: "Je confirme être un TRAVAILLEUR AUTONOME et non un employé de Pratiqo. Pratiqo agit uniquement comme intermédiaire technologique entre les professeurs et les élèves.",
                  },
                  {
                    state: taxAck2,
                    setter: setTaxAck2,
                    text: "Je suis SEUL RESPONSABLE de déclarer mes revenus et de respecter mes obligations fiscales (TPS, TVQ, impôts personnels) auprès de Revenu Québec et de l'Agence du Revenu du Canada.",
                  },
                  {
                    state: taxAck3,
                    setter: setTaxAck3,
                    text: "Je comprends qu'AUCUN REVENU n'est garanti par Pratiqo et que mes gains dépendent uniquement de mon activité personnelle, de la qualité de mon profil et de la demande dans ma région.",
                  },
                ].map(({ state, setter, text }, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={state}
                      onChange={(e) => setter(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-500 accent-teal-500"
                    />
                    <span
                      className={cn(
                        "text-sm leading-relaxed transition-colors",
                        state ? "text-[#0f6d52] font-medium" : "text-[var(--p-text)]",
                      )}
                    >
                      {text}
                    </span>
                  </label>
                ))}
              </div>

              <p className="text-xs text-[var(--p-text-muted)] leading-relaxed border-t border-slate-200 pt-4">
                {t("loginConsentNote")}{" "}
                <a href="/legal/cgu" target="_blank" className="text-teal-700 underline font-medium">
                  {t("footerTerms")}
                </a>{" "}
                ou contacte{" "}
                <a href="mailto:support@pratiqo.ca" className="text-teal-700 underline font-medium">
                  support@pratiqo.ca
                </a>
              </p>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="mt-8 rounded-2xl border border-teal-500/25 bg-teal-500/10 p-6">
              <p className="text-lg font-bold text-[#0f6d52]">Ton profil est prêt!</p>
              <p className="mt-2 text-sm text-[var(--p-text-muted)]">
                Tu peux maintenant apparaître dans la recherche et accepter des réservations.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/teacher/profile/${user.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white hover:brightness-[0.98]"
                >
                  Voir mon profil
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[var(--p-text)] hover:border-teal-500/40 hover:text-teal-700"
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
                onClick={() =>
                  setStep((prev) =>
                    prev === 1 ? 1 : prev === 2 ? 1 : prev === 3 ? 2 : 3,
                  )
                }
                disabled={step === 1}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--p-text)] disabled:opacity-40"
              >
                <ChevronLeft size={18} /> Retour
              </button>
              {step === 4 ? (
                <button
                  type="button"
                  onClick={() => void saveAll()}
                  disabled={saving || !allTaxAcknowledged}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white hover:brightness-[0.98] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 size={18} />}
                  Terminer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && selectedDisciplines.length === 0) {
                      alert("Choisis au moins une discipline.");
                      return;
                    }
                    setStep((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 4));
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white hover:brightness-[0.98]"
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

