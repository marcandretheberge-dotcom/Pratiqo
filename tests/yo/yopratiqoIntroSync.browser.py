"""Two real tabs share an unfinished introduction without replaying its results.

The only fixture is a profile and an unfinished cursor. No answer, completion,
grade or review event is seeded. Delaying storage/focus notifications reproduces
a suspended tab; all edits, help, checks and continuation use the actual UI.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-journal-qa"))
out.mkdir(parents=True, exist_ok=True)
fixtures = json.loads((Path(os.environ.get("YO_QA_DIR", "/tmp/yo-shared-review")) / "courses.json").read_text())
fixture = next(item for item in fixtures if item["course"]["language"] == "en")
course, steps = fixture["course"], fixture["steps"]
practice = course["missions"][0]["practice"]
ordered = next(item for item in practice if item["kind"] == "order")
reply = practice[practice.index(ordered) + 1]
assert reply["kind"] == "reply", "This continuity scenario needs the existing adjacent written reply"
parts = next(phrase["parts"] for phrase in course["phrases"] if phrase["id"] == ordered["answer"])
assert len(parts) >= 3 and len(set(parts)) == len(parts)
key = "yo.shared-intro.v1." + course["language"]
epoch_key = "yo.shared-intro.epoch.v1." + course["language"]
route = base + "/yo/langues/" + course["slug"] + "/demarrer?lang=en"


def read(page):
    return page.evaluate("key => JSON.parse(localStorage.getItem(key))", key)


def reviews(page):
    return page.evaluate("""() => Object.keys(localStorage).filter(key => key.startsWith('yo.review.v1.'))
      .sort().map(key => [key, localStorage.getItem(key)])""")


def evidence(page):
    saved = read(page)
    return {"completed": sorted(saved["completed"]), "answers": saved["answers"], "best": saved["best"],
            "attempts": saved["sync"]["attempts"], "reviews": reviews(page)}


def capture(page, name):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Horizontal page overflow"
    page.screenshot(path=str(out / (name + ".png")), full_page=False)


def quiet(page):
    assert page.evaluate("window.__introSyncQaMicrophones + window.__introSyncQaVoices + window.__introSyncQaAudio") == 0, \
        "The written continuity scenario requested a microphone, device voice or lesson audio"


def dismiss_films(page):
    # Allow the real route effects to mount their dialogs, then use real Skip controls.
    for _ in range(8):
        page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        film = page.locator("[data-travel-film], [data-mission-film]")
        if not film.count():
            return
        film.first.get_by_role("button", name="Skip", exact=True).click()
    raise AssertionError("Cinema did not finish after its real Skip controls")


def resume(page):
    expect(page.locator('[data-shared-course="en"]')).to_be_attached(timeout=45000)
    # The map and question may already be mounted behind a cinema dialog.
    expect(page.locator("[data-shared-world-map]")).to_be_attached()
    dismiss_films(page)
    page.locator("[data-shared-world-map]").get_by_role("button", name="Continue", exact=True).click()
    expect(page.locator('[data-intro-question="' + ordered["id"] + '"]')).to_be_attached()
    dismiss_films(page)
    expect(sentence(page)).to_be_visible()


def panel(page, exercise=ordered):
    return page.locator('[data-intro-question="' + exercise["id"] + '"]')


def sentence(page):
    return panel(page).get_by_role("group", name="Your sentence", exact=True)


def expect_words(page, words):
    expect(sentence(page).get_by_role("button")).to_have_text(words)


def fill_words(page, words):
    selected = sentence(page).get_by_role("button")
    while selected.count():
        count = selected.count()
        selected.last.click()
        expect(selected).to_have_count(count - 1)
    available = panel(page).get_by_role("group", name="Available words", exact=True)
    for word in words:
        available.get_by_role("button", name=word, exact=True).click()
    expect_words(page, words)


def hold_notifications(page, hold):
    page.evaluate("hold => { window.__introSyncQaHold = hold; if (!hold) window.dispatchEvent(new Event('focus')); }", hold)
    return page.evaluate("window.__introSyncQaBlocked")


def wait_for_delayed_event(page, previous):
    page.wait_for_function("previous => window.__introSyncQaBlocked > previous", arg=previous)


def verify(browser, engine):
    context = browser.new_context(viewport={"width": 320, "height": 740}, locale="en-CA",
                                  is_mobile=True, has_touch=True, device_scale_factor=1, reduced_motion="reduce")
    errors, forbidden = [], []
    context.add_init_script("""window.__introSyncQaHold = false; window.__introSyncQaBlocked = 0;
      window.__introSyncQaMicrophones = 0; window.__introSyncQaVoices = 0; window.__introSyncQaAudio = 0;
      addEventListener('storage', event => {
        if (window.__introSyncQaHold && (event.key === null || event.key.startsWith('yo.shared-intro.'))) {
          window.__introSyncQaBlocked++; event.stopImmediatePropagation();
        }
      }, true);
      addEventListener('focus', event => { if (window.__introSyncQaHold) event.stopImmediatePropagation(); }, true);
      if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable:true, value:() => { window.__introSyncQaMicrophones++;
          return Promise.reject(new DOMException('Microphone disabled in QA', 'NotAllowedError')); }
      });
      if (window.speechSynthesis) Object.defineProperty(window.speechSynthesis, 'speak', {
        configurable:true, value:() => { window.__introSyncQaVoices++; }
      });
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.tagName === 'AUDIO') { window.__introSyncQaAudio++;
          return Promise.reject(new DOMException('Lesson audio is outside this written scenario', 'NotAllowedError')); }
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
    name = engine + "-intro-two-tabs-320"
    try:
        a.goto(base + "/companion/travel/films/departure.webp")
        state = {"version": 2, "language": course["language"],
                 "profile": {"experience": "some", "goal": "travel", "minutes": 30, "entry": 0, "interests": []},
                 "view": "map", "resume": "lesson", "step": next(i for i, step in enumerate(steps) if step["id"] == ordered["id"]),
                 "finalIndex": 0, "draft": {"selected": None, "tiles": [], "checked": False, "correct": False,
                                          "assisted": False, "heard": False, "transcript": False},
                 "completed": [], "visited": [], "answers": [], "best": 0}
        a.evaluate("""data => { localStorage.clear(); sessionStorage.clear();
          localStorage.setItem(data.key, JSON.stringify(data.state));
          localStorage.setItem('yo.practice.auto-next.v1', 'off');
          localStorage.setItem('yopratiqo.audio.muted', 'true');
          localStorage.setItem('yopratiqo.haptics.enabled', 'false');
        }""", {"key": key, "state": state})
        for page in (a, b):
            page.goto(route)
            resume(page)
        assert len(context.pages) == 2 and reviews(a) == []
        assert read(a)["completed"] == read(a)["answers"] == [] and read(a)["best"] == 0

        # Normal browser storage events synchronize these real edits first.
        fill_words(a, parts)
        expect_words(b, parts)
        blocked = hold_notifications(a, True)
        reordered = [parts[1], parts[0], *parts[2:]]
        fill_words(b, reordered)
        b.get_by_role("button", name="Word notebook", exact=True).click()
        expect(b.get_by_role("dialog")).to_be_visible()
        b.get_by_role("dialog").get_by_role("button", name="Close", exact=True).click()
        wait_for_delayed_event(a, blocked)
        expect_words(a, parts)  # The rendered answer really is stale, not just a stale variable.
        assert read(b)["sync"]["attempts"][ordered["id"]]["draft"]["assisted"]
        before_stale = evidence(b)
        panel(a).get_by_role("button", name="Check sentence", exact=True).click()
        expect_words(a, reordered)
        assert evidence(a) == before_stale, "A stale Check graded different words or emitted a review"
        assert not read(a)["sync"]["attempts"][ordered["id"]]["draft"]["checked"]
        expect(panel(a).locator("[data-yoppo-success]")).to_have_count(0)
        capture(a, name + "-stale-check-rejected")
        hold_notifications(a, False)

        # Correct the actual visible sentence; the remotely opened help remains sticky.
        fill_words(a, parts)
        expect_words(b, parts)
        blocked = hold_notifications(b, True)
        panel(a).get_by_role("button", name="Check sentence", exact=True).click()
        expect(panel(a).get_by_text("Well done!", exact=True)).to_be_visible()
        accepted = evidence(a)
        assert len(accepted["reviews"]) == 1
        event = json.loads(accepted["reviews"][0][1])
        assert event["itemId"] == "intro:m1:" + ordered["id"] and event["correct"] and event["assisted"]
        assert accepted["attempts"][ordered["id"]]["draft"]["assisted"]
        wait_for_delayed_event(b, blocked)
        panel(b).get_by_role("button", name="Check sentence", exact=True).click()
        expect(panel(b).get_by_text("Well done!", exact=True)).to_be_visible()
        assert evidence(b) == accepted, "The second tab submitted the already checked answer again"
        expect(panel(b).locator("[data-yoppo-success]")).to_have_count(0)
        hold_notifications(b, False)
        quiet(a)
        quiet(b)
        a.reload()
        resume(a)
        expect(panel(a).get_by_text("Well done!", exact=True)).to_be_visible()
        expect(panel(a).locator("[data-yoppo-success]")).to_have_count(0)
        assert evidence(a) == accepted, "Reload regraded, removed help or emitted another review"
        capture(a, name + "-checked-help-restored")

        # Keep two different activity states in the same real storage document.
        panel(b).get_by_role("button", name="Continue", exact=True).click()
        expect(panel(b, reply)).to_be_visible()
        panel(a).get_by_role("button", name="Start again without help", exact=True).click()
        fill_words(a, parts[:2])
        panel(b, reply).locator('[data-answer-id="' + reply["answer"] + '"]').click()
        expect(panel(b, reply).get_by_text("Well done!", exact=True)).to_be_visible()
        expect_words(a, parts[:2])
        separate = evidence(a)
        assert separate["completed"] == [ordered["id"]]
        assert separate["attempts"][ordered["id"]]["draft"]["tiles"] == [0, 1]
        assert not separate["attempts"][ordered["id"]]["draft"]["checked"]
        assert not separate["attempts"][ordered["id"]]["draft"]["assisted"]
        assert separate["attempts"][reply["id"]]["draft"]["checked"]
        assert separate["attempts"][reply["id"]]["draft"]["correct"]
        assert separate["answers"] == [] and separate["best"] == 0
        capture(a, name + "-distinct-draft-a")
        capture(b, name + "-distinct-result-b")

        # Browser removal has no event in its source tab, and the other tab is delayed.
        # Neither stale action may restore the deleted course or replay its SRS.
        fill_words(a, parts)
        preserved_reviews = reviews(a)
        blocked = hold_notifications(a, True)
        b.evaluate("key => localStorage.removeItem(key)", key)
        wait_for_delayed_event(a, blocked)
        panel(b, reply).get_by_role("button", name="Continue", exact=True).click()
        expect(b.get_by_role("button", name="I’m starting from zero", exact=True)).to_be_visible()
        panel(a).get_by_role("button", name="Check sentence", exact=True).click()
        expect(a.get_by_role("button", name="I’m starting from zero", exact=True)).to_be_visible()
        assert read(a) is None and read(b) is None
        assert a.evaluate("key => Boolean(localStorage.getItem(key))", epoch_key)
        assert reviews(a) == preserved_reviews
        hold_notifications(a, False)
        for page in (a, b):
            quiet(page)  # Check before navigation resets the document's counters.
            page.reload()
            expect(page.get_by_role("button", name="I’m starting from zero", exact=True)).to_be_visible()
            assert read(page) is None and reviews(page) == preserved_reviews
            quiet(page)
        capture(a, name + "-removal-remains-reset")
        assert not errors and not forbidden, (errors, forbidden)
        result = {"browser": engine, "width": 320, "language": course["language"], "tabsInSameContext": 2,
                  "fixture": "profile and unfinished cursor only", "seededResults": 0,
                  "staleChecksRejected": 2, "assistedResultRestoredWithoutReviewReplay": True,
                  "distinctActivityChangesPreserved": True, "staleActionsAfterRemovalRejected": 2,
                  "microphoneDeviceVoiceOrLessonAudioAttempts": 0,
                  "providerOrApiRequests": forbidden, "pageErrors": errors, "passed": True}
        (out / (name + ".json")).write_text(json.dumps(result, indent=2) + "\n")
        print("PASS " + engine + ": two real intro tabs, sticky help, stale checks, reload and removal", flush=True)
    except Exception:
        for label, page in (("a", a), ("b", b)):
            page.screenshot(path=str(out / (name + "-failure-" + label + ".png")))
            print(label + ": " + page.locator("body").inner_text()[:1800], flush=True)
        raise
    finally:
        context.close()


with sync_playwright() as playwright:
    for engine in os.environ.get("YO_JOURNAL_BROWSERS", "chromium,webkit").split(","):
        executable = os.environ.get("YO_CHROMIUM") if engine == "chromium" else None
        browser = getattr(playwright, engine).launch(executable_path=executable)
        try:
            verify(browser, engine)
        finally:
            browser.close()
