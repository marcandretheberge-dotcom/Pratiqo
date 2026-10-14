import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml } from "@/lib/email/layout";
import { normalizeEmailLocale, type EmailLocale } from "@/lib/email/locale";

const COPY = {
  fr: {
    subject: (subject: string) => `Bonne nouvelle : un prof de ${subject} est maintenant disponible sur Pratiqo`,
    hero: "On a trouvé un prof pour toi 🎉",
    subtitle: "Ta recherche Pratiqo vient de donner un nouveau résultat.",
    intro: (subject: string, city: string, online: boolean) =>
      online
        ? `Tu cherchais des cours de ${subject} à ${city}. Un professeur correspondant peut maintenant t'enseigner en ligne.`
        : `Tu cherchais des cours de ${subject} à ${city}. Un professeur correspondant est maintenant disponible pour ta recherche locale.`,
    reassurance: "Tu reçois ce courriel parce que tu nous as demandé de t'aviser lorsqu'un professeur correspondant à cette recherche devient disponible.",
    cta: "Voir le professeur",
  },
  en: {
    subject: (subject: string) => `Good news: a ${subject} teacher is now available on Pratiqo`,
    hero: "We found a teacher for you 🎉",
    subtitle: "Your Pratiqo search has a new match.",
    intro: (subject: string, city: string, online: boolean) =>
      online
        ? `You were looking for ${subject} lessons in ${city}. A matching teacher can now teach you online.`
        : `You were looking for ${subject} lessons in ${city}. A matching teacher is now available for your local search.`,
    reassurance: "You're receiving this email because you asked us to let you know when a teacher matching this search becomes available.",
    cta: "See the teacher",
  },
  es: {
    subject: (subject: string) => `Buenas noticias: ya hay un profe de ${subject} disponible en Pratiqo`,
    hero: "Encontramos un profe para ti 🎉",
    subtitle: "Tu búsqueda en Pratiqo tiene una nueva coincidencia.",
    intro: (subject: string, city: string, online: boolean) =>
      online
        ? `Buscabas clases de ${subject} en ${city}. Ahora hay un profesor que puede enseñarte en línea.`
        : `Buscabas clases de ${subject} en ${city}. Ahora hay un profesor disponible para tu búsqueda local.`,
    reassurance: "Recibes este correo porque nos pediste que te avisáramos cuando hubiera un profesor que correspondiera a esta búsqueda.",
    cta: "Ver el profesor",
  },
} as const;

export async function sendLearnerDemandMatchEmail(input: {
  email: string;
  subject: string;
  city: string;
  outcome: "local_match" | "online_match";
  searchUrl: string;
  locale?: EmailLocale | string | null;
  idempotencyKey?: string;
}) {
  const locale = normalizeEmailLocale(input.locale) ?? "fr";
  const copy = COPY[locale];
  const base = appBaseUrl();
  const ctaUrl = new URL(input.searchUrl, base).toString();
  const online = input.outcome === "online_match";

  const sent = await send({
    idempotencyKey: input.idempotencyKey,
    to: input.email,
    subject: copy.subject(input.subject),
    html: buildEmail({
      locale,
      heroEmoji: "🌱",
      heroTitle: copy.hero,
      heroSubtitle: copy.subtitle,
      bodyHtml: `
        <p style="margin:0 0 18px;">${escapeHtml(copy.intro(input.subject, input.city, online))}</p>
        <div style="background:#F3FAF6;border:1px solid #DCEAE3;border-radius:12px;padding:16px 18px;margin:0 0 18px;">
          <div style="font-weight:700;color:#2C2C2A;">${escapeHtml(input.subject)}</div>
          <div style="margin-top:4px;color:#6B6A65;">${escapeHtml(input.city)}</div>
        </div>
        <p style="margin:0;color:#6B6A65;font-size:13px;">${escapeHtml(copy.reassurance)}</p>
      `,
      ctaText: copy.cta,
      ctaUrl,
    }),
  });
  if (!sent) throw new Error("learner_demand_email_not_sent");
}
