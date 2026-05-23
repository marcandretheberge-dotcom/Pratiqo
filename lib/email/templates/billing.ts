import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";
import { getNotificationEmailCopy } from "@/lib/email/messages/notifications";

// ─── 6. Pro Upgrade ──────────────────────────────────────────────────────────

export async function sendProUpgrade(email: string, name: string, locale?: EmailLocale) {
  const message = buildProUpgradeEmail({ name, locale });
  await send({
    to: email,
    subject: message.subject,
    html: message.html,
  });
}

export function buildProUpgradeEmail(opts: { name: string; locale?: EmailLocale }) {
  const resolved = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getNotificationEmailCopy(resolved).proUpgrade;
  const base = appBaseUrl();
  const ctaUrl = `${base}/teacher/my-profile`;
  const checklist = copy.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return {
    subject: copy.subject,
    ctaUrl,
    html: buildEmail({
      locale: resolved,
      heroEmoji: "💎",
      heroTitle: copy.heroTitle(opts.name),
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: `
        <p>${escapeHtml(copy.intro)}</p>
        <h2 style="font-size:17px;font-weight:700;margin:24px 0 12px;color:#2C2C2A;">
          ${escapeHtml(copy.checklistTitle)}
        </h2>
        <ol style="padding-left:20px;line-height:2;font-size:15px;margin:0 0 20px;">
          ${checklist}
        </ol>
        ${tealBox(escapeHtml(copy.note))}
      `,
      ctaText: copy.ctaText,
      ctaUrl,
      footerExtra: copy.footerExtra,
    }),
  };
}
