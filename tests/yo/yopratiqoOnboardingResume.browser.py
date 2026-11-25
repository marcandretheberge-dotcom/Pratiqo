"""Real blank-profile onboarding resumes across locales and stale browser tabs.

Preferences and every checked answer come from visible controls. No placement,
profile, outcome, reward or entitlement fixture is seeded into storage.
"""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-journal-qa"))
out.mkdir(parents=True, exist_ok=True)
course = next(item["course"] for item in json.loads(
    (Path(os.environ.get("YO_QA_DIR", "/tmp/yo-shared-review")) / "courses.json").read_text())
    if item["course"]["language"] == "en")


def verify(browser, engine, italian):
    language, width = ("it", 320) if italian else ("en", 393)
    key = "yo.onboarding-draft.v1." + language
    path = "/yo/langues/italien/parcours" if italian else "/yo/langues/anglais/demarrer"
    welcome = "[data-yoppo-onboarding]" if italian else "[data-shared-welcome]"
    context = browser.new_context(viewport={"width": width, "height": 740}, locale="en-CA",
                                  is_mobile=True, has_touch=True, reduced_motion="reduce")
    errors, forbidden = [], []
    context.add_init_script("""window.__welcomeHold = false; window.__welcomeBlocked = 0;
      window.__welcomeAudio = 0; window.__welcomeMicrophones = 0; window.__welcomeVoices = 0;
      for (const name of ['storage', 'focus', 'pageshow', 'visibilitychange']) {
        addEventListener(name, event => {
          if (window.__welcomeHold) { window.__welcomeBlocked++; event.stopImmediatePropagation(); }
        }, true);
      }
      if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable:true, value:() => { window.__welcomeMicrophones++;
          return Promise.reject(new DOMException('Microphone disabled in QA', 'NotAllowedError')); }
      });
      if (window.speechSynthesis) Object.defineProperty(window.speechSynthesis, 'speak', {
        configurable:true, value:() => { window.__welcomeVoices++; }
      });
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.tagName === 'AUDIO') { window.__welcomeAudio++;
          return Promise.reject(new DOMException('Written scenario', 'NotAllowedError')); }
        return play.call(this);
      };""")

    def intercept(request_route):
        url = urlsplit(request_route.request.url)
        if url.netloc != urlsplit(base).netloc or url.path.startswith("/api/"):
            forbidden.append(request_route.request.url)
            request_route.fulfill(status=503, content_type="application/json", body='{"error":"disabled_in_qa"}')
        else:
            request_route.continue_()

    context.route("**/*", intercept)
    a, b = context.new_page(), context.new_page()
    for page in (a, b):
        page.set_default_navigation_timeout(90000)
        page.on("pageerror", lambda error: errors.append(str(error)))

    def read(page):
        return page.evaluate("key => JSON.parse(localStorage.getItem(key))", key)["state"]

    def untouched(page):
        keys = page.evaluate("() => Object.keys(localStorage)")
        assert not any(name.startswith(("yo.review.", "yo.learning-profile.", "yo.shared-intro.",
                                       "yo.italian.course.", "yopratiqo:italian-course:", "yo.xp.", "yo.entitlement"))
                       for name in keys), keys

    def capture(page, name):
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Horizontal overflow"
        page.screenshot(path=str(out / f"{engine}-{language}-welcome-{name}.png"))

    def visit(page, locale="en"):
        page.goto(base + path + "?lang=" + locale, wait_until="domcontentloaded")
        expect(page.locator(welcome)).to_be_visible(timeout=45000)

    def hold(page):
        page.evaluate("window.__welcomeHold = true")

    try:
        visit(a)
        expect(a.locator(welcome).get_by_role("heading", level=1)).to_be_focused()
        banner = a.get_by_test_id("cookie-consent-banner")
        if banner.is_visible():
            banner.get_by_role("button", name=re.compile("Necessary only|Nécessaires|Solo necesarias")).click()
        a.get_by_role("button", name="I know a few words", exact=True).click()
        a.get_by_role("button", name="Work or studies", exact=True).click()
        a.get_by_role("button", name="Art", exact=True).click()
        a.get_by_role("button", name="Continue", exact=True).click()
        a.get_by_role("button", name="Choose another duration", exact=True).click()
        a.get_by_role("spinbutton").fill("95")
        visit(a, "fr")
        expect(a.get_by_role("spinbutton")).to_have_value("95")
        preferences = read(a)
        assert preferences["goal"] == "work" and preferences["interests"] == ["art"]
        assert preferences["custom"] and preferences["customText"] == "95"
        capture(a, "custom-reloaded-fr")
        a.get_by_role("button", name="Continuer", exact=True).click()
        a.get_by_role("button", name="Trouver mon point de départ", exact=True).click()
        visit(a)
        visit(b)
        hold(b)
        if italian:
            a.get_by_role("button", name="Sono canadese.", exact=True).click()
            b.get_by_role("button", name="Mi chiamo Nina.", exact=True).click()
            checked = read(a)["game"]
            assert checked["selected"] == "1" and checked["complete"] and checked["feedback"] is False
        else:
            wrong = next(value for value in course["final"][0]["options"] if value != course["final"][0]["answer"])
            a.locator(f'[data-answer-id="{wrong}"]').click()
            b.locator(f'[data-answer-id="{course["final"][0]["answer"]}"]').click()
            checked = read(a)["draft"]
            assert checked["selected"] == wrong and checked["checked"] and checked["correct"] is False
        assert read(b)["answers"] == [], "The stale check appended a placement result"
        expect(b.get_by_text("Your choices were updated in another window. Review them before continuing.", exact=True)).to_be_visible()
        untouched(a)
        visit(a, "fr")
        assert read(a)["game" if italian else "draft"] == checked
        a.wait_for_timeout(1400)
        assert read(a)["answers"] == [], "Reload advanced or regraded a checked answer"
        capture(a, "checked-reloaded-fr")
        a.get_by_role("button", name="Continuer", exact=True).click()
        if italian:
            a.wait_for_timeout(350)  # The real continuation discards accidental trailing taps for 300 ms.
            a.get_by_role("button", name="Lire plutôt qu’écouter (avec aide)", exact=True).click()
            a.get_by_role("button", name="21", exact=True).click()
            visit(a)
            assert read(a)["game"]["assisted"] and read(a)["game"]["transcript"]
            a.get_by_role("button", name="Continue", exact=True).click()
            words = a.get_by_role("group", name="Available words", exact=True)
            words.get_by_role("button").first.click()
            partial = read(a)["game"]["tiles"]
            assert len(partial) == 1
            visit(a, "es")
            assert read(a)["game"]["tiles"] == partial
            capture(a, "partial-reloaded-es")
            a.get_by_role("button", name="Parar y elegir", exact=True).click()
            visit(a)
        else:
            visit(a)
            a.get_by_role("button", name="Choose a mission instead", exact=True).click()
        a.get_by_role("combobox").select_option(index=1)
        visit(b)
        expect(b.get_by_role("combobox")).to_have_value(a.get_by_role("combobox").input_value())
        hold(b)
        a.get_by_role("combobox").select_option(index=2)
        latest = read(a)
        b.get_by_role("button", name="Start here", exact=True).click()
        assert read(b) == latest, "A stale finish replaced the current recommendation"
        assert not b.evaluate("key => JSON.parse(localStorage.getItem(key)).consumed", key)
        untouched(b)
        capture(b, "stale-finish-rejected")
        b.get_by_role("button", name="Start this check again", exact=True).click()
        restarted = read(b)
        assert restarted["answers"] == []
        assert not restarted["game" if italian else "draft"]["complete" if italian else "checked"]
        untouched(b)
        for page in (a, b):
            assert page.evaluate("window.__welcomeAudio + window.__welcomeMicrophones + window.__welcomeVoices") == 0
        assert not forbidden, forbidden
        assert not errors, errors
        print(f"PASS {engine} {language} {width}px: real preferences, locale reload, immutable first check, stale tab/finish, explicit restart; no outcome or provider writes", flush=True)
    except Exception:
        capture(a, "failure-a")
        capture(b, "failure-b")
        print(a.locator("body").inner_text()[:1800], flush=True)
        raise
    finally:
        context.close()


with sync_playwright() as playwright:
    for engine in os.environ.get("YO_JOURNAL_BROWSERS", "chromium,webkit").split(","):
        executable = os.environ.get("YO_CHROMIUM") if engine == "chromium" else None
        browser = getattr(playwright, engine).launch(executable_path=executable)
        try:
            verify(browser, engine, True)
            verify(browser, engine, False)
        finally:
            browser.close()
