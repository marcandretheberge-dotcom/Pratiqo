import assert from "node:assert/strict";
import {
  collapsePublicBioSnippet,
  formatTeacherCardBioSnippet,
  splitPublicBioParagraphs,
} from "@/lib/teacherProfile/formatPublicBio";
import { sanitizePublicTeacherBio } from "@/lib/teacherProfile/sanitizePublicBio";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("splitPublicBioParagraphs returns empty for null/blank", () => {
  assert.deepEqual(splitPublicBioParagraphs(null), []);
  assert.deepEqual(splitPublicBioParagraphs(undefined), []);
  assert.deepEqual(splitPublicBioParagraphs("   "), []);
});

test("splitPublicBioParagraphs keeps a single paragraph together", () => {
  const bio = "Professeure de piano depuis 12 ans à Montréal.";
  assert.deepEqual(splitPublicBioParagraphs(bio), [bio]);
});

test("splitPublicBioParagraphs splits on blank lines", () => {
  const bio = "Premier paragraphe.\n\nDeuxième paragraphe.\n\n\nTroisième paragraphe.";
  assert.deepEqual(splitPublicBioParagraphs(bio), [
    "Premier paragraphe.",
    "Deuxième paragraphe.",
    "Troisième paragraphe.",
  ]);
});

test("splitPublicBioParagraphs does not split every sentence", () => {
  const bio = "J'enseigne le piano. Je travaille aussi le chant. Les cours sont bienveillants.";
  assert.equal(splitPublicBioParagraphs(bio).length, 1);
});

test("splitPublicBioParagraphs collapses single line breaks inside a paragraph", () => {
  const bio = "Ligne une\nLigne deux\n\nNouveau paragraphe";
  assert.deepEqual(splitPublicBioParagraphs(bio), [
    "Ligne une Ligne deux",
    "Nouveau paragraphe",
  ]);
});

test("splitPublicBioParagraphs trims extra whitespace and drops empty paragraphs", () => {
  const bio = "  Alpha  \n\n  \n\n  Bravo  ";
  assert.deepEqual(splitPublicBioParagraphs(bio), ["Alpha", "Bravo"]);
});

test("collapsePublicBioSnippet flattens line breaks into one line", () => {
  const bio = "Paragraphe un.\n\nParagraphe deux.\nEncore une ligne.";
  assert.equal(
    collapsePublicBioSnippet(bio),
    "Paragraphe un. Paragraphe deux. Encore une ligne.",
  );
});

test("collapsePublicBioSnippet returns empty for null/blank", () => {
  assert.equal(collapsePublicBioSnippet(null), "");
  assert.equal(collapsePublicBioSnippet("   \n\n  "), "");
});

test("formatTeacherCardBioSnippet strips leading bullets and dashes", () => {
  assert.equal(
    formatTeacherCardBioSnippet("-Enseignante avec plus de dix ans d'expérience."),
    "Enseignante avec plus de dix ans d'expérience.",
  );
  assert.equal(
    formatTeacherCardBioSnippet("• Professeur passionné de piano."),
    "Professeur passionné de piano.",
  );
  assert.equal(
    formatTeacherCardBioSnippet("* Cours adaptés à chaque élève."),
    "Cours adaptés à chaque élève.",
  );
  assert.equal(
    formatTeacherCardBioSnippet("  -  Disponible en semaine.\n\nCours en ligne."),
    "Disponible en semaine. Cours en ligne.",
  );
});

test("formatTeacherCardBioSnippet does not rewrite full profile paragraphs", () => {
  const bio = "Premier paragraphe.\n\nDeuxième paragraphe.";
  assert.deepEqual(splitPublicBioParagraphs(bio), [
    "Premier paragraphe.",
    "Deuxième paragraphe.",
  ]);
  assert.equal(
    formatTeacherCardBioSnippet(bio),
    "Premier paragraphe. Deuxième paragraphe.",
  );
});

test("helpers operate on sanitizer output and never restore masked contact", () => {
  const sanitized = sanitizePublicTeacherBio(
    "Écrivez-moi à elena.dance@example.com\n\nDisponible en semaine.",
    "fr",
  );
  const paragraphs = splitPublicBioParagraphs(sanitized.content);
  const snippet = collapsePublicBioSnippet(sanitized.content);
  assert.equal(sanitized.masked, true);
  assert.ok(paragraphs.length >= 2);
  assert.doesNotMatch(paragraphs.join(" "), /@/);
  assert.doesNotMatch(snippet, /elena\.dance@example\.com/i);
  assert.match(paragraphs[0] ?? "", /coordonnées masquées/);
  assert.match(snippet, /coordonnées masquées/);
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[teacherProfile:formatPublicBio] ${passed} tests passed`);
}
