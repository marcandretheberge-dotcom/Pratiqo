import { yoPublicCatalog } from "../yo/publicCatalog";

export const SITE_URL = "https://www.pratiqo.ca" as const;
export const SITE_HOSTNAME = "www.pratiqo.ca" as const;
export const SITE_NAME = "Pratiqo" as const;
export const DEFAULT_OG_IMAGE = "/og-image.png" as const;

export const SUPPORTED_SEO_LOCALES = ["fr", "en", "es"] as const;
export type SeoLocale = (typeof SUPPORTED_SEO_LOCALES)[number];

export const AUTH_ROUTE_PATHS = ["/login", "/connexion", "/auth", "/auth/"] as const;

export const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/admin/",
  "/api",
  "/api/",
  "/auth",
  "/auth/",
  "/checkout",
  "/checkout/",
  "/student",
  "/student/",
  "/teacher",
  "/teacher/",
  "/dashboard",
  "/onboarding",
  "/onboarding/",
  "/profile",
  "/profile/",
  "/messages",
  "/messages/",
  "/booking",
  "/booking/",
  "/reservations",
  "/reservations/",
  "/settings",
  "/settings/",
  "/account",
  "/account/",
  "/upgrade",
  "/loyalty",
  "/resolution",
] as const;

export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/auth/",
  "/admin",
  "/admin/",
  "/dashboard",
  "/onboarding",
  "/profile",
  "/messages",
  "/booking",
  "/checkout",
  "/checkout/",
  "/reservations",
  "/settings",
  "/account",
  "/upgrade",
  "/loyalty",
  "/resolution",
  "/teacher",
  "/teacher/",
  "/teacher/schedule",
  "/teacher/settings",
  "/teacher/verification",
  "/student",
  "/student/",
  "/student/choose-companion",
  "/student/progress",
  "/supabase",
] as const;

export const RENDER_ASSET_ALLOW_PREFIXES = [
  "/_next/",
  "/_next/static/",
  "/_next/image",
  "/favicon.ico",
  "/icon",
  "/apple-icon",
  "/manifest.json",
  "/fonts/",
  "/images/",
  "/icons/",
] as const;

export const PUBLIC_INDEXABLE_EXACT_PATHS = [
  "/",
  "/become-teacher",
  "/devenir-enseignant",
  "/francisation",
  "/group-sessions",
  "/tarifs",
  "/trouver-mon-prof",
  "/trouver-un-prof",
  "/uy",
  "/yo",
  "/yo/langues",
  ...yoPublicCatalog.map(course => course.landingRoute),
  "/blog",
  "/ressources",
  "/legal/accessibilite",
  "/legal/annulation",
  "/legal/cgu",
  "/legal/code-de-conduite",
  "/legal/conditions-professeurs",
  "/legal/confidentialite",
  "/legal/membre-pro",
  "/legal/paiements-remboursements",
  "/legal/yo-remboursement",
] as const;
