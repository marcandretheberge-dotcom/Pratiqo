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

type BookingDeclinedStudentCopy = {
  subject: (teacherName: string) => string;
  heroTitle: string;
  heroSubtitle: (teacherName: string) => string;
  intro: (studentName: string, teacherName: string) => string;
  reassurance: string;
  paymentNote: string;
  nextStep: string;
  cta: string;
};

type BookingCancelledStudentCopy = {
  subject: (teacherName: string) => string;
  heroTitle: string;
  heroSubtitle: (teacherName: string, date: string, time: string) => string;
  intro: (studentName: string, teacherName: string) => string;
  labels: {
    teacher: string;
    date: string;
    time: string;
  };
  paymentNote: string;
  nextStep: string;
  cta: string;
};

type BookingCancelledTeacherCopy = {
  subject: (studentName: string) => string;
  heroTitle: string;
  heroSubtitle: (studentName: string, date: string, time: string) => string;
  intro: (teacherName: string, studentName: string) => string;
  labels: {
    student: string;
    date: string;
    time: string;
  };
  slotNote: string;
  cta: string;
};

type LessonPaymentReceiptCopy = {
  subject: (receiptNumber: string) => string;
  heroTitle: string;
  heroSubtitle: (receiptNumber: string) => string;
  intro: (studentName: string) => string;
  labels: {
    business: string;
    receiptNumber: string;
    paymentDate: string;
    lesson: string;
    teacher: string;
    amountPaid: string;
    currency: string;
    tax: string;
    subtotalBeforeTax: string;
    gst: string;
    qst: string;
    taxTotal: string;
  };
  taxLine: string;
  taxInclusiveNote: string;
  stripeReceipt: string;
  cta: string;
  thanks: string;
};

