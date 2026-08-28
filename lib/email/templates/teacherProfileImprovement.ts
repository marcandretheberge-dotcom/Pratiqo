import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml } from "@/lib/email/layout";
import type { EmailLocale } from "@/lib/email/locale";

const COPY = {
  fr: {
    subject: "Votre profil Pratiqo est visible — améliorez-le pour recevoir plus de demandes",
    title: "Votre profil est maintenant visible.",
    body:
      "Pour augmenter vos chances de recevoir des demandes, ajoutez une photo, une courte description, vos prix et vos disponibilités.",
    cta: "Améliorer mon profil",
  },
  en: {
    subject: "Your Pratiqo profile is visible — improve it to receive more requests",
    title: "Your profile is now visible.",
    body:
      "To increase your chances of receiving requests, add a photo, a short description, your rates, and your availability.",
    cta: "Improve my profile",
  },
  es: {
    subject: "Tu perfil de Pratiqo ya está visible — mejóralo para recibir más solicitudes",
    title: "Tu perfil ya está visible.",
    body:
      "Para aumentar tus posibilidades de recibir solicitudes, agrega una foto, una breve descripción, tus precios y tus disponibilidades.",
    cta: "Mejorar mi perfil",
  },
} as const;

export function buildTeacherProfileImprovementEmail(input: {
  locale?: EmailLocale;
  teacherName?: string | null;
}) {
  const locale = input.locale ?? "fr";
  const copy = COPY[locale] ?? COPY.fr;
  const dashboardUrl = `${appBaseUrl()}/teacher/verification?setup=1`;
  const name = input.teacherName?.trim();
  const greeting =
    locale === "en"
      ? `Hello${name ? ` ${escapeHtml(name)}` : ""},`
      : locale === "es"
        ? `Hola${name ? ` ${escapeHtml(name)}` : ""},`
        : `Bonjour${name ? ` ${escapeHtml(name)}` : ""},`;

  return {
    subject: copy.subject,
    html: buildEmail({
      locale,
      heroTitle: copy.title,
      heroSubtitle: copy.body,
      bodyHtml: `
        <p>${greeting}</p>
        <p>${escapeHtml(copy.body)}</p>
        <p>Stripe ${
          locale === "en"
            ? "will only be required to accept a paid booking."
            : locale === "es"
              ? "solo será requerido para aceptar una reserva pagada."
              : "sera requis seulement pour accepter une réservation payante."
        }</p>
      `,
      ctaText: copy.cta,
      ctaUrl: dashboardUrl,
    }),
  };
}

export async function sendTeacherProfileImprovementEmail(input: {
  email: string;
  locale?: EmailLocale;
  teacherName?: string | null;
}): Promise<boolean> {
  const message = buildTeacherProfileImprovementEmail({
    locale: input.locale,
    teacherName: input.teacherName,
  });
  return send({
    to: input.email,
    subject: message.subject,
    html: message.html,
  });
}
