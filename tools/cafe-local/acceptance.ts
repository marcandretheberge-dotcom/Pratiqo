/** Real local Auth -> Next handlers -> PostgreSQL; never uses stored tokens. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { CafeCommunitySnapshot, CafeModerationReport } from "../../lib/cafe/communityTypes";

type Account = { alias: string; displayName: string; userId: string; accessToken: string; cookies: Array<{ name: string; value: string }> };
const base = "http://localhost:55820";
const localDb = "http://127.0.0.1:55421";
const out = resolve("artifacts/cafe-community-live");
const steps: string[] = [];
const record = (name: string) => { steps.push(name); console.log(`PASS ${name}`); };

async function dismissConsent(page: Page) {
  const banner = page.getByTestId("cookie-consent-banner");
  if (await banner.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false)) {
    await banner.getByRole("button", { name: /Nécessaires seulement|Necessary only/ }).click();
    await banner.waitFor({ state: "hidden" });
  }
  const install = page.getByRole("complementary", { name: "Installer Pratiqo", exact: true });
  if (await install.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false)) {
    await install.getByRole("button", { name: "Pas maintenant", exact: true }).click();
    await install.waitFor({ state: "hidden" });
  }
}

async function selectLanguages(page: Page, account: Account, failSave = false) {
  await page.getByRole("button", { name: "Entrer", exact: true }).click();
  await page.getByLabel("Votre nom au Café", { exact: true }).fill(account.displayName);
  const native = page.getByRole("group", { name: "Langue(s) maternelle(s)", exact: true });
  await native.getByRole("searchbox").fill("français");
  await native.getByRole("checkbox", { name: "français", exact: true }).check();
  const learning = page.getByRole("group", { name: "Langue(s) à pratiquer", exact: true });
  await learning.getByRole("searchbox").fill("italien");
  await learning.getByRole("checkbox", { name: "italien", exact: true }).check();
  await page.getByRole("checkbox", { name: "Je confirme avoir 18 ans ou plus." }).check();
  await page.getByRole("checkbox", { name: "J’accepte les règles du Café." }).check();
  assert.equal(await page.getByRole("link", { name: "Code de conduite (nouvel onglet)" }).getAttribute("target"), "_blank");
  const submit = page.getByRole("button", { name: /^(Continuer|Enregistrer)$/ });
  if (failSave) {
    await page.route("**/api/cafe/community", async route => {
      if (route.request().method() === "POST" && route.request().postDataJSON()?.action === "profile.save") await route.abort();
      else await route.continue();
    });
    await submit.click();
    await page.getByRole("alert").first().waitFor();
    assert.equal(await page.getByLabel("Votre nom au Café", { exact: true }).inputValue(), account.displayName);
    assert.equal(await learning.getByRole("checkbox", { name: "italien", exact: true }).isChecked(), true);
    await page.unroute("**/api/cafe/community");
    record(`${account.alias}.profile.save-error-preserves-input`);
  }
  await page.screenshot({ path: resolve(out, `${account.alias}-language.png`), fullPage: true });
  await submit.click();
  await page.getByRole("heading", { name: "Au Café", exact: true }).waitFor();
}

