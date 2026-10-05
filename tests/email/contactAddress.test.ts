import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:tsx?|json|md|mdx|html|txt)$/.test(path) ? [path] : [];
  });
}

test("application and public content use the primary contact address", () => {
  for (const root of ["app", "components", "lib", "content", "public"]) {
    for (const path of sourceFiles(root)) {
      assert.doesNotMatch(readFileSync(path, "utf8"), /support@pratiqo\.ca/i, path);
    }
  }
});

test("transactional replies reach info without changing the technical sender", () => {
  for (const path of ["lib/email/transport.ts", "lib/email/templates/admin.ts"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /replyTo: "info@pratiqo\.ca"/, path);
    assert.match(source, /from: "Pratiqo <onboarding@pratiqo\.ca>"/, path);
  }
});

test("contact page and localized support copy use info", () => {
  assert.match(readFileSync("app/contact/page.tsx", "utf8"), /mailto:info@pratiqo\.ca/);
  for (const locale of ["fr", "en", "es"]) {
    const dictionary = JSON.parse(readFileSync(`lib/i18n/locales/${locale}.json`, "utf8"));
    assert.match(dictionary.cookiePreferencesContact, /info@pratiqo\.ca/);
    assert.match(dictionary.plannedPackageConsentSupportContact, /info@pratiqo\.ca/);
  }
});
