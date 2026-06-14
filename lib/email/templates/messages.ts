import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";
import { getNotificationEmailCopy } from "@/lib/email/messages/notifications";

type BuildNewPratiqoMessageEmailOptions = {
  recipientName: string;
  senderName: string | null;
  conversationUrl?: string;
  locale?: EmailLocale;
};

export async function sendNewPratiqoMessageEmail(opts: {
  email: string;
  recipientName: string;
  senderName: string | null;
  conversationUrl?: string;
  locale?: EmailLocale;
}) {
  const message = buildNewPratiqoMessageEmail(opts);
  await send({
    to: opts.email,
    subject: message.subject,
    html: message.html,
  });
}

export function buildNewPratiqoMessageEmail(opts: BuildNewPratiqoMessageEmailOptions) {
  const resolved = resolveEmailLocaleFromOptional(opts.locale);
  const copy = getNotificationEmailCopy(resolved).pratiqoMessageReceived;
  const base = appBaseUrl();
  const ctaUrl = opts.conversationUrl?.trim() || `${base}/messages`;
  const recipientName = opts.recipientName.trim() || "Pratiqo";
  const senderName = opts.senderName?.trim() || copy.senderFallback;

  return {
    subject: copy.subject,
    ctaUrl,
    html: buildEmail({
      locale: resolved,
      heroEmoji: "✉️",
      heroTitle: copy.heroTitle,
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: `
        <p>${escapeHtml(copy.greeting(recipientName))}</p>
        <p>${escapeHtml(copy.intro(senderName))}</p>
        ${tealBox(escapeHtml(copy.privacyNote))}
      `,
      ctaText: copy.ctaText,
      ctaUrl,
    }),
  };
}
