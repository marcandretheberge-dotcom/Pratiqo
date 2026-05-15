import { spawnSync } from "node:child_process";

const PREFIX = "[repo-hygiene]";

type PathSource = "tracked" | "staged" | "untracked";

type ScannedCandidate = {
  path: string;
  source: PathSource;
};

/** After dedupe, `source` may be e.g. `staged+tracked`. */
type MergedCandidate = {
  path: string;
  source: string;
};

type ForbiddenRule = {
  pattern: RegExp;
  reason: string;
};

function fail(message: string): never {
  console.error(`${PREFIX} ${message}`);
  process.exit(1);
}

function gitLines(...args: string[]): string[] {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error) {
    fail(`Could not run git ${args[0]}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`git ${args.join(" ")} failed.`);
  }

  return (result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function basename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

const ALLOWED_PATHS = new Set([
  ".env.example",
  ".vercelignore",
  "docs/backup-and-restore.md",
]);

const ALLOWED_BASENAMES = new Set([
  ".env.example",
]);

const FORBIDDEN: ForbiddenRule[] = [
  {
    pattern: /(^|\/)\.env($|[./-])/i,
    reason: "environment secret file (.env*)",
  },
  {
    pattern: /(^|\/)\.(netlify|vercel)(\/|$)/i,
    reason: "deployment provider local state (.netlify/.vercel)",
  },
  {
    pattern: /(^|\/)(\.next|out|build|dist|coverage)(\/|$)/i,
    reason: "generated build or coverage output",
  },
  {
    pattern: /(^|\/)(playwright-report|test-results)(\/|$)/i,
    reason: "Playwright report/artifact output",
  },
  {
    pattern: /(^|\/)(backups?|dumps?|tmp|temp)(\/|$)/i,
    reason: "backup, dump, or temporary artifact directory",
  },
  {
    pattern: /\.(dump|backup|bak|sql\.gz|tar|tgz|tar\.gz|zip|7z|rar)$/i,
    reason: "archive, backup, or database dump file",
  },
  {
    pattern: /\.(sqlite|sqlite3|db)$/i,
    reason: "local database file",
  },
  {
    pattern: /\.(pem|p12|pfx|key)$/i,
    reason: "private key or certificate material",
  },
  {
    pattern: /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)(\.pub)?$/i,
    reason: "SSH key material",
  },
  {
    pattern: /(^|\/)(secrets?|credentials?|service[-_]?account|google[-_]?application[-_]?credentials)(\.[^.]+)?$/i,
    reason: "secret or credential file",
  },
  {
    pattern: /(^|\/)(firebase|google|gcp|stripe|supabase|vercel|netlify).*(secret|private[-_]?key|service[-_]?role|token|credential).*\.(json|env|txt|key)$/i,
    reason: "provider credential/config file",
  },
  {
    pattern: /(^|\/).*private[-_]?key.*$/i,
    reason: "private key file",
  },
  {
    pattern: /\.tsbuildinfo$/i,
    reason: "TypeScript incremental build cache",
  },
  {
    pattern: /(^|\/)next-env\.d\.ts$/i,
    reason: "Next.js auto-generated type file",
  },
  {
    pattern: /(^|\/).*applet-config\.json$/i,
    reason: "generated applet config with embedded API keys",
  },
];

function isAllowed(path: string): boolean {
  return ALLOWED_PATHS.has(path) || ALLOWED_BASENAMES.has(basename(path));
}

function uniqueCandidates(candidates: ScannedCandidate[]): MergedCandidate[] {
  const byPath = new Map<string, Set<PathSource>>();
  for (const candidate of candidates) {
    const sources = byPath.get(candidate.path) ?? new Set<PathSource>();
    sources.add(candidate.source);
    byPath.set(candidate.path, sources);
  }

  return [...byPath.entries()].map(([path, sources]) => ({
    path,
    source: [...sources].sort().join("+"),
  }));
}

function findViolations(candidates: MergedCandidate[]): string[] {
  const violations: string[] = [];

  for (const candidate of candidates) {
    if (isAllowed(candidate.path)) continue;

    for (const rule of FORBIDDEN) {
      if (rule.pattern.test(candidate.path)) {
        violations.push(`  [${candidate.source}] ${candidate.path} -> ${rule.reason}`);
        break;
      }
    }
  }

  return violations;
}

const trackedFiles = gitLines("ls-files").map((path) => ({ path, source: "tracked" as const }));
const stagedFiles = gitLines("diff", "--cached", "--name-only", "--diff-filter=ACMR").map((path) => ({
  path,
  source: "staged" as const,
}));
const untrackedFiles = gitLines("ls-files", "--others", "--exclude-standard").map((path) => ({
  path,
  source: "untracked" as const,
}));

const candidates = uniqueCandidates([...trackedFiles, ...stagedFiles, ...untrackedFiles]);
const violations = findViolations(candidates);

if (violations.length > 0) {
  console.error(`${PREFIX} FAIL - risky paths found:\n`);
  for (const violation of violations) {
    console.error(violation);
  }
  console.error(
    `\n${PREFIX} Remove tracked/staged files from git, or add local-only artifacts to .gitignore.\n` +
      `  git rm --cached <file>    # stop tracking without deleting locally\n` +
      `  git rm -r --cached <dir>  # stop tracking a directory`,
  );
  process.exit(1);
}

console.log(`${PREFIX} OK - ${candidates.length} tracked/staged/untracked paths checked, none forbidden.`);
