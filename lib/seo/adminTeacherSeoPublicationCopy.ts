import type { Locale } from "@/lib/i18n/types";
import type { TeacherGoogleSeoPublicationStatus, TeacherSeoMissingReasonKey } from "@/lib/seo/teacherSeoPublication";

type AdminTeacherSeoPublicationCopy = {
  sectionTitle: string;
  sectionDescription: string;
  googleSeoStatusLabels: Record<TeacherGoogleSeoPublicationStatus, string>;
  marketplaceVisibilityLabel: string;
  marketplacePublic: string;
  marketplacePrivate: string;
  marketplaceOptedOut: string;
  teacherRequestLabel: string;
  teacherRequestYes: string;
  teacherRequestNo: string;
  sitemapLabel: string;
  sitemapIncluded: string;
  sitemapExcluded: string;
  paymentStatusLabel: string;
  paymentActive: string;
  paymentInactive: string;
  payoutStatusLabel: string;
  payoutActive: string;
  payoutInactive: string;
  markerLabel: string;
  markerAbsent: string;
  disclaimerIndexing: string;
  disclaimerTeacherConsent: string;
  blockersTitle: string;
  warningsTitle: string;
  paymentWarningLabel: string;
  publishButton: string;
  removeFromGoogleButton: string;
  hideMarketplaceButton: string;
  requestCorrectionsButton: string;
  previewButton: string;
  publishConfirm: string;
  removeFromGoogleConfirm: string;
  hideMarketplaceConfirm: string;
  requestCorrectionsConfirm: string;
  publishSuccess: string;
  removeFromGoogleSuccess: string;
  hideMarketplaceSuccess: string;
  requestCorrectionsSuccess: string;
  missingReasonLabels: Record<TeacherSeoMissingReasonKey, string>;
  payoutBlockerNote: string;
};

