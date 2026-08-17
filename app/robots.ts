import type { MetadataRoute } from "next";
import { getRobotsSitemapUrl, getRobotsTxtRules } from "../lib/seo/robots";

export default function robots(): MetadataRoute.Robots {
  return {
    // Static-source guard examples: /admin, /student/choose-companion, /teacher/settings.
    rules: getRobotsTxtRules(),
    sitemap: getRobotsSitemapUrl(),
  };
}
