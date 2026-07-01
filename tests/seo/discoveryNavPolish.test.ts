/**
 * Public discovery flow: nav, hub cross-links, sitemap, schema honesty.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  RESOURCE_GUIDE_GROUPS,
} from "../../lib/marketing/resourceGuideHub";
import { getPublishedResourceArticles } from "../../lib/seo/resourceArticles";
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

const headerSrc = read("components/marketing/LandingHeader.tsx");
const footerSrc = read("components/marketing/LandingFooter.tsx");
const blogHeaderSrc = read("components/blog/BlogPublicHeader.tsx");
const blogIndexSrc = read("app/(marketing)/blog/BlogIndexContent.tsx");
const hubSrc = read("app/(marketing)/ressources/RessourcesIndexContent.tsx");
const landingResourcesSrc = read("components/marketing/LandingResourcesSection.tsx");
const sitemapSrc = read("app/sitemap.ts");
const disciplinePageSrc = read("app/cours/[disciplineSlug]/page.tsx");
const teacherLinksSrc = read("components/seo/TeacherProfileSeoLinks.tsx");

test("desktop nav Ressources links to /ressources not /blog", () => {
  assert.match(headerSrc, /href="\/ressources"[\s\S]*?t\("navResources"\)/);
  assert.doesNotMatch(
    headerSrc,
    /hidden sm:inline-flex[\s\S]*?href="\/blog"[\s\S]*?navResources/,
  );
});

test("mobile nav Ressources links to /ressources", () => {
  assert.match(headerSrc, /href: "\/ressources", label: t\("navResources"\)/);
  assert.match(headerSrc, /href: "\/blog", label: t\("navBlog"\)/);
});

test("footer primary Ressources links to /ressources with optional Blog", () => {
  assert.match(footerSrc, /href="\/ressources"[\s\S]*?navResources/);
  assert.match(footerSrc, /href="\/blog"[\s\S]*?navBlog/);
});

test("blog header separates Ressources and Blog links", () => {
  assert.match(blogHeaderSrc, /href="\/ressources"[\s\S]*?navResources/);
  assert.match(blogHeaderSrc, /href="\/blog"[\s\S]*?navBlog/);
  assert.doesNotMatch(blogHeaderSrc, /blogNavResources/);
});

test("/blog index links back to /ressources with banner CTA", () => {
  assert.match(blogIndexSrc, /blogResourcesBanner/);
  assert.match(blogIndexSrc, /href="\/ressources"[\s\S]*?blogResourcesBannerCta/);
});

test("/ressources hub links to /blog and /trouver-un-prof", () => {
  assert.match(hubSrc, /href="\/blog"[\s\S]*?ressourcesSeeBlog/);
  assert.match(hubSrc, /href="\/trouver-un-prof"[\s\S]*?ressourcesFindTeachersCta/);
  assert.match(hubSrc, /href="\/devenir-professeur"[\s\S]*?ressourcesBecomeTeacherCta/);
});

test("/ressources hub groups all 7 published guides", () => {
  const published = getPublishedResourceArticles();
  assert.equal(published.length, 7);
  const groupedSlugs = RESOURCE_GUIDE_GROUPS.flatMap((g) => g.slugOrder);
  assert.equal(groupedSlugs.length, 7);
  for (const article of published) {
    assert.ok(groupedSlugs.includes(article.slug), `${article.slug} must appear in a hub group`);
    assert.match(hubSrc, new RegExp(`/ressources/\\$\\{article\\.slug\\}`));
  }
});

test("homepage learning section CTA links to /ressources", () => {
  assert.match(landingResourcesSrc, /href="\/ressources"/);
});

test("sitemap includes /ressources, all guides, and /blog hub", () => {
  assert.match(sitemapSrc, /resourceHubRoute/);
  assert.match(sitemapSrc, /getPublishedResourceArticles/);
  assert.match(sitemapSrc, /blogHubRoute/);
  assert.match(sitemapSrc, /`\$\{BASE_URL\}\/blog`/);
  assert.doesNotMatch(sitemapSrc, /redirect.*\/ressources/);
});

test("discipline landing pages link to matching resource guides when available", () => {
  assert.match(disciplinePageSrc, /getResourceArticleForDisciplineSlug/);
  assert.match(disciplinePageSrc, /resourceGuideHub/);
  assert.match(disciplinePageSrc, /href=\{`\/ressources\/\$\{resourceGuide\.slug\}`\}/);
});

test("teacher profile SEO links include /ressources and optional related guide", () => {
  assert.match(teacherLinksSrc, /href="\/ressources"/);
  assert.match(teacherLinksSrc, /\/ressources\/\$\{resourceGuide\.slug\}/);
});

test("no main nav resource label points only to /blog", () => {
  assert.match(headerSrc, /href="\/ressources"[\s\S]*?t\("navResources"\)/);
  assert.doesNotMatch(headerSrc, /<Link[\s\S]*?href="\/blog"[\s\S]*?t\("navResources"\)/);
  assert.match(blogHeaderSrc, /href="\/blog"[\s\S]*?t\("navBlog"\)/);
  assert.match(blogHeaderSrc, /href="\/ressources"[\s\S]*?t\("navResources"\)/);
});

test("resource and blog pages avoid fake commerce schema types", () => {
  const resourcePageSrc = read("app/(marketing)/ressources/[slug]/page.tsx");
  for (const src of [resourcePageSrc, blogIndexSrc, hubSrc]) {
    assert.doesNotMatch(src, /"@type":\s*"Review"/);
    assert.doesNotMatch(src, /"@type":\s*"AggregateRating"/);
    assert.doesNotMatch(src, /"@type":\s*"Product"/);
    assert.doesNotMatch(src, /"@type":\s*"Course"/);
    assert.doesNotMatch(src, /"@type":\s*"Event"/);
  }
});

test("resource article FAQ schema is only emitted when FAQ section is visible", () => {
  const resourcePageSrc = read("app/(marketing)/ressources/[slug]/page.tsx");
  assert.match(resourcePageSrc, /article\.faq\.length > 0 \? <FAQSchema/);
  assert.match(resourcePageSrc, /Foire aux questions/);
});

test("canonical domain uses www.pratiqo.ca for resources hub", () => {
  const hubPageSrc = read("app/(marketing)/ressources/page.tsx");
  assert.match(hubPageSrc, /SITE_URL/);
  assert.match(hubPageSrc, /canonical: `\$\{BASE_URL\}\/ressources`/);
  assert.equal(SITE_URL, "https://www.pratiqo.ca");
});

console.log("[seo:discoveryNavPolish] tests passed");
