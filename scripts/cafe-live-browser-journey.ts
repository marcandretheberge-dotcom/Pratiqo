/**
 * Browser journey: LIVE invitation → auth session → UI Réserve → Place confirmée → reload → course return.
 * Reads .cafe-live-handoff.json from cafe-live-reservation-check.ts --keep
 *
 * Does NOT use page.request.post for reserve. Does NOT seed fake refresh_token cookies.
 * Reports BLOCKED if the app Supabase client never recognizes the learner session.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type BrowserContext, type Page, type Response } from "playwright";

type Handoff = {
  appBase: string;
  supabaseUrl: string;
  learnerEmail: string;
  learnerPassword: string;
  courseReturn: string;
  slug: string;
  previewLiveUrl: string;
  sessionUrl: string;
  inviteReserveHref?: string | null;
};

type Step = { step: string; ok: boolean; detail?: unknown };

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i);
    const v = line.slice(i + 1);
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}

loadEnvFile(".env.cafe-local");

/** Next.js 16 blocks 127.0.0.1 as cross-origin against localhost — browser must use localhost. */
function toBrowserBase(appBase: string) {
  return appBase.replace(/:\/\/127\.0\.0\.1\b/, "://localhost").replace(/\/$/, "");
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

function storageKeyFromSupabaseUrl(url: string) {
  try {
    return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  } catch {
    return "sb-127-auth-token";
  }
}

function pushStep(steps: Step[], name: string, condition: boolean, detail?: unknown) {
  steps.push({ step: name, ok: condition, detail });
  console.log(JSON.stringify({ step: name, ok: condition, detail: detail ?? null }));
  if (!condition) {
    const err = new Error(`ASSERT_FAIL ${name}${detail ? `: ${JSON.stringify(detail)}` : ""}`);
    (err as Error & { step?: string }).step = name;
    throw err;
  }
}

function confirmedLocator(page: Page) {
  return page.locator('[role="status"]').filter({
    hasText: /Place confirmée|Place confirmed|Plaza confirmada/i,
  });
}

function reserveButton(page: Page) {
  return page.getByRole("button", {
    name: /Réserver cette table|Reserve this table|Reservar esta mesa/i,
  });
}

function signInLink(page: Page) {
  return page.getByRole("link", {
    name: /Se connecter pour réserver|Sign in to reserve|Inicia sesión para reservar/i,
  });
}

function yoReturnLink(page: Page) {
  return page.getByRole("link", {
    name: /Revenir à mon cours|Return to my course|Volver a mi curso/i,
  });
}

function isStrictConfirmedVisible(page: Page) {
  // Never accept login link, reserve button, or return-only as confirmation.
  return confirmedLocator(page).count().then(async (n) => {
    if (n <= 0) return false;
    const text = (await confirmedLocator(page).first().innerText()).trim();
    return /Place confirmée|Place confirmed|Plaza confirmada/i.test(text);
  });
}

/**
 * Require the explicit local-sandbox CSP connect origin (no CDP BypassCSP).
 * This is a local validation harness — not a production OAuth proof.
 */
function requiredLocalSandboxOrigin(): string {
  const origin = process.env.CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN?.trim() ?? "";
  if (!origin) {
    throw new Error(
      "CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN must be set (exact sandbox origin, e.g. http://127.0.0.1:55421)",
    );
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to run browser journey with local CSP origin under VERCEL_ENV=production");
  }
  return origin.replace(/\/$/, "");
}

async function assertEnforcingCspAllowsSandbox(page: Page, sandboxOrigin: string) {
  let cspHeader: string | null = null;
  page.on("response", (res) => {
    if (res.request().resourceType() === "document") {
      cspHeader = res.headers()["content-security-policy"] ?? cspHeader;
    }
  });
  return {
    read: () => cspHeader,
    assertPresent: () => {
      if (!cspHeader) throw new Error("CSP header missing on document response");
      if (!cspHeader.includes(sandboxOrigin)) {
        throw new Error(
          `Enforcing CSP connect-src does not include ${sandboxOrigin}. ` +
            "Start Next with CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN set from .env.cafe-local.",
        );
      }
      return cspHeader;
    },
  };
}

async function seedRecognizedSession(
  context: BrowserContext,
  handoff: Handoff,
  appBase: string,
): Promise<{ accessToken: string; refreshToken: string } | { blocked: string }> {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(handoff.supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await client.auth.signInWithPassword({
    email: handoff.learnerEmail,
    password: handoff.learnerPassword,
  });
  if (signed.error || !signed.data.session?.access_token || !signed.data.session.refresh_token) {
    return { blocked: signed.error?.message ?? "signInWithPassword returned no session" };
  }
  if (signed.data.session.refresh_token === "browser-live") {
    return { blocked: "refusing fake refresh_token browser-live" };
  }

  const key = storageKeyFromSupabaseUrl(handoff.supabaseUrl);
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

  return {
    accessToken: signed.data.session.access_token,
    refreshToken: signed.data.session.refresh_token,
  };
}

async function prepCancelSeat(appBase: string, slug: string, accessToken: string) {
  const mine = await fetch(`${appBase}/api/cafe/reservations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await mine.json()) as {
    reservations?: Array<{ slug: string; version?: number; effective_status?: string; effectiveStatus?: string }>;
  };
  const row = (body.reservations ?? []).find((r) => r.slug === slug);
  const effective = row?.effective_status ?? row?.effectiveStatus;
  if (!row || effective !== "confirmed") {
    return { skipped: true, status: mine.status, row };
  }
  const cancelled = await fetch(`${appBase}/api/cafe/reservations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug,
      action: "cancel",
      expectedVersion: typeof row.version === "number" ? row.version : 0,
      requestId: crypto.randomUUID(),
    }),
  });
  return { skipped: false, status: cancelled.status, body: await cancelled.json() };
}

