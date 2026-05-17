import { getDictionary } from "@/lib/i18n/server";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";

export type ReminderWindow = "24h" | "1h";

export function formatEmailTeachingLocation(
  locale: EmailLocale,
  teachingMode?: string | null,
  meetingUrl?: string | null,
): string {
  const dict = getDictionary(locale);
  const mode = String(teachingMode ?? "person").toLowerCase();
  let base: string;
  if (mode === "online") base = dict.bookingOnline;
  else if (mode === "domicile" || mode === "home") base = dict.bookingHome;
  else base = dict.bookingStudio;

  if (mode === "online") {
    const url = typeof meetingUrl === "string" ? meetingUrl.trim() : "";
    return url ? `${base} — ${url}` : base;
  }
  return base;
}

type BookingConfirmedStudentCopy = {
  subject: (teacherName: string) => string;
  heroTitle: string;
  heroSubtitle: (teacherName: string, date: string, time: string) => string;
  intro: (name: string) => string;
  labels: {
    teacher: string;
    discipline: string;
    date: string;
    time: string;
    duration: string;
    location: string;
    total: string;
    credits: string;
    cardPaid: string;
  };
  tipsTitle: string;
  tipsHtml: string;
  thanks: string;
  cta: string;
};

type BookingConfirmedTeacherCopy = {
  subject: (studentName: string) => string;
  heroTitle: string;
  heroSubtitle: (studentName: string, date: string, time: string) => string;
  intro: (name: string) => string;
  labels: {
    student: string;
    discipline: string;
    date: string;
    time: string;
    duration: string;
    location: string;
    gross: string;
    commission: (pct: number) => string;
    net: string;
  };
  tipsTitle: string;
  tipsHtml: string;
  thanks: string;
  cta: string;
};

type PostClassReviewCopy = {
  subject: (teacherName: string) => string;
  heroTitle: string;
  heroSubtitle: (teacherName: string) => string;
  greeting: (studentName: string) => string;
  completed: (teacherName: string) => string;
  community: string;
  cta: string;
};

type ReminderStudentCopy = {
  subject24h: (teacherName: string) => string;
  subject1h: (teacherName: string) => string;
  hero24h: string;
  hero1h: string;
  intro24h: (studentName: string, teacherName: string) => string;
  intro1h: (studentName: string, teacherName: string) => string;
  labels: {
    teacher: string;
    discipline: string;
    date: string;
    time: string;
    format: string;
  };
  cta: string;
};

type ReminderTeacherCopy = {
  subject24h: (studentName: string) => string;
  subject1h: (studentName: string) => string;
  hero24h: string;
  hero1h: string;
  intro24h: (teacherName: string, studentName: string) => string;
  intro1h: (teacherName: string, studentName: string) => string;
  labels: {
    student: string;
    discipline: string;
    date: string;
    time: string;
    format: string;
  };
  cta: string;
};

export type BookingEmailCopy = {
  confirmedStudent: BookingConfirmedStudentCopy;
  confirmedTeacher: BookingConfirmedTeacherCopy;
  postClassReview: PostClassReviewCopy;
  reminderStudent: ReminderStudentCopy;
  reminderTeacher: ReminderTeacherCopy;
};

