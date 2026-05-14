"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Home,
  Loader2,
  MapPin,
  Moon,
  ShieldCheck,
  Star,
  Sun,
  Sunrise,
  Users,
  Video,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "../lib/supabase";
import { haversineDistance } from "../lib/geo";
import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";
import { calculateIntroSessionPriceCents } from "@/lib/introSession";
import { formatLocalISODate, periodForSlot } from "../lib/slots";
import { localeToBcp47 } from "../lib/i18n/types";
import { useLocale } from "../lib/locale-context";
import { TeacherAvatar } from "./TeacherAvatar";
import {
  bookingWallTimeRangeToUtc,
  formatBookingTimeForBothZones,
  getBrowserTimeZone,
} from "@/lib/timezones";
import { getAcademicSystemConfig, getAcademicProgramHelperKey, getProgramTrackLabelKey } from "@/lib/academicSystems";
import type { TranslationKey } from "@/lib/translations";
import { isUuidString } from "@/lib/uuid";

export type BookingInitialLessonKind = "standard" | "home";

type StoredTeachingMode = "person" | "online" | "domicile";
type LessonType = "regular" | "intro";

type Step = "info" | "preferences" | "pickDate" | "pickSlot" | "confirm";
type LearnerContextType = "academic" | "language" | "music" | "general";
type SlotPeriodKey = "matin" | "apresmidi" | "soir";

type BookingLearnerProfile = {
  id: string;
  display_name: string;
  context_type: LearnerContextType | null;
  grade_level: string | null;
  academic_program: string | null;
  academic_program_label: string | null;
  academic_program_unsure: boolean | null;
  school_level: string | null;
  target_language: string | null;
  current_level: string | null;
  instrument: string | null;
  practice_frequency: string | null;
  exam_date: string | null;
  notes_for_teacher: string | null;
  learning_goals: string[] | null;
  subject_struggles: string[] | null;
  explanation_preference: string | null;
  is_default: boolean | null;
};

type BookingContextDraft = {
  context_type: LearnerContextType;
  grade_level: string;
  academic_program: string;
  subject_struggles: string;
  exam_date: string;
  target_language: string;
  current_level: string;
  instrument: string;
  practice_frequency: string;
  learning_goals: string;
  notes_for_teacher: string;
};

function defaultTeachingMode(teacher: Teacher, initial: BookingInitialLessonKind): StoredTeachingMode {
  if (initial === "home") return "domicile";
  if (teacher.teachingMode === "online") return "online";
  if (teacher.teachingMode === "person") return "person";
  return "person";
}

function SlotPeriodIcon({ period }: { period: SlotPeriodKey }) {
  if (period === "matin") return <Sunrise size={14} className="text-amber-500" />;
  if (period === "apresmidi") return <Sun size={14} className="text-teal-700" />;
  return <Moon size={14} className="text-indigo-500" />;
}

function suggestLearnerContextType(teacher: Teacher): LearnerContextType {
  const raw = [
    (teacher as { category?: string | null }).category,
    (teacher as { discipline?: string | null }).discipline,
    teacher.name,
  ].filter(Boolean).join(" ").toLowerCase();
  if (/(scolaire|school|tutor|tuteur|math|science|physique|chimie|devoir|examen|exam|academic|soutien)/.test(raw)) {
    return "academic";
  }
  if (/(langue|language|fran|english|anglais|spanish|espagnol|conversation|ielts|delf|tef)/.test(raw)) {
    return "language";
  }
  if (/(musique|music|piano|guitar|guitare|chant|voice|batterie|drum|violon|solf)/.test(raw)) {
    return "music";
  }
  return "general";
}

function csvToArray(value: string): string[] {
  return value.split(",").map((x) => x.trim()).filter(Boolean);
}

function programLabelFromValue(value: string, config: ReturnType<typeof getAcademicSystemConfig>, t: (key: TranslationKey) => string) {
  const key = getProgramTrackLabelKey(config, value);
  if (key) return t(key as TranslationKey);
  if (value === "ib") return "IB";
  return value || null;
}

function draftFromLearner(learner: BookingLearnerProfile | null, fallback: LearnerContextType): BookingContextDraft {
  return {
    context_type: learner?.context_type ?? fallback,
    grade_level: learner?.grade_level ?? "",
    academic_program: learner?.academic_program ?? "",
    subject_struggles: (learner?.subject_struggles ?? []).join(", "),
    exam_date: learner?.exam_date ?? "",
    target_language: learner?.target_language ?? "",
    current_level: learner?.current_level ?? "",
    instrument: learner?.instrument ?? "",
    practice_frequency: learner?.practice_frequency ?? "",
    learning_goals: (learner?.learning_goals ?? []).join(", "),
    notes_for_teacher: learner?.notes_for_teacher ?? "",
  };
}

interface BookingModalProps {
  teacher: Teacher;
  onClose: () => void;
  initialLessonKind?: BookingInitialLessonKind;
}

