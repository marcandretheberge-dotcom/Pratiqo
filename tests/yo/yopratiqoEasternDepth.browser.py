"""Real mobile JA/ZH routes; ONLY historical eight-unit learner records are seeded.

This gate does not claim to earn the old course through the UI or complete all
twelve units. Two NEW written recalls per language are entered and checked via
their real controls. One uses help. Neither their grades nor audio evidence are
inserted in storage. The original final remains separate from the new final.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_EASTERN_URL", "http://127.0.0.1:3247").rstrip("/")
out = Path(os.environ.get("YO_QA_DIR", "/tmp/yo-eastern-qa"))
fixture = json.loads((out / "eastern-courses.json").read_text())
assert fixture["fixturePolicy"]["newResultsSeeded"] == 0
assert fixture["fixturePolicy"]["historicalChecksEarnedThroughUI"] == 0
assert {course["language"] for course in fixture["courses"]} == {"ja", "zh"}


def dismiss_films(page):
    # Hydration may open a presentation after the route first becomes visible.
    # Use its real Skip button; never mark a film or exercise completed in storage.
    for _ in range(4):
        skip = page.locator("[data-cinema-id]").get_by_role("button", name="Skip", exact=True)
        if skip.count():
            skip.last.click()
        page.wait_for_timeout(120)


def settle(page):
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


def player_ready(page):
    # A cinematic dialog makes the mounted player aria-hidden. Wait only for its
    # mount, skip the actual presentation, then require its accessible controls.
    expect(page.get_by_role("combobox", name="Step", exact=True, include_hidden=True)).to_be_attached(timeout=45000)
    dismiss_films(page)
    expect(page.get_by_role("combobox", name="Step", exact=True)).to_be_visible()


def saved(page, course):
    return page.evaluate("key => JSON.parse(localStorage.getItem(key) || '{}')", course["progressKey"])


def preserve_history(page, course):
    current = saved(page, course)
    original = course["progress"]["results"]
    assert {key: current.get("results", {}).get(key) for key in original} == original
    bookmark = current.get("lastSteps" if course["language"] == "ja" else "steps", {}).get("bilan")
    assert bookmark == course["legacyTarget"]["bookmark"], (bookmark, course["legacyTarget"])
    assert not set(course["newFinalIds"]).intersection(current.get("results", {})), "old final evidence must never become new final grades"
    return current


def capture(page, name, panel=None):
    dimensions = page.evaluate("() => ({viewport:innerWidth,content:document.documentElement.scrollWidth})")
    assert dimensions["content"] <= dimensions["viewport"] + 1, dimensions
    if panel is not None:
        content = panel.evaluate("element => ({width:element.clientWidth,content:element.scrollWidth})")
        assert content["content"] <= content["width"] + 1, content
    page.screenshot(path=str(out / (name + ".png")), full_page=False)


def exercise_panel(page, course, exercise):
    if course["language"] == "ja":
        return page.locator('[data-japanese-activity="' + exercise["id"] + '"]')
    return page.get_by_role("region", name=exercise["prompt"], exact=True)


def select_recall(page, course, exercise):
    select = page.get_by_role("combobox", name="Step", exact=True)
    expect(select).to_be_visible()
    options = select.locator("option").evaluate_all(
        "elements => elements.map(element => ({value:element.value,text:element.textContent.trim()}))"
    )
    matches = [option for option in options if option["text"].endswith(". " + exercise["stepLabel"])]
    assert len(matches) == 1, (exercise["stepLabel"], options)
    select.select_option(matches[0]["value"])
    panel = exercise_panel(page, course, exercise)
    expect(panel).to_be_visible()
    expect(panel.get_by_role("textbox", name=course["inputLabel"], exact=True)).to_have_value("")
    assert panel.get_by_text(exercise["answer"], exact=True).count() == 0, "the model is hidden before recall"
    return panel


def verify(browser, engine, course, width):
    name = f"{engine}-eastern-{course['language']}-{width}"
    route = base + "/yo/langues/" + course["slug"] + "/parcours"
    context = browser.new_context(viewport={"width": width, "height": 800}, is_mobile=True,
                                  has_touch=True, device_scale_factor=1, locale="en-CA", reduced_motion="reduce")
    errors, forbidden, media_attempts = [], [], []
    context.expose_binding("__easternAttempt", lambda source, kind: media_attempts.append({"kind": kind, "url": source["frame"].url}))
    context.add_init_script("""(() => {
      const note=kind=>{void window.__easternAttempt(kind);};
      if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,
        value:()=>{note('microphone');return Promise.reject(new DOMException('Disabled in QA','NotAllowedError'));}});
      if(window.speechSynthesis)Object.defineProperty(window.speechSynthesis,'speak',{configurable:true,value:()=>note('device-voice')});
      const originalPlay=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(){
        if(this.tagName==='AUDIO'||!this.muted)note('audible-media');
        return originalPlay.call(this);
      };
    })();""")

    def guard(request_route):
        request = request_route.request
        url = urlsplit(request.url)
        blocked = ("/api/yo/speech" in url.path or "/auth/v1/" in url.path or "/api/yo/progress" in url.path
                   or url.hostname in {"api.openai.com", "api.elevenlabs.io"}
                   or url.path.lower().endswith((".mp3", ".wav", ".m4a", ".ogg")))
        if blocked:
            forbidden.append({"url": request.url, "method": request.method})
            request_route.abort()
        else:
            request_route.continue_()

    context.route("**/*", guard)
    context.tracing.start(screenshots=True, snapshots=True, sources=False)
    page = context.new_page()
    page.set_default_timeout(20000)
    page.set_default_navigation_timeout(90000)
    page.on("pageerror", lambda error: errors.append({"message": str(error), "stack": error.stack}))
    try:
        # Start with no persisted grades. Both protected routes must stay closed.
        for slug in [course["module9"]["slug"], "bilan"]:
            page.goto(route + "/" + slug + "?lang=en")
            expect(page.get_by_role("heading", name="One step at a time", exact=True)).to_be_visible(timeout=45000)
            assert saved(page, course).get("results", {}) == {}
            capture(page, name + "-empty-locked-" + slug)

        # Explicit historical fixture only. No new module steps, answers or results.
        assert not set(course["newIds"]).intersection(course["progress"]["results"])
        assert set(course["progress"]["results"]) == set(course["originalIds"])
        page.goto(base + "/companion/travel/films/departure.webp")
        page.evaluate("data => {localStorage.clear();sessionStorage.clear();localStorage.setItem(data.key,JSON.stringify(data.progress));}",
                      {"key": course["progressKey"], "progress": course["progress"]})
        page.goto(route + "?lang=en")
        resume = page.get_by_role("link", name="Resume my session", exact=True)
        expect(page.get_by_role("link", name="Resume my session", exact=True, include_hidden=True)).to_have_attribute(
            "href", "/yo/langues/" + course["slug"] + "/parcours/bilan-initial?lang=en", timeout=45000)
        dismiss_films(page)
        expect(resume).to_be_visible()
        capture(page, name + "-historical-home")
        resume.click()
        expect(page).to_have_url(route + "/bilan-initial?lang=en")
        player_ready(page)
        expect(page.get_by_text(course["legacyTarget"]["prompt"], exact=True)).to_be_visible()
        preserve_history(page, course)
        capture(page, name + "-initial-final-resumed")
        page.goto(route + "/bilan?lang=en")
        expect(page.get_by_role("heading", name="One step at a time", exact=True)).to_be_visible(timeout=45000)
        preserve_history(page, course)

        page.goto(route + "/" + course["module9"]["slug"] + "?lang=en")
        player_ready(page)
        if course["language"] == "zh":
            rail = page.get_by_test_id("yoppo-reserved-rail")
            expect(rail).to_be_visible()
            layout = page.evaluate("""() => {
              const rail = document.querySelector('[data-testid="yoppo-reserved-rail"]');
              const scroll = document.querySelector('[data-mandarin-scroll]');
              const navigation = document.querySelector('nav[aria-label="Lesson navigation"]');
              const rect = element => { const box = element.getBoundingClientRect(); return {top:box.top,bottom:box.bottom,height:box.height}; };
              return {rail:rect(rail), scroll:rect(scroll), navigation:rect(navigation),
                railPosition:getComputedStyle(rail).position, navigationPosition:getComputedStyle(navigation).position,
                viewport:innerHeight};
            }""")
            assert layout["railPosition"] == "relative" and layout["navigationPosition"] == "static", layout
            assert 44 <= layout["rail"]["height"] <= 60, layout
            assert layout["scroll"]["height"] >= layout["viewport"] * .55, layout
            assert layout["scroll"]["bottom"] <= layout["rail"]["top"] + 1, layout
            assert layout["rail"]["bottom"] <= layout["navigation"]["top"] + 1, layout
            assert layout["navigation"]["bottom"] <= layout["viewport"] + 1, layout
        preserve_history(page, course)
        answered = []
        for index, exercise in enumerate(course["module9"]["recalls"]):
            panel = select_recall(page, course, exercise)
            capture(page, name + f"-recall-{index + 1}-before", panel)
            assisted = index == 1
            if assisted:
                panel.get_by_role("button", name=course["hintLabel"], exact=True).click()
                expect(panel.locator("aside")).to_contain_text(exercise["hint"])
            field = panel.get_by_role("textbox", name=course["inputLabel"], exact=True)
            field.fill(exercise["answer"])
            expect(field).to_have_value(exercise["answer"])
            panel.get_by_role("button", name="Check", exact=True).click()
            page.wait_for_function("data => JSON.parse(localStorage.getItem(data.key) || '{}').results?.[data.id]?.attempts === 1",
                                   arg={"key": course["progressKey"], "id": exercise["id"]})
            record = preserve_history(page, course)["results"][exercise["id"]]
            assert record["passed"] and record["independent"] == (not assisted), record
            assert record[course["reviewField"]] is assisted, record
            expect(panel.get_by_text("Completed with help" if assisted else ("Correct in this exercise" if course["language"] == "ja" else "Correct answer"), exact=True)).to_be_visible()
            capture(page, name + f"-recall-{index + 1}-result", panel)
            answered.append(exercise["id"])
            page.reload()
            player_ready(page)
            expect(exercise_panel(page, course, exercise)).to_be_visible(timeout=45000)
            settle(page)
            after_reload = preserve_history(page, course)
            assert after_reload["results"][exercise["id"]] == record, "reload must neither regrade nor inflate attempt count"
            assert set(after_reload["results"]) - set(course["originalIds"]) == set(answered)
            capture(page, name + f"-recall-{index + 1}-reloaded")

        # Two checked answers are insufficient to complete all four new modules.
        page.goto(route + "/bilan?lang=en")
        expect(page.get_by_role("heading", name="One step at a time", exact=True)).to_be_visible(timeout=45000)
        preserve_history(page, course)
        settle(page)
        assert not errors and not forbidden and not media_attempts, (errors, forbidden, media_attempts)
        return {"language": course["language"], "width": width, "interfaceLocale": "en",
                "fixture": course["fixtureLabel"], "historicalUnitsSeeded": 8,
                "historicalResultsSeeded": len(course["originalIds"]), "historicalChecksEarnedThroughUI": 0,
                "newResultsSeeded": 0, "newRecallChecksThroughUI": 2, "aidedRecallChecksThroughUI": 1,
                "reloadResubmissions": 0, "legacyResultsPreserved": True, "newFinalRemainsLocked": True,
                "microphoneOrAudioAttempts": len(media_attempts), "providerOrAudioRequests": len(forbidden),
                "fullTwelveUnitCompletionTested": False, "passed": True}
    except Exception:
        page.screenshot(path=str(out / (name + "-failure.png")), full_page=False)
        (out / (name + "-failure.html")).write_text(page.content())
        (out / (name + "-events.json")).write_text(json.dumps({"errors": errors, "forbidden": forbidden, "mediaAttempts": media_attempts}, indent=2))
        raise
    finally:
        context.tracing.stop(path=str(out / (name + "-trace.zip")))
        context.close()


with sync_playwright() as playwright:
    for engine in os.environ.get("YO_EASTERN_BROWSERS", "chromium").split(","):
        assert engine in {"chromium", "webkit"}
        browser = getattr(playwright, engine).launch()
        passed, failed = [], []
        for course in fixture["courses"]:
            for width in [393, 320]:
                try:
                    passed.append(verify(browser, engine, course, width))
                except Exception as error:
                    failed.append({"language": course["language"], "width": width, "error": str(error)})
        (out / (engine + "-eastern-results.json")).write_text(json.dumps({"fixturePolicy": fixture["fixturePolicy"], "passed": passed, "failed": failed}, indent=2))
        browser.close()
        assert len(passed) == 4 and not failed, failed