const BOOKING_EMAIL_COPY: Record<EmailLocale, BookingEmailCopy> = {
  fr: {
    confirmedStudent: {
      subject: (teacherName) => `Cours réservé avec ${teacherName} ✓`,
      heroTitle: "Cours confirmé !",
      heroSubtitle: (teacherName, date, time) => `Avec ${teacherName} — ${date} à ${time}`,
      intro: (name) => `Bonne nouvelle, ${name} — ton cours est officiellement confirmé !`,
      labels: {
        teacher: "Professeur",
        discipline: "Discipline",
        date: "Date",
        time: "Heure",
        duration: "Durée",
        location: "Lieu",
        total: "Montant total",
        credits: "Crédits appliqués",
        cardPaid: "Payé par carte",
      },
      tipsTitle: "Rappels importants",
      tipsHtml:
        "· Annulation gratuite jusqu'à <strong>24h avant</strong> le cours<br>" +
        "· Tu peux envoyer un message à ton professeur via l'application<br>" +
        "· Après le cours, partagez votre expérience — votre avis aide la communauté Pratiqo",
      thanks: "Merci de faire confiance à Pratiqo et à nos professeurs locaux. 🌱",
      cta: "Voir les détails",
    },
    confirmedTeacher: {
      subject: (studentName) => `Nouveau cours avec ${studentName} ! 🎉`,
      heroTitle: "Nouveau cours confirmé !",
      heroSubtitle: (studentName, date, time) => `${studentName} · ${date} à ${time}`,
      intro: (name) => `Excellent, ${name} — une nouvelle réservation vient d'être confirmée !`,
      labels: {
        student: "Élève",
        discipline: "Discipline",
        date: "Date",
        time: "Heure",
        duration: "Durée",
        location: "Lieu",
        gross: "Revenu brut",
        commission: (pct) => `Commission Pratiqo (${pct} %)`,
        net: "Ton revenu net",
      },
      tipsTitle: "Quelques conseils",
      tipsHtml:
        "· Présente-toi par message à ton élève avant le cours<br>" +
        "· Prépare un plan de leçon adapté à son niveau<br>" +
        "· Ajoute des notes après le cours pour suivre sa progression",
      thanks: "Merci d'être sur Pratiqo. Ensemble, on bâtit l'écosystème éducatif que le Québec mérite. 🇨🇦",
      cta: "Voir le cours",
    },
    postClassReview: {
      subject: (teacherName) => `Comment s'est passé votre cours avec ${teacherName} ?`,
      heroTitle: "Votre avis compte",
      heroSubtitle: (teacherName) => `Cours avec ${teacherName}`,
      greeting: (studentName) => `Bonjour ${studentName},`,
      completed: (teacherName) =>
        `Votre cours avec <strong>${teacherName}</strong> vient d'être marqué comme terminé.`,
      community:
        "Votre avis aide la communauté Pratiqo à choisir les bons professeurs. Prenez une minute pour partager votre expérience.",
      cta: "Laisser un avis",
    },
    reminderStudent: {
      subject24h: (teacherName) => `Rappel : cours demain avec ${teacherName}`,
      subject1h: (teacherName) => `Rappel : cours dans 1 h avec ${teacherName}`,
      hero24h: "Votre cours approche",
      hero1h: "Cours dans 1 heure",
      intro24h: (studentName, teacherName) =>
        `<p>Bonjour ${studentName},</p><p>Petit rappel : votre cours avec <strong>${teacherName}</strong> a lieu <strong>demain</strong>.</p>`,
      intro1h: (studentName, teacherName) =>
        `<p>Bonjour ${studentName},</p><p>Votre cours avec <strong>${teacherName}</strong> commence dans environ <strong>une heure</strong>.</p>`,
      labels: {
        teacher: "Professeur",
        discipline: "Discipline",
        date: "Date",
        time: "Heure",
        format: "Format",
      },
      cta: "Voir mon cours",
    },
    reminderTeacher: {
      subject24h: (studentName) => `Rappel : cours demain avec ${studentName}`,
      subject1h: (studentName) => `Rappel : cours dans 1 h avec ${studentName}`,
      hero24h: "Cours demain",
      hero1h: "Cours dans 1 heure",
      intro24h: (teacherName, studentName) =>
        `<p>Bonjour ${teacherName},</p><p>Rappel : vous avez un cours avec <strong>${studentName}</strong> <strong>demain</strong>.</p>`,
      intro1h: (teacherName, studentName) =>
        `<p>Bonjour ${teacherName},</p><p>Votre cours avec <strong>${studentName}</strong> commence dans environ <strong>une heure</strong>.</p>`,
      labels: {
        student: "Élève",
        discipline: "Discipline",
        date: "Date",
        time: "Heure",
        format: "Format",
      },
      cta: "Voir le cours",
    },
  },
  en: {
    confirmedStudent: {
      subject: (teacherName) => `Lesson booked with ${teacherName} ✓`,
      heroTitle: "Lesson confirmed!",
      heroSubtitle: (teacherName, date, time) => `With ${teacherName} — ${date} at ${time}`,
      intro: (name) => `Good news, ${name} — your lesson is officially confirmed!`,
      labels: {
        teacher: "Teacher",
        discipline: "Subject",
        date: "Date",
        time: "Time",
        duration: "Duration",
        location: "Location",
        total: "Total amount",
        credits: "Credits applied",
        cardPaid: "Paid by card",
      },
      tipsTitle: "Helpful reminders",
      tipsHtml:
        "· Free cancellation up to <strong>24 hours before</strong> the lesson<br>" +
        "· You can message your teacher in the app<br>" +
        "· After the lesson, share your experience — your review helps the Pratiqo community",
      thanks: "Thank you for trusting Pratiqo and our local teachers. 🌱",
      cta: "View details",
    },
    confirmedTeacher: {
      subject: (studentName) => `New lesson with ${studentName}! 🎉`,
      heroTitle: "New lesson confirmed!",
      heroSubtitle: (studentName, date, time) => `${studentName} · ${date} at ${time}`,
      intro: (name) => `Great news, ${name} — a new booking has been confirmed!`,
      labels: {
        student: "Student",
        discipline: "Subject",
        date: "Date",
        time: "Time",
        duration: "Duration",
        location: "Location",
        gross: "Gross earnings",
        commission: (pct) => `Pratiqo fee (${pct}%)`,
        net: "Your net earnings",
      },
      tipsTitle: "Quick tips",
      tipsHtml:
        "· Send your student a welcome message before the lesson<br>" +
        "· Prepare a lesson plan suited to their level<br>" +
        "· Add notes after the lesson to track their progress",
      thanks: "Thank you for teaching on Pratiqo. 🇨🇦",
      cta: "View lesson",
    },
    postClassReview: {
      subject: (teacherName) => `How was your lesson with ${teacherName}?`,
      heroTitle: "Your review matters",
      heroSubtitle: (teacherName) => `Lesson with ${teacherName}`,
      greeting: (studentName) => `Hello ${studentName},`,
      completed: (teacherName) =>
        `Your lesson with <strong>${teacherName}</strong> has been marked as completed.`,
      community:
        "Your review helps the Pratiqo community choose the right teachers. Take a minute to share your experience.",
      cta: "Leave a review",
    },
    reminderStudent: {
      subject24h: (teacherName) => `Reminder: lesson tomorrow with ${teacherName}`,
      subject1h: (teacherName) => `Reminder: lesson in 1 hour with ${teacherName}`,
      hero24h: "Your lesson is coming up",
      hero1h: "Lesson in 1 hour",
      intro24h: (studentName, teacherName) =>
        `<p>Hello ${studentName},</p><p>Quick reminder: your lesson with <strong>${teacherName}</strong> is <strong>tomorrow</strong>.</p>`,
      intro1h: (studentName, teacherName) =>
        `<p>Hello ${studentName},</p><p>Your lesson with <strong>${teacherName}</strong> starts in about <strong>one hour</strong>.</p>`,
      labels: {
        teacher: "Teacher",
        discipline: "Subject",
        date: "Date",
        time: "Time",
        format: "Format",
      },
      cta: "View my lesson",
    },
    reminderTeacher: {
      subject24h: (studentName) => `Reminder: lesson tomorrow with ${studentName}`,
      subject1h: (studentName) => `Reminder: lesson in 1 hour with ${studentName}`,
      hero24h: "Lesson tomorrow",
      hero1h: "Lesson in 1 hour",
      intro24h: (teacherName, studentName) =>
        `<p>Hello ${teacherName},</p><p>Reminder: you have a lesson with <strong>${studentName}</strong> <strong>tomorrow</strong>.</p>`,
      intro1h: (teacherName, studentName) =>
        `<p>Hello ${teacherName},</p><p>Your lesson with <strong>${studentName}</strong> starts in about <strong>one hour</strong>.</p>`,
      labels: {
        student: "Student",
        discipline: "Subject",
        date: "Date",
        time: "Time",
        format: "Format",
      },
      cta: "View lesson",
    },
  },
  es: {
    confirmedStudent: {
      subject: (teacherName) => `Clase reservada con ${teacherName} ✓`,
      heroTitle: "¡Clase confirmada!",
      heroSubtitle: (teacherName, date, time) => `Con ${teacherName} — ${date} a las ${time}`,
      intro: (name) => `¡Buenas noticias, ${name}! Tu clase está confirmada.`,
      labels: {
        teacher: "Profesor",
        discipline: "Disciplina",
        date: "Fecha",
        time: "Hora",
        duration: "Duración",
        location: "Lugar",
        total: "Monto total",
        credits: "Créditos aplicados",
        cardPaid: "Pagado con tarjeta",
      },
      tipsTitle: "Recordatorios",
      tipsHtml:
        "· Cancelación gratuita hasta <strong>24 h antes</strong> de la clase<br>" +
        "· Podés enviar un mensaje a tu profesor en la aplicación<br>" +
        "· Después de la clase, compartí tu experiencia — tu reseña ayuda a la comunidad Pratiqo",
      thanks: "Gracias por confiar en Pratiqo y en nuestros profesores locales. 🌱",
      cta: "Ver detalles",
    },
    confirmedTeacher: {
      subject: (studentName) => `¡Nueva clase con ${studentName}! 🎉`,
      heroTitle: "¡Nueva clase confirmada!",
      heroSubtitle: (studentName, date, time) => `${studentName} · ${date} a las ${time}`,
      intro: (name) => `Excelente, ${name} — se confirmó una nueva reserva.`,
      labels: {
        student: "Estudiante",
        discipline: "Disciplina",
        date: "Fecha",
        time: "Hora",
        duration: "Duración",
        location: "Lugar",
        gross: "Ingreso bruto",
        commission: (pct) => `Comisión Pratiqo (${pct} %)`,
        net: "Tu ingreso neto",
      },
      tipsTitle: "Consejos",
      tipsHtml:
        "· Presentate por mensaje antes de la clase<br>" +
        "· Prepará un plan adaptado a su nivel<br>" +
        "· Agregá notas después de la clase para seguir su progreso",
      thanks: "Gracias por enseñar en Pratiqo. 🇨🇦",
      cta: "Ver la clase",
    },
    postClassReview: {
      subject: (teacherName) => `¿Cómo fue tu clase con ${teacherName}?`,
      heroTitle: "Tu reseña importa",
      heroSubtitle: (teacherName) => `Clase con ${teacherName}`,
      greeting: (studentName) => `Hola ${studentName},`,
      completed: (teacherName) =>
        `Tu clase con <strong>${teacherName}</strong> fue marcada como completada.`,
      community:
        "Tu reseña ayuda a la comunidad de Pratiqo a elegir los profesores adecuados. Tómate un minuto para compartir tu experiencia.",
      cta: "Dejar una reseña",
    },
    reminderStudent: {
      subject24h: (teacherName) => `Recordatorio: clase mañana con ${teacherName}`,
      subject1h: (teacherName) => `Recordatorio: clase en 1 h con ${teacherName}`,
      hero24h: "Tu clase se acerca",
      hero1h: "Clase en 1 hora",
      intro24h: (studentName, teacherName) =>
        `<p>Hola ${studentName},</p><p>Recordatorio: tu clase con <strong>${teacherName}</strong> es <strong>mañana</strong>.</p>`,
      intro1h: (studentName, teacherName) =>
        `<p>Hola ${studentName},</p><p>Tu clase con <strong>${teacherName}</strong> comienza en aproximadamente <strong>una hora</strong>.</p>`,
      labels: {
        teacher: "Profesor",
        discipline: "Disciplina",
        date: "Fecha",
        time: "Hora",
        format: "Formato",
      },
      cta: "Ver mi clase",
    },
    reminderTeacher: {
      subject24h: (studentName) => `Recordatorio: clase mañana con ${studentName}`,
      subject1h: (studentName) => `Recordatorio: clase en 1 h con ${studentName}`,
      hero24h: "Clase mañana",
      hero1h: "Clase en 1 hora",
      intro24h: (teacherName, studentName) =>
        `<p>Hola ${teacherName},</p><p>Recordatorio: tenés una clase con <strong>${studentName}</strong> <strong>mañana</strong>.</p>`,
      intro1h: (teacherName, studentName) =>
        `<p>Hola ${teacherName},</p><p>Tu clase con <strong>${studentName}</strong> comienza en aproximadamente <strong>una hora</strong>.</p>`,
      labels: {
        student: "Estudiante",
        discipline: "Disciplina",
        date: "Fecha",
        time: "Hora",
        format: "Formato",
      },
      cta: "Ver la clase",
    },
  },
};

export function getBookingEmailCopy(locale?: EmailLocale): BookingEmailCopy {
  const resolved = resolveEmailLocaleFromOptional(locale);
  return BOOKING_EMAIL_COPY[resolved];
}
