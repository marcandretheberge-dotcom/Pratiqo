/**
 * Real Chromium interactions with the labelled fixture-only community preview.
 * Community fixtures are UI evidence only: no database, real members or Daily.
 * The separate signed-out /cafe check decodes the committed hero MP4 in Chromium.
 * Neither check requests microphone or camera access.
 * Start Next with CAFE_V1_ENABLED=true, CAFE_COMMUNITY_ENABLED=true,
 * CAFE_COMMUNITY_PREVIEW_ENABLED=true. Run with node --import tsx.
 * Set CAFE_HERO_ONLY=true to verify only the public entrance on a hosted preview.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright";

const base = (process.env.CAFE_COMMUNITY_BASE || process.env.CAFE_PR3B_BASE || "http://localhost:3465").replace(/\/$/, "");
const outDir = join("artifacts", "cafe-community");
const heroOnly = process.env.CAFE_HERO_ONLY === "true";
mkdirSync(outDir, { recursive: true });

async function noOverflow(page: Page, label: string) {
  const result = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(result.content <= result.width + 1, `${label}: horizontal overflow (${result.content}px in ${result.width}px)`);
}

async function dismissConsent(page: Page) {
  const banner = page.getByTestId("cookie-consent-banner");
  if (await banner.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false)) {
    await banner.getByRole("button", { name: /Nécessaires seulement|Necessary only|Solo necesarias/i }).click();
    await banner.waitFor({ state: "hidden" });
  }
  const install = page.getByRole("complementary", { name: /Installer Pratiqo|Install Pratiqo|Instalar Pratiqo/i });
  if (await install.isVisible()) await install.getByRole("button", { name: /Pas maintenant|Not now|Ahora no/i }).click();
}


/** Actual committed video playback, separate from the simulated community journey. */
async function exerciseHeroVideo(browser: Browser, label: string, options: BrowserContextOptions, locale = "en") {
  const context = await browser.newContext({ ...options, locale: "en-US", reducedMotion: "no-preference" });
  await context.addInitScript({ content: `localStorage.setItem("pratiqo-locale", ${JSON.stringify(locale)});` });
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  const mediaResponses: { status: number; contentType: string }[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/videos/cafe-world-journey.mp4") {
      mediaResponses.push({ status: response.status(), contentType: response.headers()["content-type"] ?? "" });
    }
  });
  try {
    const response = await page.goto(`${base}/cafe`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    assert.equal(response?.status(), 200, "the public Café entrance must load");
    await dismissConsent(page);
    const hero = page.locator('[data-cafe-hero="video-enabled"]');
    await hero.waitFor({ state: "visible" });
    await hero.scrollIntoViewIfNeeded();
    const video = hero.locator("video");
    const control = hero.getByRole("button");
    // Raw browser source avoids tsx's __name helper in the isolated browser realm.
    await page.waitForFunction(`(() => {
      const video = document.querySelector('[data-cafe-hero="video-enabled"] video');
      return video && !video.error && !video.paused && video.readyState >= 2 &&
        video.videoWidth === 1280 && video.videoHeight === 720 &&
        video.getVideoPlaybackQuality().totalVideoFrames > 0;
    })()`, undefined, { timeout: 30_000 });
    const initialTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    await page.waitForFunction(`document.querySelector('[data-cafe-hero="video-enabled"] video').currentTime > ${initialTime + 0.2}`);
    const metadata = await video.evaluate((element: HTMLVideoElement) => ({
      width: element.videoWidth, height: element.videoHeight, duration: element.duration,
      muted: element.muted, loop: element.loop, playsInline: element.playsInline,
      source: new URL(element.currentSrc).pathname,
    }));
    assert.equal(metadata.source, "/videos/cafe-world-journey.mp4");
    assert.ok(metadata.muted && metadata.loop && metadata.playsInline);
    assert.ok(metadata.duration > 28 && metadata.duration < 31, "the complete three-country loop is present");
    const controlBox = await control.boundingBox();
    assert.ok(controlBox && controlBox.width >= 44 && controlBox.height >= 44, "video control has an accessible touch target");

    await control.click();
    await page.waitForFunction(`document.querySelector('[data-cafe-hero="video-enabled"] video').paused`);
    const pausedAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    await page.waitForTimeout(300);
    assert.equal(await video.evaluate((element: HTMLVideoElement) => element.currentTime), pausedAt, "Pause stops the actual media clock");
    await control.click();
    await page.waitForFunction(`document.querySelector('[data-cafe-hero="video-enabled"] video').currentTime > ${pausedAt + 0.2}`);

    // Verify all four invitation layouts over the actual decoded frames, including
    // the narrow signed-out entry where the film is smaller than the viewport.
    await control.click();
    for (const [cue, time] of [["japan", 3], ["marrakech", 13], ["paris", 23.5], ["welcome", 27.5]] as const) {
      await video.evaluate((element: HTMLVideoElement, target) => { element.currentTime = target; }, time);
      await page.waitForFunction(`(() => {
        const video = document.querySelector('[data-cafe-hero="video-enabled"] video');
        const cue = document.querySelector('[data-cafe-cue="${cue}"]');
        return video.paused && !video.seeking && video.readyState >= 2 &&
          Math.abs(video.currentTime - ${time}) < 0.1 && cue && Number(cue.style.opacity) > .95;
      })()`);
      const invitation = hero.locator(`[data-cafe-cue="${cue}"]`);
      const invitationBox = await invitation.boundingBox();
      const currentControlBox = await control.boundingBox();
      const heroBox = await hero.boundingBox();
      assert.ok(invitationBox && currentControlBox && heroBox);
      assert.ok(invitationBox.x >= heroBox.x - 1 && invitationBox.x + invitationBox.width <= heroBox.x + heroBox.width + 1, `${label}/${cue}: invitation fits the player`);
      const overlap = invitationBox.x < currentControlBox.x + currentControlBox.width && invitationBox.x + invitationBox.width > currentControlBox.x && invitationBox.y < currentControlBox.y + currentControlBox.height && invitationBox.y + invitationBox.height > currentControlBox.y;
      assert.equal(overlap, false, `${label}/${cue}: invitation and control do not overlap`);
      if (cue === "marrakech") assert.equal(await invitation.locator('[lang="ary"]').getAttribute("dir"), "rtl");
      await noOverflow(page, `${label}/${cue}`);
      await hero.screenshot({ path: join(outDir, `${label}-hero-${cue}.png`) });
    }
    await noOverflow(page, `${label}/hero-video-paris`);
    await page.screenshot({ path: join(outDir, `${label}-hero-video-paris.png`), fullPage: true });
    await hero.screenshot({ path: join(outDir, `${label}-hero-video-paris-detail.png`) });

    // Exercise the wrapper contract in a real browser, without claiming a physical
    // WKWebView/device test. A deliberate Pause must survive native state changes.
    for (const state of ["background", "active"]) {
      await page.evaluate(`window.__PRATIQO_APP_STATE__ = "${state}"; window.dispatchEvent(new Event("pratiqo:app-state"));`);
      await page.waitForTimeout(100);
      assert.equal(await video.evaluate((element: HTMLVideoElement) => element.paused), true, "native resume preserves manual Pause");
    }

    await video.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - 0.3; });
    await control.click();
    await page.waitForFunction(`(() => {
      const video = document.querySelector('[data-cafe-hero="video-enabled"] video');
      return !video.paused && !video.error && video.currentTime < 1.5;
    })()`, undefined, { timeout: 10_000 });
    const decodedFrames = await video.evaluate((element: HTMLVideoElement) => element.getVideoPlaybackQuality().totalVideoFrames);
    assert.ok(mediaResponses.some(({ status, contentType }) => (status === 200 || status === 206) && /video\/mp4/.test(contentType)), "the committed MP4 is served as playable media");
    assert.deepEqual(runtimeErrors, [], "no entrance hydration or runtime exceptions");
    return { viewport: label, locale, engine: "chromium", realVideoPlayback: true, liveConversation: false, ...metadata, decodedFrames, mediaResponses,
      checks: ["real_mp4_decode", "muted_inline_autoplay", "advancing_media_clock", "pause_play", "loop_wrap", "four_invitation_layouts", "arabic_rtl", "native_event_preserves_pause", "paris_hold_screenshot", "no_horizontal_overflow"] };
  } catch (error) {
    await page.screenshot({ path: join(outDir, `${label}-hero-video-failure.png`), fullPage: true }).catch(() => undefined);
    throw error;
  } finally { await context.close(); }
}

