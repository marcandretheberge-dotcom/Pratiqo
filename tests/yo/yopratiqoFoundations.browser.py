"""Real EN/ES/Québec routes: written assessment, honest help, reload and unlocking.

Only empty browser storage is seeded. All six checkpoint answers are entered
through the rendered controls. No course success, score or entitlement is seeded.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_FOUNDATIONS_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_QA_DIR", "/tmp/yo-foundations-qa"))
out.mkdir(parents=True, exist_ok=True)
courses = json.loads((out / "foundation-courses.json").read_text())
copy = {
    "fr": {"quiz": "Bilan", "start": "Commencer", "check": "Vérifier", "next": "Continuer", "model": "Voir un modèle", "skip": "Passer", "locked": "Une étape à la fois"},
    "en": {"quiz": "Checkpoint", "start": "Start", "check": "Check", "next": "Continue", "model": "Show a model", "skip": "Skip", "locked": "One step at a time"},
    "es": {"quiz": "Repaso", "start": "Empezar", "check": "Comprobar", "next": "Continuar", "model": "Ver un modelo", "skip": "Saltar", "locked": "Una etapa a la vez"},
}


def dismiss_films(page, locale):
    # Actual arrival and mission dialogs can enter consecutively after hydration.
    for _ in range(5):
        page.wait_for_timeout(120)
        buttons = page.get_by_role("button", name=copy[locale]["skip"], exact=True)
        if buttons.count():
            buttons.last.click()
        celebration = page.locator("[data-celebration]")
        if celebration.count():
            continuation = celebration.get_by_role("button", name=copy[locale]["next"], exact=True)
            if continuation.count():
                continuation.last.click()


def capture(page, name):
    size = page.evaluate("() => ({viewport: innerWidth, content: document.documentElement.scrollWidth})")
    assert size["content"] <= size["viewport"] + 1, size
    page.screenshot(path=str(out / (name + ".png")), full_page=False)


def verify(browser, engine, course, locale, width):
    assisted = width == 320
    context = browser.new_context(viewport={"width": width, "height": 800}, is_mobile=True,
                                  has_touch=True, device_scale_factor=1, locale="en-CA", reduced_motion="reduce")
    context.add_init_script("""window.__foundationAudio = 0; window.__foundationMic = 0; window.__foundationVoice = 0;
      if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {configurable:true,
        value:()=>{window.__foundationMic++;return Promise.reject(new DOMException('Disabled in QA','NotAllowedError'));}});
      if (window.speechSynthesis) Object.defineProperty(window.speechSynthesis,'speak',{configurable:true,value:()=>window.__foundationVoice++});
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function(){if(this.tagName==='AUDIO')window.__foundationAudio++;return play.call(this);};""")
    requests, errors, failed_requests = [], [], []

    def observe_request(request):
        url = urlsplit(request.url)
        if "/api/yo/speech/" in url.path or "/auth/v1/" in url.path or url.hostname == "api.openai.com":
            requests.append(url.path)

    # No interception: even unmatched WebKit routes change navigation/cache
    # behavior. This shell has no speech backend or real account credentials.
    # Assert every forbidden request and page error instead of hiding failures.
    context.on("request", observe_request)
    page = context.new_page()
    page.set_default_timeout(15000)
    page.set_default_navigation_timeout(90000)
    page.on("pageerror", lambda error: errors.append({"message": str(error), "stack": error.stack}))
    page.on("requestfailed", lambda request: failed_requests.append({"url": request.url, "failure": request.failure}))
    name = f"{engine}-foundations-{course['language']}-{locale}-{width}"
    url = base + "/yo/langues/" + course["slug"] + "/parcours"
    unit = course["units"][0]
    checkpoint = unit["quiz"]
    c = copy[locale]
    try:
        page.goto(base + "/companion/travel/films/departure.webp")
        page.evaluate("() => {localStorage.clear();sessionStorage.clear();}")
        page.goto(url + "?lang=" + locale)
        expect(page.locator('[data-course-unit="home"]')).to_be_visible(timeout=60000)
        dismiss_films(page, locale)
        capture(page, name + "-map")
        page.goto(url + "/" + unit["id"] + "?lang=" + locale)
        # The film intentionally makes the lesson underneath inert. Wait for the
        # real unit, dismiss its dialogs, then inspect the accessible heading.
        expect(page.locator('[data-course-unit="' + unit["id"] + '"]')).to_be_attached(timeout=60000)
        dismiss_films(page, locale)
        expect(page.get_by_role("heading", name=unit["title"][locale], exact=True, level=1)).to_be_visible(timeout=60000)
        assert page.evaluate("window.__foundationAudio + window.__foundationVoice + window.__foundationMic") == 0
        expect(page.locator("[data-course-culture]")).to_contain_text(unit["culture"]["title"][locale])
        capture(page, name + "-mission")
        # A genuine practice reveal stays assisted through a full page reload.
        lesson = unit["lessons"][0]
        exercise = next(item for item in lesson["activities"] if item["kind"] == "type" and not item.get("listeningText"))
        page.goto(url + "/" + unit["id"] + "?lang=" + locale + "&lesson=" + lesson["id"] + "&activity=" + exercise["id"])
        expect(page.get_by_role("textbox")).to_be_visible(timeout=45000)
        dismiss_films(page, locale)
        page.get_by_role("button", name=c["model"], exact=True).click()
        page.reload()
        expect(page.get_by_role("textbox")).to_be_visible(timeout=45000)
        page.get_by_role("textbox").fill(exercise["model"])
        page.get_by_role("button", name=c["check"], exact=True).click()
        practice = page.evaluate("args=>JSON.parse(localStorage.getItem(args[0])).activities[args[1]]", [course["progressKey"], exercise["id"]])
        assert practice["completed"] and not practice["independent"] and practice["attempts"] == 1, practice
        page.reload()
        expect(page.get_by_role("textbox")).to_have_count(0)
        restored = page.evaluate("args=>JSON.parse(localStorage.getItem(args[0])).activities[args[1]]", [course["progressKey"], exercise["id"]])
        assert restored == practice, "restoring a checked exercise must not submit it again"
        page.get_by_role("button", name=c["quiz"], exact=True).click()
        panel = page.locator('[data-course-assessment="' + checkpoint["id"] + '"]')
        expect(panel).to_be_visible()
        panel.get_by_role("button", name=c["start"], exact=True).click()
        used_help = False
        for index, question in enumerate(checkpoint["questions"]):
            expect(panel).to_have_attribute("data-assessment-index", str(index))
            if question["kind"] == "type":
                if assisted and not used_help:
                    panel.get_by_role("button", name=c["model"], exact=True).click()
                    page.reload()
                    expect(panel).to_have_attribute("data-assessment-index", str(index), timeout=45000)
                    used_help = True
                panel.get_by_role("textbox").fill(question["model"])
            else:
                answer = next(option for option in question["options"] if option["id"] == question["correctId"])
                label = answer.get("it") or answer["label"][locale]
                panel.get_by_role("button", name=label, exact=True).click()
            panel.get_by_role("button", name=c["check"], exact=True).click()
            if index == 0:
                capture(page, name + "-checked")
                page.reload()
                expect(panel).to_have_attribute("data-assessment-index", "0", timeout=45000)
                expect(panel.get_by_role("button", name=c["next"], exact=True)).to_be_visible()
            panel.get_by_role("button", name=c["next"], exact=True).click()
        assert used_help == assisted
        expect(panel).to_have_attribute("data-assessment-done", "true")
        dismiss_films(page, locale)
        capture(page, name + "-result")
        saved = page.evaluate("key=>JSON.parse(localStorage.getItem(key))", course["progressKey"])
        record = saved["assessments"][checkpoint["id"]]
        assert record["attempts"] == 1, record
        assert record["last"]["correct"] == len(checkpoint["questions"]), record
        assert record["last"]["assisted"] == assisted, record
        assert record["bestIndependent"] == (None if assisted else 100), record
        before_reload = json.dumps(record, sort_keys=True)
        page.reload()
        expect(panel).to_have_attribute("data-assessment-done", "true", timeout=45000)
        after = page.evaluate("args=>JSON.parse(localStorage.getItem(args[0])).assessments[args[1]]", [course["progressKey"], checkpoint["id"]])
        assert json.dumps(after, sort_keys=True) == before_reload, "restoring a result must not count it again"
        page.goto(url + "/u02?lang=" + locale)
        if assisted:
            expect(page.get_by_role("heading", name=c["locked"], exact=True)).to_be_visible(timeout=45000)
            expect(page.locator('[data-course-unit="u02"]')).to_have_count(0)
        else:
            expect(page.locator('[data-course-unit="u02"]')).to_be_visible(timeout=45000)
            dismiss_films(page, locale)
        page.goto(url + "/final?lang=" + locale)
        expect(page.get_by_role("heading", name=c["locked"], exact=True)).to_be_visible(timeout=45000)
        expect(page.locator("[data-course-assessment]")).to_have_count(0)
        assert not requests, requests
        assert not errors, errors
        assert page.evaluate("window.__foundationAudio + window.__foundationVoice + window.__foundationMic") == 0
        return {"language": course["language"], "locale": locale, "width": width, "assisted": assisted,
                "questionsAnswered": len(checkpoint["questions"]), "checkpointAttempts": 1, "passed": True}
    except Exception:
        page.screenshot(path=str(out / (name + "-failure.png")), full_page=False)
        (out / (name + "-failure.html")).write_text(page.content())
        (out / (name + "-network.json")).write_text(json.dumps({"errors": errors, "failedRequests": failed_requests}, indent=2))
        raise
    finally:
        context.close()


with sync_playwright() as playwright:
    for engine in os.environ.get("YO_JOURNAL_BROWSERS", "chromium").split(","):
        browser = getattr(playwright, engine).launch()
        results = []
        failed = []
        for index, course in enumerate(courses):
            locale = ["en", "es", "fr"][index]
            for width in [393, 320]:
                try:
                    results.append(verify(browser, engine, course, locale, width))
                except Exception as error:
                    failed.append({"language": course["language"], "width": width, "error": str(error)})
        (out / (engine + "-foundations-results.json")).write_text(json.dumps({"passed": results, "failed": failed}, indent=2))
        browser.close()
        assert not failed, failed