const COPY: Record<Locale, AdminTeacherSeoPublicationCopy> = {
  fr: {
    sectionTitle: "Publication SEO Google",
    sectionDescription:
      "Contrôlez l'indexation Google et l'inclusion au sitemap. La visibilité marketplace Pratiqo est gérée séparément.",
    googleSeoStatusLabels: {
      not_published: "Non publié",
      requested: "Demandé",
      blocked: "Bloqué",
      ready_to_publish: "Prêt à publier",
      published_in_google: "Publié dans Google",
    },
    marketplaceVisibilityLabel: "Visibilité marketplace Pratiqo",
    marketplacePublic: "Visible dans la recherche Pratiqo",
    marketplacePrivate: "Masqué de la recherche Pratiqo",
    marketplaceOptedOut: "Profil masqué volontairement",
    teacherRequestLabel: "Demande du professeur",
    teacherRequestYes: "Demandé",
    teacherRequestNo: "Non demandé",
    sitemapLabel: "Sitemap Google",
    sitemapIncluded: "Inclus",
    sitemapExcluded: "Exclu",
    markerLabel: "Marqueur admin (public_profile_last_indexable_at)",
    markerAbsent: "Absent",
    disclaimerIndexing:
      "Cette option contrôle l'indexation Google et l'ajout au sitemap. Elle ne garantit pas le classement dans Google.",
    disclaimerTeacherConsent:
      "Le professeur doit d'abord avoir un profil complet et accepter la publication publique.",
    blockersTitle: "Éléments manquants ou bloquants",
    publishButton: "Publier dans Google",
    removeFromGoogleButton: "Retirer de Google",
    hideMarketplaceButton: "Rendre le profil privé sur Pratiqo",
    requestCorrectionsButton: "Demander corrections",
    previewButton: "Prévisualiser le profil",
    publishConfirm: "Publier ce profil dans Google (sitemap + indexation) ?",
    removeFromGoogleConfirm:
      "Retirer ce profil de Google et du sitemap (sans masquer le marketplace Pratiqo) ?",
    hideMarketplaceConfirm: "Masquer ce profil de la recherche Pratiqo (opt-out marketplace) ?",
    requestCorrectionsConfirm:
      "Demander des corrections (retire le consentement SEO et dépublie) ?",
    publishSuccess: "Profil publié dans Google.",
    removeFromGoogleSuccess: "Profil retiré de Google et du sitemap.",
    hideMarketplaceSuccess: "Profil masqué de la recherche Pratiqo.",
    requestCorrectionsSuccess:
      "Demande de corrections envoyée — le professeur devra soumettre à nouveau.",
    missingReasonLabels: {
      display_name: "Nom public manquant",
      public_bio: "Bio publique insuffisante",
      main_subject: "Matière principale manquante",
      location_or_format: "Ville/région ou format en ligne manquant",
      teaching_format: "Format d'enseignement non défini",
      onboarding_incomplete: "Onboarding incomplet",
      admin_hidden: "Profil masqué par l'administration",
      identity_failed: "Vérification d'identité échouée",
      unsupported_market: "Marché non pris en charge",
      search_consent_missing: "Consentement Google manquant",
      public_profile_intent_missing: "Demande de publication manquante",
      slug_missing: "URL publique (slug) manquante",
      not_admin_published: "En attente de publication admin",
    },
    paymentStatusLabel: "Paiements activés",
    paymentActive: "Oui",
    paymentInactive: "Non",
    payoutStatusLabel: "Versements activés",
    payoutActive: "Oui",
    payoutInactive: "Non",
    warningsTitle: "À surveiller",
    paymentWarningLabel: "Paiements non configurés",
    payoutBlockerNote:
      "Le profil peut rester visible, mais Stripe Connect doit être terminé avant d'accepter des réservations payées.",
  },
  en: {
    sectionTitle: "Google SEO publication",
    sectionDescription:
      "Control Google indexing and sitemap inclusion. Pratiqo marketplace visibility is managed separately.",
    googleSeoStatusLabels: {
      not_published: "Not published",
      requested: "Requested",
      blocked: "Blocked",
      ready_to_publish: "Ready to publish",
      published_in_google: "Published in Google",
    },
    marketplaceVisibilityLabel: "Pratiqo marketplace visibility",
    marketplacePublic: "Visible in Pratiqo search",
    marketplacePrivate: "Hidden from Pratiqo search",
    marketplaceOptedOut: "Hidden from marketplace",
    teacherRequestLabel: "Teacher request",
    teacherRequestYes: "Requested",
    teacherRequestNo: "Not requested",
    sitemapLabel: "Google sitemap",
    sitemapIncluded: "Included",
    sitemapExcluded: "Excluded",
    markerLabel: "Admin marker (public_profile_last_indexable_at)",
    markerAbsent: "Absent",
    disclaimerIndexing:
      "This option controls Google indexing and sitemap inclusion. It does not guarantee Google ranking.",
    disclaimerTeacherConsent:
      "The teacher must first have a complete profile and accept public publication.",
    blockersTitle: "Missing or blocking items",
    publishButton: "Publish in Google",
    removeFromGoogleButton: "Remove from Google",
    hideMarketplaceButton: "Make profile private on Pratiqo",
    requestCorrectionsButton: "Request corrections",
    previewButton: "Preview profile",
    publishConfirm: "Publish this profile in Google (sitemap + indexing)?",
    removeFromGoogleConfirm:
      "Remove this profile from Google and the sitemap (without hiding from Pratiqo marketplace)?",
    hideMarketplaceConfirm: "Hide this profile from Pratiqo search (marketplace opt-out)?",
    requestCorrectionsConfirm:
      "Request corrections (removes SEO consent and unpublishes)?",
    publishSuccess: "Profile published in Google.",
    removeFromGoogleSuccess: "Profile removed from Google and the sitemap.",
    hideMarketplaceSuccess: "Profile hidden from Pratiqo search.",
    requestCorrectionsSuccess:
      "Correction request sent — the teacher must submit again.",
    missingReasonLabels: {
      display_name: "Missing public name",
      public_bio: "Insufficient public bio",
      main_subject: "Missing main subject",
      location_or_format: "Missing city/region or online format",
      teaching_format: "Teaching format not set",
      onboarding_incomplete: "Onboarding incomplete",
      admin_hidden: "Profile hidden by admin",
      identity_failed: "Identity verification failed",
      unsupported_market: "Unsupported market",
      search_consent_missing: "Missing Google consent",
      public_profile_intent_missing: "Missing publication request",
      slug_missing: "Missing public URL (slug)",
      not_admin_published: "Waiting for admin publication",
    },
    paymentStatusLabel: "Payments enabled",
    paymentActive: "Yes",
    paymentInactive: "No",
    payoutStatusLabel: "Payouts enabled",
    payoutActive: "Yes",
    payoutInactive: "No",
    warningsTitle: "Watch",
    paymentWarningLabel: "Payments not configured",
    payoutBlockerNote:
      "The profile can remain visible, but Stripe Connect must be completed before accepting paid bookings.",
  },
  es: {
    sectionTitle: "Publicación SEO en Google",
    sectionDescription:
      "Controla la indexación en Google y la inclusión en el sitemap. La visibilidad en el marketplace de Pratiqo se gestiona por separado.",
    googleSeoStatusLabels: {
      not_published: "No publicado",
      requested: "Solicitado",
      blocked: "Bloqueado",
      ready_to_publish: "Listo para publicar",
      published_in_google: "Publicado en Google",
    },
    marketplaceVisibilityLabel: "Visibilidad en el marketplace Pratiqo",
    marketplacePublic: "Visible en la búsqueda de Pratiqo",
    marketplacePrivate: "Oculto de la búsqueda de Pratiqo",
    marketplaceOptedOut: "Perfil oculto voluntariamente",
    teacherRequestLabel: "Solicitud del profesor",
    teacherRequestYes: "Solicitado",
    teacherRequestNo: "No solicitado",
    sitemapLabel: "Sitemap de Google",
    sitemapIncluded: "Incluido",
    sitemapExcluded: "Excluido",
    markerLabel: "Marcador admin (public_profile_last_indexable_at)",
    markerAbsent: "Ausente",
    disclaimerIndexing:
      "Esta opción controla la indexación en Google y la inclusión en el sitemap. No garantiza el posicionamiento en Google.",
    disclaimerTeacherConsent:
      "El profesor debe tener primero un perfil completo y aceptar la publicación pública.",
    blockersTitle: "Elementos faltantes o bloqueantes",
    publishButton: "Publicar en Google",
    removeFromGoogleButton: "Retirar de Google",
    hideMarketplaceButton: "Hacer el perfil privado en Pratiqo",
    requestCorrectionsButton: "Solicitar correcciones",
    previewButton: "Vista previa del perfil",
    publishConfirm: "¿Publicar este perfil en Google (sitemap + indexación)?",
    removeFromGoogleConfirm:
      "¿Retirar este perfil de Google y del sitemap (sin ocultarlo del marketplace de Pratiqo)?",
    hideMarketplaceConfirm: "¿Ocultar este perfil de la búsqueda de Pratiqo (opt-out marketplace)?",
    requestCorrectionsConfirm:
      "¿Solicitar correcciones (retira el consentimiento SEO y despublica)?",
    publishSuccess: "Perfil publicado en Google.",
    removeFromGoogleSuccess: "Perfil retirado de Google y del sitemap.",
    hideMarketplaceSuccess: "Perfil oculto de la búsqueda de Pratiqo.",
    requestCorrectionsSuccess:
      "Solicitud de correcciones enviada — el profesor deberá volver a enviar.",
    missingReasonLabels: {
      display_name: "Nombre público faltante",
      public_bio: "Biografía pública insuficiente",
      main_subject: "Materia principal faltante",
      location_or_format: "Ciudad/región o formato en línea faltante",
      teaching_format: "Formato de enseñanza no definido",
      onboarding_incomplete: "Onboarding incompleto",
      admin_hidden: "Perfil oculto por administración",
      identity_failed: "Verificación de identidad fallida",
      unsupported_market: "Mercado no compatible",
      search_consent_missing: "Consentimiento de Google faltante",
      public_profile_intent_missing: "Solicitud de publicación faltante",
      slug_missing: "URL pública (slug) faltante",
      not_admin_published: "En espera de publicación admin",
    },
    paymentStatusLabel: "Pagos activados",
    paymentActive: "Sí",
    paymentInactive: "No",
    payoutStatusLabel: "Transferencias activadas",
    payoutActive: "Sí",
    payoutInactive: "No",
    warningsTitle: "A vigilar",
    paymentWarningLabel: "Pagos no configurados",
    payoutBlockerNote:
      "El perfil puede seguir visible, pero Stripe Connect debe completarse antes de aceptar reservas pagadas.",
  },
};

export function getAdminTeacherSeoPublicationCopy(locale: Locale = "fr"): AdminTeacherSeoPublicationCopy {
  return COPY[locale] ?? COPY.fr;
}
