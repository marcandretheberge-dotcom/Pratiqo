"""Regression for the opening that previously showed one static Yoppo portrait."""
import os
import re
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
out = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-journal-qa"))
out.mkdir(parents=True, exist_ok=True)


def dismiss_notices(page):
    banner = page.get_by_test_id("cookie-consent-banner")
    if banner.is_visible():
        banner.get_by_role("button", name=re.compile("Nécessaires|Necessary only|Solo necesarias", re.I)).click()
    later = page.get_by_role("button", name=re.compile("^(Pas maintenant|Not now|Ahora no)$"))
    if later.count() and later.first.is_visible():
        later.first.click()


def sample(page, selector):
    return page.locator(selector).evaluate("(el) => getComputedStyle(el).transform")


def check_journal(browser, engine, path, goal, zero, travel, width, height, reduced=False):
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
        figure = page.locator("[data-journal-figure]")
        atlas = figure.locator("img")
        atlas.evaluate("image => image.decode()")
        box = figure.bounding_box()
        assert box and box["height"] >= 135 and 0 <= box["y"] < height - box["height"], box
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        face, paw = ".yj-face", ".yj-writing-paw"
        first_pose = [sample(page, face), sample(page, paw)]
        page.wait_for_timeout(340)
        second_pose = [sample(page, face), sample(page, paw)]
        pause = page.get_by_role("button", name="Mettre Yoppo en pause")
        if reduced:
            assert first_pose == second_pose == ["none", "none"]
            expect(pause).to_be_hidden()
        else:
            assert all(a != b for a, b in zip(first_pose, second_pose)), (first_pose, second_pose)
            pause.click()
            stopped = [sample(page, face), sample(page, paw)]
            page.wait_for_timeout(180)
            assert stopped == [sample(page, face), sample(page, paw)]
            page.get_by_role("button", name="Relancer l’animation de Yoppo").click()
        page.screenshot(path=str(out / f"{engine}-{path.split('/')[3]}-{width}-welcome.png"))
        first.click()
        expect(page.get_by_role("heading", name=goal)).to_be_focused()
        expect(page.locator(".yj-receipt")).to_have_text(zero)
        if not reduced:
            arm = ".yj-arm-attention"
            position = sample(page, arm)
            page.wait_for_timeout(190)
            assert sample(page, arm) != position
            page.wait_for_timeout(150)
        page.screenshot(path=str(out / f"{engine}-{path.split('/')[3]}-{width}-writing.png"))
        page.get_by_role("button", name=travel, exact=True).click()
        expect(page.locator(".yj-receipt")).to_have_text(travel)
        page.locator("label").filter(has=page.get_by_role("radio", name=re.compile(r"^30 min\b"))).click()
        assert "30" in page.locator(".yj-receipt").inner_text()
        page.get_by_role("button", name="Retour", exact=True).click()
        expect(page.locator(".yj-receipt")).to_have_count(0)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    except Exception:
        page.screenshot(path=str(out / f"{engine}-{width}-failure.png"))
        print(page.locator("body").inner_text()[:1500], flush=True)
        raise
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
            check_journal(browser, engine, "/yo/langues/japonais/demarrer?lang=fr", question, "Je pars de zéro", "Voyager", 390, 750)
            if engine == "chromium" and os.environ.get("YO_JOURNAL_VIDEO"):
                record_opening(browser)
            print(f"PASS {engine}: opening, writing, pause, reduced motion, back, Italian and shared entry", flush=True)
        finally:
            browser.close()
