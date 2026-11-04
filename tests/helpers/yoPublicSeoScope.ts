import assert from "node:assert/strict";
import { posix } from "node:path";
import ts from "typescript";

// Public presentation only; learning, access flags and payment modules are not
// authorized by this boundary. Reviewed imports remain an exact allowlist.
export const yoPublicSeoFiles = new Set([
  "app/yo/langues/allemand/page.tsx",
  "app/yo/langues/anglais/page.tsx",
  "app/yo/langues/francais-quebec/page.tsx",
  "app/yo/langues/italien/page.tsx",
  "app/yo/langues/japonais/page.tsx",
  "app/yo/langues/mandarin/page.tsx",
  "app/yo/langues/portugais-bresil/page.tsx",
  "components/yo/YoCourseOverview.tsx",
  "components/yo/YoDocumentLanguage.tsx",
  "lib/seo/config.ts",
  "lib/yo/publicCatalog.ts",
  "lib/yo/yopratiqoLandingContent.ts",
  "lib/yo/yopratiqoSeo.ts",
]);

const publicImports = new Set([
  "next", "next/image", "next/link", "react", "lucide-react",
  "components/companion/CompanionAvatar",
  "components/yo/YoAppHeader", "components/yo/YoCourseOverview",
  "components/yo/YoDocumentLanguage", "components/yo/YoLanguageBadge",
  "components/yo/YoLanguageLandingPage", "components/yo/YoUpcomingModuleCard",
  "lib/seo/jsonLd", "lib/seo/site", "lib/seo/yopratiqoCourseSchema",
  "lib/yo/localize", "lib/yo/types", "lib/yo/publicCatalog",
  "lib/yo/yopratiqoProductConfig", "lib/yo/yopratiqoLandingContent", "lib/yo/yopratiqoSeo",
  "lib/yo/german/courseData", "lib/yo/german/courseCulture",
  "lib/yo/portuguese/courseData", "lib/yo/portuguese/courseCulture",
  "lib/yo/mandarin/course", "lib/yo/mandarin/imageAssets.json",
]);

export function assertYoPublicSeoSurface(file: string, source: string): void {
  assert.ok(yoPublicSeoFiles.has(file), `Not a reviewed public SEO file: ${file}`);
  assert.doesNotMatch(source, /["']use server["']|\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|eval)\s*\(|\bimport\s*\(|\brequire\s*\(|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|STRIPE_SECRET_KEY|process\.env/, file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    if (!statement.moduleSpecifier) continue;
    assert.ok(ts.isStringLiteral(statement.moduleSpecifier), `Nonliteral import in ${file}`);
    const specifier = statement.moduleSpecifier.text;
    const resolved = specifier.startsWith(".")
      ? posix.normalize(posix.join(posix.dirname(file), specifier))
      : specifier.replace(/^@\//, "");
    assert.ok(publicImports.has(resolved), `Outside public SEO boundary: ${file} imports ${specifier}`);
  }
}
