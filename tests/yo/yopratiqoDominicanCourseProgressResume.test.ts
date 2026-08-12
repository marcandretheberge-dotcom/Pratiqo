import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Contract tests: DR Course Home + student hub resume wiring.
 */

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function ok(name: string): void {
  console.log(`ok - ${name}`);
}

const countryPagePath =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";
const hubPath = "components/yo/YoStudentHubContent.tsx";
const resolverPath = "lib/yopratiqo/dominicanRepublicCourseProgress.ts";
const serverLoaderPath = "lib/yopratiqo/loadAuthenticatedProgressSnapshots.ts";
const clientFetchPath = "lib/yopratiqo/fetchAuthenticatedProgressSnapshots.ts";

for (const file of [
  countryPagePath,
  hubPath,
  resolverPath,
  serverLoaderPath,
  clientFetchPath,
]) {
  assert.ok(existsSync(path.join(root, file)), `missing ${file}`);
}

const countrySrc = read(countryPagePath);
const hubSrc = read(hubPath);
const serverLoaderSrc = read(serverLoaderPath);

assert.match(
  countrySrc,
  /deriveDominicanRdCourseProgress/,
  "Course Home must derive progress from snapshots",
);
assert.match(
  countrySrc,
  /loadAuthenticatedProgressSnapshots/,
  "Course Home must load authenticated snapshots server-side",
);
assert.match(
  countrySrc,
  /buildRoadmap\(locale,\s*courseProgress\)/,
  "Course Home must pass resolved progress into buildRoadmap",
);
assert.doesNotMatch(
  countrySrc,
  /status:\s*["']next["'][\s\S]*id:\s*["']intro["'][\s\S]*status:\s*["']available["']/,
  "Course Home must not hardcode static intro-next / module-available statuses in ROADMAP_BASE",
);
assert.match(
  countrySrc,
  /progress\.roadmapStatuses\[step\.id\]/,
  "roadmap step status must come from the canonical resolver",
);
assert.match(
  countrySrc,
  /primaryHref=\{continueHref\}/,
  "hero primary CTA must follow resolved continue href",
);
assert.match(
  countrySrc,
  /data-yo-course-continue-href=\{continueHref\}/,
  "Course Home must expose resolved continue href for contract tests",
);
ok("Course Home uses canonical progress resolver (not static roadmap only)");

assert.match(
  hubSrc,
  /deriveDominicanRdCourseProgress/,
  "student hub must use the canonical resolver",
);
assert.match(
  hubSrc,
  /fetchAuthenticatedProgressSnapshots/,
  "student hub must fetch authenticated snapshots client-side",
);
assert.match(
  hubSrc,
  /href=\{continueHref\}/,
  "student hub Continue CTA must bind to resolved continue href",
);
assert.doesNotMatch(
  hubSrc,
  /href=\{HREFS\.intro\}[\s\S]*data-testid=["']yo-student-hub-continue-cta["']/,
  "student hub Continue must not be hardcoded to Intro",
);
ok("student hub Continue uses resolver (not always Intro)");

assert.match(
  serverLoaderSrc,
  /\.eq\(\s*["']user_id["']\s*,\s*user\.id\s*\)/,
  "server loader must scope snapshots to auth uid only",
);
assert.doesNotMatch(
  serverLoaderSrc,
  /searchParams|req\.json|body\.user_id/,
  "server loader must not accept client-provided user id",
);
ok("server-side progress load is owner-scoped");

assert.match(
  countrySrc,
  /deriveDominicanRdCourseProgress\(progressSnapshots/,
  "null/error snapshots fall through resolver on Course Home",
);
ok("anonymous/default Intro-first path preserved via resolver null input");

console.log("\nAll DR course progress resume contract tests passed.");
