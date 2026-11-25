/**
 * Probe enforcing CSP for the local Café sandbox (no CDP BypassCSP).
 * Expects Next to be started with CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN set.
 * Writes artifacts/cafe-live-browser/csp-normal-probe.json
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { resolveCafeLocalSandboxConnectOrigin } from "../lib/security/cafeLocalSandboxCsp";

function loadEnv() {
  for (const file of [".env.cafe-local", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i);
      const v = line.slice(i + 1);
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function stringToBase64URL(str: string) {
  return Buffer.from(str, "utf8").toString("base64url");
}

function createChunks(key: string, value: string, chunkSize = 3180) {
  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= chunkSize) return [{ name: key, value }];
  const chunks: Array<{ name: string; value: string }> = [];
  let remaining = encodedValue;
  let i = 0;
  while (remaining.length > 0) {
    let head = remaining.slice(0, chunkSize);
    const lastEscapePos = head.lastIndexOf("%");
    if (lastEscapePos > chunkSize - 3) head = head.slice(0, lastEscapePos);
    while (head.length > 0) {
      try {
        decodeURIComponent(head);
        break;
      } catch {
        if (head.at(-3) === "%" && head.length > 3) head = head.slice(0, -3);
        else throw new Error("chunk decode failed");
      }
    }
    chunks.push({ name: `${key}.${i}`, value: decodeURIComponent(head) });
    remaining = remaining.slice(head.length);
    i += 1;
  }
  return chunks;
}

void (async () => {
  loadEnv();
  const outDir = join("artifacts", "cafe-live-browser");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "csp-normal-probe.json");
  const sha = process.env.CAFE_PROBE_SHA || "unknown";

  const sandboxOrigin = resolveCafeLocalSandboxConnectOrigin(process.env);
  if (!sandboxOrigin) {
    const report = {
      status: "BLOCKED",
      sha,
      cspBypass: false,
      reason: "CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN unset",
      validationKind: "local_sandbox_csp_probe",
      notProductionOAuth: true,
    };
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const handoff = JSON.parse(readFileSync(".cafe-live-handoff.json", "utf8")) as {
    appBase: string;
    supabaseUrl: string;
    learnerEmail: string;
    learnerPassword: string;
    sessionUrl: string;
  };
  const appBase = handoff.appBase.replace("://127.0.0.1", "://localhost").replace(/\/$/, "");
  const sessionUrl = handoff.sessionUrl
    .replace(handoff.appBase, appBase)
    .replace("://127.0.0.1", "://localhost");

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(handoff.supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await client.auth.signInWithPassword({
    email: handoff.learnerEmail,
    password: handoff.learnerPassword,
  });
  if (signed.error || !signed.data.session) {
    const report = { status: "BLOCKED", sha, cspBypass: false, reason: signed.error?.message };
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();

  const cspState: { header: string | null } = { header: null };
  page.on("response", (res) => {
    if (res.request().resourceType() === "document") {
      cspState.header = res.headers()["content-security-policy"] ?? cspState.header;
    }
  });

  const key = `sb-${new URL(handoff.supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const encoded = `base64-${stringToBase64URL(JSON.stringify(signed.data.session))}`;
  await context.addCookies(
    createChunks(key, encoded).map((chunk) => ({
      name: chunk.name,
      value: chunk.value,
      url: appBase,
      sameSite: "Lax" as const,
      httpOnly: false,
    })),
  );

  await page.goto(sessionUrl, { waitUntil: "domcontentloaded", timeout: 180000 });
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Preparing the tables|Préparation des tables/i.test(t)) return false;
        return (
          t.includes("LIVE Intro")
          || /Sign in to reserve|Se connecter|Place confirm|Réserver cette table|Reserve this table/i.test(t)
        );
      },
      { timeout: 90000 },
    );
  } catch {
    // fall through — CSP header proof is the primary local validation
  }

  const signIn = await page.getByRole("link", { name: /Se connecter pour réserver|Sign in to reserve/i }).count();
  const reserve = await page.getByRole("button", { name: /Réserver cette table|Reserve this table/i }).count();
  const confirmed = await page.getByText(/Place confirmée|Place confirmed/i).count();
  const header = cspState.header ?? "";
  const cspAllows = Boolean(header.length > 0 && header.includes(sandboxOrigin));
  // Local CSP proof only — not a production OAuth validation.
  const status = cspAllows ? "OK" : "BLOCKED";

  const report = {
    status,
    sha,
    cspBypass: false,
    validationKind: "local_sandbox_csp_probe",
    notProductionOAuth: true,
    sandboxOrigin,
    cspHeaderPresent: Boolean(header),
    cspIncludesSandboxOrigin: cspAllows,
    connectSrc: header.match(/connect-src[^;]*/)?.[0] ?? null,
    ui: {
      signIn,
      reserve,
      confirmed,
      body: (await page.locator("main").innerText().catch(() => "")).slice(0, 500),
    },
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(status === "OK" ? 0 : 2);
})();
