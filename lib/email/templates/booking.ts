import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, infoTable, tealBox } from "@/lib/email/layout";
import type { EmailLocale } from "@/lib/email/locale";
import { resolveEmailLocaleFromOptional } from "@/lib/email/locale";
import { getBookingEmailCopy } from "@/lib/email/messages/booking";

type LocaleOpts = { locale?: EmailLocale };

export type LessonPaymentReceiptEmailInput = {
  email: string;
  studentName: string;
  receiptNumber: string;
  paymentDate: string;
  lessonDescription: string;
  teacherName: string;
  amountPaid: string;
  currency: string;
  stripeReceiptUrl?: string | null;
} & LocaleOpts;

export function buildLessonPaymentReceiptEmail(opts: LessonPaymentReceiptEmailInput) {
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getBookingEmailCopy(locale).lessonPaymentReceipt;
  const rows: [string, string][] = [
    [copy.labels.business, "Pratiqo inc."],
    [copy.labels.receiptNumber, opts.receiptNumber],
    [copy.labels.paymentDate, opts.paymentDate],
    [copy.labels.lesson, opts.lessonDescription],
    [copy.labels.teacher, opts.teacherName],
    [copy.labels.amountPaid, opts.amountPaid],
    [copy.labels.currency, opts.currency.toUpperCase()],
    [copy.labels.tax, copy.taxLine],
  ];

  return {
    subject: copy.subject(opts.receiptNumber),
    html: buildEmail({
      locale,
      heroEmoji: "🧾",
      heroTitle: copy.heroTitle,
      heroSubtitle: copy.heroSubtitle(opts.receiptNumber),
      bodyHtml: `
        <p>${copy.intro(escapeHtml(opts.studentName))}</p>
        ${infoTable(rows)}
        ${tealBox(`<strong>${copy.labels.tax}</strong><br>${escapeHtml(copy.taxLine)}`)}
        ${opts.stripeReceiptUrl ? `<p style="font-size:14px;color:#6B6A65;">${escapeHtml(copy.stripeReceipt)}: <a href="${escapeHtml(opts.stripeReceiptUrl)}" style="color:#2D7B72;font-weight:700;">${escapeHtml(opts.stripeReceiptUrl)}</a></p>` : ""}
        <p style="font-size:14px;color:#6B6A65;">${copy.thanks}</p>
      `,
      ctaText: opts.stripeReceiptUrl ? copy.cta : undefined,
      ctaUrl: opts.stripeReceiptUrl ?? undefined,
    }),
  };
}

export async function sendLessonPaymentReceipt(opts: LessonPaymentReceiptEmailInput): Promise<boolean> {
  const message = buildLessonPaymentReceiptEmail(opts);
  return send({
    to: opts.email,
    subject: message.subject,
    html: message.html,
  });
}

