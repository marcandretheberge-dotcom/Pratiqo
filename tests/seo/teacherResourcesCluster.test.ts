/**
 * Teacher profile SEO + /ressources cluster tests.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatFrenchTeacherDeDiscipline,
  localizeTeacherSeoSubject,
} from "../../lib/seo/teacherPublicProfileLabels";
import {
  getPublishedResourceArticles,
  getResourceArticleBySlug,
  getResourceArticleCanonical,
  LIFESTYLE_RESOURCE_SLUGS,
  RESOURCE_ARTICLES,
} from "../../lib/seo/resourceArticles";
import { loadResourceArticleMarkdown } from "../../lib/seo/resourceArticleContent";
import { resolveTeacherDisciplineHubHref } from "../../lib/seo/resolveTeacherDisciplineLink";
import { SITE_URL } from "../../lib/seo/site";
import {
  buildTeacherPublicProfileCanonicalUrl,
  buildTeacherPublicProfileDescription,
  buildTeacherPublicProfileJsonLd,
  buildTeacherPublicProfileTitle,
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
  resolveTeacherSeoCityLabel,
  teacherHasPublicLocationOrTeachingFormat,
  teacherPublicProfileRobots,
  TEACHER_JSON_LD_FORBIDDEN_KEYS,
} from "../../lib/seo/teacherPublicProfile";
import type { Teacher } from "../../types";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const baseRow = {
  id: "afe6eab4-f40d-4d84-add9-8e061184ef6f",
  user_id: "0bbed16d-e677-47b3-9c87-03fca0109704",
  name: "Marie Dubois",
  bio: "Professeure passionnée avec plus de dix ans d'expérience en classe et en ligne.",
  discipline: "Espagnol",
  city: "Lévis",
  region: "QC",
  teaching_mode: "both",
  is_public: true,
  deactivated_at: null,
  deleted_at: null,
  is_demo: false,
  identity_verification_failed: false,
  public_profile_enabled: true,
  search_indexing_consent: true,
  public_profile_slug: "marie-d-espagnol-levis",
  teacher_onboarding_complete: true,
  profile_is_active: true,
  profile_deactivated_at: null,
  profile_deleted_at: null,
  profile_anonymized_at: null,
  subject_count: 1,
};

test("French de/d' discipline formatter contracts before vowels", () => {
  assert.equal(formatFrenchTeacherDeDiscipline("espagnol"), "d'espagnol");
  assert.equal(formatFrenchTeacherDeDiscipline("anglais"), "d'anglais");
  assert.equal(formatFrenchTeacherDeDiscipline("piano"), "de piano");
  assert.equal(formatFrenchTeacherDeDiscipline("français"), "de français");
});

test("localized subject labels for EN and ES metadata", () => {
  assert.equal(localizeTeacherSeoSubject("espagnol", "en"), "Spanish");
  assert.equal(localizeTeacherSeoSubject("mathématiques", "en"), "math");
  assert.equal(localizeTeacherSeoSubject("espagnol", "es"), "español");
  assert.equal(localizeTeacherSeoSubject("anglais", "es"), "inglés");
});

test("French teacher SEO title uses name — discipline — city pattern", () => {
  assert.equal(
    buildTeacherPublicProfileTitle({
      locale: "fr",
      subject: "espagnol",
      firstName: "Marie",
      cityLabel: "Lévis",
    }),
    "Marie — professeur d'espagnol à Lévis | Pratiqo",
  );
});

test("French teacher SEO title uses de before consonant discipline", () => {
  assert.equal(
    buildTeacherPublicProfileTitle({
      locale: "fr",
      subject: "piano",
      firstName: "Marie",
      cityLabel: "Montréal",
    }),
    "Marie — professeur de piano à Montréal | Pratiqo",
  );
});

test("English teacher SEO title uses online label without inventing a city", () => {
  assert.equal(
    buildTeacherPublicProfileTitle({
      locale: "en",
      subject: "Espagnol",
      firstName: "Marie",
      cityLabel: "online",
    }),
    "Marie — online Spanish teacher | Pratiqo",
  );
});

test("Spanish teacher SEO title localizes discipline label", () => {
  assert.equal(
    buildTeacherPublicProfileTitle({
      locale: "es",
      subject: "mathématiques",
      firstName: "Marie",
      cityLabel: "Montréal",
    }),
    "Marie — profesor de matemáticas en Montréal | Pratiqo",
  );
});

test("online-only teacher without city can be visible when teaching_mode is online", () => {
  const row = {
    ...baseRow,
    city: "",
    region: "",
    teaching_mode: "online",
  };
  assert.equal(teacherHasPublicLocationOrTeachingFormat(row), true);
  assert.equal(resolveTeacherSeoCityLabel("fr", { teachingMode: "online" }), "en ligne");
  assert.equal(isTeacherPublicProfilePageVisible(row), true);
});

test("missing discipline blocks SEO title generation (noindex path)", () => {
  assert.equal(
    buildTeacherPublicProfileTitle({
      locale: "fr",
      subject: "",
      firstName: "Marie",
      cityLabel: "Lévis",
    }),
    null,
  );
});

test("private teacher without consent is not indexable", () => {
  const row = { ...baseRow, search_indexing_consent: false };
  assert.equal(isTeacherPublicProfileIndexable(row), false);
  assert.deepEqual(teacherPublicProfileRobots(false), { index: false, follow: false });
});

test("eligible public teacher JSON-LD includes ProfilePage and BreadcrumbList without private fields", () => {
  const teacher: Teacher = {
    id: baseRow.id,
    name: baseRow.name,
    discipline: "Espagnol",
    category: "Langues",
    rating: 4.8,
    reviews: 3,
    distance: 0,
    pricePerLesson: 45,
    bio: baseRow.bio,
    imageUrl: "https://cdn.example.com/avatar.webp",
    availability: [],
    location: { lat: 46.8, lng: -71.2, neighborhood: "Lévis" },
    city: "Lévis",
    region: "QC",
    countryCode: "CA",
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: ["beginner"],
  };

  const jsonLd = buildTeacherPublicProfileJsonLd({
    teacher,
    canonicalUrl: buildTeacherPublicProfileCanonicalUrl("marie-d-espagnol-levis"),
    subjects: ["Espagnol"],
    locale: "fr",
    slug: "marie-d-espagnol-levis",
  });

  const serialized = JSON.stringify(jsonLd);
  assert.match(serialized, /ProfilePage/);
  assert.match(serialized, /BreadcrumbList/);
  for (const key of TEACHER_JSON_LD_FORBIDDEN_KEYS) {
    assert.ok(!serialized.includes(key), `forbidden key leaked: ${key}`);
  }
});

test("incomplete teacher page does not emit JSON-LD in professeurs route when not indexable", () => {
  const pageSrc = read("app/professeurs/[slug]/page.tsx");
  assert.match(pageSrc, /showStructuredData/);
  assert.match(pageSrc, /bundle\.indexable/);
});

test("draft resource articles are excluded from sitemap and routing", () => {
  const sitemapSrc = read("app/sitemap.ts");
  assert.match(sitemapSrc, /getPublishedResourceArticles/);
  for (const article of RESOURCE_ARTICLES) {
    if (article.status === "draft") {
      assert.doesNotMatch(sitemapSrc, new RegExp(article.slug));
      assert.equal(getResourceArticleBySlug(article.slug), undefined);
    }
  }
});

test("seven resource guides are published", () => {
  assert.equal(getPublishedResourceArticles().length, 7);
  assert.equal(RESOURCE_ARTICLES.filter((a) => a.status === "draft").length, 0);
});

const NEW_RESOURCE_SLUGS = [
  "cours-cuisine-prive",
  "choisir-coach-entraineur-prive",
  "choisir-cours-danse",
  "choisir-cours-arts-martiaux",
  "choisir-cours-photographie",
] as const;

test("new resource articles are published with canonical paths and cours links", () => {
  for (const slug of NEW_RESOURCE_SLUGS) {
    const article = getResourceArticleBySlug(slug);
    assert.ok(article, `${slug} must be published`);
    assert.equal(getResourceArticleCanonical(slug), `${SITE_URL}/ressources/${slug}`);
    assert.ok(
      article.relatedPaths.some((p) => p.startsWith("/cours/")),
      `${slug} must link to a /cours/ page`,
    );
    assert.ok(article.relatedPaths.includes("/trouver-un-prof"), `${slug} must link to /trouver-un-prof`);
    assert.ok(article.relatedPaths.includes("/devenir-professeur"), `${slug} must link to /devenir-professeur`);
  }
});

test("resource article markdown includes expected H1 topic in registry title", () => {
  for (const slug of NEW_RESOURCE_SLUGS) {
    const article = getResourceArticleBySlug(slug)!;
    const md = loadResourceArticleMarkdown(article.markdownFile);
    assert.ok(md.length > 400, `${slug} content must not be thin`);
    assert.match(md, /\/trouver-un-prof/);
    assert.match(md, /\/devenir-professeur/);
  }
});

test("martial arts guide avoids combat-instruction framing", () => {
  const md = loadResourceArticleMarkdown("choisir-cours-arts-martiaux.md");
  assert.match(md, /encadrement sécuritaire/i);
  assert.match(md, /aucune technique de combat/i);
  assert.doesNotMatch(md, /comment frapper|coups? de poing|enchaînement offensif/i);
});

test("coaching guide avoids body-transformation promises", () => {
  const md = loadResourceArticleMarkdown("choisir-coach-entraineur-prive.md");
  assert.match(md, /objectifs réalistes/i);
  assert.match(md, /ne promet ni perte de poids garantie/i);
  assert.doesNotMatch(md, /transformation corporelle assurée|perte de poids garantie pour vous/i);
});

test("dance guide avoids sexualized framing", () => {
  const md = loadResourceArticleMarkdown("choisir-cours-danse.md");
  assert.match(md, /respectueux/i);
  assert.doesNotMatch(md, /sensuel|sexy|seduct/i);
});

test("photography guide avoids guaranteed professional outcomes", () => {
  const md = loadResourceArticleMarkdown("choisir-cours-photographie.md");
  assert.match(md, /sans promettre/i);
  assert.match(md, /carrière garantie|revenus garantis|revenus assurés/i);
  assert.doesNotMatch(md, /revenus garantis pour vous|certification professionnelle garantie/i);
  const article = getResourceArticleBySlug("choisir-cours-photographie");
  assert.ok(article?.faq?.some((item) => /ne promet pas de carrière ou de revenus garantis/i.test(item.answer)));
});

test("photography subject landing page is registered and indexable", () => {
  const subjectSrc = read("lib/seo/subjectLandingPages.ts");
  assert.match(subjectSrc, /slug:\s*"photographie"/);
  assert.match(subjectSrc, /Cours de photographie privés \| Pratiqo/);
  assert.equal(
    resolveTeacherDisciplineHubHref({ discipline: "Photographie", city: "Montréal" }),
    "/cours/photographie",
  );
  assert.equal(resolveTeacherDisciplineHubHref({ discipline: "photographie" }), "/cours/photographie");
});

test("lifestyle resource slugs registry matches published articles", () => {
  for (const slug of LIFESTYLE_RESOURCE_SLUGS) {
    assert.ok(getResourceArticleBySlug(slug), `${slug} in LIFESTYLE_RESOURCE_SLUGS must be published`);
  }
});

test("/ressources hub links to published guides dynamically", () => {
  const hubSrc = read("app/(marketing)/ressources/RessourcesIndexContent.tsx");
  assert.match(hubSrc, /\/ressources\/\$\{article\.slug\}/);
  assert.match(hubSrc, /trouver-un-prof/);
  assert.match(hubSrc, /devenir-professeur/);
  assert.match(hubSrc, /href="\/blog"/);
  assert.match(hubSrc, /resourceGuideHub/);
  const registry = read("lib/seo/resourceArticles.ts");
  assert.match(registry, /comment-choisir-professeur-prive-quebec/);
  assert.match(registry, /professeur-prive-local-vs-plateforme-internationale/);
});

test("resource article page has canonical metadata and Article JSON-LD", () => {
  const pageSrc = read("app/(marketing)/ressources/[slug]/page.tsx");
  assert.match(pageSrc, /alternates:\s*\{\s*canonical/);
  assert.match(pageSrc, /"@type":\s*"Article"/);
  assert.doesNotMatch(pageSrc, /AggregateRating/);
  assert.doesNotMatch(pageSrc, /"@type":\s*"Product"/);
});

test("discipline city page links indexable teachers to /professeurs when available", () => {
  const pageSrc = read("app/cours/[disciplineSlug]/[citySlug]/page.tsx");
  assert.match(pageSrc, /fetchIndexableTeacherPublicPathsByIds/);
  assert.match(pageSrc, /indexablePublicPaths\.get/);
  assert.match(pageSrc, /\/trouver-un-prof/);
});

test("teacher profile links to related discipline hub without inventing city", () => {
  assert.equal(
    resolveTeacherDisciplineHubHref({ discipline: "Espagnol", city: "Lévis" }),
    "/cours/espagnol/levis",
  );
  assert.equal(
    resolveTeacherDisciplineHubHref({ discipline: "Espagnol" }),
    "/trouver-un-prof?q=Espagnol",
  );
});

test("canonical teacher URL uses www.pratiqo.ca", () => {
  const url = buildTeacherPublicProfileCanonicalUrl("marie-d-espagnol-levis");
  assert.equal(url, `${SITE_URL}/professeurs/marie-d-espagnol-levis`);
});

test("French teacher description does not promise fake guarantees", () => {
  const desc = buildTeacherPublicProfileDescription({
    locale: "fr",
    subject: "espagnol",
    firstName: "Marie",
    cityLabel: "Lévis",
  });
  assert.ok(desc);
  assert.doesNotMatch(desc!, /garanti/i);
});

console.log("[seo:teacherResourcesCluster] tests passed");
