import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const routes = [
  "app/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/ressources/fiches-pratique/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/ressources/fiches-exploration/page.tsx",
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/ressources/cahier-a2/page.tsx",
];

for (const route of routes) {
  const absolute = join(ROOT, route);
  assert.ok(existsSync(absolute), `${route} exists`);
  const src = readFileSync(absolute, "utf8");
  assert.match(src, /YoPrintPageShell/, `${route} uses YoPrintPageShell`);
  assert.match(src, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/, `${route} stays noindex`);
  assert.doesNotMatch(src, /href=.*\.pdf|download=/i, `${route} does not fake PDF/download behavior`);
  assert.doesNotMatch(src, /rawQuizAnswers|quizAnswers|correctAnswers/i, `${route} does not expose raw quiz answers`);
}

const module2Route = readFileSync(
  join(
    ROOT,
    "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee/page.tsx",
  ),
  "utf8",
);
assert.match(module2Route, /DominicanRepublicModule2Workbook/);
assert.doesNotMatch(module2Route, /DominicanModulePrintables|module2PrintablePack/);

const module2 = readFileSync(
  join(ROOT, "components/yo/DominicanRepublicModule2Content.tsx"),
  "utf8",
);
const module3 = readFileSync(
  join(ROOT, "components/yo/DominicanRepublicModule3Content.tsx"),
  "utf8",
);
const module4 = readFileSync(
  join(ROOT, "components/yo/DominicanRepublicModule4Content.tsx"),
  "utf8",
);
const module5 = readFileSync(
  join(ROOT, "components/yo/DominicanRepublicModule5Content.tsx"),
  "utf8",
);

assert.match(module2, /data-yo-module2-printable-resource-card/);
assert.match(module3, /data-yo-module3-printable-resource-card/);
assert.match(module4, /data-yo-module4-printable-resource-card/);
assert.match(module5, /data-yo-module5-printable-resource-card/);
assert.doesNotMatch(module3, /<DominicanModulePrintables\b/, "Module 3 printables are consolidated into one resource card");

console.log("[yo:printable-resource-routes] assertions passed");
