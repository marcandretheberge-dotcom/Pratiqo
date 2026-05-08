"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Calendar, CalendarClock, ExternalLink, MapPin, MessageCircle, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { getBookingLifecycleState, type BookingLifecycleState } from "@/lib/bookingLifecycle";
import { localeToBcp47 } from "@/lib/i18n/types";
import { bookingWallTimeRangeToUtc, formatTimeRangeForUser } from "@/lib/timezones";
import { SupportCaseModal } from "@/components/support/SupportCaseModal";
import { AddMeetingLinkModal } from "@/components/bookings/AddMeetingLinkModal";

const PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TeacherScheduleRow = {
  id: string;
  studentName?: string;
  studentPhotoUrl?: string | null;
  studentUserId?: string | null;
  learnerContext?: {
    displayName: string;
    contextType: "academic" | "language" | "music" | "general" | null;
    schoolLevel: string | null;
    gradeLevel: string | null;
    academicProgram: string | null;
    academicProgramLabel: string | null;
    academicProgramUnsure: boolean;
    targetLanguage: string | null;
    currentLevel: string | null;
    instrument: string | null;
    practiceFrequency: string | null;
    examDate: string | null;
    currentGradePercent: number | null;
    learningGoals: string[];
    subjectStruggles: string[];
    explanationPreference: string | null;
    notesForTeacher: string | null;
  } | null;
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
  status?: string | null;
  teachingMode?: string | null;
  durationMinutes?: number | null;
  studentAddress?: string | null;
  meetingUrl?: string | null;
};

type CompletionOutcome = "held" | "absent" | "technical_issue";

function normalizeTeachingMode(mode: string | null | undefined): "online" | "at_home" | "in_person" {
  const raw = String(mode || "").toLowerCase();
  if (raw === "online") return "online";
  if (raw === "domicile" || raw === "home" || raw === "at_home") return "at_home";
  return "in_person";
}

function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function explanationPreferenceKey(value: string): TranslationKey {
  if (value === "examples_first") return "explanationExamplesFirst";
  if (value === "theory_first") return "explanationTheoryFirst";
  if (value === "step_by_step") return "explanationStepByStep";
  if (value === "visual_schema") return "explanationVisualSchema";
  if (value === "practice_first") return "explanationPracticeFirst";
  return "explanationPreference";
}

