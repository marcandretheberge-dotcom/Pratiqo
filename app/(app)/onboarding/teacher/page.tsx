"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, MapPin, Rocket, ShieldCheck, SkipForward } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { getTeacherOnboardingMissingFields, isTeacherProfileComplete } from "@/lib/teacherOnboarding";
import { parseGooglePlace } from "@/lib/googleAddressParser";
import { blurCoordinates } from "@/lib/maps";
import { TeacherHourlyRatePreview } from "@/components/teacher/TeacherHourlyRatePreview";
import { ProfileAiAssistant } from "@/components/teacher/ProfileAiAssistant";
import { MarketWaitlistCard } from "@/components/MarketWaitlistCard";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";
import { validateTeacherLessonOffers } from "@/lib/pricing/lessonOffer";
import {
  DEFAULT_LESSON_DURATION_MINUTES,
  LESSON_DURATION_OPTIONS,
  formatLessonDurationLabel,
  normalizeLessonDurationMinutes,
} from "@/lib/pricing/lessonDuration";
import { isTeacherMarketSupported } from "@/lib/config/markets";

/**
 * Teacher Launch Center
 * --------------------
 * Single canonical onboarding flow for new teachers. Mounted at /onboarding/teacher.
 * The auth callback and dashboard both redirect here when a teacher hasn't
 * completed onboarding yet (see lib/auth/admin.ts and app/(app)/dashboard/page.tsx).
 *
 * UX shape:
 * - First visit shows a friendly "Let's get started" hero (`started === false`).
 *   After the teacher clicks it, the wizard appears at step 1.
 * - Return visits with a saved draft show a "Continue where you left off" CTA
 *   instead of starting the user from scratch.
 * - Each step can be skipped; we surface a calm consequence message
 *   (visibility, payments, identity, etc.) instead of blocking progress.
 * - Drafts are persisted to localStorage so the teacher's typing survives
 *   reloads. The real DB write still happens only on final save.
 */

const LAUNCH_TOTAL_STEPS = 4;
const LAUNCH_DRAFT_STORAGE_PREFIX = "pratiqo-teacher-launch-draft:";
const LAUNCH_STARTED_STORAGE_PREFIX = "pratiqo-teacher-launch-started:";

type StepId = 1 | 2 | 3 | 4;
type Category = "music" | "languages" | "academic" | "other";
type TeachingMode = "online" | "in_person" | "at_home" | "hybrid";
type JsonRecord = Record<string, unknown>;
type ExistingTeacherRow = { id?: string; image_url?: string | null; location?: unknown } | null;

const LEVELS = ["beginner", "intermediate", "advanced", "kids", "teens", "adults"] as const;
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const PERIODS = [
  { id: "Matin", label: "08:00–12:00" },
  { id: "Après-midi", label: "12:00–17:00" },
  { id: "Soir", label: "17:00–21:00" },
] as const;

function dbCategoryFromWizard(c: Category): string {
  if (c === "languages") return "Langues";
  if (c === "academic") return "Scolaire";
  // DB enum is legacy; safest fallback is Musique.
  return "Musique";
}

function encodeTeachingMode(mode: TeachingMode): string {
  if (mode === "online") return "online";
  if (mode === "in_person") return "person";
  if (mode === "at_home") return "home";
  return "all";
}

function initialTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function initialGoogleReady(): boolean {
  return typeof window !== "undefined" && Boolean(window.google?.maps?.places);
}