async function exercise(browser: Browser, label: string, options: BrowserContextOptions) {
  const context = await browser.newContext({ ...options, locale: "en-US", timezoneId: "America/Toronto" });
  // Raw browser source avoids tsx's __name helper leaking into Playwright's isolated realm.
  await context.addInitScript({ content: `
    window.__cafeMediaRequests = 0;
    const forbidden = () => {
      window.__cafeMediaRequests++;
      return Promise.reject(new Error("The text-only preview must not request media"));
    };
    if (navigator.mediaDevices) {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: forbidden });
      Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", { configurable: true, value: forbidden });
    }
  ` });
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  let communityRequests = 0;
  let dailyRequests = 0;
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/(^|\.)daily\.co$/.test(url.hostname)) dailyRequests++;
    if (url.pathname.startsWith("/api/cafe") || url.pathname.startsWith("/api/admin/cafe")) communityRequests++;
  });
  await page.route("**/api/cafe/**", (route) => route.abort());
  await page.route("**/api/admin/cafe/**", (route) => route.abort());
  const screenshot = async (name: string) => {
    await noOverflow(page, `${label}/${name}`);
    await page.screenshot({ path: join(outDir, `${label}-${name}.png`), fullPage: true });
  };
  try {
    const response = await page.goto(`${base}/cafe/preview/communaute`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    assert.equal(response?.status(), 200, "preview must be explicitly enabled");
    const headers = response!.headers();
    assert.match(headers["permissions-policy"] ?? "", /camera=\(\)/, "text page denies camera");
    assert.match(headers["permissions-policy"] ?? "", /microphone=\(\)/, "text page denies microphone");
    await page.getByText(/DÉMONSTRATION · Personnes, présence/).waitFor();
    await page.getByLabel("Langue de la démonstration").selectOption("en");
    await page.getByRole("heading", { name: "Come in. Say hello." }).waitFor();
    await dismissConsent(page);
    await screenshot("lobby");

    // Actual profile UI: selection is deliberately outside the initial Yo course set.
    await page.getByRole("button", { name: "Tester l’entrée" }).click();
    await page.getByLabel("Your Café name").fill("Asha · browser demo");
    const native = page.getByRole("group", { name: "My native language(s)" });
    await native.getByRole("searchbox").fill("Hindi");
    await native.getByRole("checkbox", { name: "Hindi", exact: true }).check();
    const learning = page.getByRole("group", { name: "Languages I am learning" });
    await learning.getByRole("searchbox").fill("Swahili");
    await learning.getByRole("checkbox", { name: "Swahili", exact: true }).check();
    await page.getByRole("checkbox", { name: "I confirm I am 18 or older." }).check();
    await page.getByRole("checkbox", { name: "I agree to these rules and respect other members’ choices." }).check();
    await screenshot("profile");
    await page.getByRole("button", { name: "Enter the Café", exact: true }).click();
    await page.getByRole("button", { name: "My profile · Asha · browser demo" }).waitFor();

    await page.getByRole("button", { name: "Join the chat", exact: true }).click();
    await page.getByRole("heading", { name: "Your Café conversation", exact: true }).waitFor();
    if ((options.viewport?.width ?? 0) >= 760) {
      const originalViewport = page.viewportSize()!;
      for (const height of [800, 900]) {
        await page.setViewportSize({ ...originalViewport, height });
        await page.evaluate(() => window.scrollTo(0, 0));
        const composer = await page.getByLabel("Your message", { exact: true }).locator("..").boundingBox();
        assert.ok(composer && composer.y >= 0 && composer.y + composer.height <= height + 1,
          `desktop composer must fit the ${height}px viewport without scrolling`);
      }
      await page.setViewportSize(originalViewport);
    }
    const plainMessage = "Hello! <strong>This stays plain text.</strong>";
    await page.getByLabel("Your message", { exact: true }).fill(plainMessage);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.getByRole("log").getByText(plainMessage, { exact: true }).waitFor();
    assert.equal(await page.getByRole("log").locator("strong").filter({ hasText: "This stays plain text." }).count(), 0);
    await page.getByRole("button", { name: "Block", exact: true }).waitFor();
    await page.getByRole("button", { name: "Report", exact: true }).click();
    await page.getByRole("dialog", { name: "Report behaviour" }).waitFor();
    await screenshot("report-controls");
    await page.getByRole("button", { name: "Cancel report", exact: true }).click();
    await screenshot("chat");
    await page.getByRole("button", { name: "Leave the room", exact: true }).click();

    await page.getByRole("button", { name: "Create a room", exact: true }).click();
    const create = page.getByRole("dialog", { name: "Your room", exact: true });
    await create.getByLabel("Room name", { exact: true }).fill("Our Swahili conversation · demo");
    await create.getByRole("button", { name: "Open my room and wait", exact: true }).click();
    await page.getByRole("heading", { name: "Our Swahili conversation · demo" }).waitFor();
    await screenshot("created-room");
    await page.getByRole("button", { name: "Close the room", exact: true }).click();

    await page.getByRole("button", { name: "Pick a date", exact: true }).click();
    const schedule = page.getByRole("dialog", { name: "Your room", exact: true });
    await schedule.getByLabel("Room name", { exact: true }).fill("Tomorrow over coffee · demo");
    const localFuture = await page.evaluate(() => {
      const date = new Date(Date.now() + 2 * 86_400_000);
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T18:30`;
    });
    await schedule.locator('input[type="datetime-local"]').fill(localFuture);
    await screenshot("schedule");
    await schedule.getByRole("button", { name: "Schedule the room", exact: true }).click();
    await page.getByRole("button", { name: "Upcoming", exact: true }).click();
    await page.getByRole("heading", { name: "Tomorrow over coffee · demo" }).waitFor();
    await screenshot("scheduled-room");

    // Block is a direct action, independent of finishing a report.
    await page.getByRole("button", { name: "People", exact: true }).click();
    const maya = page.getByRole("article").filter({ hasText: "Maya · démo" });
    await maya.getByRole("button", { name: "Block", exact: true }).click();
    await page.getByText("This person is blocked. You can manage blocks in My profile.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "My profile · Asha · browser demo" }).click();
    await page.getByRole("dialog", { name: "My Café profile" }).getByRole("button", { name: "Unblock", exact: true }).waitFor();
    await screenshot("blocked-list");
    await page.getByRole("button", { name: "Close my profile", exact: true }).click();

    // Empty filter remains actionable and never invents people or rooms.
    await page.getByRole("button", { name: "Now", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter by language" }).selectOption("hi");
    await page.getByText("The first hello can come from you.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "See all languages", exact: true }).waitFor();
    await screenshot("empty-state");
    assert.equal(await page.locator("iframe").count(), 0, "text preview creates no media frames");
    const mediaRequests = await page.evaluate(() => (window as unknown as { __cafeMediaRequests: number }).__cafeMediaRequests);
    assert.equal(mediaRequests, 0); assert.equal(dailyRequests, 0); assert.equal(communityRequests, 0);
    assert.deepEqual(runtimeErrors, [], "no hydration or runtime exceptions");
    return { viewport: label, engine: "chromium", simulatedCommunity: true, realDatabase: false, realMedia: false, communityRequests, dailyRequests, mediaRequests, checks: ["normal_headers", "all_languages", "profile_agreements", "text_join_send", "plain_text", ...((options.viewport?.width ?? 0) >= 760 ? ["composer_fits_800_and_900px"] : []), "create_now", "local_future_schedule", "independent_block", "report_controls", "empty_state", "no_horizontal_overflow"] };
  } catch (error) {
    await page.screenshot({ path: join(outDir, `${label}-failure.png`), fullPage: true }).catch(() => undefined);
    throw error;
  } finally { await context.close(); }
}

void (async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CAFE_BROWSER_EXECUTABLE_PATH || undefined });
  try {
    const desktop = { viewport: { width: 1280, height: 900 } };
    const mobile = { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
    const heroVideoCases = [
      await exerciseHeroVideo(browser, "desktop-1280", desktop),
      await exerciseHeroVideo(browser, "mobile-320-fr", mobile, "fr"),
      await exerciseHeroVideo(browser, "mobile-320-en", mobile, "en"),
      await exerciseHeroVideo(browser, "mobile-320-es", mobile, "es"),
    ];
    const cases = heroOnly ? [] : [
      await exercise(browser, "desktop-1280", desktop),
      await exercise(browser, "mobile-320", mobile),
    ];
    const report = { kind: heroOnly ? "cafe_entrance_browser" : "community_fixture_browser_ui", ok: true, browserVersion: browser.version(), notLiveValidation: true, cases, heroVideoCases };
    writeFileSync(join(outDir, "community-browser-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch((error: unknown) => {
  const result = { kind: "community_fixture_browser_ui", ok: false, notLiveValidation: true, error: error instanceof Error ? error.message : "Browser check failed" };
  writeFileSync(join(outDir, "community-browser-report.json"), JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result)); process.exitCode = 1;
});
