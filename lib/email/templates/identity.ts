import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";
import { getNotificationEmailCopy } from "@/lib/email/messages/notifications";

// ─── 7. Identity Verified ────────────────────────────────────────────────────

export async function sendIdentityVerified(email: string, name: string, locale?: EmailLocale) {
  const message = buildIdentityVerifiedEmail({ name, locale });
  await send({
    to: email,
    subject: message.subject,
    html: message.html,
  });
}

// ─── 8. Identity Failed ──────────────────────────────────────────────────────

export async function sendIdentityFailed(email: string, name: string, reason: string, locale?: EmailLocale) {
  const message = buildIdentityFailedEmail({ name, reason, locale });
  await send({
    to: email,
    subject: message.subject,
    html: message.html,
  });
}

export function buildIdentityVerifiedEmail(opts: { name: string; locale?: EmailLocale }) {
  const resolved = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getNotificationEmailCopy(resolved).identityVerified;
  const base = appBaseUrl();
  const ctaUrl = `${base}/dashboard`;

  return {
    subject: copy.subject,
    ctaUrl,
    html: buildEmail({
      locale: resolved,
      heroEmoji: "✅",
      heroTitle: copy.heroTitle,
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: `
        <p>${escapeHtml(copy.greeting(opts.name))}</p>
        <p>${escapeHtml(copy.body)}</p>
      `,
      ctaText: copy.ctaText,
      ctaUrl,
    }),
  };
}

export function buildIdentityFailedEmail(opts: {
  name: string;
  reason: string;
  locale?: EmailLocale;
}) {
  const resolved = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getNotificationEmailCopy(resolved).identityFailed;
  const base = appBaseUrl();
  const ctaUrl = `${base}/teacher/verification`;
  const reason = opts.reason.trim();

  return {
    subject: copy.subject,
    ctaUrl,
    html: buildEmail({
      locale: resolved,
      heroEmoji: "🔄",
      heroTitle: copy.heroTitle,
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: `
        <p>${escapeHtml(copy.greeting(opts.name))}</p>
        <p>${escapeHtml(copy.body)}</p>
        ${reason ? tealBox(`<strong>${escapeHtml(copy.reasonLabel)}:</strong> ${escapeHtml(reason)}`) : ""}
        <p>${escapeHtml(copy.support)}</p>
      `,
      ctaText: copy.ctaText,
      ctaUrl,
    }),
  };
}
