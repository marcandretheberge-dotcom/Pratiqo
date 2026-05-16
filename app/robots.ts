import type { MetadataRoute } from "next";
import { LOCALES } from "../lib/i18n/routing";
import { SITE_URL } from "../lib/seo/site";

const PRIVATE_ROBOT_PATHS = [
  // Infrastructure and server-side APIs, never crawled.
  "/api/",
  "/auth/",
  // Admin and reserved paths.
  "/admin",
  "/admin/",
  "/supabase",
  // Authenticated-only app shell pages.
  "/dashboard",
  "/onboarding",
  "/profile",
  "/messages",
  "/booking",
  "/upgrade",
  "/loyalty",
  "/resolution",
  // Student-side private pages. The root catches every student app route.
  "/student",
  "/student/",
  // Teacher-side private pages. Do not block /teacher/profile or /teacher/profile/*.
  "/teacher/group-sessions",
  "/teacher/history",
  "/teacher/my-profile",
  "/teacher/progress",
  "/teacher/revenue",
  "/teacher/schedule",
  "/teacher/settings",
  "/teacher/verification",
] as const;

function privateRobotPathsWithLocales(): string[] {
  const localized = LOCALES.flatMap((locale) =>
    PRIVATE_ROBOT_PATHS.map((path) => `/${locale}${path}`),
  );

  return [...PRIVATE_ROBOT_PATHS, ...localized];
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRobotPathsWithLocales(),
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
