/**
 * YoPratiqo — layout / overflow regression guard.
 *
 * The Phase 0 audit found a handful of recurring Tailwind-class
 * mistakes that produced cropped, cramped, or sideways-scrolling
 * surfaces in the browser:
 *
 *   • Invalid Tailwind utilities like `pb-18` / `mt-18` / `pt-18`
 *     (the default scale has no `18` rung; Tailwind silently
 *     drops the class).
 *   • `h-[100dvh]` AND `min-h-[100vh]` on the same element — on
 *     iOS Safari `100vh` resolves to the viewport height while
 *     the bottom toolbar is visible, so the bottom CTA ends up
 *     hidden under the toolbar even though `100dvh` would have
 *     handled it correctly.
 *   • `grid-cols-N` (N ≥ 2) declared without a `sm:`-prefixed
 *     step-down to `grid-cols-1`, which cramps small phones at
 *     360 px.
 *   • `truncate` on h1 / h2 headings, which clips long FR titles
 *     mid-word and erodes the premium feel.
 *
 * This suite walks the YoPratiqo source surface (the components +
 * routes the world-class shell pass touches) and refuses any of
 * those patterns. It is a STATIC contract — runtime parsing of
 * CSS would require a real browser, but every one of these
 * patterns is detectable from source.
 *
 * Style: `node:test`-style runtime assertions, no jsdom, no
 * Playwright. Read-only.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure static analysis. Reads files from disk, does not
 *     execute any module, makes no network call, never touches
 *     auth / payments / Supabase / OpenAI / SEO / scripts.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const REPO_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function listFilesRecursive(rel: string, extensions: string[]): string[] {
  const out: string[] = [];
  const abs = join(REPO_ROOT, rel);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const childAbs = join(abs, entry);
    const childRel = `${rel}/${entry}`;
    let stat;
    try {
      stat = statSync(childAbs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      // Skip generated / vendored directories.
      if (
        entry === "node_modules" ||
        entry === ".next" ||
        entry === "dist" ||
        entry === "build" ||
        entry.startsWith(".")
      ) {
        continue;
      }
      out.push(...listFilesRecursive(childRel, extensions));
    } else {
      if (extensions.some((ext) => entry.endsWith(ext))) {
        out.push(childRel);
      }
    }
  }
  return out;
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ─── Audited surface ────────────────────────────────────────────
// We deliberately scope the scan to the YoPratiqo surface (the
// components + routes touched by the world-class shell pass).
// Scanning the entire repo would also flag pre-existing,
// out-of-scope Tailwind classes in unrelated marketing pages.
const YO_COMPONENT_DIR = "components/yo";
const YO_ROUTE_DIR = "app/yo";
const YO_AUTH_ROUTES = [
  "app/(app)/student/yopratiqo/page.tsx",
  "app/(app)/student/progress/page.tsx",
];

function auditedFiles(): string[] {
  const components = listFilesRecursive(YO_COMPONENT_DIR, [
    ".tsx",
    ".ts",
  ]);
  const routes = listFilesRecursive(YO_ROUTE_DIR, [".tsx"]);
  const auth = YO_AUTH_ROUTES.filter((p) => {
    try {
      statSync(join(REPO_ROOT, p));
      return true;
    } catch {
      return false;
    }
  });
  return [...components, ...routes, ...auth].map((p) =>
    p.split("/").join(sep),
  );
}

// ─── 1. No invalid Tailwind spacing utilities ────────────────────
test("no audited className declares an invalid Tailwind spacing rung (pb-18 / mt-18 / pt-18 / pb-22 …)", () => {
  // Tailwind's default spacing scale has rungs at 0, 0.5, 1, 1.5,
  // 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24,
  // 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96. Notably
  // there is no 13, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29,
  // 30, 31, 33–35, 37–39, 41–43, 45–47, 49–51, 53–55, 57–59,
  // 61–63, 65–71, 73–79, 81–95. The most common typo we hit was
  // `pb-18`, so we ban every spacing utility that lands on a
  // non-existent rung.
  //
  // To avoid false positives on prose in comments (e.g. the
  // phrase "top-level comma") and on the named max-w-{xs,sm,…}
  // scale, this scan runs INSIDE className expressions only and
  // only flags the strictly-numeric spacing prefixes (padding,
  // margin, gap, space, inset). Width / height / size utilities
  // use their own named scales and are out of scope here.
  const VALID = new Set([
    "0",
    "0.5",
    "1",
    "1.5",
    "2",
    "2.5",
    "3",
    "3.5",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "14",
    "16",
    "20",
    "24",
    "28",
    "32",
    "36",
    "40",
    "44",
    "48",
    "52",
    "56",
    "60",
    "64",
    "72",
    "80",
    "96",
    "px",
    "auto",
    "full",
  ]);
  const SPACING_PREFIXES = new Set([
    "p",
    "pt",
    "pb",
    "pl",
    "pr",
    "px",
    "py",
    "ps",
    "pe",
    "m",
    "mt",
    "mb",
    "ml",
    "mr",
    "mx",
    "my",
    "ms",
    "me",
    "gap",
    "gap-x",
    "gap-y",
    "space-x",
    "space-y",
    "inset",
    "inset-x",
    "inset-y",
    "top",
    "bottom",
    "left",
    "right",
  ]);
  // Extract every className expression first, then tokenize.
  const classExpr = /className\s*=\s*(\{[^}]*\}|"[^"]*"|'[^']*'|`[^`]*`)/g;
  // Match a single Tailwind token inside an expression. Allows
  // a chain of responsive/state prefixes like `lg:hover:pb-18`.
  const tokenRe = /(?:^|[\s"'`])((?:[a-z0-9]+:)*)(-?)([a-z]+(?:-[a-z]+)?)-([A-Za-z0-9.]+)(?=[\s"'`])/g;
  const offenses: string[] = [];
  for (const rel of auditedFiles()) {
    const src = read(rel);
    let m: RegExpExecArray | null;
    classExpr.lastIndex = 0;
    while ((m = classExpr.exec(src)) !== null) {
      const expr = m[1];
      let t: RegExpExecArray | null;
      tokenRe.lastIndex = 0;
      while ((t = tokenRe.exec(expr)) !== null) {
        const prefix = t[3];
        const value = t[4];
        if (!SPACING_PREFIXES.has(prefix)) continue;
        if (value.startsWith("[")) continue;
        if (value.includes("/")) continue;
        if (!VALID.has(value)) {
          offenses.push(`${rel}: invalid utility ${prefix}-${value}`);
        }
      }
    }
  }
  assert.deepStrictEqual(
    offenses,
    [],
    `Invalid Tailwind spacing utilities detected:\n${offenses.join("\n")}`,
  );
});

// ─── 2. No 100vh + 100dvh clash on the same element ──────────────
test("no element declares both h-[100dvh] / min-h-[100dvh] and h-[100vh] / min-h-[100vh]", () => {
  // Pattern: `100dvh` and `100vh` together on the same element's
  // className resolves to the wrong height on iOS Safari while
  // the bottom toolbar is visible (`100vh` includes the toolbar,
  // `100dvh` excludes it, so the maximum wins and the bottom CTA
  // ends up below the toolbar).
  //
  // The check is class-attribute scoped: we find each `className=`
  // expression, strip JS comments + non-string-literal parts so
  // explanatory comments inside `cn(…)` calls don't false-positive,
  // and refuse any remaining string fragment that mentions both
  // `100dvh` and `100vh`.
  const classExpr = /className\s*=\s*(\{[^}]*\}|"[^"]*"|'[^']*'|`[^`]*`)/g;
  function stripCommentsAndKeepStrings(expr: string): string {
    let out = "";
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      const next = expr[i + 1];
      // Block comment
      if (ch === "/" && next === "*") {
        const end = expr.indexOf("*/", i + 2);
        i = end === -1 ? expr.length : end + 2;
        continue;
      }
      // Line comment
      if (ch === "/" && next === "/") {
        const end = expr.indexOf("\n", i + 2);
        i = end === -1 ? expr.length : end;
        continue;
      }
      // Strings (single, double, backtick) — keep the inner
      // string verbatim because that's where real classnames live.
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        out += ch;
        i++;
        while (i < expr.length) {
          const c = expr[i];
          if (c === "\\" && i + 1 < expr.length) {
            out += c + expr[i + 1];
            i += 2;
            continue;
          }
          out += c;
          i++;
          if (c === quote) break;
        }
        continue;
      }
      out += ch;
      i++;
    }
    return out;
  }
  const offenses: string[] = [];
  for (const rel of auditedFiles()) {
    const src = read(rel);
    let m: RegExpExecArray | null;
    classExpr.lastIndex = 0;
    while ((m = classExpr.exec(src)) !== null) {
      const expr = stripCommentsAndKeepStrings(m[1]);
      const has100dvh = /100dvh/.test(expr);
      const has100vh = /(?:^|[^d])100vh/.test(expr);
      if (has100dvh && has100vh) {
        offenses.push(`${rel}: className mixes 100dvh and 100vh on the same element`);
      }
    }
  }
  assert.deepStrictEqual(
    offenses,
    [],
    `100vh / 100dvh clashes detected:\n${offenses.join("\n")}`,
  );
});

