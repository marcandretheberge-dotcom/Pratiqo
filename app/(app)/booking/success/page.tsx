import Link from "next/link";
import type Stripe from "stripe";
import {
  CheckCircle2,
  Calendar,
  Download,
  LayoutDashboard,
  User,
  Clock,
  MapPin,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  sendBookingConfirmedStudent,
  sendBookingConfirmedTeacher,
} from "@/lib/email";
import { SuccessCleaner } from "./SuccessCleaner";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { localeToBcp47 } from "@/lib/i18n/types";
import { getPlatformFeeRate } from "@/lib/payments/amounts";
import {
  chargeIdFromPaymentIntent,
  retrievePaymentIntentChargeId,
  upsertPaidBookingPayment,
} from "@/lib/payments/ledger";

export const dynamic = "force-dynamic";

// ─── Types ───────────────────────────────────────────────────────────────────

type VerifyResult =
  | { ok: true; booking: BookingDetails }
  | { ok: false; reason: "no_session_id" | "payment_not_paid" | "booking_not_found" | "stripe_error" };

interface BookingDetails {
  teacherName: string;
  studentName: string;
  discipline: string;
  date: string;
  time: string;
  durationMinutes: number;
  /** Display — translate with bookingOnline | bookingHome | bookingStudio */
  locationKind: "online" | "domicile" | "person";
  amountLabel: string;
  bookingId: string;
  status: string;
  alreadyConfirmed: boolean;
  studentHasProfileName: boolean;
}

function parseBookingStart(dateIso: string, slot: string): Date | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  const time = /^(\d{1,2})h(\d{2})$/.exec(slot);
  if (!date || !time) return null;
  return new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(time[1]), Number(time[2]));
}

