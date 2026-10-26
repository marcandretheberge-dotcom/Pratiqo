import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import robots from "../../app/robots";
import * as publicProfile from "../../lib/seo/teacherPublicProfile";
import { shouldIncludeInSitemap } from "../../lib/seo/sitemap";

const requireFromRoot = createRequire(path.join(process.cwd(), "package.json"));
const { resolveRobots } = requireFromRoot("next/dist/build/webpack/loaders/metadata/resolve-route-data") as {
  resolveRobots: (data: ReturnType<typeof robots>) => string;
};

// Evaluate the serialized directives using longest-path precedence, as Google
// does. Allow wins equal-length ties. No network request or database is used.
function mayCrawl(url: string): boolean {
  const pathname = new URL(url, "https://www.pratiqo.ca").pathname;
  const matches = resolveRobots(robots()).split("\n").flatMap((line) => {
    const match = /^(Allow|Disallow):\s*(.+)$/.exec(line);
    return match && pathname.startsWith(match[2])
      ? [{ allow: match[1] === "Allow", length: match[2].length }] : [];
  });
  matches.sort((a, b) => b.length - a.length || Number(b.allow) - Number(a.allow));
  return matches[0]?.allow ?? true;
}

test("serialized robots permits canonical signals on public legacy details only", () => {
  const text = resolveRobots(robots());
  assert.match(text, /Allow: \/teacher\/profile\/\n/);
  assert.match(text, /Sitemap: https:\/\/www\.pratiqo\.ca\/sitemap\.xml/);
  for (const url of ["/teacher/profile/11111111-1111-4111-8111-111111111111", "/teacher/profile/example?ref=old", "/professeurs/example", "/cours/francais/saint-georges", "/_next/static/example.js"]) {
    assert.equal(mayCrawl(url), true, url);
  }
  for (const url of ["/teacher", "/teacher/profile", "/teacher/profile-settings", "/teacher/settings", "/teacher/schedule", "/teacher/verification", "/admin", "/student/search", "/api/teachers", "/auth/callback"]) {
    assert.equal(mayCrawl(url), false, url);
  }
  assert.equal(shouldIncludeInSitemap("https://www.pratiqo.ca/teacher/profile/11111111-1111-4111-8111-111111111111"), false);
});

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  name: "Marie Test",
  bio: "Une biographie de professeur suffisamment détaillée pour le profil public de test.",
  discipline: "Français",
  category: "Langues",
  city: "Saint-Georges",
  region: "QC",
  teaching_mode: "both",
  is_public: true,
  public_profile_enabled: true,
  search_indexing_consent: true,
  public_profile_slug: "marie-t-francais-saint-georges",
  public_profile_last_indexable_at: "2026-10-01T00:00:00Z",
  teacher_onboarding_complete: true,
  profile_is_active: true,
  subject_count: 1,
};

type Fixture = {
  seo?: Partial<typeof row>;
  missing?: boolean;
  inactiveOwner?: boolean;
};

