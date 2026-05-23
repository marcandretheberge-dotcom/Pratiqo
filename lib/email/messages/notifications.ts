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
      subject: "Votre profil Pratiqo Pro est actif",
      heroTitle: (name) => `${name}, votre profil Pratiqo Pro est actif`,
      heroSubtitle: "Vous pouvez maintenant gérer votre profil enseignant avec vos options Pro.",
      intro:
        "Merci de faire partie de Pratiqo. Votre espace Pro est prêt pour vous aider à présenter un profil clair, complet et à jour.",
      checklistTitle: "À garder à jour",
      checklist: [
        "Vos disponibilités",
        "Votre photo et votre biographie",
        "Vos prix et formats de cours",
        "Vos informations de vérification",
      ],
      note:
        "Les options Pro soutiennent votre visibilité sur la plateforme, sans promesse de résultat.",
      ctaText: "Voir mon profil",
      footerExtra: "Pratiqo Pro · Vous pouvez gérer votre abonnement depuis votre espace enseignant.",
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
      subject: "Your Pratiqo Pro profile is active",
      heroTitle: (name) => `${name}, your Pratiqo Pro profile is active`,
      heroSubtitle: "You can now manage your teacher profile with your Pro options.",
      intro:
        "Thanks for being part of Pratiqo. Your Pro space is ready to help you keep your teacher profile clear, complete, and up to date.",
      checklistTitle: "Keep these up to date",
      checklist: [
        "Your availability",
        "Your photo and bio",
        "Your prices and lesson formats",
        "Your verification information",
      ],
      note: "Pro options support your visibility on the platform, without promising outcomes.",
      ctaText: "View my profile",
      footerExtra: "Pratiqo Pro · You can manage your subscription from your teacher space.",
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
      subject: "Tu perfil Pratiqo Pro está activo",
      heroTitle: (name) => `${name}, tu perfil Pratiqo Pro está activo`,
      heroSubtitle: "Ya puedes gestionar tu perfil docente con tus opciones Pro.",
      intro:
        "Gracias por formar parte de Pratiqo. Tu espacio Pro está listo para ayudarte a mantener tu perfil claro, completo y actualizado.",
      checklistTitle: "Mantén esto actualizado",
      checklist: [
        "Tu disponibilidad",
        "Tu foto y biografía",
        "Tus precios y formatos de clase",
        "Tu información de verificación",
      ],
      note:
        "Las opciones Pro apoyan tu visibilidad en la plataforma, sin prometer resultados.",
      ctaText: "Ver mi perfil",
      footerExtra: "Pratiqo Pro · Puedes gestionar tu suscripción desde tu espacio docente.",
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
