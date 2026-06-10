import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  DOMINICAN_RD_COURSE_ID,
  dominicanRdModuleProgressPayload,
} from "@/lib/yo/dominicanRepublicProgressPayloads";
import {
  parseProgressSnapshotPayload,
  summarizeSnapshotsForBridge,
  type ProgressSnapshotRow,
  PROGRESS_SNAPSHOT_VERSION,
} from "@/lib/yopratiqo/progressSnapshotPersistence";
import { FORBIDDEN_TEACHER_BRIDGE_FIELDS } from "@/lib/yopratiqo/teacherBridgeSummary";

/**
 * Dominican Republic module progress completion tests.
 *
 * Extends PR #146 (progress snapshots) to Modules 2–4 while keeping
 * Module 5 integrated. Proves each module mounts YoMarkModuleCompletedButton
 * with safe payloads and that multiple snapshots enrich the teacher bridge
 * summary projector.
 */

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

const module2Content = "components/yo/DominicanRepublicModule2Content.tsx";
const module3Content = "components/yo/DominicanRepublicModule3Content.tsx";
const module4Content = "components/yo/DominicanRepublicModule4Content.tsx";
const module5Content = "components/yo/DominicanRepublicModule5Content.tsx";
const payloadsLib = "lib/yo/dominicanRepublicProgressPayloads.ts";
const markButton = "components/yo/YoMarkModuleCompletedButton.tsx";
const productConfig = "lib/yo/yopratiqoProductConfig.ts";

for (const file of [
  module2Content,
  module3Content,
  module4Content,
  module5Content,
  payloadsLib,
  markButton,
  productConfig,
]) {
  assert.ok(existsSync(path.join(root, file)), `expected file is missing: ${file}`);
}

const m2 = read(module2Content);
const m3 = read(module3Content);
const m4 = read(module4Content);
const m5 = read(module5Content);
const payloadsSrc = read(payloadsLib);
const productConfigSrc = read(productConfig);

const RAW_QUIZ_PATTERN =
  /\b(rawQuiz|quizAnswers|quiz_answers|selectedOption|pickedOption|correctOptionId|answerLog|incorrectAnswers|keystrokeHistory|audioAttempts)\b/i;

// ── 1–4: each module mounts YoMarkModuleCompletedButton ─────────────────

for (const [label, src, marker] of [
  ["Module 2", m2, "data-yo-module2-progress-complete"],
  ["Module 3", m3, "data-yo-module3-progress-complete"],
  ["Module 4", m4, "data-yo-module4-progress-complete"],
  ["Module 5", m5, "data-yo-module5-progress-complete"],
] as const) {
  assert.match(src, /YoMarkModuleCompletedButton/);
  assert.match(src, new RegExp(marker));
  assert.match(src, /dominicanRdModuleProgressPayload\(/);
  ok(`${label} mounts YoMarkModuleCompletedButton with shared payload helper`);
}

// ── 5: safe module IDs / titles exist for every RD module ───────────────

for (const moduleId of ["module-2", "module-3", "module-4", "module-5"] as const) {
  assert.match(payloadsSrc, new RegExp(`"${moduleId}"`));
  for (const locale of ["fr", "en", "es"] as const) {
    const payload = dominicanRdModuleProgressPayload(moduleId, locale);
    assert.equal(payload.course_id, DOMINICAN_RD_COURSE_ID);
    assert.equal(payload.module_id, moduleId);
    assert.ok(payload.module_title.length > 0, `${moduleId} ${locale} title`);
    assert.equal(payload.discipline, "Languages");
    assert.equal(payload.progress_state, "completed");
  }
}
ok("safe module IDs and locale-aware titles exist for Modules 2–5");

// ── 6: no raw quiz fields in payloads or module sources ─────────────────

for (const forbidden of FORBIDDEN_TEACHER_BRIDGE_FIELDS) {
  const result = parseProgressSnapshotPayload({
    ...dominicanRdModuleProgressPayload("module-2", "fr"),
    [forbidden]: ["leaked"],
  });
  assert.equal(result.ok, false, `parser must reject forbidden key: ${forbidden}`);
}

// Module lesson sources may reference quiz field names for rendering
// (e.g. correctOptionId in <details> quiz UI). Scan only the shared
// payload helper — the runtime parser test above is the contract gate.
assert.doesNotMatch(
  payloadsSrc,
  RAW_QUIZ_PATTERN,
  "payloads lib must not reference raw quiz fields",
);

for (const moduleId of ["module-2", "module-3", "module-4", "module-5"] as const) {
  const parsed = parseProgressSnapshotPayload(
    dominicanRdModuleProgressPayload(moduleId, "en"),
  );
  assert.equal(parsed.ok, true, `parser must accept ${moduleId} payload`);
}
ok("no raw quiz fields are passed or referenced in RD module progress surfaces");

// ── 7: paid checkout remains disabled ───────────────────────────────────

assert.match(productConfigSrc, /premiumModulesEnabled:\s*false/);
assert.match(productConfigSrc, /supportedProductTypes:\s*\[\s*"free_intro"\s*\]/);
ok("paid YoPratiqo checkout remains disabled");

// ── 8: no restricted systems touched outside allow-list ─────────────────

const status = execSync("git status --porcelain -uall", { cwd: root, encoding: "utf8" });
const changedFiles = status
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.replace(/^[ MADRCU?!]{1,2}\s+/, "").replace(/^"|"$/g, ""));

