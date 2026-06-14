import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";
import { getNotificationEmailCopy } from "@/lib/email/messages/notifications";

export function buildNewPratiqoMessageEmail(opts: {
  recipientName: string;
  senderName: string;
  conversationUrl: string;
  locale?: EmailLocale;
}) {
  const resolved = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getNotificationEmailCopy(resolved).newPratiqoMessage;
  const ctaUrl = opts.conversationUrl || `${appBaseUrl()}/messages`;

  return {
    subject: copy.subject,
    ctaUrl,
    html: buildEmail({
      locale: resolved,
      heroEmoji: "✉",
      heroTitle: copy.heroTitle,
      heroSubtitle: copy.heroSubtitle(opts.senderName),
      bodyHtml: `
        <p>${escapeHtml(copy.greeting(opts.recipientName))}</p>
        <p>${escapeHtml(copy.body(opts.senderName))}</p>
      `,
      ctaText: copy.ctaText,
      ctaUrl,
      footerExtra: copy.footerExtra,
    }),
  };
}

export async function sendNewPratiqoMessageEmail(opts: {
  email: string;
  recipientName: string;
  senderName: string;
  conversationUrl: string;
  locale?: EmailLocale;
}): Promise<boolean> {
  const message = buildNewPratiqoMessageEmail(opts);
  return send({
    to: opts.email,
    subject: message.subject,
    html: message.html,
  });
}