export function BookingModal({ teacher, onClose, initialLessonKind = "standard" }: BookingModalProps) {
  const { user, profile } = useAuth();
  const { locale, t, formatPrice } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);
  const academicConfig = useMemo(
    () => getAcademicSystemConfig({ countryCode: teacher.countryCode, regionCode: teacher.region, locale }),
    [teacher.countryCode, teacher.region, locale],
  );
  const [step, setStep] = useState<Step>("info");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [lessonType, setLessonType] = useState<LessonType>("regular");
  const [teachingMode, setTeachingMode] = useState<StoredTeachingMode>(() =>
    defaultTeachingMode(teacher, initialLessonKind),
  );
  const [studentAddress, setStudentAddress] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [applyCredits, setApplyCredits] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [learnerProfiles, setLearnerProfiles] = useState<BookingLearnerProfile[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>("");
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [learnerSaving, setLearnerSaving] = useState(false);
  const suggestedContextType = useMemo(() => suggestLearnerContextType(teacher), [teacher]);
  const [contextDraft, setContextDraft] = useState<BookingContextDraft>(() => draftFromLearner(null, suggestedContextType));
  const [contextDirty, setContextDirty] = useState(false);

  const [availableDays, setAvailableDays] = useState<Record<string, number>>({});
  const [slots, setSlots] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const teacherIdInvalid = useMemo(() => !isUuidString(teacher.id), [teacher.id]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && teacherIdInvalid) {
      console.warn("[BookingModal] teacher.id is not a valid UUID:", teacher.id);
    }
  }, [teacher.id, teacherIdInvalid]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const todayIso = useMemo(() => formatLocalISODate(new Date()), []);

  const distanceKm = useMemo(() => {
    if (!geo) return null;
    const lat = teacher.location?.lat;
    const lng = teacher.location?.lng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }
    return haversineDistance(geo.lat, geo.lng, lat, lng);
  }, [geo, teacher.location?.lat, teacher.location?.lng]);

  const introAvailable = teacher.introSessionEnabled === true;
  const introDurationMinutes =
    typeof teacher.introSessionDurationMinutes === "number" && Number.isFinite(teacher.introSessionDurationMinutes)
      ? Math.max(30, Math.round(teacher.introSessionDurationMinutes))
      : 45;
  const introDiscountPercent =
    typeof teacher.introSessionDiscountPercent === "number" && Number.isFinite(teacher.introSessionDiscountPercent)
      ? Math.max(0, Math.min(95, Math.round(teacher.introSessionDiscountPercent)))
      : 50;

  const lessonMinutes = useMemo(() => {
    if (lessonType === "intro") return introDurationMinutes;
    if (teachingMode !== "domicile") return 60;
    let h = (teacher.homeLessonMinDuration ?? 60) / 60;
    if (teacher.homeLessonForce2hOver20km && distanceKm !== null && distanceKm > 20) {
      h = Math.max(h, 2);
    }
    return Math.round(h * 60);
  }, [
    lessonType,
    introDurationMinutes,
    teachingMode,
    teacher.homeLessonMinDuration,
    teacher.homeLessonForce2hOver20km,
    distanceKm,
  ]);

  const lessonHours = lessonMinutes / 60;
  const hourlyRate = teachingMode === "domicile" ? Number(teacher.homeLessonPrice ?? 0) : teacher.pricePerLesson;
  const totalPrice = Math.round(lessonHours * hourlyRate * 100) / 100;

  const introPriceCents = useMemo(() => {
    if (!introAvailable) return null;
    return calculateIntroSessionPriceCents({
      hourlyPrice: teacher.pricePerLesson,
      durationMinutes: introDurationMinutes,
      discountPercent: introDiscountPercent,
      explicitPriceCents: teacher.introSessionPriceCents ?? null,
    });
  }, [introAvailable, teacher.introSessionPriceCents, teacher.pricePerLesson, introDurationMinutes, introDiscountPercent]);

  const basePrice = lessonType === "intro" && introPriceCents != null ? Math.round(introPriceCents) / 100 : totalPrice;
  // Future: show approximate converted price using FX service, but charge in the configured Stripe currency.
  const displayPrice = formatPrice(basePrice);
  const displayedHourlyPrice = formatPrice(hourlyRate);

  // Credits: can apply up to balance, but leave at least $0.50 for Stripe minimum
  const maxCreditsApplicable = Math.max(0, Math.floor(Math.min(creditBalance, basePrice - 0.5) * 100) / 100);
  const creditsDiscount = applyCredits ? maxCreditsApplicable : 0;
  const effectivePrice = Math.max(0.5, basePrice - creditsDiscount);
  const effectiveDisplayPrice = formatPrice(effectivePrice);

  const homeAvailable =
    Boolean(teacher.homeLessonEnabled) &&
    typeof teacher.homeLessonPrice === "number" &&
    Number(teacher.homeLessonPrice) > 0;

  // "all" comes from encodeTeachingMode when teacher has person + online + home selected
  const showStudio = ["person", "both", "all"].includes(teacher.teachingMode);
  const showOnline = ["online", "both", "all"].includes(teacher.teachingMode);
  const showHome = lessonType !== "intro";

  const areaLabel =
    teacher.location?.neighborhood ||
    [teacher.city, teacher.region].filter(Boolean).join(", ") ||
    (distanceKm !== null ? `${distanceKm.toFixed(1)} km` : t("bookingApproxArea"));

  const selectedFormatLabel =
    teachingMode === "online" ? t("bookingOnline") :
    teachingMode === "domicile" ? t("bookingHome") :
    t("bookingStudio");

  const selectedLearner = useMemo(
    () => learnerProfiles.find((learner) => learner.id === selectedLearnerId) ?? null,
    [learnerProfiles, selectedLearnerId],
  );

  const selectedLearnerSummary = useMemo(() => {
    if (!selectedLearner) return "";
    return [
      selectedLearner.display_name,
      contextDraft.context_type === "academic" ? contextDraft.grade_level : null,
      contextDraft.context_type === "academic"
        ? programLabelFromValue(contextDraft.academic_program, academicConfig, t) ?? selectedLearner.academic_program_label
        : null,
      contextDraft.context_type === "language" ? contextDraft.target_language || contextDraft.current_level : null,
      contextDraft.context_type === "music" ? contextDraft.instrument || contextDraft.current_level : null,
    ].filter(Boolean).join(" · ");
  }, [academicConfig, contextDraft, selectedLearner, t]);

  const currentStepNumber =
    step === "info" || step === "preferences" ? 1 :
    step === "pickDate" || step === "pickSlot" ? 2 :
    3;

  // Fall back to standard levels when teacher hasn't configured any
  const displayLevels =
    teacher.levels && teacher.levels.length > 0
      ? teacher.levels
      : [t("levelBeginner"), t("levelIntermediate"), t("levelAdvanced")];

  const loadAvailableDays = useCallback(async () => {
    setLoadingDays(true);
    setDaysError(null);
    try {
      const q = new URLSearchParams({ weeks: "4", duration: String(lessonMinutes) });
      const res = await fetch(`/api/teachers/${encodeURIComponent(teacher.id)}/available-days?${q.toString()}`);
      const body = (await res.json().catch(() => ({}))) as {
        days?: Record<string, number>;
        durationMinutes?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || t("bookingLoadDatesFail"));
      setAvailableDays(body.days ?? {});
      if (typeof body.durationMinutes === "number") setDurationMinutes(body.durationMinutes);
    } catch (e) {
      setDaysError(e instanceof Error ? e.message : "Erreur");
      setAvailableDays({});
    } finally {
      setLoadingDays(false);
    }
  }, [teacher.id, lessonMinutes, t]);

  const loadSlotsForDate = useCallback(
    async (dateIso: string) => {
      setLoadingSlots(true);
      setSlotsError(null);
      try {
        const q = new URLSearchParams({ date: dateIso, duration: String(lessonMinutes) });
        const res = await fetch(`/api/teachers/${encodeURIComponent(teacher.id)}/slots?${q.toString()}`);
        const body = (await res.json().catch(() => ({}))) as {
          slots?: string[];
          durationMinutes?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error || t("bookingLoadSlotsFail"));
        setSlots(body.slots ?? []);
        if (typeof body.durationMinutes === "number") setDurationMinutes(body.durationMinutes);
      } catch (e) {
        setSlotsError(e instanceof Error ? e.message : "Erreur");
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [teacher.id, lessonMinutes, t],
  );

  useEffect(() => {
    setLessonType("regular");
    setTeachingMode(defaultTeachingMode(teacher, initialLessonKind));
    setStudentAddress("");
    setStep("info");
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedLevel(null);
    setCheckoutError(null);
    setAvailableDays({});
    setSlots([]);
    setDaysError(null);
    setSlotsError(null);
    setGeo(null);
    setContextDraft(draftFromLearner(null, suggestedContextType));
    setContextDirty(false);
  }, [teacher.id, initialLessonKind, suggestedContextType]);

  useEffect(() => {
    setContextDraft(draftFromLearner(selectedLearner, suggestedContextType));
    setContextDirty(false);
  }, [selectedLearner, suggestedContextType]);

  useEffect(() => {
    if (!user?.id) {
      setLearnerProfiles([]);
      setSelectedLearnerId("");
      return;
    }
    let cancelled = false;
    const supabase = getSupabaseClient();
    setLoadingLearners(true);
    void supabase
      .from("learner_profiles")
      .select("id, display_name, context_type, school_level, grade_level, academic_program, academic_program_label, academic_program_unsure, target_language, current_level, instrument, practice_frequency, exam_date, learning_goals, subject_struggles, explanation_preference, notes_for_teacher, is_default")
      .eq("owner_user_id", user.id)
      .is("archived_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as BookingLearnerProfile[];
        setLearnerProfiles(rows);
        setSelectedLearnerId((current) => current || rows.find((r) => r.is_default)?.id || rows[0]?.id || "");
        setLoadingLearners(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const createSelfLearner = async () => {
    if (!user?.id) return;
    setLearnerSaving(true);
    setCheckoutError(null);
    try {
      const supabase = getSupabaseClient();
      const displayName =
        String((profile as { name?: string | null } | null)?.name || user.email || t("learnerRelationshipSelf")).trim();
      const makeDefault = learnerProfiles.length === 0;
      const { data, error } = await supabase
        .from("learner_profiles")
        .insert({
          owner_user_id: user.id,
          display_name: displayName,
          relationship: "self",
          context_type: suggestedContextType,
          school_level: "adult",
          is_default: makeDefault,
        })
        .select("id, display_name, context_type, school_level, grade_level, academic_program, academic_program_label, academic_program_unsure, target_language, current_level, instrument, practice_frequency, exam_date, learning_goals, subject_struggles, explanation_preference, notes_for_teacher, is_default")
        .single();
      if (error) throw error;
      const row = data as BookingLearnerProfile;
      setLearnerProfiles((prev) => [row, ...prev]);
      setSelectedLearnerId(row.id);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setLearnerSaving(false);
    }
  };

  const updateContextDraft = (patch: Partial<BookingContextDraft>) => {
    setContextDraft((current) => ({ ...current, ...patch }));
    setContextDirty(true);
  };

  const saveSelectedLearnerContext = async () => {
    if (!user?.id || !selectedLearnerId || !contextDirty) return;
    const payload = {
      context_type: contextDraft.context_type,
      grade_level: contextDraft.context_type === "academic" ? contextDraft.grade_level.trim() || null : null,
      academic_program: contextDraft.context_type === "academic" ? contextDraft.academic_program || null : null,
      academic_program_label:
        contextDraft.context_type === "academic" && contextDraft.academic_program
          ? programLabelFromValue(contextDraft.academic_program, academicConfig, t)
          : null,
      academic_program_unsure: contextDraft.context_type === "academic" && contextDraft.academic_program === "unsure",
      subject_struggles: contextDraft.context_type === "academic" ? csvToArray(contextDraft.subject_struggles) : [],
      exam_date: contextDraft.context_type === "academic" ? contextDraft.exam_date || null : null,
      target_language: contextDraft.context_type === "language" ? contextDraft.target_language.trim() || null : null,
      instrument: contextDraft.context_type === "music" ? contextDraft.instrument.trim() || null : null,
      current_level:
        contextDraft.context_type !== "academic" ? contextDraft.current_level.trim() || null : null,
      practice_frequency:
        contextDraft.context_type === "music" ? contextDraft.practice_frequency.trim() || null : null,
      learning_goals:
        contextDraft.context_type === "academic"
          ? Array.isArray(selectedLearner?.learning_goals)
            ? selectedLearner.learning_goals
            : []
          : csvToArray(contextDraft.learning_goals),
      notes_for_teacher: contextDraft.notes_for_teacher.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("learner_profiles")
      .update(payload)
      .eq("id", selectedLearnerId)
      .eq("owner_user_id", user.id)
      .select("id, display_name, context_type, school_level, grade_level, academic_program, academic_program_label, academic_program_unsure, target_language, current_level, instrument, practice_frequency, exam_date, learning_goals, subject_struggles, explanation_preference, notes_for_teacher, is_default")
      .single();
    if (error) throw error;
    const updated = data as BookingLearnerProfile;
    setLearnerProfiles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setContextDirty(false);
  };

  const requestBookingGeo = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    if (step === "pickDate") void loadAvailableDays();
  }, [step, loadAvailableDays]);

  useEffect(() => {
    if (step === "pickSlot" && selectedDate) void loadSlotsForDate(selectedDate);
  }, [step, selectedDate, loadSlotsForDate]);

  useEffect(() => {
    if (step !== "confirm" || !user) return;
    setLoadingCredits(true);
    setApplyCredits(false);
    const supabase = getSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      void fetch("/api/credits", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
        .then((r) => r.json())
        .then((d: { balance?: number }) => {
          setCreditBalance(Number(d?.balance ?? 0));
          setLoadingCredits(false);
        })
        .catch(() => setLoadingCredits(false));
    });
  }, [step, user]);

  const calendarCells = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const cells: { iso: string; label: string; count: number; disabled: boolean }[] = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = formatLocalISODate(d);
      const count = availableDays[iso] ?? 0;
      const disabled = iso <= todayIso || count === 0;
      const label = d.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });
      cells.push({ iso, label, count, disabled });
    }
    return cells;
  }, [availableDays, todayIso, dateLocale]);

  const slotsByPeriod = useMemo(() => {
    const groups: { key: SlotPeriodKey; label: string; items: string[] }[] = [
      { key: "matin", label: t("morning"), items: [] },
      { key: "apresmidi", label: t("afternoon"), items: [] },
      { key: "soir", label: t("evening"), items: [] },
    ];
    for (const s of slots) {
      const p = periodForSlot(s);
      const g = groups.find((x) => x.key === p);
      if (g) g.items.push(s);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [slots, t]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [selectedDate, dateLocale]);

  const selectedTimeLabels = useMemo(() => {
    if (!selectedDate || !selectedSlot) return null;
    const range = bookingWallTimeRangeToUtc({
      dateIso: selectedDate,
      slot: selectedSlot,
      durationMinutes,
      timeZone: teacher.timezone,
    });
    if (!range) return null;
    return formatBookingTimeForBothZones({
      startIso: range.start,
      endIso: range.end,
      userTimeZone: browserTimeZone,
      teacherTimeZone: teacher.timezone,
      locale: dateLocale,
    });
  }, [browserTimeZone, dateLocale, durationMinutes, selectedDate, selectedSlot, teacher.timezone]);

  const handleConfirmAndPay = async () => {
    if (!user) {
      const next =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/student/search";
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!selectedDate || !selectedSlot) {
      setCheckoutError(t("bookingSelectDateTimeError"));
      return;
    }

    const modeForDb: "person" | "online" | "domicile" =
      teachingMode === "domicile" ? "domicile" : teachingMode;
    const addressTrim = studentAddress.trim();

    if (modeForDb === "domicile") {
      if (!homeAvailable) {
        setCheckoutError(t("bookingHomeUnavailable"));
        return;
      }
      if (!addressTrim) {
        setCheckoutError(t("bookingAddressRequired"));
        return;
      }
    }

    if (!isUuidString(teacher.id)) {
      setCheckoutError(t("bookingInvalidTeacherId"));
      return;
    }
    const learnerTrim = selectedLearnerId.trim();
    if (learnerTrim !== "" && !isUuidString(learnerTrim)) {
      setCheckoutError(t("bookingInvalidLearnerProfileId"));
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    let redirecting = false;
    try {
      if (!isBookingAtLeast24hAhead({ slot_date: selectedDate, time_slot: selectedSlot })) {
        setCheckoutError(t("bookingMinimumNoticeError"));
        return;
      }

      const supabase = getSupabaseClient();
      await saveSelectedLearnerContext();

      if (lessonType === "intro") {
        const base = supabase
          .from("bookings")
          .select("id", { head: true, count: "exact" })
          .eq("teacher_id", teacher.id)
          .eq("lesson_type", "intro");
        const { count, error: checkErr } = learnerTrim
          ? await base.eq("learner_profile_id", learnerTrim)
          : await base.eq("student_id", user.id);
        if (checkErr) throw checkErr;
        if ((count ?? 0) > 0) {
          setCheckoutError(t("introSessionAlreadyUsed"));
          return;
        }
      }
      const bookingData = {
        teacher_id: teacher.id,
        student_id: user.id,
        date: selectedDate,
        time: selectedSlot,
        slot_date: selectedDate,
        time_slot: selectedSlot,
        student_level: selectedLevel,
        teaching_mode: modeForDb,
        status: "pending_payment",
        lesson_type: lessonType,
        price: basePrice,
        duration_minutes: lessonMinutes,
        student_address: modeForDb === "domicile" ? addressTrim : null,
        learner_profile_id: learnerTrim === "" ? null : learnerTrim,
      };

      const { data: inserted, error: insErr } = await supabase.from("bookings").insert(bookingData).select("id").single();
      if (insErr) {
        if ((insErr as { code?: string }).code === "23505") {
          setCheckoutError(t("slotBooked"));
          return;
        }
        throw insErr;
      }
      const bookingId = inserted?.id as string;
      if (!bookingId) throw new Error("Missing booking id after insert.");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error(t("bookingSessionExpired"));
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          teacher_id: teacher.id,
          amount: basePrice,
          lesson_type: lessonType,
          booking_details: { booking_id: bookingId },
          teaching_mode: modeForDb,
          student_address: modeForDb === "domicile" ? addressTrim : "",
          learner_profile_id: learnerTrim === "" ? undefined : learnerTrim,
          credits_to_apply: creditsDiscount > 0 ? creditsDiscount : undefined,
        }),
      });

      const raw = await res.text();
      let payload: { url?: string; error?: string; stripeCode?: string | null; stripeType?: string };
      try {
        payload = raw ? (JSON.parse(raw) as typeof payload) : {};
      } catch {
        payload = { error: raw || `Erreur HTTP ${res.status}` };
      }

      if (res.status === 409) {
        setCheckoutError(payload.error || t("slotBooked"));
        return;
      }

      if (!res.ok) {
        const parts = [
          payload.error || t("bookingStripeFail"),
          payload.stripeCode ? `(${payload.stripeCode})` : null,
        ].filter(Boolean);
        throw new Error(parts.join(" "));
      }

      const url = payload.url;
      if (!url) throw new Error(t("bookingMissingCheckoutUrl"));

      redirecting = true;
      window.location.assign(url);
    } catch (error) {
      console.error("Booking / checkout error", error);
      const msg = error instanceof Error ? error.message : t("bookingUnknownError");
      setCheckoutError(msg);
    } finally {
      if (!redirecting) setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--palette-teal-700)" }}>
                {t("bookingTitle")}
              </p>
              <h3 id="booking-modal-title" className="text-xl font-bold text-slate-900">{teacher.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{t("bookingModalSubtitle")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("accessibilityCloseDialog")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold" aria-label={t("bookingProgressLabel")}>
            {[t("bookingStepDetails"), t("bookingStepSlot"), t("bookingStepPayment")].map((label, idx) => {
              const isCurrent = idx + 1 === currentStepNumber;
              const active = idx + 1 <= currentStepNumber;
              return (
                <div
                  key={label}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "rounded-2xl border px-2 py-2 text-center transition-colors",
                    active ? "border-teal-100 bg-teal-50 text-teal-700" : "border-slate-100 bg-slate-50 text-slate-400",
                    isCurrent && "shadow-sm ring-1 ring-teal-500/20",
                  )}
                >
                  <span className="mb-1 block h-1 rounded-full bg-current opacity-40" />
                  {idx + 1}. {label}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start gap-3">
              <TeacherAvatar
                name={teacher.name}
                category={teacher.category}
                imageUrl={teacher.imageUrl}
                size={52}
                ringClassName="border-2 border-white shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">{teacher.name}</p>
                    <p className="text-xs text-slate-600">{teacher.discipline}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                      <Star size={12} fill="currentColor" className="text-amber-400" />
                      {teacher.rating} · {teacher.reviews} {t("bookingReviewsShort")}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-700 shadow-sm">
                    {displayPrice}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                    {teachingMode === "online" ? <Video size={12} /> : teachingMode === "domicile" ? <Home size={12} /> : <Users size={12} />}
                    {selectedFormatLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                    <MapPin size={12} />
                    {areaLabel}
                  </span>
                </div>
                <p className="mt-3 text-[11px] font-semibold text-teal-700">
                  {t("bookingNoHiddenFees").replace("{price}", displayPrice)}
                </p>
              </div>
            </div>
          </div>

          {step === "info" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {teacher.bio || t("bookingTeacherSummaryFallback")}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { icon: <Users size={15} />, title: t("bookingNextStepDetails"), body: t("bookingNextStepDetailsBody") },
                  { icon: <Calendar size={15} />, title: t("bookingNextStepSlot"), body: t("bookingNextStepSlotBody") },
                  { icon: <CreditCard size={15} />, title: t("bookingNextStepPay"), body: t("bookingNextStepPayBody") },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                      {item.icon}
                    </div>
                    <p className="text-xs font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] px-4 py-3 text-xs text-slate-700 flex gap-2">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-teal-700" />
                <span>{t("bookingSecurePaymentNote")}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep("preferences")}
                className="w-full ds-btn-primary h-12 rounded-2xl text-sm font-semibold"
              >
                {t("bookingContinue")} <ChevronRight className="inline ml-1" size={16} />
              </button>
            </div>
          )}

          {step === "preferences" && (
            <div className="space-y-4">
              {introAvailable ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">{t("chooseLessonType")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLessonType("intro");
                        // V1: keep intro simple; avoid 45-min home lessons when teacher enforces 60+.
                        if (teachingMode === "domicile") setTeachingMode("person");
                      }}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-all",
                        lessonType === "intro"
                          ? "border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-teal-200",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{t("introLesson")}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-teal-700 shadow-sm">
                          {introPriceCents != null ? formatPrice(introPriceCents / 100) : displayPrice}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                        {t("bookingIntroLessonCardBody").replace("{n}", String(introDurationMinutes))}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonType("regular")}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-all",
                        lessonType === "regular"
                          ? "border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-teal-200",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{t("regularLesson")}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-800 shadow-sm">
                          {formatPrice(teacher.pricePerLesson)}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600">{t("bookingRegularLessonCardBody")}</span>
                    </button>
                  </div>
                  {lessonType === "intro" ? (
                    <p className="text-xs font-semibold text-slate-600">{t("introSessionOnePerTeacher")}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{t("bookingYourLevel")}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t("optionalBadge")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {displayLevels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border",
                      selectedLevel === lvl ? "text-white border-transparent" : "border-slate-200 text-slate-600",
                    )}
                    style={
                      selectedLevel === lvl
                        ? { backgroundColor: "var(--palette-teal-700)", borderColor: "var(--palette-teal-700)" }
                        : undefined
                    }
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="space-y-2 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t("bookingSelectLearner")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("bookingLearnerContextHint")}</p>
                  </div>
                  <Link href="/student/learners" className="shrink-0 text-xs font-bold text-teal-700 hover:underline">
                    {t("bookingCreateLearnerProfile")}
                  </Link>
                </div>
                {loadingLearners ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                    {t("loading")}
                  </div>
                ) : learnerProfiles.length > 0 ? (
                  <select
                    value={selectedLearnerId}
                    onChange={(e) => setSelectedLearnerId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 text-sm outline-none focus:border-teal-500"
                  >
                    <option value="">{t("bookingLearnerOptionalSelf")}</option>
                    {learnerProfiles.map((learner) => (
                      <option key={learner.id} value={learner.id}>
                        {learner.display_name}
                        {learner.context_type === "academic" && learner.grade_level ? ` · ${learner.grade_level}` : ""}
                        {learner.context_type === "music" && learner.instrument ? ` · ${learner.instrument}` : ""}
                        {learner.context_type === "language" && learner.target_language ? ` · ${learner.target_language}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={learnerSaving}
                      onClick={() => void createSelfLearner()}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-teal-700 disabled:opacity-60"
                    >
                      {learnerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t("bookingCreateSelfLearner")}
                    </button>
                    <Link
                      href="/student/learners"
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[#DCEAE3] bg-white px-3 text-xs font-bold text-slate-700"
                    >
                      {t("bookingCreateLearnerProfile")}
                    </Link>
                  </div>
                )}
              </div>

              {selectedLearner ? (
                <LearnerBookingContextPanel
                  draft={contextDraft}
                  academicConfig={academicConfig}
                  onChange={updateContextDraft}
                />
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">{t("bookingLocationTitle")}</p>
                <div className="flex flex-wrap gap-2">
                  {showStudio ? (
                    <button
                      type="button"
                      onClick={() => setTeachingMode("person")}
                      className={cn(
                        "flex-1 min-w-[100px] py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5",
                        teachingMode === "person"
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200",
                      )}
                    >
                      <Users size={14} /> {t("bookingStudio")}
                    </button>
                  ) : null}
                  {showOnline ? (
                    <button
                      type="button"
                      onClick={() => setTeachingMode("online")}
                      className={cn(
                        "flex-1 min-w-[100px] py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5",
                        teachingMode === "online"
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200",
                      )}
                    >
                      <Video size={14} /> {t("bookingOnline")}
                    </button>
                  ) : null}
                  {homeAvailable && showHome ? (
                    <button
                      type="button"
                      onClick={() => setTeachingMode("domicile")}
                      className={cn(
                        "flex-1 min-w-[100px] py-2.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5",
                        teachingMode === "domicile"
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200",
                      )}
                    >
                      <Home size={14} /> {t("bookingHome")}
                    </button>
                  ) : null}
                </div>
              </div>

              {teachingMode === "domicile" ? (
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin size={14} className="text-teal-700" />
                    {t("bookingAddressLabel")}
                  </label>
                  <textarea
                    value={studentAddress}
                    onChange={(e) => setStudentAddress(e.target.value)}
                    rows={3}
                    placeholder={t("bookingAddressPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">
                      {lessonType === "intro"
                        ? `${introDurationMinutes} min`
                        : `${displayedHourlyPrice} / h × ${lessonHours === 1 ? t("bookingOneHour") : `${lessonHours} ${t("bookingHours")}`}`}
                    </span>
                    <span className="font-bold text-teal-700">
                      {t("bookingTotalLine")} : {displayPrice}
                    </span>
                  </div>
                  {teacher.homeLessonRequiresConfirmation ? (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                      {t("bookingManualConfirmHome")}
                    </p>
                  ) : null}
                  {!geo ? (
                    <button
                      type="button"
                      onClick={requestBookingGeo}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {t("bookingRefineLocationCta")}
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {t("bookingRateHint")} : <strong className="text-slate-800">{formatPrice(teacher.pricePerLesson)}</strong> /{" "}
                  {t("bookingPerHourWord")}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  <ChevronLeft className="inline mr-1" size={16} />
                  {t("back")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setStep("pickDate");
                  }}
                  className="flex-[2] ds-btn-primary h-11 rounded-2xl text-sm font-semibold"
                >
                  {t("chooseSlotCta")}
                </button>
              </div>
            </div>
          )}

          {step === "pickDate" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={16} /> {t("bookingPickDateTitle")}
              </p>
              <p className="text-xs text-slate-500">{t("fourWeeksHint")}</p>
              {daysError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{daysError}</div>
              ) : null}
              {loadingDays ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-teal-700" size={28} />
                </div>
              ) : !daysError && Object.keys(availableDays).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  {t("bookingNoAvailability")}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {calendarCells.map((cell) => (
                    <button
                      key={cell.iso}
                      type="button"
                      disabled={cell.disabled}
                      onClick={() => {
                        setSelectedDate(cell.iso);
                        setSelectedSlot(null);
                        setStep("pickSlot");
                      }}
                      className={cn(
                        "py-2.5 px-2 rounded-xl border text-left text-xs font-semibold transition-colors",
                        cell.disabled
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"
                          : selectedDate === cell.iso
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-slate-200 hover:border-teal-500/50",
                      )}
                    >
                      <span className="block capitalize">{cell.label}</span>
                      {!cell.disabled ? (
                        <span className="text-[10px] font-bold text-teal-700">
                          {t("slotsAvailableBadge").replace("{n}", String(cell.count))}
                        </span>
                      ) : cell.iso <= todayIso ? (
                        <span className="text-[10px] text-slate-600">{t("pastLabel")}</span>
                      ) : (
                        <span className="text-[10px] text-slate-600">{t("fullLabel")}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep("preferences")}
                className="w-full h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >
                <ChevronLeft className="inline mr-1" size={16} />
                {t("back")}
              </button>
            </div>
          )}

          {step === "pickSlot" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Clock size={16} /> {t("bookingTimeLabel")}
              </p>
              {selectedDate ? (
                <p className="text-xs text-slate-500 capitalize">{formattedSelectedDate}</p>
              ) : null}
              {slotsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{slotsError}</div>
              ) : null}
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-teal-700" size={28} />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noSlotsPickOther")}</p>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {slotsByPeriod.map((g) => (
                    <div key={g.key}>
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-600">
                        <SlotPeriodIcon period={g.key} />
                        {g.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {g.items.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setSelectedSlot(s);
                              setStep("confirm");
                            }}
                            className={cn(
                              "rounded-xl border px-2 py-3 text-xs font-bold transition-colors",
                              selectedSlot === s
                                ? "border-teal-700 bg-teal-700 text-white"
                                : "border-slate-200 hover:border-teal-500/40",
                            )}
                          >
                            {s} · {durationMinutes} min
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("pickDate")}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  <ChevronLeft className="inline mr-1" size={16} />
                  {t("backToDate")}
                </button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              {teacherIdInvalid ? (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                >
                  {t("bookingInvalidTeacherId")}
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{t("bookingConfirmTitle")}</p>
                  <p className="mt-1 text-xs text-slate-500">{t("bookingConfirmSubtitle")}</p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-teal-700">
                  {effectiveDisplayPrice}
                </span>
              </div>
              <div className="rounded-3xl border border-[#DCEAE3] bg-[#F3FAF6] p-4 space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t("bookingDateLabel")}</span>
                  <span className="font-semibold text-slate-900 text-right capitalize">{formattedSelectedDate}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t("bookingTimeLabel")}</span>
                  <span className="font-semibold text-slate-900">{selectedSlot}</span>
                </div>
                {selectedTimeLabels ? (
                  <div className="rounded-xl border border-[#DCEAE3] bg-white px-3 py-2 text-xs text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">{t("yourLocalTime")}:</span>{" "}
                      {selectedTimeLabels.userLabel}
                    </p>
                    {selectedTimeLabels.showTeacherTime ? (
                      <p className="mt-1">
                        <span className="font-semibold text-slate-900">{t("teacherLocalTime")}:</span>{" "}
                        {selectedTimeLabels.teacherLabel}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-slate-500">{t("timezoneDisplayedInYourZone")}</p>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t("bookingDurationLabel")}</span>
                  <span className="font-semibold text-slate-900">
                    {durationMinutes} {t("freeSlotsMinSuffix")}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t("bookingLocationTitle")}</span>
                  <span className="font-semibold text-slate-900 text-right">{selectedFormatLabel}</span>
                </div>
                {selectedLearner ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">{t("studentCourseForLearner")}</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {selectedLearnerSummary}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">{t("bookingAmountLabel")}</span>
                  <span className="font-bold text-teal-700">{displayPrice}</span>
                </div>
                {creditsDiscount > 0 ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">{t("creditsApply")}</span>
                    <span className="font-bold text-teal-700">-{formatPrice(creditsDiscount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2 border-t border-teal-500/20 pt-3">
                  <span className="font-semibold text-slate-900">{t("bookingDueToday")}</span>
                  <span className="font-extrabold text-teal-700">{effectiveDisplayPrice}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                <div className="flex gap-2">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-teal-700" />
                  <p className="leading-relaxed">
                    <span className="font-semibold text-slate-800">{t("bookingPaymentNote")}</span>{" "}
                    {t("bookingExclusiveText")}
                  </p>
                </div>
              </div>

              {/* Credits toggle */}
              {!loadingCredits && creditBalance > 0 && maxCreditsApplicable > 0 ? (
                <button
                  type="button"
                  onClick={() => setApplyCredits((v) => !v)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                    applyCredits
                      ? "border-teal-500 bg-teal-500/10"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Gift size={16} className={applyCredits ? "text-teal-700" : "text-slate-600"} />
                    <div>
                      <p className={cn("text-sm font-semibold", applyCredits ? "text-teal-700" : "text-slate-700")}>
                        {t("creditsApply")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatPrice(creditBalance)} {t("creditsAvailable")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {applyCredits && (
                      <span className="text-sm font-bold text-teal-700">
                        -{formatPrice(creditsDiscount)}
                      </span>
                    )}
                    <div
                      className={cn(
                        "relative h-6 w-11 rounded-full border transition-colors",
                        applyCredits ? "bg-teal-600 border-teal-500" : "bg-slate-200 border-slate-200",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          applyCredits ? "left-5" : "left-0.5",
                        )}
                      />
                    </div>
                  </div>
                </button>
              ) : null}

              {teachingMode === "domicile" ? (
                <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-slate-700">
                  <span className="font-semibold text-teal-700">{t("bookingAtHomeLabel")}</span>
                  {lessonHours > 1 ? (
                    <span className="block mt-1">
                      {t("bookingBilledDuration")} : {lessonHours} {t("bookingHours")} {t("bookingDistancePolicy")}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {checkoutError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                >
                  {checkoutError}
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("pickSlot")}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  <ChevronLeft className="inline mr-1" size={16} />
                  {t("backToSlot")}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || teacherIdInvalid}
                  onClick={() => void handleConfirmAndPay()}
                  className="flex-[2] h-11 rounded-2xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-white shadow-md transition hover:opacity-95"
                  style={{ backgroundColor: "var(--palette-teal-700)" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {t("bookingRedirecting")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      {t("bookingPay")}{" "}
                      {creditsDiscount > 0 ? (
                        <>
                          <span className="line-through opacity-60 mr-1">{displayPrice}</span>
                          {effectiveDisplayPrice}
                        </>
                      ) : (
                        displayPrice
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function LearnerBookingContextPanel({
  draft,
  academicConfig,
  onChange,
}: {
  draft: BookingContextDraft;
  academicConfig: ReturnType<typeof getAcademicSystemConfig>;
  onChange: (patch: Partial<BookingContextDraft>) => void;
}) {
  const { t } = useLocale();
  const academicProgramHelperKey = getAcademicProgramHelperKey(academicConfig);

  const fieldClass = "h-10 w-full rounded-xl border border-[#DCEAE3] bg-white px-3 text-xs outline-none focus:border-teal-500";
  const areaClass = "w-full rounded-xl border border-[#DCEAE3] bg-white px-3 py-2 text-xs outline-none focus:border-teal-500";

  return (
    <div className="space-y-3 rounded-2xl border border-[#DCEAE3] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t("bookingLearnerContextHint")}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("learnerContextHelpfulHint")}</p>
        </div>
        <select
          value={draft.context_type}
          onChange={(e) => onChange({ context_type: e.target.value as LearnerContextType })}
          className="h-9 rounded-xl border border-[#DCEAE3] bg-[#F3FAF6] px-2 text-xs font-semibold text-teal-700"
        >
          <option value="academic">{t("contextTypeAcademic")}</option>
          <option value="language">{t("contextTypeLanguage")}</option>
          <option value="music">{t("contextTypeMusic")}</option>
          <option value="general">{t("contextTypeGeneral")}</option>
        </select>
      </div>

      {draft.context_type === "academic" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("gradeLevel")}</span>
            <input value={draft.grade_level} onChange={(e) => onChange({ grade_level: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("academicProgram")}</span>
            <select value={draft.academic_program} onChange={(e) => onChange({ academic_program: e.target.value })} className={fieldClass}>
              <option value="">-</option>
              {academicConfig.programTracks.map((track) => (
                <option key={track.value} value={track.value}>
                  {t((track.parentFriendlyLabelKey || track.labelKey) as TranslationKey)}
                </option>
              ))}
            </select>
            {academicProgramHelperKey ? (
              <span className="block text-[11px] leading-relaxed text-slate-500">
                {t(academicProgramHelperKey as TranslationKey)}
              </span>
            ) : null}
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("subjectStruggles")}</span>
            <input
              value={draft.subject_struggles}
              onChange={(e) => onChange({ subject_struggles: e.target.value })}
              placeholder="Fractions, fonctions..."
              className={fieldClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("examDate")}</span>
            <input type="date" value={draft.exam_date} onChange={(e) => onChange({ exam_date: e.target.value })} className={fieldClass} />
          </label>
        </div>
      ) : null}

      {draft.context_type === "language" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("targetLanguage")}</span>
            <input value={draft.target_language} onChange={(e) => onChange({ target_language: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("currentLevel")}</span>
            <input value={draft.current_level} onChange={(e) => onChange({ current_level: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("learningGoals")}</span>
            <input value={draft.learning_goals} onChange={(e) => onChange({ learning_goals: e.target.value })} className={fieldClass} />
          </label>
        </div>
      ) : null}

      {draft.context_type === "music" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("instrument")}</span>
            <input value={draft.instrument} onChange={(e) => onChange({ instrument: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("currentLevel")}</span>
            <input value={draft.current_level} onChange={(e) => onChange({ current_level: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("practiceFrequency")}</span>
            <input value={draft.practice_frequency} onChange={(e) => onChange({ practice_frequency: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("learningGoals")}</span>
            <input value={draft.learning_goals} onChange={(e) => onChange({ learning_goals: e.target.value })} className={fieldClass} />
          </label>
        </div>
      ) : null}

      {draft.context_type === "general" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("currentLevel")}</span>
            <input value={draft.current_level} onChange={(e) => onChange({ current_level: e.target.value })} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-600">{t("learningGoals")}</span>
            <input value={draft.learning_goals} onChange={(e) => onChange({ learning_goals: e.target.value })} className={fieldClass} />
          </label>
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="text-[11px] font-bold uppercase text-slate-600">{t("notesForTeacher")}</span>
        <textarea
          value={draft.notes_for_teacher}
          onChange={(e) => onChange({ notes_for_teacher: e.target.value })}
          rows={2}
          className={areaClass}
        />
      </label>
    </div>
  );
}