// Execute the actual route exports with synthetic read-only dependencies.
// Next's real redirect/notFound functions and real consent eligibility are used.
function loadRoute(fixture: Fixture = {}) {
  const supabase = {
    from(table: string) {
      const query = {
        column: "", value: "",
        select() { return query; },
        eq(column: string, value: string) { query.column = column; query.value = value; return query; },
        async maybeSingle() {
          if (table === "profiles") return { data: { is_active: !fixture.inactiveOwner }, error: null };
          if (table !== "teachers_public") throw new Error(`Unexpected table: ${table}`);
          return { data: !fixture.missing && row[query.column as "id" | "user_id"] === query.value ? row : null, error: null };
        },
      };
      return query;
    },
  };
  const mocks: Record<string, unknown> = {
    "@/lib/supabaseAdmin": { getSupabaseAdmin: () => supabase },
    "@/lib/supabase/queries": { TEACHERS_PUBLIC_TABLE: "teachers_public", TEACHERS_LIST_SELECT: "*", TEACHERS_LIST_SELECT_LEGACY_PUBLIC: "*" },
    "@/lib/teacherDisciplines": { fetchTeacherDisciplinesMap: async () => new Map(), mergeTeachersWithDisciplines: (teachers: unknown[]) => teachers },
    "@/lib/teacherTeachingZones": { attachPublicTeachingZones: async (_client: unknown, teachers: unknown[]) => teachers },
    "@/lib/teacherMapper": { teacherRowToTeacher: (input: typeof row) => ({ ...input, location: {}, pricePerLesson: 40, reviews: 0, rating: 0 }) },
    "@/lib/constants/vocabulary": { buildTeacherSeoTitle: () => "Marie | Pratiqo", buildTeacherSeoDescription: () => row.bio, buildJobTitle: () => "Professeur" },
    "@/lib/geoLocale": { usdToUyu: (value: number) => value },
    "@/lib/teacherPhoto": { resolveTeacherPublicPhoto: () => null },
    "@/lib/teacherProfile/sanitizePublicBio": { sanitizePublicTeacherBio: (content: string) => ({ content }) },
    "@/lib/identity/displayName": { formatPublicTeacherDisplayName: () => "Marie T." },
    "./TeacherProfileClient": { default: () => null },
    "@/lib/seo/site": { SITE_URL: "https://www.pratiqo.ca" },
    "@/lib/seo/jsonLd": { serializeJsonLd: JSON.stringify },
    "@/lib/uuid": { isUuidString: (value: string) => /^[0-9a-f-]{36}$/.test(value) },
    "@/lib/seo/teacherPublicProfileData": { fetchTeacherPublicSeoRowById: async () => ({ ...row, ...fixture.seo }) },
    "@/lib/seo/teacherPublicProfile": publicProfile,
  };
  const source = readFileSync(path.join(process.cwd(), "app/teacher/profile/[id]/page.tsx"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const routeModule = { exports: {} };
  const requireMock = (id: string) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
    if (["react", "react/jsx-runtime", "next/navigation"].includes(id)) return requireFromRoot(id);
    throw new Error(`Unmocked route dependency: ${id}`);
  };
  new Function("require", "module", "exports", compiled.outputText)(requireMock, routeModule, routeModule.exports);
  return routeModule.exports as {
    default: (props: { params: Promise<{ id: string }> }) => Promise<unknown>;
    generateMetadata: (props: { params: Promise<{ id: string }> }) => Promise<{ robots: unknown; alternates: { canonical: string } }>;
  };
}

const props = (id = row.id) => ({ params: Promise.resolve({ id }) });
const canonical = `https://www.pratiqo.ca/professeurs/${row.public_profile_slug}`;
const isRedirectToCanonical = (error: unknown) => (error as { digest?: string }).digest === `NEXT_REDIRECT;replace;/professeurs/${row.public_profile_slug};308;`;

test("eligible teacher ID permanently redirects to the canonical slug", async () => {
  const route = loadRoute();
  await assert.rejects(() => route.default(props()), isRedirectToCanonical);
  assert.equal((await route.generateMetadata(props())).alternates.canonical, canonical);
});

test("eligible owner ID reaches the canonical slug without an intermediate profile ID", async () => {
  await assert.rejects(() => loadRoute().default(props(row.user_id)), isRedirectToCanonical);
});

for (const [name, seo] of [
  ["consent withdrawn", { search_indexing_consent: false }],
  ["no admin publication", { public_profile_last_indexable_at: "" }],
  ["public SEO profile disabled", { public_profile_enabled: false }],
  ["onboarding incomplete", { teacher_onboarding_complete: false }],
] as const) {
  test(`${name}: legacy detail remains noindex without canonical promotion`, async () => {
    const route = loadRoute({ seo });
    await route.default(props());
    const metadata = await route.generateMetadata(props());
    assert.deepEqual(metadata.robots, { index: false, follow: false });
    assert.equal(metadata.alternates.canonical, `https://www.pratiqo.ca/teacher/profile/${row.id}`);
  });
}

for (const [name, fixture] of [["missing teacher", { missing: true }], ["inactive owner", { inactiveOwner: true }]] as const) {
  test(`${name}: returns notFound and cannot redirect to an indexable profile`, async () => {
    const route = loadRoute(fixture);
    await assert.rejects(() => route.default(props()), (error: unknown) => (error as { digest?: string }).digest === "NEXT_HTTP_ERROR_FALLBACK;404");
    assert.deepEqual((await route.generateMetadata(props())).robots, { index: false, follow: false });
  });
}
