import { send } from "@/lib/email/transport";
import { appBaseUrl, buildEmail, escapeHtml, infoTable, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";

type TeacherBookingRequestEmailInput = {
  email: string;
  teacherName: string;
  studentName: string;
  discipline: string;
  date: string;
  time: string;
  mode: string;
  locale?: EmailLocale;
};

const COPY: Record<
  EmailLocale,
  {
    subject: string;
    heroTitle: string;
    heroSubtitle: string;
    greeting: (name: string) => string;
    intro: (student: string) => string;
    labels: { student: string; discipline: string; date: string; time: string; mode: string };
    note: string;
    cta: string;
  }
> = {
  fr: {
    subject: "Un apprenant veut réserver un cours avec vous",
    heroTitle: "Un apprenant veut réserver un cours avec vous",
    heroSubtitle: "Un élève souhaite apprendre avec vous.",
    greeting: (name) => `Bonjour ${name},`,
    intro: (student) => `${student} a envoyé une demande de cours sur Pratiqo.`,
    labels: {
      student: "Élève",
      discipline: "Discipline",
      date: "Date souhaitée",
      time: "Créneau souhaité",
      mode: "Format",
    },
    note:
      "Cette demande n’est pas une réservation payée. Pour accepter la réservation et recevoir les paiements, complétez votre configuration Stripe. Votre profil reste visible même si cette étape n’est pas encore terminée.",
    cta: "Compléter ma configuration de paiement",
  },
  en: {
    subject: "A learner wants to book a class with you",
    heroTitle: "A learner wants to book a class with you",
    heroSubtitle: "A learner wants to study with you.",
    greeting: (name) => `Hi ${name},`,
    intro: (student) => `${student} sent a lesson request on Pratiqo.`,
    labels: {
      student: "Learner",
      discipline: "Discipline",
      date: "Requested date",
      time: "Requested time",
      mode: "Format",
    },
    note:
      "This request is not a paid booking. To accept the booking and receive payments, please complete your Stripe setup. Your profile remains visible even if this step is not finished yet.",
    cta: "Complete my payment setup",
  },
  es: {
    subject: "Un aprendiz quiere reservar una clase contigo",
    heroTitle: "Un aprendiz quiere reservar una clase contigo",
    heroSubtitle: "Un estudiante quiere aprender contigo.",
    greeting: (name) => `Hola ${name},`,
    intro: (student) => `${student} envió una solicitud de clase en Pratiqo.`,
    labels: {
      student: "Estudiante",
      discipline: "Disciplina",
      date: "Fecha solicitada",
      time: "Horario solicitado",
      mode: "Formato",
    },
    note:
      "Esta solicitud no es una reserva pagada. Para aceptar la reserva y recibir pagos, completa tu configuración de Stripe. Tu perfil sigue visible aunque este paso todavía no esté terminado.",
    cta: "Completar mi configuración de pago",
  },
};

export function buildTeacherBookingRequestEmail(opts: TeacherBookingRequestEmailInput) {
  const locale = resolveEmailLocaleFromOptional(opts.locale);
  const copy = COPY[locale];
  const base = appBaseUrl();
  return {
    subject: copy.subject,
    html: buildEmail({
      locale,
      heroEmoji: "📩",
      heroTitle: copy.heroTitle,
      heroSubtitle: copy.heroSubtitle,
      bodyHtml: `
        <p>${escapeHtml(copy.greeting(opts.teacherName))}</p>
        <p>${escapeHtml(copy.intro(opts.studentName))}</p>
        ${infoTable([
          [copy.labels.student, opts.studentName],
          [copy.labels.discipline, opts.discipline],
          [copy.labels.date, opts.date],
          [copy.labels.time, opts.time],
          [copy.labels.mode, opts.mode],
        ])}
        ${tealBox(escapeHtml(copy.note))}
      `,
      ctaText: copy.cta,
      ctaUrl: `${base}/dashboard`,
    }),
  };
}

export async function sendTeacherBookingRequestEmail(
  opts: TeacherBookingRequestEmailInput,
): Promise<boolean> {
  const message = buildTeacherBookingRequestEmail(opts);
  return send({
    to: opts.email,
    subject: message.subject,
    html: message.html,
  });
}
