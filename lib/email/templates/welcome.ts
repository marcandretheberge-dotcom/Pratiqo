import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";
import { getNotificationEmailCopy } from "@/lib/email/messages/notifications";
import { getWelcomeStudentCopy, getWelcomeTeacherCopy } from "@/lib/email/messages/welcome";

// ─── 1. Welcome Student ──────────────────────────────────────────────────────

export async function sendWelcomeStudent(email: string, name: string, locale?: EmailLocale) {
  const resolved = resolveEmailLocaleFromOptional(locale);
  const copy = getWelcomeStudentCopy(resolved);
  const base = appBaseUrl();
  await send({
    to: email,
    subject: copy.subject(name),
    html: buildEmail({
      locale: resolved,
      heroEmoji: "🌱",
      heroTitle: copy.heroTitle(name),
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: copy.bodyHtml(name),
      ctaText: copy.ctaText,
      ctaUrl: `${base}/student/choose-companion`,
    }),
  });
}

// ─── 2. Welcome Teacher ──────────────────────────────────────────────────────

export async function sendWelcomeTeacher(email: string, name: string, locale?: EmailLocale) {
  const resolved = resolveEmailLocaleFromOptional(locale);
  const copy = getWelcomeTeacherCopy(resolved);
  const base = appBaseUrl();
  await send({
    to: email,
    subject: copy.subject(name),
    html: buildEmail({
      locale: resolved,
      heroEmoji: "🎓",
      heroTitle: copy.heroTitle(name),
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: copy.bodyHtml(name),
      ctaText: copy.ctaText,
      ctaUrl: `${base}/dashboard`,
    }),
  });
}

// ─── 3. Companion Evolution ──────────────────────────────────────────────────
// Follow-up: localize sendCompanionEvolution (FR-only today).

export async function sendCompanionEvolution(
  email: string,
  name: string,
  companionName: string,
  oldEmoji: string,
  newEmoji: string,
  oldStage: string,
  newStage: string,
  creditAmount: number,
  locale?: EmailLocale,
) {
  const message = buildCompanionEvolutionEmail({
    name,
    companionName,
    oldEmoji,
    newEmoji,
    oldStage,
    newStage,
    locale,
  });
  await send({
    to: email,
    subject: message.subject,
    html: message.html,
  });
  void creditAmount;
}

export function buildCompanionEvolutionEmail(opts: {
  name: string;
  companionName: string;
  oldEmoji: string;
  newEmoji: string;
  oldStage: string;
  newStage: string;
  locale?: EmailLocale;
}) {
  const resolved = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getNotificationEmailCopy(resolved).companionEvolution;
  const base = appBaseUrl();
  const ctaUrl = `${base}/student/progress`;

  return {
    subject: copy.subject,
    ctaUrl,
    html: buildEmail({
      locale: resolved,
      heroEmoji: opts.newEmoji,
      heroTitle: copy.heroTitle(opts.name),
      heroSubtitle: `${opts.oldEmoji} ${copy.heroSubtitle(opts.oldStage, opts.newStage)} ${opts.newEmoji}`,
      bodyHtml: `
        <div style="text-align:center;font-size:56px;margin:8px 0 24px;">
          ${escapeHtml(opts.newEmoji)}
        </div>
        <p style="text-align:center;font-size:17px;font-weight:700;color:#2C2C2A;">
          ${escapeHtml(copy.intro(opts.companionName))}
        </p>
        <p style="text-align:center;">
          <strong>${escapeHtml(copy.stageLine(opts.oldStage, opts.newStage))}</strong>
        </p>
        ${tealBox(escapeHtml(copy.encouragement))}
      `,
      ctaText: copy.ctaText,
      ctaUrl,
    }),
  };
}
