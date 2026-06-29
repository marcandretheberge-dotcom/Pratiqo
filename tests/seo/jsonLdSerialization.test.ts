import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

import { serializeJsonLd } from "../../lib/seo/jsonLd";
import { buildTeacherPublicProfileCanonicalUrl, buildTeacherPublicProfileJsonLd } from "../../lib/seo/teacherPublicProfile";
import type { Teacher } from "../../types";

const REPO_ROOT = process.cwd();
const MALICIOUS = '</script><script>window.__PRATIQO_XSS__=true</script>';

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function walk(dir: string): string[] {
  const absolute = join(REPO_ROOT, dir);
  if (!existsSync(absolute)) return [];

  return readdirSync(absolute).flatMap((entry) => {
    const full = join(absolute, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(relative(REPO_ROOT, full));
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    return [relative(REPO_ROOT, full).replace(/\\/g, "/")];
  });
}

test("serializeJsonLd escapes script-breaking characters without mutating input", () => {
  const value = {
    name: MALICIOUS,
    ampersand: "cours & tutorat",
    separators: "line\u2028paragraph\u2029",
  };
  const before = structuredClone(value);

  const serialized = serializeJsonLd(value);

  assert.deepEqual(value, before);
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.doesNotMatch(serialized, /<script>/i);
  assert.doesNotMatch(serialized, /[<>&]/);
  assert.match(serialized, /\\u003c\/script\\u003e/i);
  assert.match(serialized, /\\u003cscript\\u003e/i);
  assert.match(serialized, /\\u0026/);
  assert.match(serialized, /\\u2028/);
  assert.match(serialized, /\\u2029/);
  assert.equal(JSON.parse(serialized).name, MALICIOUS);
});

test("teacher public JSON-LD serialization cannot break out with teacher-controlled fields", () => {
  const teacher: Teacher = {
    id: "teacher-xss",
    name: MALICIOUS,
    discipline: MALICIOUS,
    category: MALICIOUS,
    rating: 0,
    reviews: 0,
    distance: 0,
    pricePerLesson: 45,
    bio: MALICIOUS,
    imageUrl: "https://cdn.example.com/avatar.webp",
    availability: [],
    location: { lat: 46.8, lng: -71.2, neighborhood: MALICIOUS },
    city: MALICIOUS,
    region: "QC",
    countryCode: "CA",
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: ["beginner"],
  };

  const jsonLd = buildTeacherPublicProfileJsonLd({
    teacher,
    canonicalUrl: buildTeacherPublicProfileCanonicalUrl("teacher-xss"),
    subjects: [MALICIOUS],
    locale: "fr",
    slug: "teacher-xss",
  });
  const serialized = serializeJsonLd(jsonLd);

  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.doesNotMatch(serialized, /<script>/i);
  assert.doesNotMatch(serialized, /[<>&]/);
  assert.match(serialized, /\\u003c/);
  assert.equal(JSON.parse(serialized)["@context"], "https://schema.org");
});

test("all JSON-LD script injections use serializeJsonLd instead of raw JSON.stringify", () => {
  const files = [...walk("app"), ...walk("components")];
  const offenders = files.filter((file) => {
    const src = read(file);
    return (
      src.includes('type="application/ld+json"') &&
      /dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify/.test(src)
    );
  });

  assert.deepEqual(offenders, []);
});

test("high-risk public SEO pages import and use the shared JSON-LD serializer", () => {
  const fixedFiles = [
    "app/professeurs/[slug]/page.tsx",
    "app/teacher/profile/[id]/page.tsx",
    "app/cours/[disciplineSlug]/[citySlug]/page.tsx",
    "app/tuteurs/[citySlug]/page.tsx",
    "app/clases/montevideo/[barrioSlug]/page.tsx",
  ];

  for (const file of fixedFiles) {
    const src = read(file);
    assert.match(src, /serializeJsonLd/);
    assert.doesNotMatch(src, /dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify/);
  }
});