export default function TeacherOnboardingPage() {
  const { user, loading, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Launch Center hero: hidden once the teacher has explicitly clicked "Let's get started"
  // on this device (persisted) OR once they already have a saved draft / partial profile.
  const [started, setStarted] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const draftRestoredRef = useRef(false);
  const [aiBioNotes, setAiBioNotes] = useState("");
  const [aiBioOpen, setAiBioOpen] = useState(false);

  // Step 1
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<Category>("music");
  const [discipline, setDiscipline] = useState("");
  const [levels, setLevels] = useState<(typeof LEVELS)[number][]>([]);
  const [bio, setBio] = useState("");

  // Step 2
  const [teachingMode, setTeachingMode] = useState<TeachingMode>("hybrid");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [countryCode, setCountryCode] = useState("CA");
  const [timezone, setTimezone] = useState<string>(() => initialTimezone());
  const [currency, setCurrency] = useState("CAD");

  const [googleReady, setGoogleReady] = useState(() => initialGoogleReady());
  const [googleError, setGoogleError] = useState(() => !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [addressValue, setAddressValue] = useState("");
  const [parsedPlace, setParsedPlace] = useState<ReturnType<typeof parseGooglePlace> | null>(null);

  // Step 3
  const [pricePerLesson, setPricePerLesson] = useState<string>("");
  const [homeRadiusKm, setHomeRadiusKm] = useState<string>("25");
  const [availability, setAvailability] = useState<string[]>([]);
  const [defaultLessonDurationMinutes, setDefaultLessonDurationMinutes] = useState<number>(
    DEFAULT_LESSON_DURATION_MINUTES,
  );
  const [teacherPlan, setTeacherPlan] = useState<string | null>(null);
  const [loyaltyTier, setLoyaltyTier] = useState<string | null>(null);
  const [annualVolumeCents, setAnnualVolumeCents] = useState(0);

  // Step 4
  const [taxStatusAck, setTaxStatusAck] = useState(false);
  const [noExclusivityAck, setNoExclusivityAck] = useState(false);
  const [noIncomeGuaranteeAck, setNoIncomeGuaranteeAck] = useState(false);
  const legalComplete = taxStatusAck && noExclusivityAck && noIncomeGuaranteeAck;

  const progressLabel = useMemo(() => `${step}/4`, [step]);

  const missingPreview = useMemo(() => {
    const teacherLike = {
      name: displayName,
      discipline,
      category: dbCategoryFromWizard(category),
      city,
      region,
      country_code: countryCode,
      timezone,
      teaching_mode: encodeTeachingMode(teachingMode),
      price_per_lesson: Number(pricePerLesson),
      availability,
    };
    return getTeacherOnboardingMissingFields(teacherLike);
  }, [displayName, discipline, category, city, region, countryCode, timezone, teachingMode, pricePerLesson, availability]);

  // Initial defaults / guard
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/onboarding/teacher")}`);
      return;
    }
    if (profile?.role === "student") {
      router.replace("/dashboard");
    }
  }, [loading, user, profile?.role, router]);

  // If teacher already complete, bounce back to dashboard.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    void (async () => {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("plan, loyalty_tier, loyalty_annual_volume")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        const row = profileRow as {
          plan?: string | null;
          loyalty_tier?: string | null;
          loyalty_annual_volume?: number | string | null;
        } | null;
        setTeacherPlan(row?.plan ?? null);
        setLoyaltyTier(row?.loyalty_tier ?? null);
        setAnnualVolumeCents(Math.round(Math.max(0, Number(row?.loyalty_annual_volume ?? 0)) * 100));
      }

      const { data: trow } = await supabase
        .from("teachers")
        .select("name, discipline, category, city, region, country_code, timezone, teaching_mode, price_per_lesson, availability")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (isTeacherProfileComplete(trow ?? null)) {
        router.replace("/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, router]);

  // Google Places Autocomplete (optional)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      return;
    }
    if (typeof window !== "undefined" && window.google?.maps?.places) return;
    let cancelled = false;
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.onload = () => {
      if (cancelled) return;
      if (window.google?.maps?.places) setGoogleReady(true);
      else setGoogleError(true);
    };
    script.onerror = () => {
      if (!cancelled) setGoogleError(true);
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!googleReady) return;
    const el = addressInputRef.current;
    if (!el) return;
    if (!("google" in window)) return;
    const ac = new google.maps.places.Autocomplete(el, {
      fields: ["address_components", "formatted_address", "geometry"],
      types: ["address"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const parsed = parseGooglePlace(place);
      setParsedPlace(parsed);
      if (parsed.formattedAddress) setAddressValue(parsed.formattedAddress);
      if (parsed.city) setCity(parsed.city);
      if (parsed.region) setRegion(parsed.region);
      if (parsed.countryCode) setCountryCode(parsed.countryCode);
    });
    return () => {
      // Autocomplete has no official dispose; just detach ref by unmounting.
    };
  }, [googleReady]);

  const toggleLevel = (lvl: (typeof LEVELS)[number]) => {
    setLevels((prev) => (prev.includes(lvl) ? prev.filter((x) => x !== lvl) : [...prev, lvl]));
  };

  const toggleAvail = (day: (typeof DAYS)[number], period: (typeof PERIODS)[number]["id"]) => {
    const key = `${day} ${period}`;
    setAvailability((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return displayName.trim().length > 1 && discipline.trim().length > 1;
    }
    if (step === 2) {
      return city.trim().length > 1 && region.trim().length > 1 && countryCode.trim().length === 2 && timezone.trim().length > 2;
    }
    const priceOk = Number(pricePerLesson) > 0;
    if (step === 3) return priceOk && availability.length > 0;
    return priceOk && availability.length > 0 && legalComplete;
  }, [step, displayName, discipline, city, region, countryCode, timezone, pricePerLesson, availability.length, legalComplete]);

  const goNext = () => {
    if (!canGoNext) return;
    setError(null);
    setStep((s) => (s === 4 ? 4 : ((s + 1) as StepId)));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => (s === 1 ? 1 : ((s - 1) as StepId)));
  };

  /**
   * Skip the current step without losing the wizard. We deliberately do NOT
   * advance past the legal step — `tax_status` / `no_exclusivity` / `no_income`
   * acknowledgements are legally meaningful, so the final save still requires
   * them. Earlier steps can be skipped: the consequence copy is shown on the
   * step itself before the teacher clicks "Skip for now".
   */
  const skipStep = () => {
    if (step >= 4) return;
    setError(null);
    setStep((s) => ((s + 1) as StepId));
  };

  // ── Save / resume via localStorage ────────────────────────────────────────
  // We persist the wizard draft per-user on this device so a refresh, accidental
  // tab close, or "save and finish later" never costs the teacher their typing.
  // The DB write only happens at final save (POST /api/teacher/onboarding/complete).
  const draftKey = user?.id ? `${LAUNCH_DRAFT_STORAGE_PREFIX}${user.id}` : null;
  const startedKey = user?.id ? `${LAUNCH_STARTED_STORAGE_PREFIX}${user.id}` : null;

  // Restore once per user.
  useEffect(() => {
    if (!draftKey || !startedKey) return;
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (typeof d.displayName === "string") setDisplayName(d.displayName);
        if (typeof d.category === "string") setCategory(d.category as Category);
        if (typeof d.discipline === "string") setDiscipline(d.discipline);
        if (Array.isArray(d.levels)) setLevels(d.levels as (typeof LEVELS)[number][]);
        if (typeof d.bio === "string") setBio(d.bio);
        if (typeof d.teachingMode === "string") setTeachingMode(d.teachingMode as TeachingMode);
        if (typeof d.city === "string") setCity(d.city);
        if (typeof d.region === "string") setRegion(d.region);
        if (typeof d.countryCode === "string") setCountryCode(d.countryCode);
        if (typeof d.timezone === "string") setTimezone(d.timezone);
        if (typeof d.currency === "string") setCurrency(d.currency);
        if (typeof d.pricePerLesson === "string") setPricePerLesson(d.pricePerLesson);
        if (typeof d.homeRadiusKm === "string") setHomeRadiusKm(d.homeRadiusKm);
        if (Array.isArray(d.availability)) setAvailability(d.availability as string[]);
        if (typeof d.defaultLessonDurationMinutes === "number") {
          setDefaultLessonDurationMinutes(normalizeLessonDurationMinutes(d.defaultLessonDurationMinutes));
        }
        if (typeof d.addressValue === "string") setAddressValue(d.addressValue);
        if (typeof d.step === "number" && d.step >= 1 && d.step <= 4) setStep(d.step as StepId);
        if (typeof d.aiBioNotes === "string") setAiBioNotes(d.aiBioNotes);
        setHasSavedDraft(true);
      }
      const wasStarted = localStorage.getItem(startedKey) === "1";
      // If they already started OR have a draft, skip the hero so they don't
      // feel like Pratiqo lost their work.
      if (wasStarted || raw) setStarted(true);
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [draftKey, startedKey]);

  // Persist draft on relevant changes (cheap enough to do on every render).
  useEffect(() => {
    if (!draftKey || !draftRestoredRef.current) return;
    try {
      const draft = {
        displayName,
        category,
        discipline,
        levels,
        bio,
        teachingMode,
        city,
        region,
        countryCode,
        timezone,
        currency,
        pricePerLesson,
        homeRadiusKm,
        availability,
        defaultLessonDurationMinutes,
        addressValue,
        step,
        aiBioNotes,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [
    draftKey,
    displayName,
    category,
    discipline,
    levels,
    bio,
    teachingMode,
    city,
    region,
    countryCode,
    timezone,
    currency,
    pricePerLesson,
    homeRadiusKm,
    availability,
    defaultLessonDurationMinutes,
    addressValue,
    step,
    aiBioNotes,
  ]);

  const launchStarted = useCallback(() => {
    setStarted(true);
    if (startedKey) {
      try {
        localStorage.setItem(startedKey, "1");
      } catch {
        /* ignore */
      }
    }
  }, [startedKey]);

  const saveAndExit = useCallback(() => {
    // Draft is already in localStorage; just leave the wizard. The dashboard
    // will bounce them back here on next login because onboarding isn't complete.
    router.replace("/dashboard");
  }, [router]);

  const skipConsequenceKey = useMemo(() => {
    if (step === 1) return "teacherLaunchSkipProfile";
    if (step === 2) return "teacherLaunchSkipLocation";
    if (step === 3) return "teacherLaunchSkipPricing";
    // Step 4 cannot be skipped — legal acknowledgements are required by design.
    return null;
  }, [step]);

  const save = async () => {
    if (!user?.id) return;
    if (!legalComplete) {
      setError(t("teacherOnboardingLegalRequired"));
      return;
    }
    const hourlyNum = Number(pricePerLesson);
    const homeOn = teachingMode === "at_home" || teachingMode === "hybrid";
    const offerCheck = validateTeacherLessonOffers({
      price_per_lesson: hourlyNum,
      home_lesson_enabled: homeOn,
      intro_session_enabled: false,
    });
    if (!offerCheck.ok) {
      setError(`${t("pricingMinLessonPrice")} ${t("pricingMinLessonPriceSuggestion")}`);
      return;
    }
    const missingFields = getTeacherOnboardingMissingFields({
      name: displayName,
      discipline,
      category: dbCategoryFromWizard(category),
      city,
      region,
      country_code: countryCode,
      timezone,
      teaching_mode: encodeTeachingMode(teachingMode),
      price_per_lesson: hourlyNum,
      availability,
    });
    if (missingFields.length > 0) {
      setError(`${t("teacherOnboardingMissingFields")} ${missingFields.join(", ")}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();

      const { data: existing } = await supabase
        .from("teachers")
        .select("id, image_url, location")
        .eq("user_id", user.id)
        .maybeSingle();
      const existingTeacher = existing as ExistingTeacherRow;

      const teacherId = existingTeacher?.id ?? user.id;

      const nextLocation: JsonRecord = {
        ...(isRecord(existingTeacher?.location) ? existingTeacher.location : {}),
      };

      // Public fields used by search/cards must remain non-exact.
      const privateBlock: Record<string, unknown> = {};
      if (parsedPlace?.formattedAddress) privateBlock.formatted_address = parsedPlace.formattedAddress;
      if (parsedPlace?.streetNumber) privateBlock.street_number = parsedPlace.streetNumber;
      if (parsedPlace?.route) privateBlock.route = parsedPlace.route;
      if (parsedPlace?.postalCode) privateBlock.postal_code = parsedPlace.postalCode;
      if (parsedPlace?.latitude != null) privateBlock.latitude = parsedPlace.latitude;
      if (parsedPlace?.longitude != null) privateBlock.longitude = parsedPlace.longitude;

      const publicCity = city.trim();
      const publicRegion = region.trim();
      const publicCountry = countryCode.trim().toUpperCase();
      if (!isTeacherMarketSupported(publicCountry)) {
        setError(t("marketTeacherUnavailableMessage"));
        return;
      }

      // Backwards compatibility: keep flat keys used by existing UI.
      nextLocation.neighborhood = publicCity;
      const publicLocation: JsonRecord = {
        city: publicCity,
        region: publicRegion,
        country_code: publicCountry,
      };
      nextLocation.public = publicLocation;

      // Use fuzzed coords for public lat/lng only.
      if (parsedPlace?.latitude != null && parsedPlace?.longitude != null) {
        const fuzzed = blurCoordinates(parsedPlace.latitude, parsedPlace.longitude);
        nextLocation.lat = fuzzed.lat;
        nextLocation.lng = fuzzed.lng;
        publicLocation.lat = fuzzed.lat;
        publicLocation.lng = fuzzed.lng;
      }

      if (Object.keys(privateBlock).length > 0) {
        nextLocation.private = {
          ...(isRecord(nextLocation.private) ? nextLocation.private : {}),
          ...privateBlock,
        };
      }

      const updates: Record<string, unknown> = {};
      const nameTrim = displayName.trim();
      if (nameTrim) updates.name = nameTrim;
      updates.category = dbCategoryFromWizard(category);
      const discTrim = discipline.trim();
      if (discTrim) updates.discipline = discTrim;
      const bioTrim = bio.trim();
      if (bioTrim) updates.bio = bioTrim;
      if (levels.length > 0) updates.levels = levels;

      updates.teaching_mode = encodeTeachingMode(teachingMode);
      updates.city = publicCity || null;
      updates.region = publicRegion || null;
      updates.country_code = publicCountry || null;
      updates.timezone = timezone.trim() || null;
      updates.currency = currency.trim() || null;

      updates.price_per_lesson = Number(pricePerLesson) || 0;
      updates.availability = availability;
      updates.default_lesson_duration_minutes = normalizeLessonDurationMinutes(defaultLessonDurationMinutes);
      updates.location = nextLocation;

      // Home lessons fields (optional columns exist in types).
      updates.home_lesson_enabled = homeOn;
      if (homeOn) {
        const r = Number(homeRadiusKm);
        if (Number.isFinite(r) && r > 0) updates.home_lesson_radius_km = r;
      }

      // Insert if missing (must satisfy not-null constraints).
      if (!existingTeacher?.id) {
        const payload = {
          id: teacherId,
          user_id: user.id,
          rating: 0,
          reviews: 0,
          monthly_subscription: null,
          is_verified: false,
          languages: [],
          price_per_lesson: hourlyNum,
          image_url:
            existingTeacher?.image_url ??
            (typeof profile?.photo_url === "string" && profile.photo_url ? profile.photo_url : "https://picsum.photos/seed/teacher/400/400"),
          ...updates,
        };
        const { error: insErr } = await supabase.from("teachers").insert(payload);
        if (insErr) throw insErr;
      } else {
        const { error: upErr } = await supabase.from("teachers").update(updates).eq("id", teacherId);
        if (upErr) throw upErr;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error(t("anErrorOccurred"));
      }
      const pricingRes = await fetch("/api/teacher/pricing", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ price_per_lesson: hourlyNum }),
      });
      const pricingPayload = (await pricingRes.json().catch(() => ({}))) as { error?: string };
      if (!pricingRes.ok) {
        throw new Error(pricingPayload.error || t("anErrorOccurred"));
      }

      const completeRes = await fetch("/api/teacher/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tax_status_acknowledged: true,
          no_exclusivity_acknowledged: true,
          no_income_guarantee_acknowledged: true,
        }),
      });
      const completePayload = (await completeRes.json().catch(() => ({}))) as { error?: string };
      if (!completeRes.ok) {
        throw new Error(completePayload.error || t("anErrorOccurred"));
      }

      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pb-12">
      <div className="pt-8 sm:pt-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700/80">
          {t("teacherLaunchHeroEyebrow")}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[var(--p-text)]">
          {started ? t("teacherOnboardingTitle") : t("teacherLaunchHeroTitle")}
        </h1>
        <p className="mt-2 text-sm text-[var(--p-text-muted)] max-w-2xl">
          {started ? t("teacherOnboardingSubtitle") : t("teacherLaunchHeroSubtitle")}
        </p>
      </div>

      {!started ? (
        // ── Launch Center hero ──────────────────────────────────────────────
        // One big friendly entry point. No bureaucratic checklist visible yet.
        <div
          className="mt-6 rounded-3xl bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-10 text-center"
          data-testid="teacher-launch-hero"
        >
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/15 text-teal-700">
            <Rocket size={26} aria-hidden />
          </div>
          <h2 className="mt-5 text-xl sm:text-2xl font-bold text-[var(--p-text)]">
            {t("teacherLaunchHeroTitle")}
          </h2>
          <p className="mt-3 text-sm text-[var(--p-text-muted)] max-w-xl mx-auto">
            {t("teacherLaunchHeroBody")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={launchStarted}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-700 shadow-sm"
              data-testid="teacher-launch-start-cta"
            >
              <Rocket size={16} />
              {hasSavedDraft ? t("teacherLaunchResumeCta") : t("teacherLaunchStartCta")}
            </button>
          </div>
          {hasSavedDraft ? (
            <p className="mt-4 text-[11px] text-[var(--p-text-subtle)]">
              {t("teacherLaunchSavedDraft")}
            </p>
          ) : null}
        </div>
      ) : (
      <div className="mt-6 rounded-3xl bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_12px_40px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 sm:px-8 py-4 border-b border-[rgba(0,0,0,0.06)] bg-[#F3FAF6]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
              <ShieldCheck size={18} />
              <span>
                {t(
                  step === 1
                    ? "teacherLaunchStepProfileTitle"
                    : step === 2
                      ? "teacherLaunchStepLocationTitle"
                      : step === 3
                        ? "teacherLaunchStepPricingTitle"
                        : "teacherOnboardingStepLegal",
                )}
              </span>
            </div>
            <span className="text-xs text-[var(--p-text-muted)]">
              {t("teacherLaunchProgressLabel")
                .replace("{step}", String(step))
                .replace("{total}", String(LAUNCH_TOTAL_STEPS))}
            </span>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingName")}
                    </span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                      placeholder="Ex. Marie Dupont"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingCategory")}
                    </span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm bg-white"
                    >
                      <option value="music">Musique</option>
                      <option value="languages">Langues</option>
                      <option value="academic">Scolaire</option>
                      <option value="other">Autre</option>
                    </select>
                  </label>
                </div>
                {!isTeacherMarketSupported(countryCode) ? (
                  <MarketWaitlistCard
                    defaultEmail={user?.email}
                    defaultCountryCode={countryCode}
                    defaultRole="teacher"
                  />
                ) : null}

                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                    {t("teacherOnboardingDiscipline")}
                  </span>
                  <input
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                    placeholder="Ex. Piano, Anglais, Mathématiques…"
                  />
                </label>

                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                    {t("teacherOnboardingLevels")}
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {LEVELS.map((lvl) => {
                      const on = levels.includes(lvl);
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => toggleLevel(lvl)}
                          className={cn(
                            "h-10 px-4 rounded-full border text-sm font-semibold transition-colors",
                            on
                              ? "border-teal-500 bg-teal-500/15 text-teal-700"
                              : "border-[var(--p-border-light)] bg-white text-[var(--p-text-muted)] hover:text-[var(--p-text)]",
                          )}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                    {t("teacherOnboardingBio")}
                  </span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-[var(--p-border-light)] px-4 py-3 text-sm"
                    placeholder="Quelques lignes sur votre approche, votre expérience, et votre style d’enseignement…"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setAiBioOpen((v) => !v)}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                      data-testid="teacher-launch-ai-toggle"
                    >
                      {aiBioOpen ? "▾ " : "✨ "}
                      {t("aiAssistantHeadline")}
                    </button>
                  </div>
                  {aiBioOpen ? (
                    <div className="mt-2">
                      <ProfileAiAssistant
                        discipline={discipline || category}
                        specialty={discipline}
                        notes={aiBioNotes}
                        onNotesChange={setAiBioNotes}
                        onAccept={(next) => {
                          setBio(next);
                          setAiBioOpen(false);
                        }}
                        compact
                      />
                    </div>
                  ) : null}
                </label>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                    {t("teacherOnboardingTeachingMode")}
                  </span>
                  <select
                    value={teachingMode}
                    onChange={(e) => setTeachingMode(e.target.value as TeachingMode)}
                    className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm bg-white"
                  >
                    <option value="online">En ligne</option>
                    <option value="in_person">En personne</option>
                    <option value="at_home">À domicile</option>
                    <option value="hybrid">Hybride</option>
                  </select>
                </label>

                <div className="rounded-2xl border border-teal-500/25 bg-teal-500/10 px-4 py-3 text-sm text-teal-700 flex gap-2">
                  <MapPin className="mt-0.5" size={16} />
                  <p>{t("teacherOnboardingPrivacyNote")}</p>
                </div>

                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                    {t("teacherOnboardingManualLocation")}
                  </span>
                  <div className="mt-2">
                    <input
                      ref={addressInputRef}
                      value={addressValue}
                      onChange={(e) => setAddressValue(e.target.value)}
                      className="w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                      placeholder="Adresse (optionnel)"
                      disabled={!googleReady && !googleError}
                    />
                    {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || googleError ? (
                      <p className="mt-2 text-xs text-[var(--p-text-muted)]">{t("teacherOnboardingGoogleUnavailable")}</p>
                    ) : null}
                  </div>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingCity")}
                    </span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                      placeholder="Ex. Montréal"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingRegion")}
                    </span>
                    <input
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                      placeholder="Ex. Québec"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingCountry")}
                    </span>
                    <input
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                      placeholder="CA"
                    />
                    {!isTeacherMarketSupported(countryCode) ? (
                      <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                        {t("marketTeacherUnavailableMessage")}
                      </p>
                    ) : null}
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingTimezone")}
                    </span>
                    <input
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                      placeholder="America/Toronto"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                    {t("teacherOnboardingCurrency")}
                  </span>
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                    placeholder="CAD"
                  />
                </label>
              </motion.div>
            ) : null}

            {step === 3 ? (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingPrice")}
                    </span>
                    <input
                      value={pricePerLesson}
                      onChange={(e) => setPricePerLesson(e.target.value)}
                      type="number"
                      min={MIN_LESSON_PRICE_DOLLARS}
                      step="0.5"
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                      placeholder="50"
                    />
                    <p className="mt-2 text-xs leading-relaxed text-[var(--p-text-subtle)]">{t("profileBaseRateHelper")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--p-text-subtle)]">{t("pricingMinLessonPrice")}</p>
                    <TeacherHourlyRatePreview
                      hourlyRate={pricePerLesson}
                      defaultDurationMinutes={null}
                      teacherPlan={teacherPlan}
                      annualVolumeCents={annualVolumeCents}
                      loyaltyTier={loyaltyTier}
                      currency={currency}
                    />
                  </label>

                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      {t("teacherOnboardingAvailability")}
                    </span>
                    <p className="mt-3 text-xs text-[var(--p-text-muted)]">
                      Sélectionnez vos plages hebdomadaires (vous pourrez affiner plus tard).
                    </p>
                  </label>
                </div>

                {(teachingMode === "at_home" || teachingMode === "hybrid") ? (
                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                      Rayon (km) — à domicile
                    </span>
                    <input
                      value={homeRadiusKm}
                      onChange={(e) => setHomeRadiusKm(e.target.value)}
                      type="number"
                      min={1}
                      step="1"
                      className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm"
                    />
                  </label>
                ) : null}

                <label className="block max-w-sm">
                  <span className="block text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
                    {t("lessonDurationLabel")}
                  </span>
                  <select
                    value={defaultLessonDurationMinutes}
                    onChange={(e) => setDefaultLessonDurationMinutes(Number(e.target.value))}
                    className="mt-2 w-full h-12 rounded-2xl border border-[var(--p-border-light)] px-4 text-sm font-semibold"
                    data-testid="teacher-onboarding-lesson-duration-select"
                  >
                    {LESSON_DURATION_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {formatLessonDurationLabel(minutes, t)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--p-text-subtle)]">
                    {t("lessonDurationDescription")}
                  </p>
                </label>

                <div className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-4 sm:p-5 overflow-x-auto">
                  <div className="min-w-[560px] grid grid-cols-[100px_repeat(3,1fr)] gap-2">
                    <div />
                    {PERIODS.map((p) => (
                      <div key={p.id} className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)] text-center">
                        {p.id}
                        <span className="block font-normal normal-case text-[10px]">{p.label}</span>
                      </div>
                    ))}
                    {DAYS.map((d) => (
                      <React.Fragment key={d}>
                        <div className="text-sm font-semibold text-[var(--p-text)]">{d}</div>
                        {PERIODS.map((p) => {
                          const key = `${d} ${p.id}`;
                          const on = availability.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleAvail(d, p.id)}
                              className={cn(
                                "h-11 rounded-xl border transition-colors",
                                on ? "border-teal-500 bg-teal-500/15" : "border-[var(--p-border-light)] bg-white hover:bg-[#F3FAF6]",
                              )}
                              aria-pressed={on}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}

            {step === 4 ? (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-lg font-bold text-[var(--p-text)]">{t("teacherOnboardingLegalTitle")}</h2>
                  <p className="mt-2 text-sm text-[var(--p-text-muted)]">{t("teacherOnboardingLegalSubtitle")}</p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 space-y-4">
                  {[
                    {
                      checked: taxStatusAck,
                      onChange: setTaxStatusAck,
                      label: t("teacherOnboardingLegalSelfEmployed"),
                    },
                    {
                      checked: noExclusivityAck,
                      onChange: setNoExclusivityAck,
                      label: t("teacherOnboardingLegalNoExclusivity"),
                    },
                    {
                      checked: noIncomeGuaranteeAck,
                      onChange: setNoIncomeGuaranteeAck,
                      label: t("teacherOnboardingLegalNoIncomeGuarantee"),
                    },
                  ].map((item) => (
                    <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.onChange(e.target.checked)}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-teal-500"
                      />
                      <span className={cn("text-sm leading-relaxed", item.checked ? "text-teal-700 font-medium" : "text-[var(--p-text)]")}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Skip-with-consequence — calm explanation, then "Skip for now". */}
        {skipConsequenceKey ? (
          <div className="mx-6 sm:mx-8 mb-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-[var(--p-text-muted)]">
            <p data-testid="teacher-launch-skip-consequence">{t(skipConsequenceKey)}</p>
          </div>
        ) : null}

        <div className="px-6 sm:px-8 py-5 border-t border-[rgba(0,0,0,0.06)] bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || saving}
              className="h-11 px-4 rounded-full border border-[var(--p-border-light)] text-sm font-semibold text-[var(--p-text)] disabled:opacity-40 inline-flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              {t("teacherOnboardingBack")}
            </button>
            <button
              type="button"
              onClick={saveAndExit}
              disabled={saving}
              className="h-11 px-4 rounded-full border border-[var(--p-border-light)] bg-white text-sm font-semibold text-[var(--p-text-muted)] disabled:opacity-40 hover:text-[var(--p-text)] inline-flex items-center gap-2"
              data-testid="teacher-launch-save-exit"
            >
              {t("teacherLaunchSaveAndExitCta")}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {step < 4 ? (
              <button
                type="button"
                onClick={skipStep}
                disabled={saving}
                className="h-11 px-4 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-2"
                data-testid="teacher-launch-skip-cta"
              >
                <SkipForward size={16} />
                {t("teacherLaunchSkipCta")}
              </button>
            ) : null}

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext || saving}
                className="h-11 px-5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-2 shadow-sm"
              >
                {t("teacherOnboardingNext")}
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void save()}
                disabled={!canGoNext || saving}
                className="h-11 px-5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-2 shadow-sm"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                {t("teacherOnboardingSave")}
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