export function TeacherScheduleCard({
  items,
  emptyHint,
  titleKey = "upcomingScheduleTitle",
  onRequestCancelClass,
  onOpenReschedule,
  onMarkCompleted,
  cancelBusy,
  timeZone,
}: {
  items: TeacherScheduleRow[];
  emptyHint: string;
  titleKey?: "upcomingScheduleTitle" | "upcomingConfirmedClasses";
  onRequestCancelClass?: (bookingId: string) => void;
  onOpenReschedule?: (bookingId: string) => void;
  onMarkCompleted?: (bookingId: string, outcome: CompletionOutcome) => Promise<void> | void;
  cancelBusy?: boolean;
  timeZone?: string | null;
}) {
  const { t, locale } = useLocale();
  const dateLocale = localeToBcp47(locale);
  const router = useRouter();
  const relationshipMode = Boolean(onRequestCancelClass && onOpenReschedule);
  const [completionTarget, setCompletionTarget] = useState<TeacherScheduleRow | null>(null);
  const [supportTarget, setSupportTarget] = useState<TeacherScheduleRow | null>(null);
  const [meetingTarget, setMeetingTarget] = useState<TeacherScheduleRow | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [supportFlash, setSupportFlash] = useState<string | null>(null);

  const finishBooking = async (outcome: CompletionOutcome) => {
    if (!completionTarget) return;
    setCompleting(true);
    setCompletionError(null);
    try {
      await onMarkCompleted?.(completionTarget.id, outcome);
      setCompletionTarget(null);
    } catch (error) {
      setCompletionError(error instanceof Error ? error.message : t("anErrorOccurred"));
    } finally {
      setCompleting(false);
    }
  };

  const openCompletionDialog = (booking: TeacherScheduleRow) => {
    setCompletionError(null);
    setCompletionTarget(booking);
  };

  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-[0_8px_40px_rgba(44,44,42,0.06)] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#526056]">{t(titleKey)}</h3>
          <p className="mt-0.5 text-xs text-[#6B6760]">{t("scheduleCardSubtitle")}</p>
        </div>
        <Calendar size={18} className="shrink-0 text-[#0F6E56]" aria-hidden />
      </div>
      {supportFlash ? (
        <p className="mb-4 rounded-xl border border-[#DCEAE3] bg-[#F3FAF6] px-3 py-2 text-xs font-semibold text-[#0F6E56]">
          {supportFlash}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#6B6760]">
          <p>{emptyHint}</p>
          <Link
            href="/teacher/schedule"
            className="mt-4 inline-block text-xs font-semibold text-[#0F6E56] underline-offset-2 hover:underline"
          >
            {t("tabAvailability")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((b) => {
            const peer = typeof b.studentUserId === "string" ? b.studentUserId.trim() : "";
            const canMessage = peer.length > 0 && PEER_UUID_RE.test(peer);
            const messagesHref = canMessage ? `/messages?peer=${encodeURIComponent(peer)}` : "/messages";
            const photoUrl = b.studentPhotoUrl?.trim();
            const lifecycle = getBookingLifecycleState({
              slot_date: b.slot_date,
              date: b.date,
              time_slot: b.time_slot,
              time: b.time,
              duration_minutes: b.durationMinutes,
              status: b.status,
            });
            const mode = normalizeTeachingMode(b.teachingMode);
            const mapUrl = b.studentAddress?.trim() ? directionsUrl(b.studentAddress.trim()) : null;
            const meetingUrl = typeof b.meetingUrl === "string" ? b.meetingUrl.trim() : "";
            const learner = b.learnerContext ?? null;
            const dateIso = String(b.slot_date || b.date || "");
            const slot = String(b.time_slot || b.time || "");
            const utcRange = dateIso && slot
              ? bookingWallTimeRangeToUtc({
                  dateIso,
                  slot,
                  durationMinutes: b.durationMinutes,
                  timeZone,
                })
              : null;
            const timeLabel = utcRange
              ? formatTimeRangeForUser(utcRange.start, utcRange.end, dateLocale, timeZone || undefined)
              : [b.slot_date || b.date, b.time_slot || b.time].filter(Boolean).join(" · ");

            return (
              <li key={b.id} className="rounded-2xl border border-[#F1EFE8] bg-white p-4 sm:p-5">
                <div className="flex gap-3 sm:gap-4">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 shrink-0 rounded-full border border-[#0F6E56]/20 object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#1D9E75,#0f6e56)" }}
                      aria-hidden
                    >
                      {(b.studentName || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#2C2C2A]">{b.studentName}</p>
                    <p className="mt-0.5 text-sm font-medium text-[#0F6E56]">{timeLabel}</p>
                    {timeZone ? <p className="mt-0.5 text-xs text-[#6B6760]">{t("teacherLocalTime")}</p> : null}
                    <LifecycleBadge state={lifecycle} />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-3 text-xs text-slate-700">
                  <p className="font-bold uppercase tracking-widest text-[#0F6E56]">{t("teacherLearnerContextTitle")}</p>
                  {learner ? (
                    <LearnerContextSummary learner={learner} />
                  ) : (
                    <p className="mt-2 text-slate-600">{t("teacherLearnerContextEmpty")}</p>
                  )}
                </div>

                <ContextualBookingAction
                  lifecycle={lifecycle}
                  mode={mode}
                  meetingUrl={meetingUrl}
                  mapUrl={mapUrl}
                  disabled={Boolean(cancelBusy) || completing}
                  onNeedsReview={() => openCompletionDialog(b)}
                  onAddMeetingLink={() => setMeetingTarget(b)}
                />

                {relationshipMode ? (
                  <div className="mt-4 flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(messagesHref)}
                      disabled={Boolean(cancelBusy) || !canMessage}
                      className={cn(
                        "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition",
                        "bg-[#0F6E56] hover:bg-[#0c5a47] disabled:cursor-not-allowed disabled:opacity-45",
                        "sm:h-11 sm:min-h-0 sm:w-auto sm:flex-1 sm:min-w-[160px] sm:py-0",
                      )}
                    >
                      <MessageCircle className="h-[18px] w-[18px] shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
                      {t("messageStudent")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReschedule?.(b.id)}
                      disabled={Boolean(cancelBusy)}
                      className={cn(
                        "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#0F6E56]/35 bg-white px-4 py-3 text-sm font-semibold text-[#0F6E56] transition hover:bg-[#0F6E56]/[0.06] disabled:opacity-50",
                        "sm:h-11 sm:min-h-0 sm:w-auto sm:flex-1 sm:min-w-[160px] sm:py-0",
                      )}
                    >
                      <CalendarClock className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" aria-hidden />
                      {t("rescheduleClass")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupportTarget(b)}
                      disabled={Boolean(cancelBusy)}
                      className={cn(
                        "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50",
                        "sm:h-11 sm:min-h-0 sm:w-auto sm:flex-1 sm:min-w-[160px] sm:py-0",
                      )}
                    >
                      <AlertTriangle className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" aria-hidden />
                      {t("reportProblem")}
                    </button>
                  </div>
                ) : canMessage ? (
                  <button
                    type="button"
                    onClick={() => router.push(messagesHref)}
                    className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47] sm:h-11 sm:min-h-0 sm:py-0"
                  >
                    <MessageCircle className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" aria-hidden />
                    {t("messageStudent")}
                  </button>
                ) : null}

                {relationshipMode ? (
                  <div className="mt-3 flex flex-col gap-2 border-t border-[#F1EFE8] pt-3">
                    <Link
                      href="/legal/annulation"
                      className="text-xs font-medium text-[#0F6E56]/85 underline-offset-2 hover:underline"
                    >
                      {t("viewCancellationPolicy")}
                    </Link>
                    {onRequestCancelClass ? (
                      <button
                        type="button"
                        onClick={() => onRequestCancelClass(b.id)}
                        disabled={Boolean(cancelBusy)}
                        className="self-start text-left text-xs font-medium text-rose-700/70 underline-offset-2 transition hover:text-rose-800 hover:underline disabled:opacity-50"
                      >
                        {t("cancelThisClass")}
                      </button>
                    ) : null}
                  </div>
                ) : onRequestCancelClass ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onRequestCancelClass(b.id)}
                      disabled={Boolean(cancelBusy)}
                      className="mt-3 text-left text-xs font-medium text-rose-700/70 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {t("cancelThisClass")}
                    </button>
                    <Link href="/legal/annulation" className="mt-1 inline-block text-xs font-medium text-[#0F6E56]/80 hover:underline">
                      {t("viewCancellationPolicy")}
                    </Link>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {completionTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-base font-bold text-[#2C2C2A]">{t("bookingCompletionDialogTitle")}</h4>
            <p className="mt-2 text-sm text-[#6B6760]">{t("bookingCompletionDialogBody")}</p>
            {completionError ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {completionError}
              </p>
            ) : null}
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={completing}
                onClick={() => void finishBooking("held")}
                className="h-11 rounded-xl bg-[#0F6E56] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {completing ? t("saving") : t("bookingCompletionHeld")}
              </button>
              <button
                type="button"
                disabled={completing}
                onClick={() => void finishBooking("absent")}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#2C2C2A] disabled:opacity-60"
              >
                {t("bookingCompletionAbsent")}
              </button>
              <button
                type="button"
                disabled={completing}
                onClick={() => void finishBooking("technical_issue")}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#2C2C2A] disabled:opacity-60"
              >
                {t("bookingCompletionTechnicalIssue")}
              </button>
              <button
                type="button"
                disabled={completing}
                onClick={() => {
                  setCompletionError(null);
                  setCompletionTarget(null);
                }}
                className="h-10 rounded-xl px-4 text-sm font-semibold text-[#6B6760] disabled:opacity-60"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <SupportCaseModal
        open={Boolean(supportTarget)}
        bookingId={supportTarget?.id ?? null}
        onClose={() => setSupportTarget(null)}
        onSubmitted={(caseId) => {
          setSupportFlash(`${t("supportCaseSubmitted")} #${caseId.slice(0, 8)}`);
          window.setTimeout(() => setSupportFlash(null), 4000);
        }}
      />
      <AddMeetingLinkModal
        bookingId={meetingTarget?.id ?? ""}
        isOpen={Boolean(meetingTarget)}
        onClose={() => setMeetingTarget(null)}
        onSaved={(data) => {
          const id = meetingTarget?.id;
          if (!id) return;
          setSupportFlash(t("videoLinkAddedSuccess"));
          window.setTimeout(() => setSupportFlash(null), 4000);
          // Optimistic: update local meeting URL so CTA flips immediately.
          const nextUrl = data.meeting_url;
          setMeetingTarget(null);
          // Update the corresponding item in-place (source list may be owned by parent, so we only adjust UI here).
          // Parent dashboard also listens to bookings changes, so it will refresh from DB.
          try {
            // no-op: this component is stateless w.r.t items; rely on realtime refresh
            void nextUrl;
          } catch {
            /* ignore */
          }
        }}
      />
    </div>
  );
}

function LearnerContextSummary({ learner }: { learner: NonNullable<TeacherScheduleRow["learnerContext"]> }) {
  const { t } = useLocale();
  const contextType = learner.contextType ?? "general";
  const programLabel =
    learner.academicProgramLabel ||
    (learner.academicProgram === "unsure" ? t("programIDontKnow") : learner.academicProgram?.toUpperCase() ?? null);

  return (
    <div className="mt-2 space-y-1.5">
      <p>
        <span className="font-semibold text-slate-900">{t("student")}:</span>{" "}
        {learner.displayName}
      </p>

      {contextType === "academic" ? (
        <>
          {[learner.schoolLevel, learner.gradeLevel].filter(Boolean).length ? (
            <p>
              <span className="font-semibold text-slate-900">{t("gradeLevel")}:</span>{" "}
              {[learner.schoolLevel, learner.gradeLevel].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {programLabel ? (
            <p>
              <span className="font-semibold text-slate-900">{t("academicProgram")}:</span>{" "}
              {programLabel}
            </p>
          ) : null}
          {learner.subjectStruggles.length ? (
            <p>
              <span className="font-semibold text-slate-900">{t("subjectStruggles")}:</span>{" "}
              {learner.subjectStruggles.join(", ")}
            </p>
          ) : null}
          {learner.examDate ? (
            <p>
              <span className="font-semibold text-slate-900">{t("examDate")}:</span>{" "}
              {learner.examDate}
            </p>
          ) : null}
          {learner.currentGradePercent != null ? (
            <p>
              <span className="font-semibold text-slate-900">{t("currentGradePercent")}:</span>{" "}
              {learner.currentGradePercent}%
            </p>
          ) : null}
          {learner.explanationPreference ? (
            <p>
              <span className="font-semibold text-slate-900">{t("explanationPreferenceShort")}:</span>{" "}
              {t(explanationPreferenceKey(learner.explanationPreference))}
            </p>
          ) : null}
        </>
      ) : null}

      {contextType === "language" ? (
        <>
          {learner.targetLanguage ? (
            <p><span className="font-semibold text-slate-900">{t("targetLanguage")}:</span> {learner.targetLanguage}</p>
          ) : null}
          {learner.currentLevel ? (
            <p><span className="font-semibold text-slate-900">{t("currentLevel")}:</span> {learner.currentLevel}</p>
          ) : null}
          {learner.learningGoals.length ? (
            <p><span className="font-semibold text-slate-900">{t("learningGoals")}:</span> {learner.learningGoals.join(", ")}</p>
          ) : null}
          {learner.explanationPreference ? (
            <p>
              <span className="font-semibold text-slate-900">{t("explanationPreferenceShort")}:</span>{" "}
              {t(explanationPreferenceKey(learner.explanationPreference))}
            </p>
          ) : null}
        </>
      ) : null}

      {contextType === "music" ? (
        <>
          {learner.instrument ? (
            <p><span className="font-semibold text-slate-900">{t("instrument")}:</span> {learner.instrument}</p>
          ) : null}
          {learner.currentLevel ? (
            <p><span className="font-semibold text-slate-900">{t("currentLevel")}:</span> {learner.currentLevel}</p>
          ) : null}
          {learner.practiceFrequency ? (
            <p><span className="font-semibold text-slate-900">{t("practiceFrequency")}:</span> {learner.practiceFrequency}</p>
          ) : null}
          {learner.learningGoals.length ? (
            <p><span className="font-semibold text-slate-900">{t("learningGoals")}:</span> {learner.learningGoals.join(", ")}</p>
          ) : null}
        </>
      ) : null}

      {contextType === "general" ? (
        <>
          {learner.currentLevel ? (
            <p><span className="font-semibold text-slate-900">{t("currentLevel")}:</span> {learner.currentLevel}</p>
          ) : null}
          {learner.learningGoals.length ? (
            <p><span className="font-semibold text-slate-900">{t("learningGoals")}:</span> {learner.learningGoals.join(", ")}</p>
          ) : null}
        </>
      ) : null}

      {learner.notesForTeacher ? <p className="pt-1 text-slate-600">{learner.notesForTeacher}</p> : null}
    </div>
  );
}

function LifecycleBadge({ state }: { state: BookingLifecycleState }) {
  const { t } = useLocale();
  const labels: Record<BookingLifecycleState, TranslationKey> = {
    upcoming: "bookingLifecycleUpcoming",
    ready: "bookingLifecycleReady",
    needs_review: "bookingLifecycleNeedsReview",
    completed: "bookingLifecycleCompleted",
    inactive: "bookingLifecycleInactive",
  };
  return (
    <span
      className={cn(
        "mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
        state === "ready" ? "bg-[#E1F5EE] text-[#0F6E56]" : "",
        state === "needs_review" ? "bg-amber-100 text-amber-800" : "",
        state === "completed" ? "bg-slate-100 text-slate-600" : "",
        state === "upcoming" ? "bg-slate-100 text-slate-700" : "",
      )}
    >
      {t(labels[state])}
    </span>
  );
}

function ContextualBookingAction({
  lifecycle,
  mode,
  meetingUrl,
  mapUrl,
  disabled,
  onNeedsReview,
  onAddMeetingLink,
}: {
  lifecycle: BookingLifecycleState;
  mode: "online" | "at_home" | "in_person";
  meetingUrl: string;
  mapUrl: string | null;
  disabled: boolean;
  onNeedsReview: () => void;
  onAddMeetingLink: () => void;
}) {
  const { t } = useLocale();
  if (lifecycle === "completed") return null;

  if (lifecycle === "needs_review") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onNeedsReview}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
      >
        {t("bookingMarkCompleted")}
      </button>
    );
  }

  if (mode === "online") {
    if (!meetingUrl) {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={onAddMeetingLink}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47] disabled:opacity-50"
        >
          <Video className="h-4 w-4" aria-hidden />
          {t("addVideoLink")}
        </button>
      );
    }
    return (
      <a
        href={meetingUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47]"
      >
        <Video className="h-4 w-4" aria-hidden />
        {t("joinCall")}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    );
  }

  if (mode === "at_home") {
    if (!mapUrl) {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => window.alert(t("lessonAddressPending"))}
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47] disabled:opacity-50"
        >
          <MapPin className="h-4 w-4" aria-hidden />
          {t("routeToLesson")}
        </button>
      );
    }
    return (
      <a
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47]"
      >
        <MapPin className="h-4 w-4" aria-hidden />
        {t("routeToLesson")}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.alert(t("bookingArrivalReady"))}
      className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#0F6E56] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5a47]"
    >
      {t("bookingStart")}
    </button>
  );
}
