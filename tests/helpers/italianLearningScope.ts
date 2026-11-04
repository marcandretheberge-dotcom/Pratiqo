import assert from "node:assert/strict";
import { posix } from "node:path";
import ts from "typescript";

// /yo is also a disclosure surface. These reviewed learning-only changes may
// accompany it; this is not permission for arbitrary YoPratiqo/API changes.
export const italianLearningFiles = new Set([
  "components/yo/YoLanguageQuickStart.tsx",
  "components/yo/YoStudentHubContent.tsx",
  "components/yo/italian/ItalianGames.tsx",
  "components/yo/italian/course/CourseAssessmentPlayer.tsx",
  "components/yo/italian/course/CourseCulturePhoto.tsx",
  "components/yo/italian/course/CourseShared.tsx",
  "components/yo/italian/course/ItalianCourseAssessment.tsx",
  "components/yo/italian/course/ItalianCourseDashboard.tsx",
  "components/yo/italian/course/ItalianCourseUnit.tsx",
  "components/yo/italian/course/ItalianStudyJourney.tsx",
  "lib/yo/italian/course/courseAssessments.ts",
  "lib/yo/italian/course/courseAuthoring.ts",
  "lib/yo/italian/course/courseCulture.ts",
  "lib/yo/italian/course/courseData.ts",
  "lib/yo/italian/course/courseTypes.ts",
  "lib/yo/italian/italianModuleTypes.ts",
]);

const sharedImports = new Set([
  "react", "next/link", "next/image", "lucide-react",
  "components/companion/CompanionAvatar", "lib/companion/companionVisuals",
  "lib/utils", "lib/locale-context",
  "lib/yopratiqo/studentCompanionState", "lib/yopratiqo/dominicanRepublicCourseProgress",
  "lib/yopratiqo/fetchAuthenticatedProgressSnapshots", "lib/yopratiqo/progressSnapshotPersistence",
]);

export const journeyLearningFiles = new Set([
  "app/yo/langues/japonais/parcours/[unit]/page.tsx",
  "app/yo/langues/mandarin/parcours/[unit]/page.tsx",
  "app/yo/langues/mandarin/parcours/page.tsx",
  "components/yo/japanese/JapaneseCourseHome.tsx",
  "components/yo/japanese/JapaneseCoursePlayer.tsx",
  "components/yo/journey/CourseJourney.tsx",
  "components/yo/journey/ExplorationJourneyMap.tsx",
  "components/yo/journey/FoundationJourneyAdvance.tsx",
  "components/yo/journey/useExplorationJourney.ts",
  "components/yo/mandarin/MandarinCourseHome.tsx",
  "components/yo/mandarin/MandarinCoursePlayer.tsx",
  "lib/yo/courseJourney.ts",
  "lib/yo/foundationJourney.ts",
  "lib/yo/foundationJourneyCatalogs.ts",
  "lib/yo/learningJourney.ts",
]);

export function assertItalianLearningSurface(file: string, source: string): void {
  assert.ok(italianLearningFiles.has(file), `Not a reviewed Italian learning file: ${file}`);
  assertLearningSurface(file, source);
}

export function assertJourneyLearningSurface(file: string, source: string): void {
  assert.ok(journeyLearningFiles.has(file), `Not a reviewed journey file: ${file}`);
  assertLearningSurface(file, source);
}

function assertLearningSurface(file: string, source: string): void {
  assert.doesNotMatch(source, /["']use server["']|\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|eval)\s*\(|\bimport\s*\(|\brequire\s*\(|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|STRIPE_SECRET_KEY|\/api\//, file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    if (!statement.moduleSpecifier) continue;
    assert.ok(ts.isStringLiteral(statement.moduleSpecifier), `Nonliteral import in ${file}`);
    const specifier = statement.moduleSpecifier.text;
    const resolved = specifier.startsWith(".")
      ? posix.normalize(posix.join(posix.dirname(file), specifier))
      : specifier.replace(/^@\//, "");
    const serverRouteImport = journeyLearningFiles.has(file) && file.startsWith("app/yo/") && ["next", "next/navigation"].includes(resolved);
    assert.ok(serverRouteImport || sharedImports.has(resolved) || resolved.startsWith("components/yo/") || resolved.startsWith("lib/yo/"),
      `Outside learning boundary: ${file} imports ${specifier}`);
    assert.doesNotMatch(resolved, /stripe|supabase|(?:^|\/)(?:auth|payments?|checkout|consent|sharing)(?:\/|$)/i,
      `Privileged dependency in ${file}`);
  }
}