function googleDateValue(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl(booking: BookingDetails, locationLabel: string): string | null {
  const start = parseBookingStart(booking.date, booking.time);
  if (!start) return null;
  const end = new Date(start.getTime() + Math.max(30, booking.durationMinutes || 60) * 60_000);
  const title = `Pratiqo · ${booking.discipline} avec ${booking.teacherName}`;
  const details = `Cours confirmé avec ${booking.teacherName}. Consultez votre tableau de bord Pratiqo pour les détails à jour.`;
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${googleDateValue(start)}/${googleDateValue(end)}`);
  url.searchParams.set("details", details);
  url.searchParams.set("location", locationLabel);
  return url.toString();
}

function emailLocationLabel(dict: Dictionary, teachingMode: string): string {
  if (teachingMode === "online") return dict.bookingOnline;
  if (teachingMode === "domicile") return dict.bookingHome;
  return dict.bookingStudio;
}

function parseLocationKind(teaching_mode: unknown): BookingDetails["locationKind"] {
  const m = String(teaching_mode ?? "person");
  if (m === "online") return "online";
  if (m === "domicile") return "domicile";
  return "person";
}

// ─── Core verification + idempotent confirmation ──────────────────────────────

async function verifyAndConfirm(sessionId: string, locale: Locale): Promise<VerifyResult> {
  const dict = getDictionary(locale);
  const admin = getSupabaseAdmin();

  // 1. Retrieve Stripe session
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });
  } catch (err) {
    console.error("[booking/success] Stripe retrieve failed:", sessionId, err);
    return { ok: false, reason: "stripe_error" };
  }

  // 2. Guard: payment must be complete
  if (session.payment_status !== "paid") {
    console.warn("[booking/success] payment_status is not paid:", session.payment_status);
    return { ok: false, reason: "payment_not_paid" };
  }

  const bookingId = session.metadata?.booking_id ?? session.client_reference_id ?? null;
  if (!bookingId) {
    console.error("[booking/success] No booking_id in session metadata:", sessionId);
    return { ok: false, reason: "booking_not_found" };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : typeof session.payment_intent === "object" && session.payment_intent !== null
        ? (session.payment_intent as { id: string }).id
        : null;
  const paymentIntent =
    typeof session.payment_intent === "object" && session.payment_intent !== null
      ? (session.payment_intent as Stripe.PaymentIntent)
      : null;

  const bookingRes = await admin
    .from("bookings")
    .select(
      "id, teacher_id, student_id, status, date, time, slot_date, time_slot, price, duration_minutes, teaching_mode, credits_applied",
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingRes.data;
  if (!booking) {
    console.error("[booking/success] booking not found:", bookingId);
    return { ok: false, reason: "booking_not_found" };
  }

  // Fetch teacher + student profiles
  const [teacherData, studentData] = await Promise.all([
    admin.from("teachers").select("user_id, name, discipline").eq("id", booking.teacher_id).maybeSingle(),
    admin.from("profiles").select("name, email, plan").eq("id", booking.student_id).maybeSingle(),
  ]);

  const studentProfileName = studentData.data?.name as string | null | undefined;
  const teacherName =
    (teacherData.data?.name as string | null) ?? dict.bookingFallbackTeacherName ?? "Teacher";
  const teacherDiscipline =
    (teacherData.data?.discipline as string | null) ?? dict.bookingFallbackDiscipline ?? "Private lesson";
  const studentName = studentProfileName ?? dict.studentDefaultName;
  const studentEmail = (studentData.data as { email?: string | null } | null)?.email ?? null;

  const alreadyConfirmed = booking.status === "confirmed";

  if (paymentIntentId) {
    const metadata = (paymentIntent?.metadata ?? session.metadata ?? {}) as Record<string, string>;
    const amountCents = session.amount_total ?? Number(metadata.amount_cents ?? 0);
    const platformFeeCents = Number(metadata.platform_fee_cents ?? 0);
    const teacherNetCents = Number(metadata.teacher_net_cents ?? Math.max(0, amountCents - platformFeeCents));
    const stripeChargeId = (paymentIntent ? chargeIdFromPaymentIntent(paymentIntent) : null) ??
      (await retrievePaymentIntentChargeId(paymentIntentId).catch(() => null));

    await upsertPaidBookingPayment(admin, {
      bookingId,
      teacherId: booking.teacher_id as string,
      studentId: booking.student_id as string,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId,
      amountCents,
      platformFeeCents,
      teacherNetCents,
      currency: session.currency ?? "cad",
      transferGroup: metadata.transfer_group ?? `booking_${bookingId}`,
      metadata: {
        ...metadata,
        fallback_source: "booking_success_page",
      },
    }).catch((e) => console.error("[booking/success] booking payment ledger upsert failed", e));
  }

  // Idempotent fallback confirmation: only runs if the webhook hasn't fired yet
  if (!alreadyConfirmed && booking.status === "pending_payment" && paymentIntentId) {
    const { data: updatedRows } = await admin
      .from("bookings")
      .update({ status: "confirmed", stripe_payment_intent_id: paymentIntentId })
      .eq("id", bookingId)
      .eq("status", "pending_payment")
      .select("id");

    if (updatedRows?.length) {
      let teacherEmail: string | null = null;
      let commissionRate = 0.1;
      if (teacherData.data?.user_id) {
        const { data: teacherProf } = await admin
          .from("profiles")
          .select("email, plan")
          .eq("id", teacherData.data.user_id as string)
          .maybeSingle();
        teacherEmail = (teacherProf as { email?: string | null } | null)?.email ?? null;
        const plan = (teacherProf as { plan?: string | null } | null)?.plan ?? "free";
        commissionRate = getPlatformFeeRate(plan, "individual");
      }

      const bookingDate =
        (booking.date as string | null) ??
        (booking as { slot_date?: string | null }).slot_date ??
        "—";
      const bookingTime =
        (booking.time as string | null) ??
        (booking as { time_slot?: string | null }).time_slot ??
        "—";
      const bookingPrice = Number((booking as { price?: number | string | null }).price ?? 0);
      const bookingDuration = Number((booking as { duration_minutes?: number | null }).duration_minutes ?? 60);
      const bookingMode = (booking as { teaching_mode?: string | null }).teaching_mode ?? "person";
      const locationLabel = emailLocationLabel(dict, bookingMode);

      const creditsApplied = Number(
        (booking as { credits_applied?: number | string | null }).credits_applied ?? 0,
      );

      if (studentEmail) {
        await sendBookingConfirmedStudent({
          email: studentEmail,
          name: studentName,
          teacherName,
          discipline: teacherDiscipline,
          date: bookingDate,
          time: bookingTime,
          durationMinutes: bookingDuration,
          price: bookingPrice,
          creditsApplied,
          location: locationLabel,
        }).catch((e) => console.error("[booking/success] student email failed", e));
      }

      if (teacherEmail) {
        await sendBookingConfirmedTeacher({
          email: teacherEmail,
          name: teacherName,
          studentName,
          discipline: teacherDiscipline,
          date: bookingDate,
          time: bookingTime,
          durationMinutes: bookingDuration,
          price: bookingPrice,
          commissionRate,
          location: locationLabel,
        }).catch((e) => console.error("[booking/success] teacher email failed", e));
      }
    }
  }

  // Build display data
  const displayDate =
    (booking.date as string | null) ??
    (booking as { slot_date?: string | null }).slot_date ??
    null;
  const displayTime =
    (booking.time as string | null) ??
    (booking as { time_slot?: string | null }).time_slot ??
    null;
  const bookingMode = (booking as { teaching_mode?: string | null }).teaching_mode ?? "person";

  const total = session.amount_total;
  const cur = (session.currency || "cad").toUpperCase();
  const amountLabel =
    total != null
      ? new Intl.NumberFormat(localeToBcp47(locale), { style: "currency", currency: cur }).format(
          total / 100,
        )
      : "";

  const locationKind = parseLocationKind(bookingMode);
  const durationMinutes = Number((booking as { duration_minutes?: number | string | null }).duration_minutes ?? 60);

  return {
    ok: true,
    booking: {
      teacherName,
      studentName,
      discipline: teacherDiscipline,
      date: displayDate ?? "",
      time: displayTime ?? "",
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
      locationKind,
      amountLabel,
      bookingId,
      status: String(booking.status ?? "confirmed"),
      alreadyConfirmed,
      studentHasProfileName: Boolean(studentProfileName?.trim()),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Search = { session_id?: string };

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const sessionId = sp.session_id;

  // No session_id in URL
  if (!sessionId) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <ErrorCard
          title={dict.bookingErrorIncompleteSessionTitle}
          message={dict.bookingErrorIncompleteSessionMessage}
          href="/booking"
          cta={dict.bookingRecoverLinkCta}
          dictionary={dict}
        />
      </div>
    );
  }

  const result = await verifyAndConfirm(sessionId, locale);

  if (!result.ok) {
    const config: Record<typeof result.reason, { title: string; message: string; href?: string; cta: string }> = {
      stripe_error: {
        title: dict.bookingErrorStripeTitle,
        message: dict.bookingErrorStripeMessage,
        href: "/dashboard",
        cta: dict.dashboard,
      },
      payment_not_paid: {
        title: dict.bookingErrorPaymentPendingTitle,
        message: dict.bookingErrorPaymentPendingMessage,
        href: "/dashboard",
        cta: dict.dashboard,
      },
      booking_not_found: {
        title: dict.bookingErrorBookingNotFoundTitle,
        message: dict.bookingErrorBookingNotFoundMessage,
        href: "/dashboard",
        cta: dict.dashboard,
      },
      no_session_id: {
        title: dict.bookingErrorIncompleteSessionTitle,
        message: dict.bookingErrorNoSessionBody,
        href: "/dashboard",
        cta: dict.dashboard,
      },
    };
    const { title, message, href, cta } = config[result.reason];
    return (
      <div className="max-w-lg mx-auto py-12">
        <ErrorCard
          title={title}
          message={message}
          href={href ?? "/dashboard"}
          cta={cta}
          sessionId={sessionId}
          dictionary={dict}
        />
      </div>
    );
  }

  const { booking } = result;

  const thanksLine = dict.bookingSuccessThanksLine.replace("{{name}}", booking.studentName);
  const locationLabel =
    booking.locationKind === "online"
      ? dict.bookingOnline
      : booking.locationKind === "domicile"
        ? dict.bookingHome
        : dict.bookingStudio;
  const googleCalendarUrl = buildGoogleCalendarUrl(booking, locationLabel);
  const calendarDownloadUrl = `/api/bookings/${encodeURIComponent(booking.bookingId)}/calendar?session_id=${encodeURIComponent(sessionId)}`;
  const meetingNote =
    booking.locationKind === "online"
      ? dict.bookingMeetingLinkPending
      : booking.locationKind === "domicile"
        ? dict.bookingExactAddressAfterConfirmation
        : dict.bookingExactAddressAfterConfirmation;

  return (
    <>
      <SuccessCleaner />

      <div className="max-w-xl mx-auto space-y-6 py-4">
        <div
          className="rounded-[28px] p-8 sm:p-10 text-white shadow-[0_24px_80px_rgba(29,158,117,0.25)] border border-white/20"
          style={{ background: "linear-gradient(145deg, #1D9E75 0%, #0f6e56 100%)" }}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25">
              <CheckCircle2 className="w-9 h-9 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9fe1cb]">
                {dict.paymentConfirmed}
              </p>
              <h1 className="text-[26px] sm:text-[32px] font-semibold leading-tight mt-2">
                {dict.bookingConfirmedTitle}
              </h1>
              <p className="text-sm text-white/85 mt-3 leading-relaxed">
                {booking.studentHasProfileName ? (
                  <>
                    {thanksLine}
                  </>
                ) : null}
                {dict.bookingSuccessLessonBefore}
                <strong className="text-white font-semibold">{booking.teacherName}</strong>
                {dict.bookingSuccessLessonAfter} {dict.bookingConfirmedSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="ds-card p-6 sm:p-8 space-y-5 border border-[var(--p-light-teal-bg)]">
          <h2 className="text-xs font-bold text-[var(--p-text-muted)] uppercase tracking-widest">
            {dict.bookingDetails}
          </h2>

          <ul className="space-y-4 text-[15px] text-[var(--p-text)]">
            {booking.amountLabel ? (
              <li className="flex items-center justify-between gap-4 border-b border-[var(--p-light-teal-bg)] pb-4">
                <span className="text-[var(--p-text-muted)] font-medium">{dict.amountPaid}</span>
                <span className="font-semibold tabular-nums" style={{ color: "#1D9E75" }}>
                  {booking.amountLabel}
                </span>
              </li>
            ) : null}

            <li className="flex items-center gap-3">
              <User className="w-5 h-5 shrink-0" style={{ color: "#1D9E75" }} />
              <div>
                <span className="font-medium">{booking.teacherName}</span>
                {booking.discipline ? (
                  <span className="ml-2 text-sm text-[var(--p-text-muted)]">· {booking.discipline}</span>
                ) : null}
              </div>
            </li>

            {(booking.date || booking.time) ? (
              <li className="flex items-center gap-3">
                <Calendar className="w-5 h-5 shrink-0" style={{ color: "#1D9E75" }} />
                <span>{[booking.date, booking.time].filter(Boolean).join(" · ")}</span>
              </li>
            ) : null}

            <li className="flex items-center gap-3">
              {booking.locationKind === "online" ? (
                <Clock className="w-5 h-5 shrink-0" style={{ color: "#1D9E75" }} />
              ) : (
                <MapPin className="w-5 h-5 shrink-0" style={{ color: "#1D9E75" }} />
              )}
              <span>{locationLabel}</span>
            </li>

            <li className="flex items-center justify-between gap-4 border-t border-[var(--p-light-teal-bg)] pt-4">
              <span className="text-[var(--p-text-muted)] font-medium">{dict.bookingDurationLabel}</span>
              <span className="font-semibold">{booking.durationMinutes} min</span>
            </li>

            <li className="flex items-center justify-between gap-4">
              <span className="text-[var(--p-text-muted)] font-medium">{dict.bookingStatusLabel}</span>
              <span className="rounded-full bg-[#E1F5EE] px-3 py-1 text-xs font-bold text-[#0F6E56]">
                {dict.bookingStatusConfirmed}
              </span>
            </li>
          </ul>

          <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] px-4 py-3 text-xs text-slate-700">
            {meetingNote}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {googleCalendarUrl ? (
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[var(--p-light-teal-bg)]/60 transition"
              >
                <Calendar className="w-4 h-4" />
                {dict.bookingAddToGoogleCalendar}
              </a>
            ) : null}
            <a
              href={calendarDownloadUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[var(--p-light-teal-bg)]/60 transition"
            >
              <Download className="w-4 h-4" />
              {dict.bookingDownloadCalendarFile}
            </a>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
              style={{ backgroundColor: "#1D9E75" }}
            >
              <LayoutDashboard className="w-4 h-4" />
              {dict.bookingViewMyLessons}
            </Link>
            <Link
              href="/messages"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold border border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[var(--p-light-teal-bg)]/60 transition"
            >
              <MessageSquare className="w-4 h-4" />
              {dict.bookingMessageTeacher}
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--p-text-muted)] px-4">
          {dict.bookingSuccessFooterProblem}{" "}
          <a
            href="mailto:support@pratiqo.ca"
            className="underline hover:text-[#1D9E75] transition-colors"
          >
            support@pratiqo.ca
          </a>
        </p>
      </div>
    </>
  );
}

// ─── Error card component ─────────────────────────────────────────────────────

function ErrorCard({
  title,
  message,
  href,
  cta,
  sessionId,
  dictionary,
}: {
  title: string;
  message: string;
  href: string;
  cta: string;
  sessionId?: string;
  dictionary: Dictionary;
}) {
  return (
    <div className="ds-card p-8 text-center border border-rose-100 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
        <AlertCircle className="w-7 h-7 text-rose-500" strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--p-text)]">{title}</h1>
        <p className="text-sm text-[var(--p-text-muted)] mt-2 leading-relaxed">{message}</p>
        {sessionId ? (
          <p className="text-xs text-[var(--p-text-muted)] mt-3 font-mono opacity-60">
            {dictionary.bookingReferenceAbbrev}: {sessionId.slice(0, 32)}…
          </p>
        ) : null}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-95"
          style={{ backgroundColor: "#1D9E75" }}
        >
          {cta}
        </Link>
        <a
          href="mailto:support@pratiqo.ca"
          className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold border border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[var(--p-light-teal-bg)]/60 transition"
        >
          {dictionary.bookingSuccessContactSupport}
        </a>
      </div>
    </div>
  );
}
