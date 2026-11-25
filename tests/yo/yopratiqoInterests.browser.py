"""Exercise authored interest stops inside four actual mobile course routes.

Uses prepare_yo_shared_review.ts and the existing journal server. Only onboarding
preferences are seeded. Every answer, error and resumed step goes through the UI.
Speech/provider/auth requests and microphone use cannot leave this QA fixture.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-journal-qa"))
out.mkdir(parents=True, exist_ok=True)
routes = [
    {"slug": "italien", "language": "it", "interestLanguage": "it", "path": "/yo/langues/italien/parcours/u02",
     "art": ("Scusi, dov’è la galleria d’arte?", "galleria d’arte"), "history": ("Scusi, dov’è il museo?", "museo")},
    {"slug": "anglais", "language": "en", "interestLanguage": "en", "path": "/yo/langues/anglais/demarrer",
     "art": ("Excuse me, where is the art gallery?", "art gallery"), "history": ("Excuse me, where is the museum?", "museum")},
    {"slug": "mandarin", "language": "zh-Hans", "interestLanguage": "zh-CN", "path": "/yo/langues/mandarin/demarrer",
     "art": ("不好意思，画廊在哪里？", "画廊"), "history": ("不好意思，博物馆在哪里？", "博物馆")},
    {"slug": "quebec", "language": "fr-CA", "interestLanguage": "fr-CA", "path": "/yo/langues/francais-quebec/demarrer",
     "art": ("Excusez-moi, où est la galerie d’art ?", "galerie d’art"), "history": ("Excusez-moi, où est le musée ?", "musée")},
]


def seed(page, route):
    language = route["language"]
    if language == "it":
        values = {"yo.learning-profile.v1.it": {"version": 1, "language": "it", "experience": "words", "goal": "travel",
                  "weeklyMinutes": 30, "startUnitId": "u02", "placement": "manual", "reviewUnitIds": [],
                  "updatedAt": 1720000000000, "interests": []}}
    else:
        values = {"yo.shared-intro.v1." + language: {"version": 2, "language": language,
                  "profile": {"experience": "new", "goal": "travel", "minutes": 30, "entry": 0, "interests": []},
                  "view": "map", "resume": None, "step": 0, "finalIndex": 0,
                  "draft": {"selected": None, "tiles": [], "checked": False, "correct": False,
                            "assisted": False, "heard": False, "transcript": False},
                  "completed": [], "visited": [], "answers": [], "best": 0}}
    page.goto(base + "/companion/travel/films/departure.webp")
    page.evaluate("""values => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('yo.italian.guided.tour.v1', 'seen');
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    }""", values)


def course_evidence(page):
    return page.evaluate("""() => Object.fromEntries(Object.keys(localStorage)
      .filter(key => key.startsWith('yo.shared-intro.v1.') || key.startsWith('yo.learning-profile.v1.')
        || key === 'yo.italian.course.first-meeting.v2' || key === 'yopratiqo:italian-course:a1:v1')
      .map(key => [key, localStorage.getItem(key)]))""")


def progress(page, language):
    return page.evaluate("language => JSON.parse(localStorage.getItem('yo.interest-practice.v1.' + language))", language)


def fits(page):
    dimensions = page.evaluate("""() => ({
      viewport: innerWidth, document: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')].flatMap(element => {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        if (!box.width || style.visibility === 'hidden' || style.display === 'none'
          || box.left >= -1 && box.right <= innerWidth + 1) return [];
        return [{tag: element.tagName, role: element.getAttribute('role'),
          className: element.getAttribute('class'), left: box.left, right: box.right,
          width: box.width, position: style.position, minWidth: style.minWidth,
          overflowX: style.overflowX, transform: style.transform}];
      }).slice(0, 12)
    })""")
    assert dimensions["document"] <= dimensions["viewport"] + 1, dimensions
    dialog = page.get_by_role("dialog")
    if dialog.count():
        box = dialog.bounding_box()
        assert box and box["x"] >= -1 and box["x"] + box["width"] <= page.viewport_size["width"] + 1, {"dialog": box, **dimensions}


def capture(page, name):
    fits(page)
    page.screenshot(path=str(out / (name + ".png")), full_page=False)


def quiet(page, requests):
    assert not requests, "Unexpected voice/provider/auth request: " + repr(requests)
    assert page.evaluate("window.__interestQaMicrophones") == 0, "Automatic microphone request"
    assert page.evaluate("window.__interestQaVoices") == 0, "Automatic device voice"
    assert page.evaluate("window.__interestQaAudio") == 0, "Automatic recorded lesson audio"


def focused_dialog(page):
    expect(page.get_by_role("dialog")).to_have_count(1)
    page.wait_for_function("""() => [...document.querySelectorAll('[role="dialog"]')]
      .some(dialog => !dialog.closest('[aria-hidden="true"]') && dialog.contains(document.activeElement))""")


def verify(browser, engine, route, width):
    reduced = width == 320
    interest = "history" if reduced else "art"
    label = "History" if reduced else "Art"
    first, transfer = ("Go straight ahead", "Turn left") if reduced else ("Turn right", "Go straight ahead")
    question, noun = route[interest]
    language = route["interestLanguage"]
    context = browser.new_context(viewport={"width": width, "height": 740}, locale="en-CA", is_mobile=True,
                                  has_touch=True, device_scale_factor=1,
                                  reduced_motion="reduce" if reduced else "no-preference")
    requests, errors = [], []
    context.add_init_script("""window.__interestQaMicrophones = 0; window.__interestQaVoices = 0; window.__interestQaAudio = 0;
      if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true, value: () => { window.__interestQaMicrophones++;
          return Promise.reject(new DOMException('Microphone disabled in QA', 'NotAllowedError')); }
      });
      if (window.speechSynthesis) Object.defineProperty(window.speechSynthesis, 'speak', {
        configurable: true, value: () => { window.__interestQaVoices++; }
      });
      const nativePlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.tagName === 'AUDIO') window.__interestQaAudio++;
        return nativePlay.call(this);
      };""")

    def intercept(request_route):
        url = urlsplit(request_route.request.url)
        if "/api/yo/speech/" in url.path or url.hostname == "api.openai.com" or "/auth/v1/" in url.path:
            requests.append(url.path)
            request_route.fulfill(status=503, content_type="application/json", body='{"error":"disabled_in_qa"}')
        else:
            request_route.continue_()

    context.route("**/*", intercept)
    page = context.new_page()
    page.set_default_navigation_timeout(90000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    name = f"{engine}-interests-{route['slug']}-{width}"
    try:
        seed(page, route)
        page.goto(base + route["path"] + "?lang=en")
        arrival = page.locator("[data-travel-film]")
        expect(arrival).to_be_visible(timeout=45000)
        arrival.get_by_role("button", name="Skip", exact=True).click()
        expect(arrival).to_have_count(0)
        card = page.locator('[data-interest-practice="' + language + '"]')
        expect(card).to_be_visible(timeout=30000)
        before_course = course_evidence(page)
        card.get_by_role("button", name="My interests", exact=True).click()
        card.get_by_role("button", name=label, exact=True).click()
        expect(card.get_by_role("button", name=label, exact=True)).to_have_attribute("aria-pressed", "true")
        expect(card.get_by_role("button", name="Surprise me", exact=True)).to_have_attribute("aria-pressed", "false")
        capture(page, name + "-choice")
        trigger = card.get_by_role("button", name="Explore · " + label, exact=True)
        trigger.focus()
        trigger.press("Enter")
        film = page.locator('[data-mission-film="mission-start"]')
        expect(film).to_be_visible()
        focused_dialog(page)
        expect(film.locator("video")).to_have_attribute("src", "/companion/travel/films/mission-ready.mp4")
        if reduced:
            assert film.locator("video").evaluate("video => video.paused")
            expect(film.locator("video")).to_have_attribute("preload", "none")
        before_skip = progress(page, language)
        page.keyboard.press("Escape")
        expect(film).to_have_count(0)
        assert progress(page, language) == before_skip, "A cinema dismissal changed practice evidence"
        focused_dialog(page)
        screen = page.locator("[data-interest-step]")
        expect(screen).to_have_attribute("data-interest-step", "0")
        page.get_by_role("button", name="Continue", exact=True).click()
        expect(screen).to_have_attribute("data-interest-step", "1")
        expect(screen.get_by_text(question, exact=True)).to_be_visible()
        capture(page, name + "-dialogue")
        page.get_by_role("button", name="Continue", exact=True).click()
        page.get_by_role("button", name=question, exact=True).click()
        page.get_by_role("button", name="Check", exact=True).click()
        page.get_by_role("button", name="Continue", exact=True).click()
        expect(screen).to_have_attribute("data-interest-step", "3")
        page.get_by_role("button", name=first, exact=True).click()
        page.get_by_role("button", name="Check", exact=True).click()
        page.get_by_role("button", name="Continue", exact=True).click()
        expect(screen).to_have_attribute("data-interest-step", "4")
        recall = page.get_by_role("textbox", name="Word from memory", exact=True)
        recall.fill("not-the-target-word")
        expect(recall).to_have_value("not-the-target-word")
        page.get_by_role("button", name="Check", exact=True).click()
        expect(screen.get_by_role("status")).to_contain_text("Notice the difference")
        capture(page, name + "-recall-error")
        saved = progress(page, language)
        assert saved["session"]["assisted"][2] is True
        assert "not-the-target-word" not in json.dumps(saved), "Typed response should not be retained"
        quiet(page, requests)
        page.get_by_role("button", name="Close and save my place", exact=True).click()
        expect(page.get_by_role("dialog")).to_have_count(0)
        expect(card.get_by_role("button", name="Resume my stop", exact=True)).to_be_focused()
        page.reload()
        card = page.locator('[data-interest-practice="' + language + '"]')
        resume = card.get_by_role("button", name="Resume my stop", exact=True)
        resume.focus()
        resume.press("Enter")
        expect(page.locator("[data-mission-film]")).to_have_count(0)
        focused_dialog(page)
        screen = page.locator("[data-interest-step]")
        expect(screen).to_have_attribute("data-interest-step", "4")
        assert progress(page, language) == saved, "Resume changed the unanswered step or assistance marker"
        field = page.get_by_role("textbox", name="Word from memory", exact=True)
        expect(field).to_have_value("")
        field.fill(noun)
        expect(field).to_have_value(noun)
        page.get_by_role("button", name="Check", exact=True).click()
        page.get_by_role("button", name="Continue", exact=True).click()
        expect(screen).to_have_attribute("data-interest-step", "5")
        assert first != transfer
        page.get_by_role("button", name=transfer, exact=True).click()
        page.get_by_role("button", name="Check", exact=True).click()
        page.get_by_role("button", name="Continue", exact=True).click()
        success = page.locator('[data-mission-film="mission-success"]')
        expect(success).to_be_visible()
        focused_dialog(page)
        expect(success.locator("video")).to_have_attribute("src", "/companion/travel/films/mission-success.mp4")
        if reduced:
            assert success.locator("video").evaluate("video => video.paused")
            success.get_by_role("button", name="Play film", exact=True).click()
        else:
            page.wait_for_function("""() => {
              const scene = document.querySelector('[data-mission-film="mission-success"]');
              return scene?.querySelector('video')?.currentTime > 0.12
                || scene?.querySelector('[role="status"]')?.textContent.includes('Tap Play');
            }""", timeout=20000)
            if success.locator("video").evaluate("video => video.paused"):
                success.get_by_role("button", name="Play film", exact=True).click()
        page.wait_for_function("""() => {
          const video = document.querySelector('[data-mission-film="mission-success"] video');
          return video && video.currentTime > 0.12 && video.videoWidth === 1280;
        }""", timeout=20000)
        success.get_by_role("button", name="Pause", exact=True).click()
        capture(page, name + "-success-film")
        success.get_by_role("button", name="Skip", exact=True).click()
        expect(screen).to_have_attribute("data-interest-step", "6")
        expect(screen.get_by_text("3/4 answers without help", exact=True)).to_be_visible()
        capture(page, name + "-completion")
        completed = progress(page, language)
        assert completed["attempts"][interest] == 1 and completed["session"]["correct"][2] is False
        page.get_by_role("button", name="Continue my journey", exact=True).click()
        expect(page.get_by_role("dialog")).to_have_count(0)
        assert course_evidence(page) == before_course, "Interest practice changed canonical course evidence"
        quiet(page, requests)
        assert not errors, errors
        result = {"route": route["slug"], "width": width, "interest": interest, "reducedMotion": reduced,
                  "passed": True, "independentAnswers": 3, "courseEvidenceUnchanged": True,
                  "speechRequests": len(requests), "microphoneRequests": page.evaluate("window.__interestQaMicrophones")}
        print("PASS " + name + ": selected dialogue, assisted recall, exact reload/resume, real success film, focus and unchanged course", flush=True)
        return result
    except Exception:
        page.screenshot(path=str(out / (name + "-failure.png")), full_page=False)
        print("FAIL " + name + ": " + page.locator("body").inner_text()[:1600], flush=True)
        raise
    finally:
        context.close()


with sync_playwright() as playwright:
    for engine in os.environ.get("YO_JOURNAL_BROWSERS", "chromium,webkit").split(","):
        browser = getattr(playwright, engine).launch(executable_path=os.environ.get("YO_CHROMIUM") if engine == "chromium" else None)
        results = []
        try:
            for width in (393, 320):
                for route in routes:
                    results.append(verify(browser, engine, route, width))
        finally:
            (out / f"{engine}-interests-results.json").write_text(json.dumps(results, indent=2) + "\n")
            browser.close()
