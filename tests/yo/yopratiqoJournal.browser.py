"""Blank-profile opening through recommendation, in all eight target languages.

These checks cover the first learner choices and Yoppo interaction. They do not
seed completion, certify course depth or substitute for a physical iPhone test.
"""
import base64
import json
import os
import re
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-journal-qa"))
out.mkdir(parents=True, exist_ok=True)
evidence = []


def dismiss_notices(page):
    banner = page.get_by_test_id("cookie-consent-banner")
    if banner.is_visible():
        banner.get_by_role("button", name=re.compile("Nécessaires|Necessary only|Solo necesarias", re.I)).click()
    later = page.get_by_role("button", name=re.compile("^(Pas maintenant|Not now|Ahora no)$"))
    if later.count() and later.first.is_visible():
        later.first.click()


def check_visible_character(page, figure):
    # Inspect what the browser painted, including CSS and media compositing.
    # A decoded poster or a moving timestamp alone cannot catch floating eyes.
    screenshot = base64.b64encode(figure.screenshot(scale="css")).decode()
    coverage = page.evaluate("""async encoded => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + encoded;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const scale = Math.max(image.width/960, image.height/400);
      const offsetX = (image.width - 960*scale)/2, offsetY = (image.height - 400*scale)/2;
      const teal = (r,g,b) => g-r > 45 && b-r > 20 && g>b;
      const cream = (r,g,b) => r>205 && r-g>7 && r-b>21;
      const paper = (r,g,b) => r>207 && g>160 && r-g>11 && r-b>35;
      return Object.fromEntries([
        ['quills',355,27,200,97,teal], ['face',375,127,175,90,cream],
        ['paw',475,265,88,58,teal], ['book',325,278,97,57,paper]
      ].map(([name,x,y,w,h,test]) => {
        const {data} = ctx.getImageData(Math.round(offsetX+x*scale), Math.round(offsetY+y*scale),
                                        Math.round(w*scale), Math.round(h*scale));
        let matched = 0;
        for (let i=0; i<data.length; i+=4) if (test(data[i],data[i+1],data[i+2])) matched++;
        return [name, matched/(data.length/4)];
      }));
    }""", screenshot)
    assert all(value > .24 for value in coverage.values()), coverage


def playing(page, gesture):
    canvas = page.locator(".yj-figure canvas")
    expect(canvas).to_have_attribute("data-gesture", gesture, timeout=10000)
    start = canvas.get_attribute("data-frame")
    page.wait_for_function("""([gesture, start]) => {
        const c = document.querySelector('.yj-figure canvas');
        return c?.dataset.gesture === gesture && c.dataset.frame !== start;
    }""", arg=[gesture, start], timeout=8000)
    return canvas


def check_journal(browser, engine, path, goal, zero, travel, width, height, reduced=False, language="it"):
    context = browser.new_context(
        viewport={"width": width, "height": height}, locale="fr-CA",
        is_mobile=width < 600, has_touch=width < 600, device_scale_factor=2 if width < 600 else 1,
        reduced_motion="reduce" if reduced else "no-preference",
    )
    page = context.new_page()
    try:
        page.goto(base + path, wait_until="domcontentloaded", timeout=90000)
        first = page.get_by_role("button", name=zero, exact=True)
        expect(first).to_be_visible(timeout=30000)
        dismiss_notices(page)
        if language != "it":
            expect(page.locator("[data-shared-welcome]")).to_have_attribute("data-shared-welcome", language)
        figure = page.locator("[data-journal-figure]")
        figure.locator("img").evaluate("image => image.decode()")
        box = figure.bounding_box()
        assert box and box["height"] >= 135 and 0 <= box["y"] < height - box["height"], box
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        pause = page.get_by_role("button", name="Mettre Yoppo en pause")
        if reduced:
            expect(figure.locator("canvas")).to_have_count(0)
            expect(pause).to_be_hidden()
        else:
            canvas = playing(page, "listen")
            pause.click()
            expect(page.get_by_role("button", name="Relancer l’animation de Yoppo")).to_be_visible()
            stopped = canvas.get_attribute("data-frame")
            page.wait_for_timeout(180)
            assert canvas.get_attribute("data-frame") == stopped
            page.get_by_role("button", name="Relancer l’animation de Yoppo").click()
            playing(page, "listen")
        check_visible_character(page, figure)
        page.screenshot(path=str(out / f"{engine}-{path.split('/')[3]}-{width}-welcome.png"))
        first.click()
        expect(page.get_by_role("heading", name=goal)).to_be_focused()
        expect(page.locator(".yj-receipt")).to_have_text(zero)
        if not reduced:
            playing(page, "write")
        check_visible_character(page, figure)
        page.screenshot(path=str(out / f"{engine}-{path.split('/')[3]}-{width}-writing.png"))
        page.get_by_role("button", name=travel, exact=True).click()
        expect(page.locator(".yj-receipt")).to_have_text(travel)
        page.get_by_role("button", name="Arts", exact=True).click()
        expect(page.get_by_role("button", name="Arts", exact=True)).to_have_attribute("aria-pressed", "true")
        page.get_by_role("button", name="Continuer", exact=True).click()
        page.locator("label").filter(has=page.get_by_role("radio", name=re.compile(r"^30 min\b"))).click()
        assert "30" in page.locator(".yj-receipt").inner_text()
        page.get_by_role("button", name="Retour", exact=True).click()
        expect(page.locator(".yj-receipt")).to_have_count(0)
        # Complete the actual choices from this fresh browser context. A profile
        # fixture must not hide a broken route, language label or recommendation.
        page.get_by_role("button", name="Continuer", exact=True).click()
        expect(page.get_by_role("radio", name=re.compile(r"^30 min\b"))).to_be_checked()
        page.get_by_role("button", name="Continuer", exact=True).click()
        recommendation = page.locator("[data-onboarding-recommendation], [data-shared-recommendation]")
        expect(recommendation).to_be_visible()
        expect(recommendation.get_by_role("button", name="Commencer ici", exact=True)).to_be_enabled()
        assert "30 min" in recommendation.inner_text()
        if not reduced:
            playing(page, "celebrate")
            if language == "pt-BR":
                check_visible_character(page, figure)
                playing(page, "listen")

        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.screenshot(path=str(out / f"{engine}-{path.split('/')[3]}-{width}-recommendation.png"))
        evidence.append({"engine": engine, "language": language, "path": path,
                         "width": width, "height": height, "reducedMotion": reduced,
                         "entry": "fresh browser context; no learner fixture",
                         "result": "animated guide, choices, focus, back, retained pace choice and recommendation passed"})
    except Exception:
        page.screenshot(path=str(out / f"{engine}-{width}-failure.png"))
        print(page.locator("body").inner_text()[:1500], flush=True)
        raise
    finally:
        context.close()


