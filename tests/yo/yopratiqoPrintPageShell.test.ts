import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

const shell = read("components/yo/YoPrintPageShell.tsx");
const button = read("components/yo/YoPrintButton.tsx");
const card = read("components/yo/YoPrintableResourceCard.tsx");

assert.match(shell, /data-yo-print-page-shell/);
assert.match(shell, /@media print/);
assert.match(shell, /yo-print-hidden/);
assert.match(shell, /@page/);
assert.match(shell, /break-inside: avoid|page-break-inside: avoid/);
assert.match(shell, /<YoPrintButton/);

assert.match(button, /"use client"/);
assert.match(button, /window\.print\(\)/);
assert.match(button, /typeof window !== "undefined"/);
assert.match(button, /data-yo-print-action/);

assert.match(card, /data-yo-printable-resource-card/);
assert.match(card, /max-w-full/);
assert.match(card, /overflow-x-hidden/);
assert.match(card, /Ouvrir le document imprimable/);
assert.match(card, /Open printable document/);
assert.match(card, /Abrir documento imprimible/);
assert.doesNotMatch(card, /download=/i);

console.log("[yo:print-page-shell] assertions passed");
