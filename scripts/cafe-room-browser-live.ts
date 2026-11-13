/**
 * Real room integration: local Supabase Auth + production Café RPCs/routes +
 * real Daily Prebuilt in two independent Chromium contexts. Camera/microphone
 * devices are synthetic; all authorization, signalling and media transport are real.
 * No CSP bypass, mocked API, fake refresh token, HAR or trace containing tokens.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createClient, type Session } from "@supabase/supabase-js";
import { chromium, type Browser, type BrowserContext, type Page, type Response } from "playwright";
import { createDailyRoomProvider } from "../lib/cafe/providers/daily";

type Evidence = Record<string, boolean | number | string>;
type Step = { name: string; ok: boolean; evidence?: Evidence };
type BrowserProbe = Window & { __cafeRtcPeers?: RTCPeerConnection[]; __cafeCspViolations?: string[] };
const steps: Step[] = [];
let currentStep = "prerequisites";
let interrupted = false;
const outDir = resolve("artifacts/cafe-room-browser-live");
mkdirSync(outDir, { recursive: true });

function check(name: string, value: unknown, evidence?: Evidence): asserts value {
  currentStep = name;
  if (interrupted) throw new Error("Validation interrupted");
  const ok = Boolean(value);
  steps.push({ name, ok, ...(evidence ? { evidence } : {}) });
  console.log(JSON.stringify({ check: name, ok, ...(evidence ? { evidence } : {}) }));
  assert.ok(ok, name);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function loopback(value: string): boolean {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname); }
  catch { return false; }
}

function statusValue(status: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const value = status[name] ?? name.split(".").reduce<unknown>(
      (entry, key) => entry && typeof entry === "object" ? (entry as Record<string, unknown>)[key] : undefined,
      status,
    );
    if (typeof value === "string" && value) return value;
  }
  throw new Error("Local Supabase status is incomplete");
}

async function seedSession(context: BrowserContext, session: Session, apiUrl: string, appBase: string) {
  assert.ok(session.access_token && session.refresh_token);
  assert.notEqual(session.refresh_token, "browser-live");
  const key = `sb-${new URL(apiUrl).hostname.split(".")[0]}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks: Array<{ name: string; value: string }> = [];
  for (let offset = 0; offset < value.length; offset += 3000) {
    chunks.push({ name: value.length <= 3000 ? key : `${key}.${chunks.length}`, value: value.slice(offset, offset + 3000) });
  }
  await context.addCookies(chunks.map((cookie) => ({ ...cookie, url: appBase, sameSite: "Lax", httpOnly: false })));
}

async function observeBrowser(context: BrowserContext) {
  // Observation only. Native RTCPeerConnections remain real and unmodified;
  // retain handles so getStats() can prove received synthetic A/V in each frame.
  await context.addInitScript(() => {
    const probe = window as BrowserProbe;
    probe.__cafeRtcPeers = [];
    probe.__cafeCspViolations = [];
    window.addEventListener("securitypolicyviolation", (event) => {
      probe.__cafeCspViolations!.push(event.effectiveDirective);
    });
    if (window.RTCPeerConnection) {
      window.RTCPeerConnection = new Proxy(window.RTCPeerConnection, {
        construct(target, args) {
          const peer = Reflect.construct(target, args) as RTCPeerConnection;
          probe.__cafeRtcPeers!.push(peer);
          return peer;
        },
      });
    }
  });
}

async function dismissConsent(page: Page) {
  const necessary = page.getByRole("button", { name: /nécessaires seulement|necessary only|solo necesarias|uniquement nécessaires|essentiels seulement/i });
  if (await necessary.waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) await necessary.click();
  const installPrompt = page.getByRole("complementary", { name: /Installer Pratiqo|Install Pratiqo|Instalar Pratiqo/i });
  if (await installPrompt.waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false)) {
    await installPrompt.getByRole("button", { name: /Pas maintenant|Not now|Ahora no/i }).click();
    await installPrompt.waitFor({ state: "hidden" });
  }
}

async function prepare(page: Page) {
  await page.locator('main[data-cafe-room-phase="welcome"]').waitFor();
  await dismissConsent(page);
  await page.getByRole("button", { name: /Préparer caméra|Prepare camera|Preparar cámara/i }).click();
  await page.locator('main[data-cafe-room-phase="media_prep"]').waitFor();
}

async function enter(page: Page) {
  await page.getByRole("button", { name: /Entrer dans la salle|Enter the room|Entrar a la sala/i }).click();
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (interrupted) throw new Error("Validation interrupted");
    const phase = await page.locator("main[data-cafe-room-phase]").getAttribute("data-cafe-room-phase");
    if (phase === "connected") return;
    if (phase === "error") throw new Error("Room UI reported an error");
    const frame = page.frameLocator("[data-cafe-daily-frame] iframe");
    const prejoin = frame.getByRole("button", { name: /^(Join meeting|Join call|Join now|Rejoindre|Entrer|Unirse)/i }).first();
    if (await prejoin.isVisible().catch(() => false)) await prejoin.click();
    await delay(250);
  }
  throw new Error("Real Daily join did not complete");
}

async function mediaControls(page: Page, actor: string) {
  const frame = page.frameLocator("[data-cafe-daily-frame] iframe");
  const controls = [
    { key: "camera", off: /turn on camera|turn camera on|start video|enable camera|activer.*caméra/i, on: /turn off camera|turn camera off|stop video|disable camera|désactiver.*caméra/i },
    { key: "microphone", off: /unmute|turn on mic|turn mic(?:rophone)? on|enable microphone|activer.*micro/i, on: /^mute(?:\b|$)|turn off mic|turn mic(?:rophone)? off|disable microphone|couper.*micro/i },
  ];
  for (const control of controls) {
    currentStep = `${actor}_${control.key}_off_on_off_on`;
    const off = frame.getByRole("button", { name: control.off }).first();
    const on = frame.getByRole("button", { name: control.on }).first();
    // Defaults must be off. Turning on requires a real user-style click.
    await off.waitFor({ state: "visible", timeout: 15_000 });
    await off.click();
    await on.waitFor({ state: "visible", timeout: 15_000 });
    await on.click();
    await off.waitFor({ state: "visible", timeout: 15_000 });
    await off.click();
    await on.waitFor({ state: "visible", timeout: 15_000 });
    check(`${actor}_${control.key}_off_on_off_on`, true);
  }
}

async function receivedMedia(page: Page): Promise<{ audio: boolean; video: boolean }> {
  const result = { audio: false, video: false };
  for (const frame of page.frames()) {
    const stats = await frame.evaluate(async () => {
      const received = { audio: false, video: false };
      for (const peer of (window as BrowserProbe).__cafeRtcPeers ?? []) {
        if (peer.connectionState === "closed") continue;
        const report = await peer.getStats().catch(() => null);
        report?.forEach((entry) => {
          if (entry.type !== "inbound-rtp" || !(entry.bytesReceived > 0)) return;
          if (entry.kind === "audio" || entry.mediaType === "audio") received.audio = true;
          if ((entry.kind === "video" || entry.mediaType === "video") && entry.framesDecoded > 0) received.video = true;
        });
      }
      return received;
    }).catch(() => ({ audio: false, video: false }));
    result.audio ||= stats.audio;
    result.video ||= stats.video;
  }
  return result;
}

const localFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
});

async function main() {
  const sandboxDir = resolve(requireEnv("CAFE_BROWSER_SANDBOX_DIR"));
  const statusPath = resolve(requireEnv("CAFE_BROWSER_STATUS_FILE"));
  check("isolated_sandbox_marker", existsSync(join(sandboxDir, ".cafe-browser-sandbox")) && statusPath === join(sandboxDir, "status.json"));
  check("not_production", process.env.VERCEL_ENV !== "production");
  const status = JSON.parse(readFileSync(statusPath, "utf8")) as Record<string, unknown>;
  const apiUrl = statusValue(status, ["API_URL", "api.url", "api_url"]);
  const anonKey = statusValue(status, ["ANON_KEY", "auth.anon_key", "anon_key"]);
  const serviceKey = statusValue(status, ["SERVICE_ROLE_KEY", "auth.service_role_key", "service_role_key"]);
  const dbUrl = statusValue(status, ["DB_URL", "db.url", "db_url"]);
  check("loopback_backend_only", loopback(apiUrl) && loopback(dbUrl));
  const appBase = "http://localhost:3477";
  const dailyConfig = {
    apiKey: requireEnv("DAILY_API_KEY"), domain: requireEnv("DAILY_DOMAIN"),
    roomHmacSecret: requireEnv("CAFE_DAILY_ROOM_HMAC_SECRET"),
    participantHmacSecret: requireEnv("CAFE_DAILY_PARTICIPANT_HMAC_SECRET"),
  };
  const provider = createDailyRoomProvider(dailyConfig);
  const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: localFetch } });
  const actors: Array<{ id: string; session: Session }> = [];
  const createdUserIds: string[] = [];
  let sessionCreated = false;
  let roomId: string | null = null;
  let browser: Browser | undefined;
  let server: ChildProcess | undefined;
  let failure: unknown = null;
  const cleanup: Record<string, boolean> = {};
  const stamp = randomUUID().replaceAll("-", "").slice(0, 16);
  const slug = `browser-${stamp}`;
  const appEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production", VERCEL_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SUPABASE_URL: apiUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN: new URL(apiUrl).origin, CAFE_V1_ENABLED: "true", CAFE_ROOM_PROVIDER_ENABLED: "true" };
  const interrupt = () => {
    interrupted = true;
    // Closing the browser rejects pending Playwright operations so the normal
    // finally block gets a chance to delete the Daily room on cancellation.
    void browser?.close().catch(() => undefined);
    server?.kill("SIGTERM");
  };
  process.once("SIGTERM", interrupt);
  process.once("SIGINT", interrupt);

  try {
    // The normal CSP disallows unsafe-eval, which Next's development runtime
    // needs. Build the tested production routes against this local backend.
    // Unrelated SEO prerenders require the hosted catalogue, which is not part
    // of this disposable fixture. Next includes the selected routes' layouts.
    // Build before creating the session so its join window cannot expire here.
    currentStep = "app_build";
    const buildFd = openSync(join(sandboxDir, "build.log"), "w", 0o600);
    const buildPaths = [
      "app/cafe/**/page.tsx",
      "app/(app)/student/yopratiqo/page.tsx",
      "app/api/**/route.ts",
    ].join(",");
    const built = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", `--debug-build-paths=${buildPaths}`], {
      env: appEnv, stdio: ["ignore", buildFd, buildFd], timeout: 8 * 60_000,
    });
    closeSync(buildFd);
    check("app_built", built.status === 0, { targetedRoutes: true, fullSiteBuild: false });

    for (const [index, name] of ["Cafehost", "Cafelearner"].entries()) {
      currentStep = `create_${index === 0 ? "host" : "learner"}`;
      const password = `Cafe-${randomUUID()}-Aa1!`;
      const email = `${name.toLowerCase()}-${stamp}@example.test`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      check(currentStep, !created.error && created.data.user);
      const id = created.data.user!.id;
      createdUserIds.push(id);
      const profile = await admin.from("profiles").insert({ id, email, name, display_name: name, role: index === 0 ? "admin" : "student" });
      check(`profile_${index}`, !profile.error);
      const client = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: localFetch } });
      const signed = await client.auth.signInWithPassword({ email, password });
      check(`auth_${index}`, !signed.error && signed.data.session);
      actors.push({ id, session: signed.data.session! });
    }
    const [host, learner] = actors;
    // Test fixture only: the consent UI is a separate PR. SQL runs only in the
    // just-created local stack, against real Auth identities from above.
    const agreements = join(sandboxDir, "agreements.sql");
    assert.ok(actors.every((actor) => /^[0-9a-f-]{36}$/.test(actor.id)));
    writeFileSync(agreements, `INSERT INTO cafe_private.participant_agreements(profile_id,adult_attested_at,rules_version,rules_accepted_at) VALUES ${actors.map((actor) => `('${actor.id}',now(),'cafe-pilot-adults-v1',now())`).join(",")};`, { mode: 0o600 });
    const consentResult = spawnSync("supabase", ["db", "query", "--workdir", sandboxDir, "--file", agreements], { encoding: "utf8", timeout: 30_000 });
    check("local_adult_agreement_fixture", consentResult.status === 0);
    const drafted = await admin.rpc("cafe_admin_create_draft_server", {
      p_actor_id: host.id, p_slug: slug, p_title: "Browser validation", p_primary_language: "fr",
      p_practice_language: "en", p_level: "A1", p_starts_at: new Date(Date.now() + 8 * 60_000).toISOString(),
      p_duration_minutes: 30, p_max_participants: 8, p_host_profile_id: host.id,
    });
    check("draft_created", !drafted.error && drafted.data?.ok === true);
    sessionCreated = true;
    const published = await admin.rpc("cafe_admin_publish_server", { p_actor_id: host.id, p_slug: slug });
    check("session_published", !published.error && published.data?.ok === true);
    const authorized = await admin.rpc("cafe_authorize_join_server", { p_actor_id: host.id, p_slug: slug, p_join_role: "host" });
    check("host_authorized_without_reservation", !authorized.error && authorized.data?.ok === true);
    roomId = provider.deterministicRoomId(authorized.data.sessionId as string);

    const serverFd = openSync(join(sandboxDir, "next.log"), "w", 0o600);
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "localhost", "--port", "3477"], {
      stdio: ["ignore", serverFd, serverFd],
      env: appEnv,
    });
    closeSync(serverFd);
    currentStep = "app_start";
    const startupDeadline = Date.now() + 150_000;
    let ready = false;
    while (Date.now() < startupDeadline && server.exitCode === null) {
      const response = await fetch(`${appBase}/cafe/${slug}/salle`, { signal: AbortSignal.timeout(5_000) }).catch(() => null);
      if (response?.status === 200) { ready = true; break; }
      await delay(750);
    }
    check("app_started", ready);
    const reserved = await fetch(`${appBase}/api/cafe/reservations`, {
      method: "POST", headers: { Authorization: `Bearer ${learner.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: "reserve", expectedVersion: 0, requestId: randomUUID() }),
      signal: AbortSignal.timeout(30_000),
    });
    const reservation = await reserved.json() as { status?: string };
    check("learner_reserved_via_app_api", reserved.ok && reservation.status === "confirmed", { httpStatus: reserved.status });

    browser = await chromium.launch({ headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const learnerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    for (const [index, context] of [hostContext, learnerContext].entries()) {
      await observeBrowser(context);
      await seedSession(context, actors[index].session, apiUrl, appBase);
    }
    const hostPage = await hostContext.newPage();
    const learnerPage = await learnerContext.newPage();
    const courseReturn = `/student/yopratiqo?cafeBrowser=${stamp}`;
    const roomPath = `/cafe/${slug}/salle?title=Browser%20validation&yoReturn=${encodeURIComponent(courseReturn)}`;
    const joinedUrls: string[] = [];
    for (const [index, page] of [hostPage, learnerPage].entries()) {
      page.setDefaultTimeout(20_000);
      page.on("response", (response) => {
        if (response.url().startsWith(`${appBase}/api/cafe/sessions/${slug}/`) && response.ok()) {
          void response.json().then((body: { roomUrl?: string }) => { if (body.roomUrl) joinedUrls.push(body.roomUrl); }).catch(() => undefined);
        }
      });
      currentStep = `load_room_${index}`;
      let response: Response | null;
      if (index === 0) {
        response = await page.goto(`${appBase}${roomPath}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      } else {
        await page.goto(`${appBase}/cafe/${slug}?yoReturn=${encodeURIComponent(courseReturn)}`, { waitUntil: "domcontentloaded" });
        await dismissConsent(page);
        const entry = page.getByRole("link", { name: /Entrer dans la salle|Enter the room|Entrar a la sala/i });
        await entry.waitFor({ state: "visible" });
        const href = new URL((await entry.getAttribute("href"))!, appBase);
        check("confirmed_seat_room_link_preserves_course", href.pathname === `/cafe/${slug}/salle` && href.searchParams.get("yoReturn") === courseReturn);
        [response] = await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 }),
          entry.click(),
        ]);
        // Permissions-Policy belongs to the document. A SPA-only transition
        // would retain camera=()/microphone=() from the session detail page.
        check("room_entry_loads_new_document", response?.request().isNavigationRequest() === true && new URL(response.url()).pathname === `/cafe/${slug}/salle`);
      }
      const headers = response?.headers() ?? {};
      const csp = headers["content-security-policy"] ?? "";
      const permissions = headers["permissions-policy"] ?? "";
      check(`enforcing_headers_${index}`, response?.ok() && csp.includes("frame-src") && csp.includes("https://*.daily.co") && csp.includes(new URL(apiUrl).origin) && permissions.includes("display-capture=()") && permissions.includes("daily.co"));
      await prepare(page);
    }
    currentStep = "host_real_join";
    await enter(hostPage);
    check("host_real_join", true);

    currentStep = "learner_offline_retry";
    await learnerContext.setOffline(true);
    await learnerPage.getByRole("button", { name: /Entrer dans la salle/i }).click();
    await learnerPage.locator('main[data-cafe-room-phase="error"]').waitFor({ timeout: 30_000 });
    await learnerContext.setOffline(false);
    await learnerPage.getByRole("button", { name: /Réessayer/i }).click();
    await learnerPage.locator('main[data-cafe-room-phase="media_prep"]').waitFor();
    await enter(learnerPage);
    check("real_join_after_browser_offline_retry", true);
    check("same_real_daily_room", joinedUrls.length >= 2 && joinedUrls.every((url) => url === joinedUrls[0]));

    currentStep = "mutual_presence";
    await hostPage.frameLocator("[data-cafe-daily-frame] iframe").getByText("Cafelearner", { exact: true }).first().waitFor();
    await learnerPage.frameLocator("[data-cafe-daily-frame] iframe").getByText("Cafehost", { exact: true }).first().waitFor();
    check("mutual_presence", true);
    await mediaControls(hostPage, "host");
    await mediaControls(learnerPage, "learner");
    currentStep = "bidirectional_synthetic_media";
    const mediaDeadline = Date.now() + 30_000;
    let media = false;
    while (Date.now() < mediaDeadline) {
      if (interrupted) throw new Error("Validation interrupted");
      const results = await Promise.all([receivedMedia(hostPage), receivedMedia(learnerPage)]);
      media = results.every((result) => result.audio && result.video);
      if (media) break;
      await delay(500);
    }
    check("bidirectional_synthetic_media", media, { realWebRtc: true, physicalDevices: false });
    await hostPage.screenshot({ path: join(outDir, "desktop-connected.png") });
    await learnerPage.screenshot({ path: join(outDir, "mobile-connected.png") });

    currentStep = "leave_rejoin";
    await learnerPage.getByRole("button", { name: /Quitter la salle/i }).click();
    await learnerPage.locator('main[data-cafe-room-phase="left"]').waitFor();
    await learnerPage.locator("[data-cafe-daily-frame] iframe").waitFor({ state: "detached" });
    check("iframe_removed_after_leave", await learnerPage.locator("[data-cafe-daily-frame] iframe").count() === 0);
    await learnerPage.goto(`${appBase}${roomPath}`, { waitUntil: "domcontentloaded" });
    await prepare(learnerPage);
    await enter(learnerPage);
    check("fresh_join_after_leave", true);
    await learnerPage.getByRole("button", { name: /Quitter la salle/i }).click();
    await learnerPage.locator('main[data-cafe-room-phase="left"]').waitFor();
    const returnLink = learnerPage.getByRole("link", { name: /Revenir à mon cours/i });
    check("course_return_preserved", await returnLink.getAttribute("href") === courseReturn);
    await returnLink.click();
    await learnerPage.waitForURL(`${appBase}${courseReturn}`, { timeout: 60_000 });
    await learnerPage.getByTestId("yo-student-hub").waitFor({ state: "visible", timeout: 60_000 });
    check("course_return_navigation", true);
    const violations = await hostPage.evaluate(() => (window as BrowserProbe).__cafeCspViolations ?? []);
    check("parent_csp_has_no_blocked_room_resources", !violations.some((name) => /^(script-src|connect-src|frame-src)/.test(name)));
  } catch (error) {
    failure = error;
    // Errors can contain URLs or credentials; only classification and our step
    // identifier are public. Detailed logs stay in the deleted private sandbox.
    console.error(JSON.stringify({ status: "FAIL", step: currentStep, errorClass: error instanceof Error ? error.name : "unknown" }));
  } finally {
    await browser?.close().catch(() => undefined);
    if (roomId) {
      try { await provider.deleteRoom(roomId); cleanup.dailyRoom = true; }
      catch { cleanup.dailyRoom = false; }
    }
    if (sessionCreated && actors[0]) {
      const cancelled = await Promise.resolve(admin.rpc("cafe_admin_cancel_server", { p_actor_id: actors[0].id, p_slug: slug })).catch(() => ({ error: true }));
      cleanup.sessionCancelled = !cancelled.error && "data" in cancelled && cancelled.data?.ok === true;
    }
    for (const [index, actor] of actors.entries()) {
      const revoked = await admin.auth.admin.signOut(actor.session.access_token, "global").catch(() => ({ error: true }));
      cleanup[`session${index}Revoked`] = !revoked.error;
    }
    for (const [index, id] of createdUserIds.entries()) {
      const deleted = await admin.auth.admin.deleteUser(id).catch(() => ({ error: true }));
      cleanup[`user${index}Deleted`] = !deleted.error;
    }
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      const stopDeadline = Date.now() + 10_000;
      while (server.exitCode === null && server.signalCode === null && Date.now() < stopDeadline) await delay(100);
      if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
    }
    const cleanupOk = Object.values(cleanup).every(Boolean);
    const report = { status: failure || interrupted || !cleanupOk ? "FAIL" : "PASS", sha: process.env.GITHUB_SHA ?? "local", failedStep: failure ? currentStep : null,
      validation: "real_daily_local_supabase_browser", buildScope: "targeted_routes", syntheticMedia: true, productionOAuth: false, cspBypass: false, steps, cleanup };
    writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, cleanup }));
    if (failure || interrupted || !cleanupOk) process.exitCode = 1;
    process.removeListener("SIGTERM", interrupt);
    process.removeListener("SIGINT", interrupt);
  }
}

void main().catch((error) => {
  const report = { status: "BLOCKED", step: currentStep, errorClass: error instanceof Error ? error.name : "unknown", steps };
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report));
  process.exitCode = 2;
});