def check_media_failure(browser):
    context = browser.new_context(viewport={"width": 393, "height": 690}, is_mobile=True, has_touch=True)
    try:
        page = context.new_page()
        page.route("**/companion/travel/journal/yoppo-*-*.webp", lambda route: route.abort())
        page.goto(base + "/yo/langues/portugais-bresil/demarrer?lang=fr")
        dismiss_notices(page)
        page.get_by_role("button", name="Je pars de zéro", exact=True).click()
        figure = page.locator("[data-journal-figure]")
        expect(page.locator(".yj-receipt")).to_have_text("Je pars de zéro")
        expect(figure.locator("canvas")).not_to_have_attribute("data-gesture", "write")
        check_visible_character(page, figure)
        expect(page.get_by_role("button", name="Voyager", exact=True)).to_be_enabled()
    finally:
        context.close()


def record_opening(browser):
    size = {"width": 390, "height": 690}
    context = browser.new_context(viewport=size, is_mobile=True, has_touch=True, locale="fr-CA",
                                  record_video_dir=str(out / "capture"), record_video_size=size)
    page = context.new_page()
    page.goto(base + "/yo/langues/italien/parcours?lang=fr", wait_until="domcontentloaded")
    zero = page.get_by_role("button", name="Je pars de zéro", exact=True)
    expect(zero).to_be_visible()
    page.locator("[data-journal-figure] img").evaluate("image => image.decode()")
    dismiss_notices(page)
    page.wait_for_timeout(1600)
    zero.tap()
    page.wait_for_timeout(1700)
    page.get_by_role("button", name="Voyager", exact=True).tap()
    page.get_by_role("button", name="Arts", exact=True).tap()
    page.get_by_role("button", name="Continuer", exact=True).tap()
    page.wait_for_timeout(1600)
    page.locator("label").filter(has=page.get_by_role("radio", name=re.compile(r"^30 min\b"))).click()
    page.wait_for_timeout(1600)
    video = page.video
    context.close()
    Path(video.path()).replace(out / "Yoppo-premiers-choix.webm")


with sync_playwright() as playwright:
    for engine in os.environ.get("YO_JOURNAL_BROWSERS", "chromium,webkit").split(","):
        executable = os.environ.get("YO_CHROMIUM") if engine == "chromium" else None
        browser = getattr(playwright, engine).launch(executable_path=executable)
        try:
            question = "Qu’est-ce qui te donne envie d’apprendre ?"
            italian = "/yo/langues/italien/parcours?lang=fr"
            for width, height in [(393, 690), (320, 568), (1024, 768)]:
                check_journal(browser, engine, italian, question, "Je pars de zéro", "Voyager", width, height, reduced=width == 320)
            for language, slug in [("en", "anglais"), ("fr-CA", "francais-quebec"),
                                   ("es", "espagnol"), ("de", "allemand"),
                                   ("pt-BR", "portugais-bresil"), ("ja", "japonais"),
                                   ("zh-Hans", "mandarin")]:
                for width, height in [(393, 690), (320, 568)]:
                    check_journal(browser, engine, f"/yo/langues/{slug}/demarrer?lang=fr",
                                  question, "Je pars de zéro", "Voyager", width, height,
                                  reduced=width == 320, language=language)
            check_media_failure(browser)
            if engine == "chromium" and os.environ.get("YO_JOURNAL_VIDEO"):
                record_opening(browser)
            (out / f"{engine}-eight-language-opening.json").write_text(json.dumps(
                [row for row in evidence if row["engine"] == engine], ensure_ascii=False, indent=2))
            print(f"PASS {engine}: eight blank-profile language entries, writing, pause, reduced motion, back, pace and recommendation", flush=True)
        finally:
            browser.close()
