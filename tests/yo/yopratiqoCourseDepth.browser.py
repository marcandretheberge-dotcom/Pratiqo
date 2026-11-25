"""Exercise the DE/PT extension through real routes, audio and checked answers.

No scores, completions, heard flags or entitlements are inserted in storage.
The first eight checkpoints unlock the extension through their rendered controls.
"""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_FOUNDATIONS_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_QA_DIR", "/tmp/yo-foundations-qa"))
courses = json.loads((out / "depth-courses.json").read_text())


def dismiss_films(page):
    for _ in range(5):
        page.wait_for_timeout(120)
        skip = page.get_by_role("button", name="Skip", exact=True)
        if skip.count():
            skip.last.click()
        celebration = page.locator("[data-celebration]")
        if celebration.count():
            continuation = celebration.get_by_role("button", name="Continue", exact=True)
            if continuation.count():
                continuation.last.click()


def capture(page, name):
    size = page.evaluate("() => ({viewport:innerWidth,content:document.documentElement.scrollWidth})")
    assert size["content"] <= size["viewport"] + 1, size
    page.screenshot(path=str(out / (name + ".png")), full_page=False)


def answer_assessment(page, assessment, name, capture_result=False):
    panel = page.locator('[data-course-assessment="' + assessment["id"] + '"]')
    expect(panel).to_be_visible()
    panel.get_by_role("button", name="Start", exact=True).click()
    heard = 0
    for index, question in enumerate(assessment["questions"]):
        expect(panel).to_have_attribute("data-assessment-index", str(index))
        if question.get("listeningText"):
            before = page.evaluate("window.__depthAudioEnded")
            panel.get_by_role("button", name=re.compile(r"^Listen :")).click()
            page.wait_for_function("before => window.__depthAudioEnded > before", arg=before, timeout=30000)
            heard += 1
        if question["kind"] == "type":
            panel.get_by_role("textbox").fill(question["model"])
        else:
            answer = next(item for item in question["options"] if item["id"] == question["correctId"])
            panel.get_by_role("button", name=answer.get("it") or answer["label"]["en"], exact=True).click()
        panel.get_by_role("button", name="Check", exact=True).click()
        panel.get_by_role("button", name="Continue", exact=True).click()
    expect(panel).to_have_attribute("data-assessment-done", "true")
    dismiss_films(page)
    if capture_result:
        capture(page, name)
    return heard


