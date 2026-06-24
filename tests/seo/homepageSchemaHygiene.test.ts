/**
 * Homepage JSON-LD hygiene — conservative Organization + WebSite only.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "../../lib/seo/site";

const root = join(__dirname, "..", "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const homepageJsonLdSrc = read("components/marketing/LandingOrgJsonLd.tsx");
const resourceArticleSrc = read("app/(marketing)/ressources/[slug]/page.tsx");
const teacherProfileSrc = read("app/professeurs/[slug]/page.tsx");
const sitemapSrc = read("app/sitemap.ts");

const FORBIDDEN_HOMEPAGE_TYPES = ["Course", "Product", "Event", "Offer", "OfferCatalog", "Review", "AggregateRating", "LocalBusiness"];

test("homepage JSON-LD emits Organization and WebSite", () => {
  assert.match(homepageJsonLdSrc, /"@type":\s*"Organization"/);
  assert.match(homepageJsonLdSrc, /"@type":\s*"WebSite"/);
  assert.match(homepageJsonLdSrc, /"@graph"/);
  assert.match(homepageJsonLdSrc, /legalName:\s*"Cours Pratiqo Inc\."/);
  assert.match(homepageJsonLdSrc, /url:\s*SITE_URL/);
});

test("homepage JSON-LD does not emit unsupported commerce or rating types", () => {
  for (const type of FORBIDDEN_HOMEPAGE_TYPES) {
    assert.doesNotMatch(homepageJsonLdSrc, new RegExp(`"@type":\\s*"${type}"`));
    assert.doesNotMatch(homepageJsonLdSrc, new RegExp(`"@type":\\s*\\[[^\\]]*"${type}"`));
  }
  assert.doesNotMatch(homepageJsonLdSrc, /hasOfferCatalog/);
  assert.doesNotMatch(homepageJsonLdSrc, /priceRange/);
});

test("homepage remains wired through LandingOrgJsonLd on app/page.tsx", () => {
  const homepageSrc = read("app/page.tsx");
  assert.match(homepageSrc, /<LandingOrgJsonLd\s*\/>/);
  assert.match(homepageSrc, /canonical:\s*SITE_URL/);
});

test("resource guide pages still emit Article schema with BreadcrumbList", () => {
  assert.match(resourceArticleSrc, /"@type":\s*"Article"/);
  assert.match(resourceArticleSrc, /"@type":\s*"BreadcrumbList"/);
  assert.doesNotMatch(resourceArticleSrc, /"@type":\s*"Course"/);
  assert.doesNotMatch(resourceArticleSrc, /"@type":\s*"Product"/);
});

test("teacher profile SEO route still uses dedicated public profile JSON-LD builder", () => {
  assert.match(teacherProfileSrc, /buildTeacherPublicProfileJsonLd/);
  assert.doesNotMatch(teacherProfileSrc, /hasOfferCatalog/);
});

test("sitemap still includes resources hub, guides, blog, and teacher profile fetch", () => {
  assert.match(sitemapSrc, /resourceHubRoute/);
  assert.match(sitemapSrc, /getPublishedResourceArticles/);
  assert.match(sitemapSrc, /blogHubRoute/);
  assert.match(sitemapSrc, /fetchTeacherEntries/);
});

console.log("[seo:homepageSchemaHygiene] tests passed");
