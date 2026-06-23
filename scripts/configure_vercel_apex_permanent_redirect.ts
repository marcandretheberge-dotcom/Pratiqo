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
 * Requires Vercel CLI auth (`vercel login` / `VERCEL_TOKEN`).
 *
 * Usage:
 *   npx tsx scripts/configure_vercel_apex_permanent_redirect.ts
 *   npx tsx scripts/configure_vercel_apex_permanent_redirect.ts --project pratiqo --apex pratiqo.ca --www www.pratiqo.ca
 */

import { execSync } from "node:child_process";

const DEFAULT_PROJECT = "pratiqo";
const DEFAULT_APEX = "pratiqo.ca";
const DEFAULT_WWW = "www.pratiqo.ca";
const PERMANENT_STATUS = 308;

type DomainConfig = {
  redirect?: string | null;
  redirectStatusCode?: number | null;
};

function parseArgs(argv: string[]): { project: string; apex: string; www: string } {
  let project = DEFAULT_PROJECT;
  let apex = DEFAULT_APEX;
  let www = DEFAULT_WWW;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--project" && argv[i + 1]) {
      project = argv[++i];
    } else if (argv[i] === "--apex" && argv[i + 1]) {
      apex = argv[++i];
    } else if (argv[i] === "--www" && argv[i + 1]) {
      www = argv[++i];
    }
  }
  return { project, apex, www };
}

function parseVercelApiJson(stdout: string): unknown {
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("No JSON object in vercel api output");
  return JSON.parse(stdout.slice(start));
}

function vercelApi<T>(method: "GET" | "PATCH", path: string, fields?: Record<string, string>): T {
  const fieldArgs = fields
    ? Object.entries(fields)
        .map(([key, value]) => `-F "${key}=${value}"`)
        .join(" ")
    : "";
  const cmd = `npx vercel api "${path}" -X ${method}${fieldArgs ? ` ${fieldArgs}` : ""}`;
  const stdout = execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  return parseVercelApiJson(stdout) as T;
}

async function main(): Promise<void> {
  const { project, apex, www } = parseArgs(process.argv.slice(2));
  const path = `/v9/projects/${project}/domains/${apex}`;

  const current = vercelApi<DomainConfig>("GET", path);
  const redirectTarget = current.redirect ?? null;
  const status = current.redirectStatusCode ?? null;

  if (redirectTarget === www && status === PERMANENT_STATUS) {
    console.log(
      `[apex-redirect] OK — ${apex} already redirects to ${www} with status ${PERMANENT_STATUS}`,
    );
    return;
  }

  console.log(
    `[apex-redirect] updating ${apex}: redirect=${redirectTarget ?? "(none)"} status=${status ?? "null"} → redirect=${www} status=${PERMANENT_STATUS}`,
  );

  const updated = vercelApi<DomainConfig>("PATCH", path, {
    redirect: www,
    redirectStatusCode: String(PERMANENT_STATUS),
  });

  if (updated.redirect !== www || updated.redirectStatusCode !== PERMANENT_STATUS) {
    console.error("[apex-redirect] PATCH did not return expected configuration:", updated);
    process.exit(1);
  }

  console.log(`[apex-redirect] configured ${apex} → ${www} (${PERMANENT_STATUS})`);
}

main().catch((err) => {
  console.error("[apex-redirect] failed:", err);
  process.exit(1);
});