def verify(browser, engine, course, width):
    context = browser.new_context(viewport={"width": width, "height": 800}, is_mobile=True,
                                  has_touch=True, device_scale_factor=1, locale="en-CA", reduced_motion="reduce")
    context.add_init_script("""window.__depthAudioEnded=0; window.__depthMic=0; window.__depthVoice=0;
      if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,
        value:()=>{window.__depthMic++;return Promise.reject(new DOMException('Disabled in QA','NotAllowedError'));}});
      if(window.speechSynthesis)Object.defineProperty(window.speechSynthesis,'speak',{configurable:true,value:()=>window.__depthVoice++});
      const play=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(){if(this.tagName==='AUDIO')this.addEventListener('ended',()=>window.__depthAudioEnded++,{once:true});return play.call(this);};""")
    errors, forbidden, audio = [], [], []
    def observe(request):
        url = urlsplit(request.url)
        if "/api/yo/speech/" in url.path or "/auth/v1/" in url.path or url.hostname == "api.openai.com":
            forbidden.append(request.url)
    context.on("request", observe)
    page = context.new_page()
    page.set_default_timeout(15000)
    page.set_default_navigation_timeout(90000)
    page.on("pageerror", lambda error: errors.append({"message": str(error), "stack": error.stack}))
    page.on("response", lambda response: audio.append({"url": response.url, "status": response.status}) if urlsplit(response.url).path.endswith(".mp3") else None)
    name = f"{engine}-depth-{course['language']}-{width}"
    route = base + "/yo/langues/" + course["slug"] + "/parcours"
    try:
        page.goto(base + "/companion/travel/films/departure.webp")
        page.evaluate("() => {localStorage.clear();sessionStorage.clear();}")
        page.goto(route + "/u09?lang=en")
        expect(page.get_by_role("heading", name="One step at a time", exact=True)).to_be_visible(timeout=45000)
        heard = 0
        for unit in course["units"]:
            page.goto(route + "/" + unit["id"] + "?lang=en")
            expect(page.locator('[data-course-unit="' + unit["id"] + '"]')).to_be_attached(timeout=45000)
            dismiss_films(page)
            expect(page.get_by_role("heading", name=unit["title"]["en"], exact=True, level=1)).to_be_visible()
            if unit["number"] == 9:
                expect(page.locator("[data-course-culture]")).to_contain_text(unit["culture"]["title"]["en"])
                capture(page, name + "-new-unit")
            page.get_by_role("button", name="Checkpoint", exact=True).click()
            heard += answer_assessment(page, unit["quiz"], name + "-unit-" + unit["id"], unit["number"] in [9, 12])
            record = page.evaluate("args=>JSON.parse(localStorage.getItem(args[0])).assessments[args[1]]", [course["progressKey"], unit["quiz"]["id"]])
            assert record["attempts"] == 1 and record["bestIndependent"] == 100 and not record["last"]["assisted"], record
            if unit["number"] == 8:
                page.goto(route + "/final?lang=en")
                expect(page.get_by_role("heading", name="One step at a time", exact=True)).to_be_visible(timeout=45000)
                page.goto(route + "/bilan-initial?lang=en")
                expect(page.locator('[data-course-assessment="' + course["legacyFinal"]["id"] + '"]')).to_be_visible(timeout=45000)
        page.goto(route + "?lang=en")
        expect(page.locator('[data-course-unit="home"]')).to_be_visible(timeout=45000)
        dismiss_films(page)
        capture(page, name + "-completed-map")
        page.goto(route + "/final?lang=en")
        panel = page.locator('[data-course-assessment="' + course["final"]["id"] + '"]')
        expect(panel).to_be_visible(timeout=45000)
        dismiss_films(page)
        heard += answer_assessment(page, course["final"], name + "-new-final", True)
        state = page.evaluate("key=>JSON.parse(localStorage.getItem(key))", course["progressKey"])
        result = state["assessments"][course["final"]["id"]]
        assert result["attempts"] == 1 and result["bestIndependent"] == 100 and result["last"]["correct"] == 24, result
        assert course["legacyFinal"]["id"] not in state["assessments"], "new results must not overwrite the old final contract"
        page.reload()
        expect(panel).to_have_attribute("data-assessment-done", "true", timeout=45000)
        restored = page.evaluate("args=>JSON.parse(localStorage.getItem(args[0])).assessments[args[1]]", [course["progressKey"], course["final"]["id"]])
        assert restored == result, "restoring the final must not submit a second score"
        assert heard == 24 and len(audio) >= 24 and all(item["status"] in [200, 206] for item in audio), (heard, audio)
        assert not errors and not forbidden, (errors, forbidden)
        assert page.evaluate("window.__depthMic+window.__depthVoice") == 0
        return {"language": course["language"], "width": width, "unitCheckpoints": 12, "questionsAnswered": 96,
                "actualRecordingsCompleted": heard, "newFinalAttempts": 1, "legacyFinalUnchanged": True, "passed": True}
    except Exception:
        page.screenshot(path=str(out / (name + "-failure.png")), full_page=False)
        (out / (name + "-failure.html")).write_text(page.content())
        (out / (name + "-network.json")).write_text(json.dumps({"errors": errors, "forbidden": forbidden, "audio": audio}, indent=2))
        raise
    finally:
        context.close()


with sync_playwright() as playwright:
    for engine in os.environ.get("YO_JOURNAL_BROWSERS", "chromium").split(","):
        browser = getattr(playwright, engine).launch()
        passed, failed = [], []
        for course, width in zip(courses, [393, 320]):
            try:
                passed.append(verify(browser, engine, course, width))
            except Exception as error:
                failed.append({"language": course["language"], "width": width, "error": str(error)})
        (out / (engine + "-depth-results.json")).write_text(json.dumps({"passed": passed, "failed": failed}, indent=2))
        browser.close()
        assert not failed, failed
