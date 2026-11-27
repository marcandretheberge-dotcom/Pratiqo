"""Real premium route QA: local films/posters, closed voice practice, mobile layout.

Run after prepare_yo_shared_review.ts with the existing journal dev server.
No microphone is granted and no speech/provider request is allowed to execute.
Only onboarding preferences are seeded; no assessment or reward is fabricated.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-journal-qa"))
out.mkdir(parents=True, exist_ok=True)


def shared_profile():
    return {"version": 2, "language": "en", "profile": {"experience": "new", "goal": "travel", "minutes": 30, "entry": 0},
            "view": "map", "resume": None, "step": 0, "finalIndex": 0,
            "draft": {"selected": None, "tiles": [], "checked": False, "correct": False,
                      "assisted": False, "heard": False, "transcript": False},
            "completed": [], "visited": [], "answers": [], "best": 0}


def seed(page, values):
    page.goto(base + "/companion/travel/films/departure.webp")
    page.evaluate("""values => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('yo.italian.guided.tour.v1', 'seen');
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    }""", values)


def fits(page, element=None):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Horizontal document overflow"
    if element is not None:
        box = element.bounding_box()
        width = page.viewport_size["width"]
        assert box and box["x"] >= -1 and box["x"] + box["width"] <= width + 1, box


def quiet(page, requests):
    assert not requests, "Voice/provider network request before opening: " + repr(requests)
    assert page.evaluate("window.__premiumQaMicrophones") == 0, "Automatic microphone request"


def screenshot(page, name):
    page.screenshot(path=str(out / (name + ".png")), full_page=True)


def travel(page, name, reduced):
    film = page.locator('[data-travel-film="flight"]')
    expect(film).to_be_visible(timeout=45000)
    expect(page.locator("[data-mission-film]")).to_have_count(0)
    expect(film.locator("video")).to_have_attribute("src", "/companion/travel/films/departure.mp4")
    fits(page, film)
    if reduced:
        assert film.locator("video").evaluate("video => video.paused")
        film.get_by_role("button", name="Lire le film", exact=True).click()
    else:
        # Browser autoplay denial is allowed, but actual decoded playback is still required.
        page.wait_for_function("""() => {
          const film = document.querySelector('[data-travel-film]');
          return film?.querySelector('video')?.currentTime > 0.15
            || film?.querySelector('[role="status"]')?.textContent.includes('Touche Lecture');
        }""", timeout=20000)
        if film.locator("video").evaluate("video => video.paused"):
            film.get_by_role("button", name="Lire le film", exact=True).click()
    page.wait_for_function("""() => {
      const video = document.querySelector('[data-travel-film] video');
      return video && video.currentTime > 0.15 && video.videoWidth === 768;
    }""", timeout=20000)
    assert film.locator("video").evaluate("video => !video.muted && video.playsInline")
    film.get_by_role("button", name="Mettre en pause", exact=True).click()
    screenshot(page, name + "-travel")
    film.get_by_role("button", name="Passer", exact=True).click()
    expect(page.locator("[data-travel-film]")).to_have_count(0)


def mission(page, name, reduced, keyboard_guard=False):
    scene = page.locator('[data-mission-film="mission-start"]')
    expect(scene).to_be_visible(timeout=30000)
    expect(page.locator("[data-travel-film]")).to_have_count(0)
    expect(page.locator("[data-mission-film]")).to_have_count(1)
    video = scene.locator("video")
    expect(video).to_have_attribute("src", "/companion/travel/films/mission-ready.mp4")
    expect(video).to_have_attribute("poster", "/companion/travel/films/mission-ready.webp")
    expect(scene.locator("[data-cinema-caption]")).to_be_visible()
    # The original image remains a genuine fallback even with an approved movie.
    video.evaluate("video => { const poster = new Image(); poster.src = video.poster; return poster.decode(); }")
    if reduced:
        assert video.evaluate("video => video.paused")
        expect(video).to_have_attribute("preload", "none")
        screenshot(page, name + "-mission-reduced-motion")
        scene.get_by_role("button", name="Lire le film", exact=True).click()
    else:
        page.wait_for_function("""() => {
          const scene = document.querySelector('[data-mission-film]');
          return scene?.querySelector('video')?.currentTime > 0.15
            || scene?.querySelector('[role="status"]')?.textContent.includes('Touche Lecture');
        }""", timeout=20000)
        if video.evaluate("video => video.paused"):
            scene.get_by_role("button", name="Lire le film", exact=True).click()
    page.wait_for_function("""() => {
      const video = document.querySelector('[data-mission-film] video');
      return video && video.currentTime > 0.15 && video.videoWidth === 1280;
    }""", timeout=20000)
    assert video.evaluate("video => !video.muted && video.playsInline")
    scene.get_by_role("button", name="Mettre en pause", exact=True).click()
    if keyboard_guard:
        screen = page.locator('[data-yo-lesson-deck-screen-host-active="true"]')
        before = screen.get_attribute("data-yo-lesson-deck-screen-host-id")
        page.keyboard.press("ArrowRight")
        page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        expect(screen).to_have_attribute("data-yo-lesson-deck-screen-host-id", before)
        expect(page.get_by_role("dialog")).to_have_count(1)
    fits(page, scene)
    screenshot(page, name + "-mission-film")
    scene.get_by_role("button", name="Continuer", exact=True).click()
    expect(page.locator("[data-mission-film]")).to_have_count(0)


def closed_speech(page, requests, name):
    panel = page.locator("details").filter(has=page.locator("summary").filter(has_text="Parle avec Yoppo"))
    expect(panel).to_have_count(1)
    panel.scroll_into_view_if_needed()
    expect(panel.locator("summary")).to_be_visible()
    assert panel.get_attribute("open") is None
    expect(panel.get_by_role("checkbox")).to_have_count(0)
    expect(panel.get_by_role("status")).to_have_count(0)
    # Let passive effects settle before asserting no auth/status/microphone startup.
    page.wait_for_timeout(200)
    quiet(page, requests)
    fits(page, panel)
    screenshot(page, name + "-speech-collapsed")


def verify(browser, engine, route, width):
    reduced = width == 320
    context = browser.new_context(viewport={"width": width, "height": 740}, locale="fr-CA",
                                  is_mobile=True, has_touch=True, device_scale_factor=1,
                                  reduced_motion="reduce" if reduced else "no-preference")
    requests, errors = [], []
    context.add_init_script("""window.__premiumQaMicrophones = 0;
      if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true, value: () => {
          window.__premiumQaMicrophones++;
          return Promise.reject(new DOMException('Microphone disabled in QA', 'NotAllowedError'));
        }
      });""")
    # Even a regression must not reach a paid endpoint or a production auth service.
    def intercept(request_route):
        request = request_route.request
        url = urlsplit(request.url)
        if "/api/yo/speech/" in url.path or url.hostname == "api.openai.com" or "/auth/v1/" in url.path:
            requests.append(url.path)
            request_route.fulfill(status=503, content_type="application/json", body='{"error":"disabled_in_qa"}')
        else:
            request_route.continue_()
    context.route("**/*", intercept)
    page = context.new_page()
    page.set_default_navigation_timeout(90000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    name = f"{engine}-premium-{route}-{width}"
    try:
        if route == "en":
            seed(page, {"yo.shared-intro.v1.en": shared_profile()})
            page.goto(base + "/yo/langues/anglais/demarrer?lang=fr")
            travel(page, name, reduced)
            page.locator("[data-shared-world-map] .yo-shared-continue").click()
            mission(page, name, reduced)
        elif route == "it":
            # A manual starting preference is not a passed assessment or earned reward.
            seed(page, {"yo.learning-profile.v1.it": {"version": 1, "language": "it", "experience": "words",
                        "goal": "travel", "weeklyMinutes": 30, "startUnitId": "u02", "placement": "manual",
                        "reviewUnitIds": [], "updatedAt": 1720000000000}})
            page.goto(base + "/yo/langues/italien/parcours/u02?lang=fr")
            travel(page, name, reduced)
            page.locator("[data-travel-continue]").click()
            briefing = page.locator("[data-yoppo-mission-briefing]")
            expect(briefing).to_be_visible()
            briefing.get_by_role("button", name="Commencer ma mission", exact=True).click()
            mission(page, name, reduced)
            # The real route layout supplies its readable mobile spacing; missing it
            # can otherwise leave functional buttons in a visually unstyled fixture.
            assert page.locator(".yo-mission-window").evaluate("window => parseFloat(getComputedStyle(window).paddingLeft) >= 16"), "Italian route layout CSS is missing"
        else:
            seed(page, {})
            page.goto(base + "/yo/langues/espagnol/pays/republique-dominicaine/intro?lang=fr")
            # The deck must not consume ArrowRight while the arrival film is on top.
            screen = page.locator('[data-yo-lesson-deck-screen-host-active="true"]')
            expect(page.locator('[data-travel-film="flight"]')).to_be_visible(timeout=45000)
            before = screen.get_attribute("data-yo-lesson-deck-screen-host-id")
            page.keyboard.press("ArrowRight")
            page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
            expect(screen).to_have_attribute("data-yo-lesson-deck-screen-host-id", before)
            travel(page, name, reduced)
            mission(page, name, reduced, keyboard_guard=True)
        closed_speech(page, requests, name)
        assert not errors, errors
        result = {"route": route, "width": width, "reducedMotion": reduced, "passed": True,
                  "speechRequestsBeforeOpening": len(requests), "microphoneRequests": page.evaluate("window.__premiumQaMicrophones")}
        print("PASS " + name + ": decoded flight and mission films + skip, reduced motion, collapsed voice, no automatic speech/mic, no horizontal overflow", flush=True)
        return result
    except Exception:
        screenshot(page, name + "-failure")
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
                for route in ("en", "it", "rd"):
                    results.append(verify(browser, engine, route, width))
        finally:
            (out / f"{engine}-premium-cinema-results.json").write_text(json.dumps(results, indent=2) + "\n")
            browser.close()
