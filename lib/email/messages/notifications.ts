import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";

type CompanionEvolutionCopy = {
  subject: string;
  heroTitle: (name: string) => string;
  heroSubtitle: (oldStage: string, newStage: string) => string;
  intro: (companionName: string) => string;
  stageLine: (oldStage: string, newStage: string) => string;
  encouragement: string;
  ctaText: string;
};

type ProUpgradeCopy = {
  subject: string;
  heroTitle: (name: string) => string;
  heroSubtitle: string;
  intro: string;
  checklistTitle: string;
  checklist: string[];
  note: string;
  ctaText: string;
  footerExtra: string;
};

type ProCancellationCopy = {
  subject: string;
  heroTitle: (name: string) => string;
  heroSubtitle: string;
  intro: string;
  effectiveDateLabel: string;
  noDate: string;
  benefitsRemain: string;
  ctaText: string;
  footerExtra: string;
};

type IdentityVerifiedCopy = {
  subject: string;
  heroTitle: string;
  heroSubtitle: string;
  greeting: (name: string) => string;
  body: string;
  ctaText: string;
};

type IdentityFailedCopy = {
  subject: string;
  heroTitle: string;
  heroSubtitle: string;
  greeting: (name: string) => string;
  body: string;
  reasonLabel: string;
  support: string;
  ctaText: string;
};

type ReviewPublishedCopy = {
  subject: string;
  heroTitle: string;
  heroSubtitle: string;
  greeting: (name: string) => string;
  intro: string;
  emptyReview: string;
  authorFallback: string;
  trustNoteTitle: string;
  trustNoteBody: string;
  ctaText: string;
};

type NotificationEmailCopy = {
  companionEvolution: CompanionEvolutionCopy;
  proUpgrade: ProUpgradeCopy;
  proCancellation: ProCancellationCopy;
  identityVerified: IdentityVerifiedCopy;
  identityFailed: IdentityFailedCopy;
  reviewPublishedTeacher: ReviewPublishedCopy;
};

