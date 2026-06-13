import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PAGE = "app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx";

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function changedFiles(): string[] {
  const out = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["diff", "--name-only", "origin/main...HEAD"]]) {
    try {
      execFileSync("git", args, { cwd: ROOT, encoding: "utf8" })
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => out.add(line.replace(/\\/g, "/")));
    } catch {}
  }
  return [...out].sort();
}

const src = read(PAGE);

assert.ok(existsSync(join(ROOT, PAGE)), "Lesson 3 route exists");
assert.match(src, /Poser une question sans bloquer/);
assert.match(src, /YoAdaptiveStepShell/);
assert.match(src, /YoStepNavigator/);
assert.doesNotMatch(src, /min-h-\[100dvh\][\s\S]{0,80}pb-20/, "lesson must not render as long-scroll module page");
assert.match(src, /data-yo-yoppo-feedback/);
assert.match(src, /YoChoiceCard/);
assert.match(src, /YoPairMatchGame/);
assert.match(src, /YoGoodAvoidGame/);
assert.match(src, /data-yo-rhythm-practice/);
assert.match(src, /YoFixedFlashcardDeck/);
assert.match(src, /YoOneQuestionQuiz/);
assert.match(src, /Pratique avec un prof Pratiqo/);
assert.match(src, /YoPratiqo te prépare\. Un vrai prof t’aide à rendre le rythme naturel\./);
assert.doesNotMatch(src, /aucune app ne peut vous l’enseigner/i);
assert.match(src, /Kit de survie Pratiqo/);
assert.match(src, /kit-de-survie/);
assert.doesNotMatch(src, /aucun[e]? app/i);
assert.doesNotMatch(src, /checkout|Stripe|paid unlock|rawQuiz|quiz_answers|persist/i);

const forbidden = [
  /^app\/api\//,
  /^lib\/payments\//,
  /^supabase\//,
  /^content\/legal\//,
  /^app\/\(app\)\/legal\//,
  /^scripts\/generate-yopratiqo-audio/i,
  /^public\/.*\.(mp3|wav|m4a)$/i,
];

for (const file of changedFiles()) {
  assert.ok(!forbidden.some((pattern) => pattern.test(file)), `restricted system touched: ${file}`);
}

console.log("[yo:fr-qc-lesson3-interactive] assertions passed");