// ─── 3. No grid-cols-N (N ≥ 2) without responsive scaling ────────
test("no audited file declares a bare grid-cols-N (N ≥ 2) without a responsive sibling (the author must reason about phone vs desktop)", () => {
  // The Phase 0 audit found cards crammed two-up on 360px phones
  // because `grid-cols-2` was declared with no thought to how it
  // would render on a small phone. Pattern we ban: a bare
  // `grid-cols-N` (N ≥ 2) token in a className expression that
  // contains NO responsive `(sm|md|lg|xl|2xl):grid-cols-…` token.
  //
  // Routes that legitimately want a 2-up phone layout (e.g. the
  // four-tile value strip) can express it as
  // `grid-cols-2 sm:grid-cols-4` — that satisfies the contract
  // because the author has explicitly thought about the wider
  // breakpoint. Routes that want 1-up phone / 2-up tablet write
  // it as `grid-cols-1 sm:grid-cols-2`, which also satisfies.
  const classExpr = /className\s*=\s*(\{[^}]*\}|"[^"]*"|'[^']*'|`[^`]*`)/g;
  const bareTwoPlus = /(?:^|[\s"'`])grid-cols-([2-9]|1[0-2])(?=[\s"'`])/;
  const responsiveAny = /(?:sm|md|lg|xl|2xl):grid-cols-/;
  const offenses: string[] = [];
  for (const rel of auditedFiles()) {
    const src = read(rel);
    let m: RegExpExecArray | null;
    classExpr.lastIndex = 0;
    while ((m = classExpr.exec(src)) !== null) {
      const expr = m[1];
      if (!bareTwoPlus.test(expr)) continue;
      // Allowed if the expression also includes ANY responsive
      // `grid-cols-…` variant. That signals the author thought
      // through the multi-breakpoint layout.
      if (responsiveAny.test(expr)) continue;
      offenses.push(
        `${rel}: bare grid-cols-N (N ≥ 2) with no responsive sibling`,
      );
    }
  }
  assert.deepStrictEqual(
    offenses,
    [],
    `Bare multi-column grids without responsive variants detected:\n${offenses.join("\n")}`,
  );
});

// ─── 4. No `truncate` on h1 / h2 headings ────────────────────────
test("no audited file applies `truncate` to an h1 / h2 element (FR titles need to wrap)", () => {
  // `truncate` clips overflowing text with an ellipsis at the END
  // of one line. On a long French course title (e.g. "République
  // dominicaine — Espagnol caribéen") that produces a
  // mid-word `…` and erodes the premium feel. h1 / h2 must
  // always be allowed to wrap (`break-words` is the preferred
  // replacement when overflow is a worry).
  //
  // We match `<h1` / `<h2` with a className attribute containing
  // `truncate`. The classNames may be multi-line / built via cn().
  const re = /<\s*(h1|h2)\b[^>]*className\s*=\s*(\{[^}]*\}|"[^"]*"|'[^']*')[^>]*>/g;
  const offenses: string[] = [];
  for (const rel of auditedFiles()) {
    const src = read(rel);
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) {
      const tag = m[1];
      const expr = m[2];
      if (/\btruncate\b/.test(expr)) {
        offenses.push(
          `${rel}: <${tag}> applies \`truncate\` — replace with \`break-words\``,
        );
      }
    }
  }
  assert.deepStrictEqual(
    offenses,
    [],
    `truncated heading offenders detected:\n${offenses.join("\n")}`,
  );
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[yo:layout-overflow-contract] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
