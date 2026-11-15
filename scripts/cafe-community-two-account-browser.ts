/**
 * Two real local-sandbox accounts through the cinematic Café UI.
 * Auth uses injected Supabase cookies (Pratiqo login UI is Google-only).
 * Evidence for authenticated text community — not Daily/video.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { chromium, type BrowserContext, type Page } from "playwright";

type Account = { alias: string; email: string; displayName: string; userId: string; accessToken: string };
type CookieJar = { name: string; value: string };

function loadEnv(path: string) {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv(".env.cafe-community-local");
// Prefer localhost so browser Origin matches Next request.url (127.0.0.1 ≠ localhost for same-origin POST).
const base = (process.env.CAFE_COMMUNITY_APP_BASE || "http://localhost:3475").replace(/\/$/, "").replace("127.0.0.1", "localhost");
const outDir = join("artifacts", "cafe-community-live");
mkdirSync(outDir, { recursive: true });
const password = process.env.CAFE_DEV_PASSWORD || "CafeDev-Pass-464!";
const accounts = (JSON.parse(readFileSync(join(outDir, "two-accounts.json"), "utf8")) as { accounts: Account[] }).accounts;
assert.equal(accounts.length, 2);

async function cookiesFor(account: Account): Promise<CookieJar[]> {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await admin.auth.signInWithPassword({ email: account.email, password });
  if (signed.error || !signed.data.session) throw signed.error || new Error("sign-in failed");
  const jar: CookieJar[] = [];
  const client = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.map((cookie) => ({ name: cookie.name, value: cookie.value })),
      setAll: (cookies) => {
        for (const cookie of cookies) {
          const index = jar.findIndex((item) => item.name === cookie.name);
          if (index >= 0) jar[index] = { name: cookie.name, value: cookie.value };
          else jar.push({ name: cookie.name, value: cookie.value });
        }
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: signed.data.session.access_token,
    refresh_token: signed.data.session.refresh_token,
  });
  if (error) throw error;
  return jar;
}

async function dismissNoise(page: Page) {
  const banner = page.getByTestId("cookie-consent-banner");
  if (await banner.waitFor({ state: "visible", timeout: 3_000 }).then(() => true).catch(() => false)) {
    await banner.getByRole("button", { name: /Nécessaires seulement|Necessary only|Solo necesarias/i }).click();
    await banner.waitFor({ state: "hidden" }).catch(() => undefined);
  }
  const install = page.getByRole("complementary", { name: /Installer Pratiqo|Install Pratiqo|Instalar Pratiqo/i });
  if (await install.isVisible().catch(() => false)) {
    await install.getByRole("button", { name: /Pas maintenant|Not now|Ahora no/i }).click();
    await install.waitFor({ state: "hidden" }).catch(() => undefined);
  }
}

async function openAuthenticatedCafe(context: BrowserContext, account: Account) {
  const cookies = await cookiesFor(account);
  await context.addCookies(cookies
    .filter((cookie) => cookie.name && cookie.value)
    .map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })));
  const page = await context.newPage();
  await page.goto(`${base}/cafe`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await dismissNoise(page);
  return page;
}

async function enterAndChooseItalian(page: Page, account: Account, shotPrefix: string) {
  await dismissNoise(page);
  await page.getByRole("heading", { name: "Café des langues", exact: true }).waitFor({ timeout: 60_000 });
  await page.screenshot({ path: join(outDir, `${shotPrefix}-entrance.png`), fullPage: true });
  await page.getByRole("button", { name: /Entrer|Enter|Entrar/i }).click();
  // Existing community profiles skip language and land in the lobby.
  const language = page.getByRole("heading", { name: /On pratique quelle langue|Which language|Qué idioma/i });
  const lobby = page.getByRole("heading", { name: /Au Café|Inside the Café|En el Café/i });
  await Promise.race([
    language.waitFor({ timeout: 30_000 }),
    lobby.waitFor({ timeout: 30_000 }),
  ]);
  if (await language.isVisible().catch(() => false)) {
    const name = page.getByLabel(/Votre prénom au Café|Your Café name|Tu nombre/i);
    if (await name.count()) await name.fill(account.displayName);
    const native = page.getByRole("group", { name: /Langue maternelle|Native language|Lengua materna/i });
    await native.getByRole("searchbox").fill(account.alias === "A" ? "français" : "espagnol");
    await native.getByRole("checkbox").first().check();
    const learning = page.getByRole("group", { name: /Langue.*pratiquer|Language.*practise|Idioma.*practicar/i });
    await learning.getByRole("searchbox").fill("italien");
    await learning.getByRole("checkbox").first().check();
    await page.getByRole("checkbox", { name: /18/i }).check();
    await page.getByRole("checkbox", { name: /règles|rules|reglas/i }).check();
    await page.screenshot({ path: join(outDir, `${shotPrefix}-language.png`), fullPage: true });
    await page.getByRole("button", { name: /Continuer|Continue|Continuar/i }).click();
  }
  await lobby.waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(outDir, `${shotPrefix}-lobby.png`), fullPage: true });
}

async function api(account: Account, body?: Record<string, unknown>, roomId?: string) {
  const path = roomId ? `/api/cafe/community?roomId=${encodeURIComponent(roomId)}` : "/api/cafe/community";
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, json: await response.json().catch(() => ({})) };
}

void (async () => {
  const browser = await chromium.launch({ headless: true });
  const steps: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const record = (name: string, ok: boolean, detail?: string) => {
    steps.push({ name, ok, detail });
    if (!ok) throw new Error(`${name}: ${detail ?? "failed"}`);
  };
  let contextA: BrowserContext | undefined;
  let contextB: BrowserContext | undefined;
  try {
    contextA = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-CA" });
    contextB = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-CA", isMobile: true, hasTouch: true });
    const [a, b] = accounts as [Account, Account];

    // Clear blocks/rooms left by the API acceptance pass.
    for (const account of [a, b]) {
      const prior = await api(account);
      for (const blocked of prior.json.blockedMembers ?? []) {
        await api(account, { action: "member.unblock", targetId: blocked.id });
      }
      for (const room of prior.json.rooms ?? []) {
        await api(account, { action: room.creator?.id === account.userId ? "room.end" : "room.leave", roomId: room.id });
      }
      if (prior.json.room?.id) {
        await api(account, { action: prior.json.room.creator?.id === account.userId ? "room.end" : "room.leave", roomId: prior.json.room.id });
      }
    }

    const pageA = await openAuthenticatedCafe(contextA, a);
    await enterAndChooseItalian(pageA, a, "A-desktop");
    record("A.authenticated.lobby", true);

    const pageB = await openAuthenticatedCafe(contextB, b);
    await enterAndChooseItalian(pageB, b, "B-mobile");
    await pageA.getByText(/personnes? en ligne|people online|personas en línea/i).waitFor({ timeout: 45_000 });
    record("presence.ui", true);

    await pageA.getByRole("button", { name: /À deux|One to one|De dos/i }).click();
    await pageA.getByRole("button", { name: /Ouvrir une conversation à deux|Open a one-to-one chat|Abrir un chat de dos|Écrire maintenant|Write now/i }).first().click();
    const dialog = pageA.getByRole("dialog");
    await dialog.getByLabel(/Nom du salon|Room name|Nombre de la sala/i).fill("Italiano · browser live");
    // Pair mode forces capacity 2 server-side; set the visible selector too.
    await dialog.locator("select").nth(1).selectOption("2").catch(() => undefined);
    await dialog.getByRole("button", { name: /Ouvrir mon salon et attendre|Open my room and wait|Abrir mi sala y esperar/i }).click();
    await pageA.getByRole("heading", { name: /Votre conversation au Café|Your Café conversation|Tu conversación en el Café/i }).waitFor({ timeout: 60_000 });
    await pageA.screenshot({ path: join(outDir, "A-desktop-chat.png"), fullPage: true });

    await pageB.getByRole("button", { name: /À deux|One to one|De dos/i }).click();
    const roomVisible = pageB.getByText("Italiano · browser live");
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline && !(await roomVisible.isVisible().catch(() => false))) {
      await pageB.reload({ waitUntil: "domcontentloaded" });
      await dismissNoise(pageB);
      const lobbyHeading = pageB.getByRole("heading", { name: /Au Café|Inside the Café|En el Café/i });
      if (!(await lobbyHeading.isVisible().catch(() => false))) {
        const enter = pageB.getByRole("button", { name: /Entrer|Enter|Entrar/i });
        if (await enter.isVisible().catch(() => false)) await enter.click();
      }
      await pageB.getByRole("button", { name: /À deux|One to one|De dos/i }).click().catch(() => undefined);
      await pageB.waitForTimeout(2_000);
    }
    await roomVisible.waitFor({ timeout: 5_000 });
    await pageB.getByRole("button", { name: /Rejoindre le chat|Join the chat|Entrar al chat/i }).first().click();
    await pageB.getByRole("heading", { name: /Votre conversation au Café|Your Café conversation|Tu conversación en el Café/i }).waitFor({ timeout: 45_000 });
    await pageB.screenshot({ path: join(outDir, "B-mobile-chat.png"), fullPage: true });

    await pageA.getByLabel(/Votre message|Your message|Tu mensaje/i).fill("Ciao dal desktop — messaggio reale.");
    await pageA.getByRole("button", { name: /Envoyer|Send|Enviar/i }).click();
    await pageB.getByText("Ciao dal desktop — messaggio reale.", { exact: true }).waitFor({ timeout: 45_000 });
    await pageB.getByLabel(/Votre message|Your message|Tu mensaje/i).fill("Risposta mobile persistita.");
    await pageB.getByRole("button", { name: /Envoyer|Send|Enviar/i }).click();
    await pageA.getByText("Risposta mobile persistita.", { exact: true }).waitFor({ timeout: 45_000 });
    await pageA.screenshot({ path: join(outDir, "A-desktop-messages.png"), fullPage: true });
    await pageB.screenshot({ path: join(outDir, "B-mobile-messages.png"), fullPage: true });
    record("messages.ui.exchange", true);

    await pageA.reload({ waitUntil: "domcontentloaded" });
    await dismissNoise(pageA);
    // Reload may return to entrance/lobby; re-enter the live room if needed.
    const message = pageA.getByText("Ciao dal desktop — messaggio reale.", { exact: true });
    if (!(await message.isVisible().catch(() => false))) {
      const enter = pageA.getByRole("button", { name: /Entrer|Enter|Entrar/i });
      if (await enter.isVisible().catch(() => false)) await enter.click();
      await pageA.getByRole("heading", { name: /Au Café|Inside the Café|En el Café/i }).waitFor({ timeout: 30_000 }).catch(() => undefined);
      await pageA.getByRole("button", { name: /À deux|One to one|De dos/i }).click().catch(() => undefined);
      const join = pageA.getByRole("button", { name: /Rejoindre le chat|Join the chat|Entrar al chat/i }).first();
      if (await join.isVisible().catch(() => false)) await join.click();
    }
    await message.waitFor({ timeout: 60_000 });
    await pageA.screenshot({ path: join(outDir, "A-desktop-reload-history.png"), fullPage: true });
    record("reload.history.ui", true);

    writeFileSync(join(outDir, "two-account-browser-report.json"), JSON.stringify({
      kind: "cafe_community_two_account_browser",
      ok: true,
      base,
      videoEnabled: false,
      notProduction: true,
      realDatabase: true,
      authNote: "Local sandbox cookies injected; production login remains Google OAuth.",
      accounts: accounts.map(({ alias, email, userId }) => ({ alias, email, userId })),
      steps,
      createdAt: new Date().toISOString(),
    }, null, 2));
    console.log(JSON.stringify({ ok: true, steps: steps.length }, null, 2));
  } catch (error) {
    writeFileSync(join(outDir, "two-account-browser-report.json"), JSON.stringify({
      kind: "cafe_community_two_account_browser",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      steps,
      createdAt: new Date().toISOString(),
    }, null, 2));
    throw error;
  } finally {
    await contextA?.close();
    await contextB?.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