const COPY: Record<EmailLocale, NotificationEmailCopy> = {
  fr: {
    companionEvolution: {
      subject: "Votre compagnon a évolué 🎉",
      heroTitle: (name) => `${name}, votre compagnon a évolué !`,
      heroSubtitle: (oldStage, newStage) => `${oldStage} → ${newStage}`,
      intro: (companionName) => `${companionName} vient de franchir une nouvelle étape.`,
      stageLine: (oldStage, newStage) => `${oldStage} devient ${newStage}.`,
      encouragement:
        "Chaque cours complété construit votre parcours d'apprentissage, une étape à la fois.",
      ctaText: "Voir ma progression",
    },
    proUpgrade: {
      subject: "Votre abonnement Membre Pro est actif",
      heroTitle: (name) => `${name}, votre abonnement Membre Pro est actif`,
      heroSubtitle: "Votre abonnement mensuel est activé et se renouvelle automatiquement jusqu’à annulation.",
      intro:
        "Merci de faire partie de Pratiqo. Membre Pro coûte 29,99 $CA / mois + taxes applicables, facturé mensuellement à l’avance.",
      checklistTitle: "À retenir",
      checklist: [
        "Le renouvellement est automatique jusqu’à annulation.",
        "Vous pouvez gérer ou annuler l’abonnement dans votre espace enseignant, via le portail sécurisé Stripe.",
        "L’annulation prend effet à la fin de la période payée en cours.",
        "Membre Pro ne garantit pas de réservations, d’élèves, de classement, de visibilité ni de revenu.",
      ],
      note:
        "Les professeurs demeurent des travailleurs autonomes. Les résultats dépendent notamment de leur activité, disponibilité, tarification, demande et volume de réservations.",
      ctaText: "Gérer mon abonnement",
      footerExtra: "Membre Pro · Abonnement mensuel géré depuis le portail sécurisé Stripe.",
    },
    proCancellation: {
      subject: "Votre abonnement Membre Pro a été annulé",
      heroTitle: (name) => `${name}, votre abonnement Membre Pro est annulé`,
      heroSubtitle: "La modification a été enregistrée dans Stripe.",
      intro:
        "Votre abonnement Membre Pro est annulé ou son annulation est programmée.",
      effectiveDateLabel: "Date d’effet",
      noDate: "Voir les détails dans le portail Stripe.",
      benefitsRemain:
        "Si une période payée est encore en cours, vos avantages Membre Pro restent actifs jusqu’à la fin de cette période.",
      ctaText: "Gérer mon abonnement",
      footerExtra: "Membre Pro · Vous pouvez consulter les détails dans votre espace enseignant.",
    },
    identityVerified: {
      subject: "Votre identité a été vérifiée",
      heroTitle: "Votre identité a été vérifiée",
      heroSubtitle: "Votre profil peut maintenant afficher cette confirmation.",
      greeting: (name) => `Bonjour ${name},`,
      body:
        "Votre vérification d'identité a été complétée avec succès. Merci de contribuer à un environnement d'apprentissage plus fiable.",
      ctaText: "Voir mon tableau de bord",
    },
    identityFailed: {
      subject: "Nous n’avons pas pu vérifier votre identité",
      heroTitle: "La vérification n'a pas pu être complétée",
      heroSubtitle: "Vous pouvez réessayer ou contacter le support si vous avez besoin d'aide.",
      greeting: (name) => `Bonjour ${name},`,
      body:
        "Nous n'avons pas pu compléter la vérification d'identité avec les informations reçues.",
      reasonLabel: "Détail",
      support: "Si le problème persiste, répondez à ce courriel et notre équipe pourra vous aider.",
      ctaText: "Réessayer la vérification",
    },
    reviewPublishedTeacher: {
      subject: "Un nouvel avis a été publié sur votre profil",
      heroTitle: "Nouvel avis publié",
      heroSubtitle: "Un retour d'élève contribue à renforcer la confiance autour de votre profil.",
      greeting: (name) => `Bonjour ${name},`,
      intro: "Un élève vient de partager un avis après un cours.",
      emptyReview: "Aucun commentaire ajouté.",
      authorFallback: "Un élève",
      trustNoteTitle: "Pourquoi c'est utile",
      trustNoteBody:
        "Les avis aident les familles et les élèves à choisir un enseignant avec plus de confiance.",
      ctaText: "Voir mon profil",
    },
  },
  en: {
    companionEvolution: {
      subject: "Your companion evolved 🎉",
      heroTitle: (name) => `${name}, your companion evolved!`,
      heroSubtitle: (oldStage, newStage) => `${oldStage} → ${newStage}`,
      intro: (companionName) => `${companionName} has reached a new stage.`,
      stageLine: (oldStage, newStage) => `${oldStage} became ${newStage}.`,
      encouragement: "Each completed lesson builds your learning story, one step at a time.",
      ctaText: "View my progress",
    },
    proUpgrade: {
      subject: "Your Pro Member subscription is active",
      heroTitle: (name) => `${name}, your Pro Member subscription is active`,
      heroSubtitle: "Your monthly subscription is active and renews automatically until cancelled.",
      intro:
        "Thanks for being part of Pratiqo. Pro Member costs $29.99 CAD / month + applicable taxes, billed monthly in advance.",
      checklistTitle: "Keep in mind",
      checklist: [
        "Renewal is automatic until cancelled.",
        "You can manage or cancel the subscription from your teacher space through the secure Stripe portal.",
        "Cancellation takes effect at the end of the current paid billing period.",
        "Pro Member does not guarantee bookings, students, ranking, visibility, or income.",
      ],
      note:
        "Teachers remain independent contractors. Results depend on factors such as activity, availability, pricing, demand, and booking volume.",
      ctaText: "Manage my subscription",
      footerExtra: "Pro Member · Monthly subscription managed through the secure Stripe portal.",
    },
    proCancellation: {
      subject: "Your Pro Member subscription was cancelled",
      heroTitle: (name) => `${name}, your Pro Member subscription is cancelled`,
      heroSubtitle: "The change was recorded in Stripe.",
      intro:
        "Your Pro Member subscription is cancelled or scheduled for cancellation.",
      effectiveDateLabel: "Effective date",
      noDate: "See details in the Stripe portal.",
      benefitsRemain:
        "If a paid period is still in progress, your Pro Member benefits remain active until the end of that period.",
      ctaText: "Manage my subscription",
      footerExtra: "Pro Member · You can review details from your teacher space.",
    },
    identityVerified: {
      subject: "Your identity has been verified",
      heroTitle: "Your identity has been verified",
      heroSubtitle: "Your profile can now show this confirmation.",
      greeting: (name) => `Hi ${name},`,
      body:
        "Your identity verification was completed successfully. Thank you for helping keep Pratiqo a trusted learning space.",
      ctaText: "Go to my dashboard",
    },
    identityFailed: {
      subject: "We couldn’t verify your identity",
      heroTitle: "Verification could not be completed",
      heroSubtitle: "You can try again or contact support if you need help.",
      greeting: (name) => `Hi ${name},`,
      body: "We could not complete identity verification with the information received.",
      reasonLabel: "Detail",
      support: "If the issue continues, reply to this email and our team can help.",
      ctaText: "Try verification again",
    },
    reviewPublishedTeacher: {
      subject: "A new review was published on your profile",
      heroTitle: "New review published",
      heroSubtitle: "Student feedback helps build trust around your profile.",
      greeting: (name) => `Hi ${name},`,
      intro: "A student just shared a review after a lesson.",
      emptyReview: "No comment added.",
      authorFallback: "A student",
      trustNoteTitle: "Why it matters",
      trustNoteBody:
        "Reviews help families and students choose a teacher with more confidence.",
      ctaText: "View my profile",
    },
  },
  es: {
    companionEvolution: {
      subject: "Tu compañero evolucionó 🎉",
      heroTitle: (name) => `${name}, tu compañero evolucionó!`,
      heroSubtitle: (oldStage, newStage) => `${oldStage} → ${newStage}`,
      intro: (companionName) => `${companionName} alcanzó una nueva etapa.`,
      stageLine: (oldStage, newStage) => `${oldStage} se convirtió en ${newStage}.`,
      encouragement: "Cada clase completada construye tu historia de aprendizaje, paso a paso.",
      ctaText: "Ver mi progreso",
    },
    proUpgrade: {
      subject: "Tu suscripción Miembro Pro está activa",
      heroTitle: (name) => `${name}, tu suscripción Miembro Pro está activa`,
      heroSubtitle: "Tu suscripción mensual está activa y se renueva automáticamente hasta su cancelación.",
      intro:
        "Gracias por formar parte de Pratiqo. Miembro Pro cuesta 29,99 $CA / mes + impuestos aplicables, facturado mensualmente por adelantado.",
      checklistTitle: "Ten en cuenta",
      checklist: [
        "La renovación es automática hasta su cancelación.",
        "Puedes gestionar o cancelar la suscripción desde tu espacio docente mediante el portal seguro de Stripe.",
        "La cancelación entra en vigor al final del período pagado en curso.",
        "Miembro Pro no garantiza reservas, estudiantes, posicionamiento, visibilidad ni ingresos.",
      ],
      note:
        "Los profesores siguen siendo trabajadores independientes. Los resultados dependen, entre otros factores, de la actividad, disponibilidad, precios, demanda y volumen de reservas.",
      ctaText: "Gestionar mi suscripción",
      footerExtra: "Miembro Pro · Suscripción mensual gestionada mediante el portal seguro de Stripe.",
    },
    proCancellation: {
      subject: "Tu suscripción Miembro Pro fue cancelada",
      heroTitle: (name) => `${name}, tu suscripción Miembro Pro está cancelada`,
      heroSubtitle: "El cambio fue registrado en Stripe.",
      intro:
        "Tu suscripción Miembro Pro está cancelada o programada para cancelarse.",
      effectiveDateLabel: "Fecha de efecto",
      noDate: "Consulta los detalles en el portal de Stripe.",
      benefitsRemain:
        "Si todavía hay un período pagado en curso, tus beneficios Miembro Pro siguen activos hasta el final de ese período.",
      ctaText: "Gestionar mi suscripción",
      footerExtra: "Miembro Pro · Puedes revisar los detalles desde tu espacio docente.",
    },
    identityVerified: {
      subject: "Tu identidad fue verificada",
      heroTitle: "Tu identidad fue verificada",
      heroSubtitle: "Tu perfil ya puede mostrar esta confirmación.",
      greeting: (name) => `Hola ${name},`,
      body:
        "Tu verificación de identidad se completó correctamente. Gracias por ayudar a mantener Pratiqo como un espacio de aprendizaje confiable.",
      ctaText: "Ir a mi panel",
    },
    identityFailed: {
      subject: "No pudimos verificar tu identidad",
      heroTitle: "La verificación no pudo completarse",
      heroSubtitle: "Puedes intentarlo de nuevo o contactar al soporte si necesitas ayuda.",
      greeting: (name) => `Hola ${name},`,
      body: "No pudimos completar la verificación de identidad con la información recibida.",
      reasonLabel: "Detalle",
      support: "Si el problema continúa, responde a este correo y nuestro equipo podrá ayudarte.",
      ctaText: "Intentar la verificación de nuevo",
    },
    reviewPublishedTeacher: {
      subject: "Se publicó una nueva reseña en tu perfil",
      heroTitle: "Nueva reseña publicada",
      heroSubtitle: "Los comentarios de estudiantes ayudan a generar confianza en tu perfil.",
      greeting: (name) => `Hola ${name},`,
      intro: "Un estudiante acaba de compartir una reseña después de una clase.",
      emptyReview: "No se agregó ningún comentario.",
      authorFallback: "Un estudiante",
      trustNoteTitle: "Por qué importa",
      trustNoteBody:
        "Las reseñas ayudan a familias y estudiantes a elegir un profesor con más confianza.",
      ctaText: "Ver mi perfil",
    },
  },
};

export function getNotificationEmailCopy(locale?: EmailLocale): NotificationEmailCopy {
  return COPY[resolveEmailLocaleFromOptional(locale)];
}
