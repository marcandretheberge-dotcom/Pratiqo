/**
 * Quick repo scan to find direct client-side writes to protected tables.
 * Run with `tsx scripts/security-scan.ts`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (p.includes("node_modules") || p.includes(".next")) continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx|js|jsx)$/.test(f)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Tables where client writes are explicitly forbidden by RLS
 * (and should also be absent from `"use client"` source).
 */
const PROTECTED_TABLES = [
  "booking_payments",
  "support_cases",
  "teacher_credentials",
  "credit_transactions",
  "review_reports",
];

/**
 * Tables where client writes are technically allowed by RLS today
 * but should be carefully reviewed before adding more. Reported as
 * warnings, not failures.
 */
const REVIEW_TABLES = [
  "messages",
  "bookings",
  "teachers",
];

const files = [...walk("app"), ...walk("components"), ...walk("lib")];
const findings: string[] = [];

for (const p of files) {
  const src = readFileSync(p, "utf8");
  const isClient = /^["']use client["']/.test(src.slice(0, 200));
  if (!isClient) continue;
  for (const t of PROTECTED_TABLES) {
    const re = new RegExp(
      `\\.from\\(\\s*["']${t}["']\\s*\\)[\\s\\S]{0,300}?\\.(insert|update|delete|upsert)\\b`,
      "g",
    );
    if (re.test(src)) {
      findings.push(`CLIENT-WRITE table=${t} file=${p}`);
    }
  }
}

const warnings: string[] = [];
for (const p of files) {
  const src = readFileSync(p, "utf8");
  const isClient = /^["']use client["']/.test(src.slice(0, 200));
  if (!isClient) continue;
  for (const t of REVIEW_TABLES) {
    const re = new RegExp(
      `\\.from\\(\\s*["']${t}["']\\s*\\)[\\s\\S]{0,300}?\\.(insert|update|delete|upsert)\\b`,
      "g",
    );
    if (re.test(src)) {
      warnings.push(`CLIENT-WRITE-REVIEW table=${t} file=${p}`);
    }
  }
}

if (findings.length === 0) {
  console.log("OK: no direct client writes to protected tables");
} else {
  for (const f of findings) console.log(f);
  process.exit(1);
}

if (warnings.length > 0) {
  console.log("");
  console.log("Review-only warnings (RLS-allowed but server route preferred):");
  for (const w of warnings) console.log("  " + w);
}