const ignoredUntracked = new Set([
  "Untitled",
  "docs/LAUNCH_READINESS_ANALYSIS.md",
  "pratiqo-legal-export-20260528-2221.zip",
]);

const restrictedPathPatterns = [
  /^app\/api\/stripe\//,
  /^app\/api\/.*checkout/i,
  /^app\/api\/.*payment/i,
  /^lib\/payments\//,
  /^lib\/pricing\//,
  /^lib\/config\/membrePro\.ts$/,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^public\/.*\.(?:mp3|wav|m4a)$/i,
  /^scripts\/(generate-yopratiqo-audio|.*openai)/i,
  /^app\/sitemap\.ts$/,
  /^app\/robots\.ts$/,
  /CourseJsonLd|CourseSchema|yopratiqoSeo/i,
];

for (const file of changedFiles) {
  if (ignoredUntracked.has(file)) continue;
  for (const pattern of restrictedPathPatterns) {
    assert.ok(!pattern.test(file), `restricted system touched: ${file}`);
  }
}
ok("no Stripe/payment/tax/legal/RLS/migrations/Membre Pro/audio/SEO files touched");

// ── 9: summary projector uses multiple RD snapshots ─────────────────────

const multiSnapshotRows: ProgressSnapshotRow[] = (
  ["module-2", "module-3", "module-4", "module-5"] as const
).map((moduleId, idx) => {
  const payload = dominicanRdModuleProgressPayload(moduleId, "fr");
  return {
    id: `00000000-0000-0000-0000-00000000000${idx + 1}`,
    user_id: "student-uuid",
    course_id: payload.course_id,
    module_id: payload.module_id,
    module_title: payload.module_title,
    discipline: payload.discipline,
    level_label: payload.level_label ?? null,
    completed_at: "2026-06-10T12:00:00.000Z",
    last_activity_at: `2026-06-10T1${idx}:00:00.000Z`,
    progress_state: "completed",
    skill_tags: payload.skill_tags ?? [],
    difficulty_tags: payload.difficulty_tags ?? [],
    score_band: payload.score_band ?? null,
    companion_stage: payload.companion_stage ?? null,
    summary_version: PROGRESS_SNAPSHOT_VERSION,
    created_at: "2026-06-10T12:00:00.000Z",
    updated_at: "2026-06-10T12:00:00.000Z",
  };
});

const summary = summarizeSnapshotsForBridge(multiSnapshotRows);
assert.ok(summary, "multi-module snapshot list must produce a bridge summary");
assert.equal(summary!.completedModules.length, 4);
assert.ok(summary!.strengths.length > 0);
assert.ok(summary!.difficultyTags.length > 0);
assert.ok(summary!.suggestedTeacherFocus.length > 0);
ok("summary projector produces a richer teacher summary from multiple RD snapshots");

console.log("[yo:rd-module-progress-completion] tests passed");
