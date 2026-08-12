/**
 * YoPratiqo · Dominican Republic Module 5 — grammar deck helper copy guard.
 *
 * Pins learner-facing wording for `DECK_HELPER_GRAMMAR` so internal
 * authoring jargon ("chunks", "bloques") cannot regress into the
 * compact companion helper on the Grammar deck screen.
 *
 * Scoped to that helper only — not a repo-wide ban on "chunk"/"bloque".
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const CONTENT_FILE = "components/yo/DominicanRepublicModule5Content.tsx";

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function extractDeckHelperGrammarBlock(src: string): string {
  const start = src.indexOf("const DECK_HELPER_GRAMMAR = lstr(");
  assert.ok(start >= 0, "DECK_HELPER_GRAMMAR must exist");
  const end = src.indexOf(");", start);
  assert.ok(end > start, "DECK_HELPER_GRAMMAR block must close");
  return src.slice(start, end + 2);
}

const src = read(CONTENT_FILE);
const helperBlock = extractDeckHelperGrammarBlock(src);

const enMatch = helperBlock.match(
  /"Passé pratique[^"]*",\s*\n\s*"([^"]+)"/,
);
const esMatch = helperBlock.match(
  /"Past-tense forms[^"]*",\s*\n\s*"([^"]+)"/,
);

assert.ok(enMatch, "EN DECK_HELPER_GRAMMAR string must exist");
assert.ok(esMatch, "ES DECK_HELPER_GRAMMAR string must exist");

const enCopy = enMatch![1];
const esCopy = esMatch![1];

assert.ok(
  !/\bchunks?\b/i.test(enCopy),
  `EN grammar helper must not use chunk jargon: ${JSON.stringify(enCopy)}`,
);
assert.ok(
  !/\bbloques?\b/i.test(esCopy),
  `ES grammar helper must not use bloque jargon: ${JSON.stringify(esCopy)}`,
);
assert.match(
  enCopy,
  /past-tense forms/i,
  "EN grammar helper should describe past-tense forms naturally",
);
assert.match(
  esCopy,
  /formas en pasado/i,
  "ES grammar helper should describe formas en pasado naturally",
);

console.log("ok - Module 5 DECK_HELPER_GRAMMAR avoids chunk/bloque jargon");
console.log("ok - EN uses past-tense forms");
console.log("ok - ES uses formas en pasado");
console.log("\nAll Module 5 grammar helper copy guard tests passed.");
