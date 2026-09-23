/** Read-only comparison: both policies use the same current public teacher snapshot. */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import ts from "typescript";
import sitemap from "../app/sitemap";
import { QC_CITIES } from "../lib/constants/cities";
import { DISCIPLINES } from "../lib/seo/disciplines";
import {
  buildLocalDiscoverySitemapEntries,
  fetchIndexableDiscoveryTeachers,
  teacherMatchesDiscipline,
  teacherHasLocalDiscoverySupply,
  type RawDiscoveryTeacher,
} from "../lib/seo/localTeacherDiscoveryPages";

async function main() {
  const baseline = process.argv[2] ?? "origin/main";
  const baselineSha = execFileSync("git", ["rev-parse", baseline], { encoding: "utf8" }).trim();
  const file = "lib/seo/localTeacherDiscoveryPages.ts";
  const source = execFileSync("git", ["show", `${baseline}:${file}`], { encoding: "utf8" });
  const historical = { exports: {} as Record<string, unknown> };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module: historical,
    exports: historical.exports,
    require: createRequire(resolve(file)),
  }, { filename: file });
  const rank = historical.exports.rankTeachersForCity as (
    teachers: RawDiscoveryTeacher[], city: typeof QC_CITIES[number],
    options?: { discipline: typeof DISCIPLINES[number] },
  ) => { ranked: unknown[] };
  const teachers = await fetchIndexableDiscoveryTeachers();
  const before = new Set<string>();
  for (const city of QC_CITIES) {
    if (rank(teachers, city).ranked.length) before.add(`/tuteurs/${city.slug}`);
    for (const discipline of DISCIPLINES) {
      if (rank(teachers, city, { discipline }).ranked.length) before.add(`/cours/${discipline.slug}/${city.slug}`);
    }
  }
  const after = new Set(buildLocalDiscoverySitemapEntries(teachers).map((entry) => entry.path));
  const current = await sitemap();
  const nonlocal = current.filter((entry) => !/^\/(?:tuteurs\/[^/]+|cours\/[^/]+\/[^/]+)$/.test(new URL(entry.url).pathname));
  const subjectHubs = nonlocal.filter((entry) => new URL(entry.url).pathname.startsWith("/cours/")).length;
  const courseCount = (paths: Set<string>) => [...paths].filter((path) => path.startsWith("/cours/")).length;
  const removed = [...before].filter((path) => !after.has(path)).sort();
  const evidence = DISCIPLINES.flatMap((discipline) => QC_CITIES.map((city) => {
    const path = `/cours/${discipline.slug}/${city.slug}`;
    const matches = teachers.filter((teacher) => teacherMatchesDiscipline(teacher, discipline));
    const local = matches.filter((teacher) => teacherHasLocalDiscoverySupply(teacher, city));
    const physical = matches.filter((teacher) => ["person", "in_person", "in-person", "home", "both", "all"].includes(teacher.teaching_mode ?? ""));
    const reason = local.length ? "eligible_local_supply" : !matches.length ? "no_exact_discipline" : !physical.length ? "online_only_or_no_physical_mode" : "no_declared_local_supply";
    return { path, previouslyIncluded: before.has(path), reason, exactDisciplineMatches: matches.length,
      physicalMatches: physical.length, localMatches: local.length,
      evidence: local.map((teacher) => ({
        discipline: teacher.discipline, disciplineIds: teacher.disciplineIds,
        category: teacher.category, teachingMode: teacher.teaching_mode,
        localityBasis: teacher.teachingZones?.some((zone) => zone.isActive && zone.countryCode === "CA") ? "declared_zone_or_student_travel_radius" : "normalized_legacy_city_equals_target",
      })),
    };
  }));
  const countReasons = (rows: typeof evidence) => Object.fromEntries(
    [...new Set(rows.map((row) => row.reason))].map((reason) => [reason, rows.filter((row) => row.reason === reason).length]),
  );
  const nonlocalGroups = Object.fromEntries([...new Set(nonlocal.map((entry) => new URL(entry.url).pathname.split("/")[1] || "root"))].map((group) => [group, nonlocal.filter((entry) => (new URL(entry.url).pathname.split("/")[1] || "root") === group).length]));
  console.log(JSON.stringify({
    baseline, baselineSha, measuredAt: new Date().toISOString(), eligibleTeacherCount: teachers.length,
    snapshotSha256: createHash("sha256").update(JSON.stringify(teachers)).digest("hex"),
    methodology: "Same current teacher snapshot, historical vs current local policy; unchanged non-local sitemap entries measured once.",
    before: { courseCityUrls: courseCount(before), allCoursUrls: courseCount(before) + subjectHubs, localUrls: before.size, totalUrls: before.size + nonlocal.length },
    after: { courseCityUrls: courseCount(after), allCoursUrls: courseCount(after) + subjectHubs, localUrls: after.size, totalUrls: after.size + nonlocal.length },
    removedCourseCityCount: removed.filter((path) => path.startsWith("/cours/")).length,
    removedExamples: removed.filter((path) => path.startsWith("/cours/")).slice(0, 10),
    addedUrls: [...after].filter((path) => !before.has(path)),
    candidateCount: evidence.length,
    reasonPriority: "One reason per URL: eligible, else no exact discipline, else no physical mode, else no declared local supply. Counts are URLs, not teachers.",
    candidateReasonCounts: countReasons(evidence),
    removedReasonCounts: countReasons(evidence.filter((row) => row.previouslyIncluded && row.reason !== "eligible_local_supply")),
    retainedEvidence: evidence.filter((row) => row.reason === "eligible_local_supply"),
    excludedEvidence: evidence.filter((row) => row.previouslyIncluded && row.reason !== "eligible_local_supply"),
    nonlocalGroups, nonlocalCount: nonlocal.length,
  }, null, 2));
}

main().catch(() => {
  console.error("Local indexation audit failed. Check the baseline ref and server database configuration.");
  process.exitCode = 1;
});
