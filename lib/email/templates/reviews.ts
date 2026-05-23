import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";
import { getNotificationEmailCopy } from "@/lib/email/messages/notifications";

export async function sendReviewPublishedTeacherEmail(opts: {
  email: string;
  teacherName: string;
  rating: number;
  reviewContent: string | null;
  studentFirstName: string;
  reviewId: string;
  locale?: EmailLocale;
}) {
  const message = buildReviewPublishedTeacherEmail(opts);
  await send({
    to: opts.email,
    subject: message.subject,
    html: message.html,
  });
}

export function buildReviewPublishedTeacherEmail(opts: {
  teacherName: string;
  rating: number;
  reviewContent: string | null;
  studentFirstName: string;
  reviewId?: string;
  locale?: EmailLocale;
}) {
  const resolved = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getNotificationEmailCopy(resolved).reviewPublishedTeacher;
  const previewRaw = (opts.reviewContent ?? "").trim();
  const preview = previewRaw.length > 200 ? `${previewRaw.slice(0, 200)}...` : previewRaw;
  const base = appBaseUrl();
  const ctaUrl = `${base}/teacher/profile`;
  const author = opts.studentFirstName.trim() || copy.authorFallback;

  return {
    subject: copy.subject,
    ctaUrl,
    html: buildEmail({
      locale: resolved,
      heroEmoji: "⭐",
      heroTitle: copy.heroTitle,
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: `
        <p>${escapeHtml(copy.greeting(opts.teacherName))}</p>
        <p>${escapeHtml(copy.intro)}</p>
        ${tealBox(`
          <div style="font-size:22px;font-weight:700;margin-bottom:8px;">${escapeHtml(String(opts.rating))} / 5</div>
          <div style="font-style:italic;color:#4D4B45;">"${escapeHtml(preview || copy.emptyReview)}"</div>
          <div style="font-size:14px;color:#6B6A65;margin-top:10px;">- ${escapeHtml(author)}</div>
        `)}
        <p><strong>${escapeHtml(copy.trustNoteTitle)}</strong></p>
        <p>${escapeHtml(copy.trustNoteBody)}</p>
      `,
      ctaText: copy.ctaText,
      ctaUrl,
    }),
  };
}
