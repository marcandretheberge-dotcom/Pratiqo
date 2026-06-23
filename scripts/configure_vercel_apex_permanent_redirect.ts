/**
 * Ensure the Vercel project-domain redirect for apex → www is permanent (308).
 *
 * Root cause of the live 307:
 *   `pratiqo.ca` was configured in Vercel Domains with
 *   `redirect: "www.pratiqo.ca"` but `redirectStatusCode: null`, which
 *   defaults to a temporary 307 at the platform edge (before vercel.json /
 *   Next.js redirects run).
 *
 * This script is idempotent — safe to rerun after deploy or in ops runbooks.
 *
 * Required env (never commit real values):
 *   VERCEL_TOKEN=<personal-or-team-token>
 *
 * Optional env (public defaults shown):
 *   VERCEL_PROJECT_SLUG=pratiqo
 *   VERCEL_APEX_DOMAIN=pratiqo.ca
 *   VERCEL_CANONICAL_DOMAIN=www.pratiqo.ca
 *
 * Usage:
 *   VERCEL_TOKEN=... npx tsx scripts/configure_vercel_apex_permanent_redirect.ts
 */

import { execSync } from "node:child_process";

const PERMANENT_STATUS = 308;
const DEFAULT_PROJECT_SLUG = "pratiqo";
const DEFAULT_APEX_DOMAIN = "pratiqo.ca";
const DEFAULT_CANONICAL_DOMAIN = "www.pratiqo.ca";

type DomainConfig = {
  redirect?: string | null;
  redirectStatusCode?: number | null;
};

type ResolvedConfig = {
  projectSlug: string;
  apexDomain: string;
  canonicalDomain: string;
};

function parseArgs(argv: string[]): Partial<ResolvedConfig> {
  const out: Partial<ResolvedConfig> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--project" && argv[i + 1]) {
      out.projectSlug = argv[++i];
    } else if (argv[i] === "--apex" && argv[i + 1]) {
      out.apexDomain = argv[++i];
    } else if (argv[i] === "--www" && argv[i + 1]) {
      out.canonicalDomain = argv[++i];
    }
  }
  return out;
}

function requireVercelToken(): string {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error(
      "[apex-redirect] Missing VERCEL_TOKEN. Export a Vercel token in the environment and rerun (never commit it).",
    );
    process.exit(1);
  }
  return token;
}

function resolveConfig(argv: string[]): ResolvedConfig {
  const args = parseArgs(argv);
  const projectSlug =
    args.projectSlug?.trim() ||
    process.env.VERCEL_PROJECT_SLUG?.trim() ||
    DEFAULT_PROJECT_SLUG;
  const apexDomain =
    args.apexDomain?.trim() ||
    process.env.VERCEL_APEX_DOMAIN?.trim() ||
    DEFAULT_APEX_DOMAIN;
  const canonicalDomain =
    args.canonicalDomain?.trim() ||
    process.env.VERCEL_CANONICAL_DOMAIN?.trim() ||
    DEFAULT_CANONICAL_DOMAIN;

  if (!projectSlug || !apexDomain || !canonicalDomain) {
    console.error("[apex-redirect] project slug, apex domain, and canonical domain are required.");
    process.exit(1);
  }

  return { projectSlug, apexDomain, canonicalDomain };
}

function parseVercelApiJson(stdout: string): unknown {
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("No JSON object in vercel api output");
  return JSON.parse(stdout.slice(start));
}

function vercelApi<T>(
  token: string,
  method: "GET" | "PATCH",
  path: string,
  fields?: Record<string, string>,
): T {
  const fieldArgs = fields
    ? Object.entries(fields)
        .map(([key, value]) => `-F "${key}=${value}"`)
        .join(" ")
    : "";
  const cmd = `npx vercel api "${path}" -X ${method}${fieldArgs ? ` ${fieldArgs}` : ""}`;
  const stdout = execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
    env: {
      ...process.env,
      VERCEL_TOKEN: token,
    },
  });
  return parseVercelApiJson(stdout) as T;
}

async function main(): Promise<void> {
  const token = requireVercelToken();
  const { projectSlug, apexDomain, canonicalDomain } = resolveConfig(process.argv.slice(2));
  const path = `/v9/projects/${projectSlug}/domains/${apexDomain}`;

  const current = vercelApi<DomainConfig>(token, "GET", path);
  const redirectTarget = current.redirect ?? null;
  const status = current.redirectStatusCode ?? null;

  if (redirectTarget === canonicalDomain && status === PERMANENT_STATUS) {
    console.log(
      `[apex-redirect] OK — ${apexDomain} already redirects to ${canonicalDomain} with status ${PERMANENT_STATUS}`,
    );
    return;
  }

  console.log(
    `[apex-redirect] updating ${apexDomain}: redirect=${redirectTarget ?? "(none)"} status=${status ?? "null"} → redirect=${canonicalDomain} status=${PERMANENT_STATUS}`,
  );

  const updated = vercelApi<DomainConfig>(token, "PATCH", path, {
    redirect: canonicalDomain,
    redirectStatusCode: String(PERMANENT_STATUS),
  });

  if (updated.redirect !== canonicalDomain || updated.redirectStatusCode !== PERMANENT_STATUS) {
    console.error(
      "[apex-redirect] PATCH did not return expected redirect configuration (redirect/redirectStatusCode only).",
    );
    process.exit(1);
  }

  console.log(`[apex-redirect] configured ${apexDomain} → ${canonicalDomain} (${PERMANENT_STATUS})`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[apex-redirect] failed:", message);
  process.exit(1);
});