async function main() {
  const adapter = await import(pathToFileURL(resolve("tools/cafe-local/env.mjs")).href);
  const env: Record<string, string> = await adapter.localCafeEnv();
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, localDb);
  assert.equal(env.APP_BASE_URL, base);
  assert.equal(env.CAFE_ROOM_PROVIDER_ENABLED, "false");
  const admin = createClient(localDb, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const run = randomUUID();
  const created: string[] = [];
  const browser = await chromium.launch({ headless: true });
  const contexts: BrowserContext[] = [];
  const pageErrors: string[] = [];
  const external: string[] = [];
  let mediaRequests = 0;
  mkdirSync(out, { recursive: true });

  async function provision(alias: string, role = "student"): Promise<Account> {
    const email = `cafe-readiness-${run}-${alias.toLowerCase()}@example.invalid`;
    const password = randomUUID() + "aA1!";
    const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(result.error, null, "Local synthetic Auth provisioning failed");
    const userId = result.data.user!.id;
    created.push(userId);
    const displayName = `Test Café ${alias}`;
    const profile = await admin.from("profiles").upsert({ id: userId, email, name: displayName, display_name: displayName, role, is_active: true });
    assert.equal(profile.error, null, "Local synthetic profile provisioning failed");
    const client = createClient(localDb, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await client.auth.signInWithPassword({ email, password });
    assert.equal(signed.error, null, "Local sign-in failed");
    const cookies: Account["cookies"] = [];
    const cookieClient = createBrowserClient(localDb, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      isSingleton: false,
      cookies: { getAll: () => cookies, setAll: values => { for (const { name, value } of values) {
        const index = cookies.findIndex(cookie => cookie.name === name);
        if (index >= 0) cookies[index] = { name, value }; else cookies.push({ name, value });
      } } },
    });
    const session = signed.data.session!;
    const set = await cookieClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    assert.equal(set.error, null, "Local session setup failed");
    cookieClient.auth.stopAutoRefresh();
    return { alias, displayName, userId, accessToken: session.access_token, cookies };
  }

  async function pageFor(account: Account, mobile: boolean, path = "/cafe") {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, locale: "fr-CA", isMobile: mobile, hasTouch: mobile });
    contexts.push(context);
    await context.addCookies(account.cookies.filter(cookie => cookie.value).map(cookie => ({ ...cookie, domain: "localhost", path: "/", sameSite: "Lax" as const })));
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin === base || url.origin === localDb) await route.continue();
      else { external.push(url.origin); await route.abort(); }
    });
    await context.exposeFunction("cafeMediaRequested", () => { mediaRequests++; });
    // A standalone browser script must not capture tsx's function-name helpers.
    await context.addInitScript(`Object.defineProperty(navigator, "mediaDevices", {
      configurable: true, value: { getUserMedia: async function () {
        await window.cafeMediaRequested();
        throw new Error("Media is disabled in text acceptance");
      } }
    });`);
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    return page;
  }

  async function api(account: Account, command?: Record<string, unknown>, path = "/api/cafe/community") {
    const response = await fetch(base + path, {
      method: command ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${account.accessToken}`, ...(command ? { "Content-Type": "application/json" } : {}) },
      ...(command ? { body: JSON.stringify(command) } : {}),
    });
    return { status: response.status, json: await response.json() as CafeCommunitySnapshot & { reports?: CafeModerationReport[] } };
  }

  try {
    const a = await provision("A"); const b = await provision("B"); const moderator = await provision("Admin", "admin");
    const pageA = await pageFor(a, false);
    await selectLanguages(pageA, a); record("A.new-member-language-and-consent");
    const pageB = await pageFor(b, true);
    await selectLanguages(pageB, b, true); record("B.mobile-new-member-language-and-consent");
    await pageB.reload({ waitUntil: "domcontentloaded" }); await dismissConsent(pageB);
    await selectLanguages(pageB, b); record("B.returning-member-explicit-language-choice");

    const roomName = `Italiano test ${run.slice(0, 8)}`;
    await pageA.getByRole("button", { name: "À deux", exact: true }).click();
    await pageA.getByRole("button", { name: "Ouvrir une conversation à deux", exact: true }).click();
    const dialog = pageA.getByRole("dialog");
    await dialog.getByLabel("Nom du salon", { exact: true }).fill(roomName);
    await dialog.getByRole("button", { name: "Ouvrir mon salon et attendre", exact: true }).click();
    await pageA.getByRole("heading", { name: "Votre conversation au Café", exact: true }).waitFor();
    await pageB.getByRole("button", { name: "À deux", exact: true }).click();
    const roomCard = pageB.locator("article").filter({ has: pageB.getByRole("heading", { name: roomName, exact: true }) });
    await roomCard.getByRole("button", { name: "Rejoindre le chat", exact: true }).click({ timeout: 45_000 });
    await pageB.getByRole("heading", { name: "Votre conversation au Café", exact: true }).waitFor();
    const room = (await api(a)).json.rooms.find(item => item.title === roomName)!;
    assert.ok(room);
    const roomPath = `/api/cafe/community?roomId=${room.id}`;
    assert.equal(room.capacity, 2); assert.equal(room.participants.length, 2);
    record("real-two-account-room-and-presence");
    const hello = "Ciao! Come stai?"; const reply = "Bene, grazie!";
    await pageA.getByLabel("Votre message", { exact: true }).fill(hello);
    await pageA.getByRole("button", { name: "Envoyer", exact: true }).click();
    await pageB.getByRole("log").getByText(hello, { exact: true }).waitFor({ timeout: 20_000 });
    let lostResponse = true; const messageIds: string[] = [];
    await pageB.route("**/api/cafe/community", async route => {
      if (route.request().method() === "POST" && route.request().postDataJSON()?.action === "message.send") {
        messageIds.push(route.request().postDataJSON().requestId);
        if (lostResponse) { lostResponse = false; await route.fetch(); await route.abort(); return; }
      }
      await route.continue();
    });
    await pageB.getByLabel("Votre message", { exact: true }).fill(reply);
    await pageB.getByRole("button", { name: "Envoyer", exact: true }).click();
    await pageB.getByRole("alert").first().waitFor();
    assert.equal(await pageB.getByLabel("Votre message", { exact: true }).inputValue(), reply);
    await pageB.getByRole("button", { name: "Actualiser", exact: true }).click();
    await pageB.getByRole("button", { name: "Envoyer", exact: true }).click();
    await pageA.getByRole("log").getByText(reply, { exact: true }).waitFor({ timeout: 20_000 });
    await pageB.unroute("**/api/cafe/community");
    assert.equal(messageIds.length, 2); assert.equal(messageIds[0], messageIds[1]);
    assert.equal((await api(a, undefined, roomPath)).json.room!.messages.filter(message => message.body === reply).length, 1);
    record("persisted-message-lost-response-idempotent-retry");
    for (const [alias, page] of [["A", pageA], ["B", pageB]] as const) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${alias}: no horizontal overflow`);
      await page.screenshot({ path: resolve(out, `${alias}-messages.png`), fullPage: true });
    }
    await pageB.reload({ waitUntil: "domcontentloaded" });
    await dismissConsent(pageB);
    await selectLanguages(pageB, b);
    await pageB.getByRole("button", { name: "À deux", exact: true }).click();
    await roomCard.getByRole("button", { name: "Rejoindre le chat", exact: true }).click();
    await pageB.getByRole("log").getByText(reply, { exact: true }).waitFor({ timeout: 30_000 });
    record("reload-restores-real-history");
    assert.equal(await pageB.getByRole("button", { name: "Proposer un appel", exact: true }).count(), 0);
    record("video-remains-off-no-media-request");
    await pageB.getByRole("button", { name: `Signaler le message de ${a.displayName}`, exact: true }).click();
    const report = pageB.getByRole("dialog");
    await report.getByLabel(/^Motif/).selectOption("other");
    await report.getByLabel("Précisions (facultatif)", { exact: true }).fill(`Synthetic review ${run}`);
    await report.getByRole("button", { name: "Envoyer le signalement", exact: true }).click();
    await report.getByText("Votre signalement a été enregistré pour l’équipe de modération.", { exact: true }).waitFor();
    await report.getByLabel("Fermer", { exact: true }).click();
    assert.equal((await api(b, undefined, "/api/admin/cafe/community/reports")).status, 403);
    const reports = await api(moderator, undefined, "/api/admin/cafe/community/reports");
    assert.equal(reports.status, 200);
    const savedReport = reports.json.reports!.find(item => item.details === `Synthetic review ${run}`)!;
    assert.ok(savedReport); assert.equal(savedReport.messages.length, 1);
    const adminPage = await pageFor(moderator, false, "/admin/cafe/community");
    await adminPage.getByText(`Synthetic review ${run}`, { exact: true }).waitFor();
    await adminPage.screenshot({ path: resolve(out, "admin-report.png"), fullPage: true });
    record("report-selected-evidence-member-denied-admin-visible");
    await pageB.getByRole("button", { name: "Bloquer", exact: true }).click();
    await pageB.getByText("Personne bloquée.", { exact: true }).waitFor();
    const denied = await api(b, { action: "message.send", roomId: room.id, requestId: randomUUID(), body: "Not deliverable" });
    assert.equal(denied.json.ok, false);
    assert.equal((await api(a, undefined, roomPath)).json.room!.messages.some(message => message.body === "Not deliverable"), false);
    record("block-persists-and-server-denies-further-messages");
    assert.equal(mediaRequests, 0); assert.deepEqual(pageErrors, []);
    record("desktop-mobile-no-page-errors");
    writeFileSync(resolve(out, "two-account-browser-report.json"), JSON.stringify({ ok: true, base, backend: localDb, realAuthAndDatabase: true, productionAccess: false, videoTested: false, physicalSafariTested: false, steps, blockedExternalOrigins: [...new Set(external)], createdAt: new Date().toISOString() }, null, 2));
  } catch (error) {
    for (const [index, context] of contexts.entries()) {
      const page = context.pages()[0];
      if (page && !page.isClosed()) await page.screenshot({ path: resolve(out, `failure-${index}.png`), fullPage: true }).catch(() => undefined);
    }
    writeFileSync(resolve(out, "two-account-browser-report.json"), JSON.stringify({ ok: false, steps, failure: error instanceof Error ? error.message : "Unknown failure" }, null, 2));
    throw error;
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
    // Only UUIDs created by this run; existing Cursor accounts stay intact.
    for (const id of created) assert.equal((await admin.auth.admin.deleteUser(id)).error, null, "Synthetic account cleanup failed");
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Local acceptance failed"); process.exitCode = 1; });