export type BookingEmailCopy = {
  confirmedStudent: BookingConfirmedStudentCopy;
  confirmedTeacher: BookingConfirmedTeacherCopy;
  postClassReview: PostClassReviewCopy;
  reminderStudent: ReminderStudentCopy;
  reminderTeacher: ReminderTeacherCopy;
  lessonPaymentReceipt: LessonPaymentReceiptCopy;
  declinedStudent: BookingDeclinedStudentCopy;
  cancelledStudent: BookingCancelledStudentCopy;
  cancelledTeacher: BookingCancelledTeacherCopy;
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
    lessonPaymentReceipt: {
      subject: (receiptNumber) => `Reçu Pratiqo ${receiptNumber}`,
      heroTitle: "Reçu de paiement",
      heroSubtitle: (receiptNumber) => `Reçu ${receiptNumber}`,
      intro: (studentName) => `Bonjour ${studentName}, voici votre reçu pour votre cours réservé sur Pratiqo.`,
      labels: {
        business: "Émetteur",
        receiptNumber: "Numéro de reçu",
        paymentDate: "Date de paiement",
        lesson: "Cours",
        teacher: "Professeur",
        amountPaid: "Total payé",
        currency: "Devise",
        tax: "Taxes",
        subtotalBeforeTax: "Sous-total avant taxes",
        gst: "TPS / GST",
        qst: "TVQ / QST",
        taxTotal: "Taxes incluses",
      },
      taxLine: "Taxes de vente non perçues pour le moment.",
      taxInclusiveNote:
        "Les taxes applicables sont incluses dans le total payé. Ce reçu reprend la ventilation calculée par Stripe au moment du paiement.",
      stripeReceipt: "Reçu Stripe",
      cta: "Ouvrir le reçu Stripe",
      thanks: "Merci de faire confiance à Pratiqo inc.",
    },
    declinedStudent: {
      subject: (teacherName) => `Réservation refusée — ${teacherName}`,
      heroTitle: "Demande non acceptée",
      heroSubtitle: (teacherName) => `${teacherName} n'a pas pu confirmer votre cours.`,
      intro: (studentName, teacherName) =>
        `Bonjour ${studentName}, ${teacherName} n'a pas pu accepter votre demande de cours.`,
      reassurance:
        "Cela peut arriver — plage horaire qui ne convenait plus, conflit d'agenda, ou simplement l'agenda du professeur qui s'est rempli.",
      paymentNote: "Si un paiement est concerné, vous pouvez suivre son état dans votre espace.",
      nextStep:
        "Il y a d'autres super profs sur Pratiqo qui pourraient correspondre à votre objectif. Lancez une nouvelle recherche pour trouver un cours adapté.",
      cta: "Trouver un autre professeur",
    },
    cancelledStudent: {
      subject: (teacherName) => `Cours annulé — ${teacherName}`,
      heroTitle: "Cours annulé",
      heroSubtitle: (teacherName, date, time) => `${teacherName} · ${date} à ${time}`,
      intro: (studentName, teacherName) =>
        `Bonjour ${studentName}, ${teacherName} a dû annuler le cours suivant.`,
      labels: {
        teacher: "Professeur",
        date: "Date",
        time: "Heure",
      },
      paymentNote: "Si un paiement est concerné, vous pouvez suivre son état dans votre espace.",
      nextStep:
        "Vous pouvez réserver un autre créneau avec ce professeur depuis son profil, ou explorer d'autres enseignants qui correspondent à votre objectif.",
      cta: "Voir mes paiements",
    },
    cancelledTeacher: {
      subject: (studentName) => `Cours annulé — ${studentName}`,
      heroTitle: "Cours annulé par l'élève",
      heroSubtitle: (studentName, date, time) => `${studentName} · ${date} à ${time}`,
      intro: (teacherName, studentName) =>
        `Bonjour ${teacherName}, ${studentName} a annulé le cours suivant.`,
      labels: {
        student: "Élève",
        date: "Date",
        time: "Heure",
      },
      slotNote:
        "Ce créneau redevient disponible pour d'autres élèves dès que vos disponibilités le permettent.",
      cta: "Voir mon horaire",
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
    lessonPaymentReceipt: {
      subject: (receiptNumber) => `Pratiqo receipt ${receiptNumber}`,
      heroTitle: "Payment receipt",
      heroSubtitle: (receiptNumber) => `Receipt ${receiptNumber}`,
      intro: (studentName) => `Hello ${studentName}, here is your receipt for your lesson booked on Pratiqo.`,
      labels: {
        business: "Issuer",
        receiptNumber: "Receipt number",
        paymentDate: "Payment date",
        lesson: "Lesson",
        teacher: "Teacher",
        amountPaid: "Total paid",
        currency: "Currency",
        tax: "Tax",
        subtotalBeforeTax: "Subtotal before tax",
        gst: "GST",
        qst: "QST",
        taxTotal: "Tax included",
      },
      taxLine: "Sales tax not collected at this time.",
      taxInclusiveNote:
        "Applicable taxes are included in the total paid. This receipt reflects the breakdown calculated by Stripe at checkout.",
      stripeReceipt: "Stripe receipt",
      cta: "Open Stripe receipt",
      thanks: "Thank you for trusting Pratiqo inc.",
    },
    declinedStudent: {
      subject: (teacherName) => `Booking declined — ${teacherName}`,
      heroTitle: "Request not accepted",
      heroSubtitle: (teacherName) => `${teacherName} couldn't confirm your lesson.`,
      intro: (studentName, teacherName) =>
        `Hi ${studentName}, ${teacherName} was unable to accept your lesson request.`,
      reassurance:
        "It happens — a time slot that no longer worked, a scheduling conflict, or simply a teacher whose calendar has filled up.",
      paymentNote: "If a payment is involved, you can follow its status in your account.",
      nextStep:
        "There are other great teachers on Pratiqo who could match your goal. Start a new search to find a lesson that fits.",
      cta: "Find another teacher",
    },
    cancelledStudent: {
      subject: (teacherName) => `Lesson cancelled — ${teacherName}`,
      heroTitle: "Lesson cancelled",
      heroSubtitle: (teacherName, date, time) => `${teacherName} · ${date} at ${time}`,
      intro: (studentName, teacherName) =>
        `Hi ${studentName}, ${teacherName} had to cancel the following lesson.`,
      labels: {
        teacher: "Teacher",
        date: "Date",
        time: "Time",
      },
      paymentNote: "If a payment is involved, you can follow its status in your account.",
      nextStep:
        "You can book another time slot with this teacher from their profile, or explore other teachers who match your goal.",
      cta: "View my payments",
    },
    cancelledTeacher: {
      subject: (studentName) => `Lesson cancelled — ${studentName}`,
      heroTitle: "Lesson cancelled by the student",
      heroSubtitle: (studentName, date, time) => `${studentName} · ${date} at ${time}`,
      intro: (teacherName, studentName) =>
        `Hi ${teacherName}, ${studentName} cancelled the following lesson.`,
      labels: {
        student: "Student",
        date: "Date",
        time: "Time",
      },
      slotNote:
        "This slot becomes available again for other students as soon as your schedule allows.",
      cta: "View my schedule",
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
    lessonPaymentReceipt: {
      subject: (receiptNumber) => `Recibo Pratiqo ${receiptNumber}`,
      heroTitle: "Recibo de pago",
      heroSubtitle: (receiptNumber) => `Recibo ${receiptNumber}`,
      intro: (studentName) => `Hola ${studentName}, este es tu recibo por la clase reservada en Pratiqo.`,
      labels: {
        business: "Emisor",
        receiptNumber: "Número de recibo",
        paymentDate: "Fecha de pago",
        lesson: "Clase",
        teacher: "Profesor",
        amountPaid: "Total pagado",
        currency: "Moneda",
        tax: "Impuestos",
        subtotalBeforeTax: "Subtotal antes de impuestos",
        gst: "GST / IVA federal",
        qst: "QST / impuesto provincial",
        taxTotal: "Impuestos incluidos",
      },
      taxLine: "Impuestos sobre ventas no cobrados por el momento.",
      taxInclusiveNote:
        "Los impuestos aplicables están incluidos en el total pagado. Este recibo refleja el desglose calculado por Stripe al pagar.",
      stripeReceipt: "Recibo de Stripe",
      cta: "Abrir recibo de Stripe",
      thanks: "Gracias por confiar en Pratiqo inc.",
    },
    declinedStudent: {
      subject: (teacherName) => `Reserva rechazada — ${teacherName}`,
      heroTitle: "Solicitud no aceptada",
      heroSubtitle: (teacherName) => `${teacherName} no pudo confirmar tu clase.`,
      intro: (studentName, teacherName) =>
        `Hola ${studentName}, ${teacherName} no pudo aceptar tu solicitud de clase.`,
      reassurance:
        "Puede pasar — un horario que ya no funcionaba, un conflicto de agenda o simplemente la agenda del profesor que se llenó.",
      paymentNote: "Si hay un pago relacionado, puedes seguir su estado en tu cuenta.",
      nextStep:
        "Hay otros excelentes profesores en Pratiqo que podrían encajar con tu objetivo. Iniciá una nueva búsqueda para encontrar la clase adecuada.",
      cta: "Buscar otro profesor",
    },
    cancelledStudent: {
      subject: (teacherName) => `Clase cancelada — ${teacherName}`,
      heroTitle: "Clase cancelada",
      heroSubtitle: (teacherName, date, time) => `${teacherName} · ${date} a las ${time}`,
      intro: (studentName, teacherName) =>
        `Hola ${studentName}, ${teacherName} tuvo que cancelar la siguiente clase.`,
      labels: {
        teacher: "Profesor",
        date: "Fecha",
        time: "Hora",
      },
      paymentNote: "Si hay un pago relacionado, puedes seguir su estado en tu cuenta.",
      nextStep:
        "Podés reservar otro horario con este profesor desde su perfil, o explorar otros profesores que encajen con tu objetivo.",
      cta: "Ver mis pagos",
    },
    cancelledTeacher: {
      subject: (studentName) => `Clase cancelada — ${studentName}`,
      heroTitle: "Clase cancelada por el estudiante",
      heroSubtitle: (studentName, date, time) => `${studentName} · ${date} a las ${time}`,
      intro: (teacherName, studentName) =>
        `Hola ${teacherName}, ${studentName} canceló la siguiente clase.`,
      labels: {
        student: "Estudiante",
        date: "Fecha",
        time: "Hora",
      },
      slotNote:
        "Este horario vuelve a estar disponible para otros estudiantes apenas tu agenda lo permita.",
      cta: "Ver mi agenda",
    },
  },
};

export function getBookingEmailCopy(locale?: EmailLocale): BookingEmailCopy {
  const resolved = resolveEmailLocaleFromOptional(locale);
  return BOOKING_EMAIL_COPY[resolved];
}
