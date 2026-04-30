import type { MetadataRoute } from "next";

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
          // Teacher-side private pages
          "/teacher/schedule",
          "/teacher/settings",
          "/teacher/verification",
          // Student-side private pages
          "/student/choose-companion",
          "/student/progress",
          // Internal / debug pages
          "/supabase",
        ],
      },
    ],
    sitemap: "https://pratiqo.ca/sitemap.xml",
  };
}