export async function sendBookingConfirmedStudent(
  opts: {
    email: string;
    name: string;
    teacherName: string;
    discipline: string;
    date: string;
    time: string;
    durationMinutes: number;
    price: number;
    creditsApplied: number;
    location: string;
  } & LocaleOpts,
) {
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getBookingEmailCopy(locale);
  const base = appBaseUrl();
  const net = opts.price - opts.creditsApplied;
  const rows: [string, string][] = [
    [copy.confirmedStudent.labels.teacher, opts.teacherName],
    [copy.confirmedStudent.labels.discipline, opts.discipline],
    [copy.confirmedStudent.labels.date, opts.date],
    [copy.confirmedStudent.labels.time, opts.time],
    [copy.confirmedStudent.labels.duration, `${opts.durationMinutes} min`],
    [copy.confirmedStudent.labels.location, opts.location],
    [copy.confirmedStudent.labels.total, `${opts.price.toFixed(2)} $`],
  ];
  if (opts.creditsApplied > 0) {
    rows.push([copy.confirmedStudent.labels.credits, `−${opts.creditsApplied.toFixed(2)} $`]);
    rows.push([copy.confirmedStudent.labels.cardPaid, `${net.toFixed(2)} $`]);
  }

  await send({
    to: opts.email,
    subject: copy.confirmedStudent.subject(opts.teacherName),
    html: buildEmail({
      locale,
      heroEmoji: "✅",
      heroTitle: copy.confirmedStudent.heroTitle,
      heroSubtitle: copy.confirmedStudent.heroSubtitle(opts.teacherName, opts.date, opts.time),
      bodyHtml: `
        <p>${copy.confirmedStudent.intro(escapeHtml(opts.name))}</p>
        ${infoTable(rows)}
        ${tealBox(`<strong>${copy.confirmedStudent.tipsTitle}</strong><br>${copy.confirmedStudent.tipsHtml}`)}
        <p style="font-size:14px;color:#6B6A65;">${copy.confirmedStudent.thanks}</p>
      `,
      ctaText: copy.confirmedStudent.cta,
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

export async function sendBookingConfirmedTeacher(
  opts: {
    email: string;
    name: string;
    studentName: string;
    discipline: string;
    date: string;
    time: string;
    durationMinutes: number;
    price: number;
    commissionRate: number;
    location: string;
  } & LocaleOpts,
) {
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getBookingEmailCopy(locale);
  const base = appBaseUrl();
  const commission = Math.round(opts.price * opts.commissionRate * 100) / 100;
  const net = Math.round((opts.price - commission) * 100) / 100;
  const commissionPct = Math.round(opts.commissionRate * 100);

  await send({
    to: opts.email,
    subject: copy.confirmedTeacher.subject(opts.studentName),
    html: buildEmail({
      locale,
      heroEmoji: "🎉",
      heroTitle: copy.confirmedTeacher.heroTitle,
      heroSubtitle: copy.confirmedTeacher.heroSubtitle(opts.studentName, opts.date, opts.time),
      bodyHtml: `
        <p>${copy.confirmedTeacher.intro(escapeHtml(opts.name))}</p>
        ${infoTable([
          [copy.confirmedTeacher.labels.student, opts.studentName],
          [copy.confirmedTeacher.labels.discipline, opts.discipline],
          [copy.confirmedTeacher.labels.date, opts.date],
          [copy.confirmedTeacher.labels.time, opts.time],
          [copy.confirmedTeacher.labels.duration, `${opts.durationMinutes} min`],
          [copy.confirmedTeacher.labels.location, opts.location],
          [copy.confirmedTeacher.labels.gross, `${opts.price.toFixed(2)} $`],
          [copy.confirmedTeacher.labels.commission(commissionPct), `−${commission.toFixed(2)} $`],
          [copy.confirmedTeacher.labels.net, `${net.toFixed(2)} $`],
        ])}
        ${tealBox(`<strong>${copy.confirmedTeacher.tipsTitle}</strong><br>${copy.confirmedTeacher.tipsHtml}`)}
        <p style="font-size:14px;color:#6B6A65;">${copy.confirmedTeacher.thanks}</p>
      `,
      ctaText: copy.confirmedTeacher.cta,
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

export async function sendPostClassReviewRequest(
  opts: {
    email: string;
    studentName: string;
    teacherName: string;
    bookingId: string;
  } & LocaleOpts,
): Promise<boolean> {
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getBookingEmailCopy(locale);
  const base = appBaseUrl();
  return send({
    to: opts.email,
    subject: copy.postClassReview.subject(opts.teacherName),
    html: buildEmail({
      locale,
      heroEmoji: "⭐",
      heroTitle: copy.postClassReview.heroTitle,
      heroSubtitle: copy.postClassReview.heroSubtitle(opts.teacherName),
      bodyHtml: `
        <p>${copy.postClassReview.greeting(escapeHtml(opts.studentName))}</p>
        <p>${copy.postClassReview.completed(escapeHtml(opts.teacherName))}</p>
        <p>${copy.postClassReview.community}</p>
      `,
      ctaText: copy.postClassReview.cta,
      ctaUrl: `${base}/student/progress?review=${encodeURIComponent(opts.bookingId)}`,
    }),
  });
}

export async function sendLessonReminderStudent(
  opts: {
    email: string;
    studentName: string;
    teacherName: string;
    discipline: string;
    dateLabel: string;
    timeLabel: string;
    location: string;
    window: "24h" | "1h";
  } & LocaleOpts,
): Promise<boolean> {
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getBookingEmailCopy(locale);
  const base = appBaseUrl();
  const is24h = opts.window === "24h";
  const studentName = escapeHtml(opts.studentName);
  const teacherName = escapeHtml(opts.teacherName);

  return send({
    to: opts.email,
    subject: is24h
      ? copy.reminderStudent.subject24h(opts.teacherName)
      : copy.reminderStudent.subject1h(opts.teacherName),
    html: buildEmail({
      locale,
      heroEmoji: is24h ? "📅" : "⏰",
      heroTitle: is24h ? copy.reminderStudent.hero24h : copy.reminderStudent.hero1h,
      heroSubtitle: `${opts.dateLabel} · ${escapeHtml(opts.timeLabel)}`,
      bodyHtml: `
        ${is24h ? copy.reminderStudent.intro24h(studentName, teacherName) : copy.reminderStudent.intro1h(studentName, teacherName)}
        ${infoTable([
          [copy.reminderStudent.labels.teacher, opts.teacherName],
          [copy.reminderStudent.labels.discipline, opts.discipline],
          [copy.reminderStudent.labels.date, opts.dateLabel],
          [copy.reminderStudent.labels.time, opts.timeLabel],
          [copy.reminderStudent.labels.format, opts.location],
        ])}
      `,
      ctaText: copy.reminderStudent.cta,
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

export async function sendLessonReminderTeacher(
  opts: {
    email: string;
    teacherName: string;
    studentName: string;
    discipline: string;
    dateLabel: string;
    timeLabel: string;
    location: string;
    window: "24h" | "1h";
  } & LocaleOpts,
): Promise<boolean> {
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getBookingEmailCopy(locale);
  const base = appBaseUrl();
  const is24h = opts.window === "24h";
  const teacherName = escapeHtml(opts.teacherName);
  const studentName = escapeHtml(opts.studentName);

  return send({
    to: opts.email,
    subject: is24h
      ? copy.reminderTeacher.subject24h(opts.studentName)
      : copy.reminderTeacher.subject1h(opts.studentName),
    html: buildEmail({
      locale,
      heroEmoji: is24h ? "📅" : "⏰",
      heroTitle: is24h ? copy.reminderTeacher.hero24h : copy.reminderTeacher.hero1h,
      heroSubtitle: `${opts.dateLabel} · ${escapeHtml(opts.timeLabel)}`,
      bodyHtml: `
        ${is24h ? copy.reminderTeacher.intro24h(teacherName, studentName) : copy.reminderTeacher.intro1h(teacherName, studentName)}
        ${infoTable([
          [copy.reminderTeacher.labels.student, opts.studentName],
          [copy.reminderTeacher.labels.discipline, opts.discipline],
          [copy.reminderTeacher.labels.date, opts.dateLabel],
          [copy.reminderTeacher.labels.time, opts.timeLabel],
          [copy.reminderTeacher.labels.format, opts.location],
        ])}
      `,
      ctaText: copy.reminderTeacher.cta,
      ctaUrl: `${base}/dashboard`,
    }),
  });
}
