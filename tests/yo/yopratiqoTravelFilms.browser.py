"""Play the actual shipped films and travel through the real course entry points."""
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
photos = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-travel"))
photos.mkdir(parents=True, exist_ok=True)
key = "yo.travel.last-place.v1"
italy = "/yo/langues/italien/parcours?lang=fr"


def seed(page, data):
    page.goto(base + "/companion/travel/films/departure.webp")
    page.evaluate("(data) => {localStorage.clear(); localStorage.setItem('yo.italian.guided.tour.v1','seen'); for (const [k,v] of Object.entries(data)) localStorage.setItem(k,JSON.stringify(v));}", data)


def italian_profile(unit="u01"):
    return {"version": 1, "language": "it", "experience": "words", "goal": "travel", "weeklyMinutes": 30,
            "startUnitId": unit, "placement": "manual", "reviewUnitIds": [], "updatedAt": 1720000000000}


def shared_profile(language):
    return {"version": 2, "language": language, "profile": {"experience": "new", "goal": "travel", "minutes": 30, "entry": 0},
            "view": "map", "resume": None, "step": 0, "finalIndex": 0, "draft": {"selected": None, "tiles": [], "checked": False,
            "correct": False, "assisted": False, "heard": False, "transcript": False}, "completed": [], "visited": [], "answers": [], "best": 0}


def location(page):
    return page.evaluate("(key)=>JSON.parse(localStorage.getItem(key))", key)


def film(page, mode):
    node = page.locator('[data-travel-film="' + mode + '"]')
    expect(node).to_be_visible(timeout=45000)
    return node


def verify(browser, engine):
    context = browser.new_context(viewport={"width": 393, "height": 690}, device_scale_factor=2, is_mobile=True,
                                  has_touch=True, locale="fr-CA", reduced_motion="no-preference")
    page = context.new_page()
    try:
        seed(page, {"yo.learning-profile.v1.it": italian_profile()})
        page.goto(base + italy)
        departure = film(page, "flight")
        expect(departure.get_by_role("heading")).to_have_text("Bologna")
        assert location(page) is None
        page.wait_for_function("document.querySelector('[data-travel-film] video')?.currentTime > 0.18", timeout=15000)
        assert departure.locator("video").evaluate("v=>v.muted")
        departure.get_by_role("button", name="Activer le son du film").click()
        assert departure.locator("video").evaluate("v=>!v.muted")
        departure.get_by_role("button", name="Couper le son du film").click()
        page.screenshot(path=str(photos / (engine + "-embarquement.png")))
        departure.get_by_role("button", name="Mettre en pause").click()
        assert departure.locator("video").evaluate("v=>v.paused && v.playsInline && v.videoWidth===768")
        departure.get_by_role("button", name="Lire le film").click()
        expect(departure).to_have_count(0, timeout=15000)  # the real H.264 ended event
        assert location(page) == {"country": "IT", "city": "Bologna"}
        assert page.locator('[data-city=u02]').get_attribute("aria-disabled") == "true"
        page.reload()
        expect(page.locator("[data-travel-continue]")).to_be_visible()
        expect(page.locator("[data-travel-film]")).to_have_count(0)

        # A returning traveler previews cities freely. Only committing to the journey opens the film.
        page.emulate_media(reduced_motion="reduce")
        seed(page, {"yo.learning-profile.v1.it": italian_profile("u07"), key: {"country": "IT", "city": "Bologna"},
                    "yo.it.travel.cosmetics.v1": {"version": 1, "arrived": True, "selected": "u01", "positions": {}}})
        page.goto(base + "/yo/langues/italien/parcours/u07?lang=fr")
        page.locator('[data-city=u02]').click()
        expect(page.locator("[data-travel-film]")).to_have_count(0)
        page.locator("[data-travel-continue]").click()
        rail = film(page, "train")
        expect(rail.get_by_role("heading")).to_contain_text("Parma")
        expect(rail.locator("video")).to_have_attribute("src", "/companion/travel/films/rail.mp4")
        assert rail.locator("video").evaluate("v=>v.paused")
        rail.get_by_role("button", name="Passer").click()
        page.wait_for_url("**/parcours/u02?**")
        assert location(page) == {"country": "IT", "city": "Parma"}

        for origin, target, unit, transport in [("Parma", "Modena", "u03", "car"), ("Modena", "Bologna", "u01", "taxi")]:
            seed(page, {"yo.learning-profile.v1.it": italian_profile("u07"), key: {"country": "IT", "city": origin},
                        "yo.it.travel.cosmetics.v1": {"version": 1, "arrived": True, "selected": "u02", "positions": {}}})
            page.goto(base + "/yo/langues/italien/parcours/u07?lang=fr")
            page.locator("[data-city=" + unit + "]").click()
            page.locator("[data-travel-continue]").click()
            ground = film(page, transport)
            ground.get_by_role("button", name="Lire le film").click()
            page.wait_for_function("document.querySelector('[data-travel-film] video')?.currentTime > .12")
            ground.get_by_role("button", name="Passer").click()
            page.wait_for_url("**/parcours/" + unit + "?**")
            assert location(page) == {"country": "IT", "city": target}

        seed(page, {"yo.shared-intro.v1.en": shared_profile("en"), key: {"country": "CA", "city": "Montréal"}})
        page.goto(base + "/yo/langues/anglais/demarrer?lang=fr")
        canada = film(page, "train")
        expect(canada.locator("video")).to_have_attribute("src", "/companion/travel/films/rail-canada.mp4")
        canada.get_by_role("button", name="Passer").click()
        assert location(page) == {"country": "CA", "city": "Toronto"}
        page.evaluate("(d)=>localStorage.setItem('yo.shared-intro.v1.ja',JSON.stringify(d))", shared_profile("ja"))
        page.goto(base + "/yo/langues/japonais/demarrer?lang=fr")
        japan = film(page, "flight")
        expect(japan.get_by_role("heading")).to_contain_text("Tokyo")
        # An actual failed media request still leaves a way to reach this map.
        page.route("**/films/departure.mp4", lambda route: route.abort())
        japan.get_by_role("button", name="Lire le film").click()
        expect(japan.get_by_role("status")).to_be_visible(timeout=10000)
        japan.get_by_role("button", name="Continuer").click()
        assert location(page) == {"country": "JP", "city": "Tokyo"}
        expect(page.locator("[data-shared-world-map]")).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        print(f"PASS {engine}: flight playback, pause, finish, reduced motion, city commitment, international transfer, same country, media failure", flush=True)
    except Exception:
        print("Media state:", page.locator("[data-travel-film] video").evaluate_all(
            """nodes => nodes.map(v => ({source: v.currentSrc, time: v.currentTime, duration: v.duration,
              paused: v.paused, muted: v.muted, autoplay: v.autoplay, ready: v.readyState, network: v.networkState,
              error: v.error && [v.error.code, v.error.message], visibility: document.visibilityState,
              width: v.videoWidth, decoded: v.getVideoPlaybackQuality?.().totalVideoFrames}))"""), flush=True)
        page.screenshot(path=str(photos / (engine + "-travel-failure.png")))
        print(page.locator("body").inner_text()[:1150], flush=True)
        raise
    finally:
        context.close()


with sync_playwright() as pw:
    for name in os.environ.get("YO_JOURNAL_BROWSERS", "chromium,webkit").split(","):
        executable = os.environ.get("YO_CHROMIUM") if name == "chromium" else None
        browser = getattr(pw, name).launch(executable_path=executable)
        try:
            verify(browser, name)
        finally:
            browser.close()
