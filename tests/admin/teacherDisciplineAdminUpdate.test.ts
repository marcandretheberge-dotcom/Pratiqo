/**
 * Admin teacher discipline correction + draft musique mislabel guards.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADMIN_TEACHER_DISCIPLINE_OPTIONS,
  isAdminTeacherDisciplineId,
  isUnsetDraftMusicCategory,
  resolveAdminDisciplineUpdate,
} from "@/lib/teachers/adminDiscipline";
import { DRAFT_TEACHER_ROW_INSERT } from "@/lib/teachers/ensureTeacherProfileRow";
import {
  formatTeacherCardDisciplines,
  getTeacherDisciplineDisplayLabels,
} from "@/lib/teacherMapper";
import type { Teacher } from "@/types";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function baseTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Alex Langues",
    discipline: "—",
    category: "music" as Teacher["category"],
    rating: 0,
    reviews: 0,
    distance: 0,
    pricePerLesson: 40,
    bio: "",
    imageUrl: "https://picsum.photos/seed/teacher/400/400",
    availability: [],
    location: { lat: 0, lng: 0 },
    isVerified: false,
    teachingMode: "both",
    languages: [],
    levels: [],
    ...overrides,
  };
}

test("canonical admin discipline options include langues and musique", () => {
  const ids = ADMIN_TEACHER_DISCIPLINE_OPTIONS.map((o) => o.id);
  assert.ok(ids.includes("langues"));
  assert.ok(ids.includes("musique"));
  assert.ok(ids.includes("francisation"));
  assert.ok(ids.includes("tuteurs"));
  assert.ok(ids.includes("zumba"));
  assert.ok(ids.includes("natation"));
  assert.ok(ids.includes("aquaforme"));
  assert.equal(isAdminTeacherDisciplineId("langues"), true);
  assert.equal(isAdminTeacherDisciplineId("not-a-discipline"), false);
  assert.equal(isAdminTeacherDisciplineId(null), false);
});

test("resolveAdminDisciplineUpdate syncs discipline label and legacy category", () => {
  const langues = resolveAdminDisciplineUpdate("langues");
  assert.ok(langues);
  assert.equal(langues!.disciplineId, "langues");
  assert.equal(langues!.disciplineLabel, "Langues");
  assert.equal(langues!.category, "Langues");

  const musique = resolveAdminDisciplineUpdate("musique");
  assert.ok(musique);
  assert.equal(musique!.category, "Musique");

  assert.equal(resolveAdminDisciplineUpdate("bogus"), null);
});

test("draft insert no longer defaults category to music", () => {
  assert.notEqual(DRAFT_TEACHER_ROW_INSERT.category, "music");
  assert.notEqual(DRAFT_TEACHER_ROW_INSERT.category, "musique");
  assert.notEqual(DRAFT_TEACHER_ROW_INSERT.category, "Musique");
  assert.equal(isUnsetDraftMusicCategory("music", "—"), true);
  assert.equal(isUnsetDraftMusicCategory("Musique", "Piano"), false);
});

test("legacy draft music + placeholder discipline does not display as Musique", () => {
  const labels = getTeacherDisciplineDisplayLabels(
    baseTeacher({ discipline: "—", category: "music" as Teacher["category"] }),
  );
  assert.ok(!labels.includes("Musique"));
  assert.equal(labels[0], "Autre");
  assert.notEqual(
    formatTeacherCardDisciplines(
      baseTeacher({ discipline: "—", category: "music" as Teacher["category"] }),
    ),
    "Musique",
  );
});

test("real music teacher with piano discipline still displays piano", () => {
  const labels = getTeacherDisciplineDisplayLabels(
    baseTeacher({ discipline: "Piano", category: "Musique" }),
  );
  assert.ok(labels.some((l) => /piano/i.test(l)));
});

test("admin API route requires admin, validates discipline, updates teachers + teacher_disciplines", () => {
  const route = read("app/api/admin/users/[id]/teacher-discipline/route.ts");
  assert.match(route, /requireAdminApi/);
  assert.match(route, /isAdminTeacherDisciplineId/);
  assert.match(route, /resolveAdminDisciplineUpdate/);
  assert.match(route, /\.from\("teachers"\)/);
  assert.match(route, /\.from\("teacher_disciplines"\)/);
  assert.match(route, /insertAdminRoleChangeAudit/);
  assert.match(route, /invalid_discipline/);
  assert.doesNotMatch(route, /from ["']@?\/?.*stripe/i);
  assert.doesNotMatch(route, /marketplace_discovery_opt_out/);
});

test("admin user detail mounts discipline correction card", () => {
  const page = read("app/(app)/admin/users/[id]/page.tsx");
  assert.match(page, /TeacherDisciplineAdminCard/);
  assert.match(page, /teacherDisciplineSnapshot/);
  const card = read("components/admin/TeacherDisciplineAdminCard.tsx");
  assert.match(card, /admin-teacher-discipline-select/);
  assert.match(card, /\/api\/admin\/users\/\$\{targetUserId\}\/teacher-discipline/);
  assert.match(card, /method:\s*"PATCH"/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[admin:teacherDisciplineAdminUpdate] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
