import { spawnSync } from "node:child_process";

const PREFIX = "[repo-hygiene]";

function fail(message: string): never {
  console.error(`${PREFIX} ${message}`);
  process.exit(1);
}

/** Run a git command and return stdout lines (empty lines stripped). */
function gitLines(...args: string[]): string[] {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error) {
    fail(`Could not run git ${args[0]}: ${result.error.message}`);
  }
  return (result.stdout ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Paths that are intentionally tracked and must NOT be flagged.
 * `.env.example` is a template file with no real secrets — explicitly
 * whitelisted in .gitignore with `!.env.example`.
 */
const ALLOWED = new Set([".env.example"]);

/**
 * Forbidden path patterns. Each entry is tested against every file path that
 * git knows about (tracked) or that is staged (cached diff).
 * Uses simple glob-style matching:
 *   - "*"  matches any characters except "/"
 *   - "**" matches any characters including "/"
 */
const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  // Secret / env files (excluding .env.example which is an intentional template)
  {
    pattern: /^\.env($|[./])/,
    reason: "environment secret file (.env*)",
  },
  {
    pattern: /\.env\.(local|production|staging|development)(\.local)?$/,
    reason: "environment secret file (.env.*)",
  },

  // Build artifacts
  {
    pattern: /^\.netlify\//,
    reason: "Netlify build artifact (.netlify/)",
  },
  {
    pattern: /^\.vercel\//,
    reason: "Vercel build artifact (.vercel/)",
  },
  {
    pattern: /^\.next\//,
    reason: "Next.js build output (.next/)",
  },
  {
    pattern: /^out\//,
    reason: "Next.js static export output (out/)",
  },

  // Database dumps / backups
  {
    pattern: /\.dump$/i,
    reason: "database dump (*.dump)",
  },
  {
    pattern: /\.sql\.gz$/i,
    reason: "compressed SQL dump (*.sql.gz)",
  },
  {
    pattern: /\.backup$/i,
    reason: "database backup (*.backup)",
  },
  {
    pattern: /^backups\//,
    reason: "backups directory",
  },

  // Test / CI reports
  {
    pattern: /^playwright-report\//,
    reason: "Playwright HTML report (playwright-report/)",
  },
  {
    pattern: /^test-results\//,
    reason: "Playwright test-results (test-results/)",
  },

  // TypeScript cache
  {
    pattern: /\.tsbuildinfo$/i,
    reason: "TypeScript incremental build cache (*.tsbuildinfo)",
  },
  {
    pattern: /^next-env\.d\.ts$/,
    reason: "Next.js auto-generated type file (next-env.d.ts)",
  },

  // Firebase / Google AI Studio config with embedded API keys
  {
    pattern: /firebase-applet-config\.json$/i,
    reason: "Firebase applet config with embedded API key",
  },
  {
    pattern: /-applet-config\.json$/i,
    reason: "Google AI Studio applet config (*-applet-config.json)",
  },

  // Project ZIP archives at repo root (often created before transfers)
  {
    pattern: /^[^/]+\.zip$/,
    reason: "ZIP archive at repo root (*.zip)",
  },
];

function checkPaths(paths: string[]): string[] {
  const violations: string[] = [];
  for (const filePath of paths) {
    if (ALLOWED.has(filePath)) continue;
    for (const { pattern, reason } of FORBIDDEN) {
      if (pattern.test(filePath)) {
        violations.push(`  ${filePath}  →  ${reason}`);
        break;
      }
    }
  }
  return violations;
}

// 1. Files already tracked by git
const trackedFiles = gitLines("ls-files");

// 2. Files staged for addition/modification (catches `git add -f` on ignored files).
// Exclude deletions (D) — staging a removal is always safe.
const stagedFiles = gitLines("diff", "--cached", "--name-only", "--diff-filter=ACMR");

// Deduplicate
const allPaths = [...new Set([...trackedFiles, ...stagedFiles])];

const violations = checkPaths(allPaths);

if (violations.length > 0) {
  console.error(`${PREFIX} FAIL — risky files found in git index or staging area:\n`);
  for (const v of violations) {
    console.error(v);
  }
  console.error(
    `\n${PREFIX} Remove the files above from git tracking:\n` +
      `  git rm --cached <file>    # stop tracking without deleting locally\n` +
      `  git rm -r --cached <dir>  # stop tracking a directory\n` +
      `Then ensure the paths are covered in .gitignore.`,
  );
  process.exit(1);
}

console.log(`${PREFIX} OK — ${allPaths.length} tracked/staged paths checked, none forbidden.`);
