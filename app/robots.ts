import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Infrastructure & server-side APIs — never crawled
          "/api/",
          "/auth/",
          // Admin & reserved paths (may not exist yet but must stay private)
          "/admin",
          "/admin/",
          // Authenticated-only pages
          "/dashboard",
          "/onboarding",
          "/profile",
          "/messages",
          "/booking",
          "/upgrade",
          "/loyalty",
          "/resolution",
          // Teacher-side private pages
          "/teacher/schedule",
          "/teacher/settings",
          "/teacher/verification",
          // Student-side private pages
          "/student",
          "/student/",
          "/student/choose-companion",
          "/student/progress",
          // Internal / debug pages
          "/supabase",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