void (async () => {
  const steps: Step[] = [];
  const sections: Record<string, unknown> = {};
  const artifactDir = join(process.cwd(), "artifacts", "cafe-live-browser");
  mkdirSync(artifactDir, { recursive: true });

  const handoff = JSON.parse(readFileSync(".cafe-live-handoff.json", "utf8")) as Handoff;
  const appBase = toBrowserBase(handoff.appBase);
  const previewLiveUrl = handoff.previewLiveUrl.replace(handoff.appBase, appBase)
    .replace("://127.0.0.1", "://localhost");
  const sessionUrl = handoff.sessionUrl.replace(handoff.appBase, appBase)
    .replace("://127.0.0.1", "://localhost");

  pushStep(steps, "handoff_loaded", Boolean(handoff.slug && handoff.courseReturn && previewLiveUrl), {
    slug: handoff.slug,
    courseReturn: handoff.courseReturn,
    appBase,
  });

  const sandboxOrigin = requiredLocalSandboxOrigin();
  pushStep(steps, "local_sandbox_csp_origin_configured", Boolean(sandboxOrigin), sandboxOrigin);

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();
  // No Page.setBypassCSP — enforcing CSP must allow the exact local sandbox origin.
  const cspProbe = await assertEnforcingCspAllowsSandbox(page, sandboxOrigin);

  let browserResult: "SUCCESS" | "BLOCKED" | "FAILED" = "FAILED";

  try {
    // --- Auth: real createBrowserClient cookie session ---
    const seeded = await seedRecognizedSession(context, handoff, appBase);
    if ("blocked" in seeded) {
      browserResult = "BLOCKED";
      sections.authentication = { status: "BLOCKED", reason: seeded.blocked, steps };
      writeFileSync(
        ".cafe-live-browser-report.json",
        JSON.stringify({ browser: "BLOCKED", sections, steps }, null, 2),
      );
      console.log(JSON.stringify({ browser: "BLOCKED", reason: seeded.blocked }, null, 2));
      process.exitCode = 2;
      return;
    }
    pushStep(steps, "browser_auth_real_tokens", Boolean(seeded.accessToken && seeded.refreshToken), {
      refreshPrefix: seeded.refreshToken.slice(0, 8),
      fakeRefresh: false,
    });

    const cookieProbe = (await context.cookies()).find((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
    pushStep(steps, "browser_auth_cookie_not_fake", Boolean(cookieProbe) && !cookieProbe!.value.includes("browser-live"), {
      name: cookieProbe?.name,
      len: cookieProbe?.value.length,
    });

    // --- Invitation LIVE → CTA → Yo context ---
    await page.goto(previewLiveUrl, { waitUntil: "domcontentloaded", timeout: 180000 });
    pushStep(steps, "browser_csp_includes_sandbox_origin", true, cspProbe.assertPresent());
    await page.waitForFunction(
      () => /Réserver cette table|Reserve this table|Reservar esta mesa/i.test(document.body?.innerText || ""),
      { timeout: 60000 },
    );
    const inviteCta = page.getByRole("link", {
      name: /Réserver cette table|Reserve this table|Reservar esta mesa/i,
    }).first();
    pushStep(steps, "browser_invitation_cta_visible", (await inviteCta.count()) > 0);
    const ctaHref = await inviteCta.getAttribute("href");
    pushStep(
      steps,
      "browser_invitation_cta_preserves_yo",
      Boolean(
        ctaHref
        && ctaHref.includes("yoReturn")
        && (ctaHref.includes("from%3Dyo") || ctaHref.includes("from=yo") || ctaHref.includes("next=")),
      ),
      ctaHref,
    );

    // Prefer explicit navigation via CTA href — click()+waitForURL("load") can hang
    // on /login when background requests never settle.
    const ctaTarget = ctaHref!.startsWith("http") ? ctaHref! : `${appBase}${ctaHref}`;
    await page.goto(ctaTarget, { waitUntil: "domcontentloaded", timeout: 120000 });
    pushStep(
      steps,
      "browser_invitation_cta_navigated",
      /\/(login|cafe)(?:\/|\?|$)/.test(page.url()),
      page.url(),
    );

    // Login may auto-redirect when session cookie is recognized by AuthProvider.
    if (!page.url().includes(`/cafe/${handoff.slug}`)) {
      try {
        await page.waitForURL(new RegExp(`/cafe/${handoff.slug}`), {
          timeout: 20000,
          waitUntil: "domcontentloaded",
        });
      } catch {
        // Fall through — try completing the handoff via the login `next` param.
      }
    }

    if (!page.url().includes(`/cafe/${handoff.slug}`) && page.url().includes("/login")) {
      const loginUrl = new URL(page.url());
      const nextPath = loginUrl.searchParams.get("next");
      if (nextPath && nextPath.includes(`/cafe/${handoff.slug}`)) {
        // Local sandbox: product login UI is Google-only. With a recognized
        // createBrowserClient cookie session, follow the preserved `next` deep-link
        // (still not a production OAuth proof).
        await page.goto(`${appBase}${nextPath}`, { waitUntil: "domcontentloaded", timeout: 120000 });
        pushStep(steps, "browser_login_next_handoff", page.url().includes(`/cafe/${handoff.slug}`), {
          nextPath,
          url: page.url(),
        });
      }
    }

    if (!page.url().includes(`/cafe/${handoff.slug}`)) {
      browserResult = "BLOCKED";
      sections.authentication = {
        status: "BLOCKED",
        reason: "CTA did not land on café session with recognized learner session",
        url: page.url(),
      };
      writeFileSync(
        ".cafe-live-browser-report.json",
        JSON.stringify({ browser: "BLOCKED", sections, steps }, null, 2),
      );
      console.log(JSON.stringify({ browser: "BLOCKED", url: page.url(), steps }, null, 2));
      process.exitCode = 2;
      return;
    }

    // Production-mode (`next start`) is required with the enforcing CSP (no unsafe-eval).
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Preparing the tables|Préparation des tables/i.test(t)) return false;
        return /LIVE Intro|Réserver cette table|Reserve this table|Place confirmée|Place confirmed|Se connecter|Sign in to reserve/i.test(t);
      },
      { timeout: 120000 },
    );

    if ((await signInLink(page).count()) > 0) {
      browserResult = "BLOCKED";
      sections.authentication = {
        status: "BLOCKED",
        reason: "session page still shows Sign in — createBrowserClient did not resolve learner token",
        url: page.url(),
      };
      writeFileSync(
        ".cafe-live-browser-report.json",
        JSON.stringify({ browser: "BLOCKED", sections, steps }, null, 2),
      );
      console.log(JSON.stringify({ browser: "BLOCKED", reason: "sign_in_still_visible", steps }, null, 2));
      process.exitCode = 2;
      return;
    }

    sections.authentication = { status: "OK", url: page.url() };
    pushStep(steps, "browser_auth_recognized", true, page.url());

    pushStep(steps, "browser_yo_return_visible", (await yoReturnLink(page).count()) > 0);
    const yoHref = await yoReturnLink(page).first().getAttribute("href");
    pushStep(
      steps,
      "browser_yo_return_matches_handoff",
      Boolean(yoHref && (yoHref === handoff.courseReturn || yoHref.endsWith(handoff.courseReturn))),
      { yoHref, courseReturn: handoff.courseReturn },
    );

    // Free seat via API (not UI reserve), then wait for Reserve button.
    const prep = await prepCancelSeat(appBase, handoff.slug, seeded.accessToken);
    pushStep(steps, "browser_prep_cancel", prep.skipped || prep.status === 200 || prep.status === 409, prep);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return /Réserver cette table|Reserve this table|Reservar esta mesa|Place confirmée|Place confirmed/i.test(t)
          && !/Se connecter pour réserver|Sign in to reserve/i.test(t);
      },
      { timeout: 60000 },
    );

    if ((await signInLink(page).count()) > 0) {
      browserResult = "BLOCKED";
      sections.authentication = {
        status: "BLOCKED",
        reason: "sign-in reappeared after reload",
        url: page.url(),
      };
      writeFileSync(
        ".cafe-live-browser-report.json",
        JSON.stringify({ browser: "BLOCKED", sections, steps }, null, 2),
      );
      process.exitCode = 2;
      return;
    }

    // If already confirmed from a race, cancel again and reload once.
    if (await isStrictConfirmedVisible(page)) {
      await prepCancelSeat(appBase, handoff.slug, seeded.accessToken);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(1500);
    }

    pushStep(steps, "browser_reserve_button_ready", (await reserveButton(page).count()) > 0, {
      body: (await page.locator("main").innerText()).slice(0, 400),
    });

    // --- UI reserve: observe real POST from the interface ---
    const postPromise = page.waitForResponse(
      (res: Response) =>
        res.url().includes("/api/cafe/reservations")
        && res.request().method() === "POST",
      { timeout: 60000 },
    );
    await reserveButton(page).click();
    const postRes = await postPromise;
    const postBody = await postRes.json().catch(() => null);
    pushStep(steps, "browser_ui_post_reserve", postRes.ok(), {
      status: postRes.status(),
      body: postBody,
      fromUi: true,
    });

    await page.waitForFunction(
      () => /Place confirmée|Place confirmed|Plaza confirmada/i.test(document.body?.innerText || ""),
      { timeout: 30000 },
    );
    pushStep(steps, "browser_ui_place_confirmee", await isStrictConfirmedVisible(page), {
      reserveStillVisible: (await reserveButton(page).count()) > 0,
      signInVisible: (await signInLink(page).count()) > 0,
    });
    // Explicitly reject false positives
    pushStep(steps, "browser_ui_not_signin_or_reserve_only", (await reserveButton(page).count()) === 0 && (await signInLink(page).count()) === 0);

    const beforePath = join(artifactDir, "after-reserve-before-reload.png");
    await page.screenshot({ path: beforePath, fullPage: true });
    sections.reservationUi = {
      status: "OK",
      postStatus: postRes.status(),
      screenshot: beforePath,
    };

    // --- Reload persistence ---
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(
      () => /Place confirmée|Place confirmed|Plaza confirmada/i.test(document.body?.innerText || ""),
      { timeout: 60000 },
    );
    pushStep(steps, "browser_reload_place_confirmee", await isStrictConfirmedVisible(page), {
      reserveStillVisible: (await reserveButton(page).count()) > 0,
      signInVisible: (await signInLink(page).count()) > 0,
      body: (await page.locator("main").innerText()).slice(0, 500),
    });
    pushStep(steps, "browser_reload_not_signin_or_reserve_only", (await reserveButton(page).count()) === 0 && (await signInLink(page).count()) === 0);
    const afterPath = join(artifactDir, "after-reload.png");
    await page.screenshot({ path: afterPath, fullPage: true });
    sections.reloadPersistence = { status: "OK", screenshot: afterPath };

    // --- Course return from handoff (no hardcoded live= marker) ---
    pushStep(steps, "browser_yo_return_still_visible", (await yoReturnLink(page).count()) > 0);
    const returnByHref = page.locator(`a[href="${handoff.courseReturn}"]`).first();
    pushStep(steps, "browser_yo_return_href_present", (await returnByHref.count()) > 0, handoff.courseReturn);
    await Promise.all([
      page.waitForURL((url) => {
        try {
          const u = new URL(url);
          const expected = new URL(handoff.courseReturn, "http://local.invalid");
          if (u.pathname !== expected.pathname) return false;
          for (const key of expected.searchParams.keys()) {
            if (u.searchParams.get(key) !== expected.searchParams.get(key)) return false;
          }
          return true;
        } catch {
          return false;
        }
      }, { timeout: 30000 }),
      returnByHref.click(),
    ]);
    const dest = page.url();
    const expectedPath = handoff.courseReturn.startsWith("/")
      ? handoff.courseReturn
      : `/${handoff.courseReturn}`;
    const expectedUrl = new URL(expectedPath, "http://local.invalid");
    const actualUrl = new URL(dest);
    const pathOk = actualUrl.pathname === expectedUrl.pathname;
    let queryOk = true;
    const queryDetail: Record<string, { expected: string | null; actual: string | null }> = {};
    for (const key of expectedUrl.searchParams.keys()) {
      const expected = expectedUrl.searchParams.get(key);
      const actual = actualUrl.searchParams.get(key);
      queryDetail[key] = { expected, actual };
      if (expected !== actual) queryOk = false;
    }

    pushStep(steps, "browser_returned_to_course", pathOk && queryOk, {
      dest,
      expectedPath,
      queryDetail,
    });
    sections.courseReturn = {
      status: "OK",
      destination: dest,
      expected: handoff.courseReturn,
    };

    browserResult = "SUCCESS";
    const report = {
      browser: browserResult,
      testedSha: process.env.CAFE_PROBE_SHA || null,
      cspBypass: false,
      cspMode: "enforcing_with_CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN",
      sandboxOrigin,
      validationKind: "local_sandbox_browser",
      notProductionOAuth: true,
      loginPath:
        "Cookie session seeded from signInWithPassword against local GoTrue (product /login is Google OAuth only; this is not a production OAuth validation).",
      courseReturnNote:
        "courseReturn used demo=introductions-complete as a demonstration handoff, not a full pedagogical mission validation.",
      sections: {
        authentication: sections.authentication,
        reservationUi: sections.reservationUi,
        reloadPersistence: sections.reloadPersistence,
        courseReturn: sections.courseReturn,
      },
      screenshots: { beforeReload: beforePath, afterReload: afterPath },
      steps,
    };
    writeFileSync(".cafe-live-browser-report.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (browserResult !== "BLOCKED") browserResult = "FAILED";
    const report = {
      browser: browserResult,
      message,
      sections,
      steps,
      url: page.url(),
    };
    writeFileSync(".cafe-live-browser-report.json", JSON.stringify(report, null, 2));
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = browserResult === "BLOCKED" ? 2 : 1;
  } finally {
    await browser.close();
  }
})();
