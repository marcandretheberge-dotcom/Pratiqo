"""From blank onboarding to earned first-mission evidence and reload/resume.

Uses the real route components and authored exercises. No learner record is
seeded. This is browser regression evidence, not physical-device certification.
"""
import json
import os
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("YO_JOURNAL_URL", "http://127.0.0.1:3246").rstrip("/")
OUT = Path(os.environ.get("YO_JOURNAL_QA_DIR", "/tmp/yoppo-journal-qa"))
OUT.mkdir(parents=True, exist_ok=True)
CATALOGUE = Path(os.environ.get("YO_QA_DIR", "/tmp/yo-shared-review")) / "courses.json"


def button(scope, name):
    return scope.get_by_role("button", name=name, exact=True)


def close_cinema(page, selector, action):
    film = page.locator(selector)
    expect(film).to_be_visible()
    button(film, action).click()
    expect(film).to_have_count(0)


def welcome(page, path):
    page.goto(BASE + path + "?lang=en", wait_until="domcontentloaded")
    button(page, "I’m starting from zero").click()
    button(page, "Travel").click()
    button(page, "Art").click()
    button(page, "Continue").click()
    page.locator("label").filter(has=page.get_by_role("radio", name=re.compile(r"^30 min\b"))).click()
    button(page, "Continue").click()
    recommendation = page.locator("[data-onboarding-recommendation], [data-shared-recommendation]")
    button(recommendation, "Start here").click()


def shared_state(page, language):
    return page.evaluate("key => JSON.parse(localStorage.getItem(key))", "yo.shared-intro.v1." + language)


def course_question(page, course, item):
    box = page.locator("[data-intro-question]")
    expect(box).to_have_attribute("data-intro-question", item["id"])
    if item["kind"] == "order":
        phrase = next(p for p in course["phrases"] if p["id"] == item["answer"])
        words = box.get_by_role("group", name="Available words", exact=True)
        for part in phrase["parts"]:
            # Identical repeated words are intentionally interchangeable in display.
            words.locator("button:not([disabled])").and_(button(words, part)).first.click()
        button(box, "Check sentence").click()
    else:
        answer = box.locator(f'[data-answer-id="{item["answer"]}"]')
        if item["kind"] in ("listen", "meaning", "number"):
            # Skip recorded listening without turning a transcript into unassisted credit.
            button(box, "Read instead of listen").click()
        expect(answer).to_be_enabled()
        page.wait_for_timeout(320)  # The player ignores a trailing tap after Continue.
        answer.press("Enter")
    expect(box.get_by_text("Well done!", exact=True)).to_be_visible()
    button(box, "Continue").click()


def shared(page, item):
    course, steps = item["course"], item["steps"]
    language, mission = course["language"], course["missions"][0]
    path = "/yo/langues/" + course["slug"] + "/demarrer"
    welcome(page, path)
    close_cinema(page, "[data-travel-film]", "Skip")
    journey = page.locator("[data-shared-world-map] .yo-shared-continue")
    expect(journey).to_have_count(1)
    journey.click()
    close_cinema(page, '[data-mission-film="mission-start"]', "Continue")
    progress = page.get_by_role("progressbar", name=mission["title"]["en"], exact=True)
    expect(progress).to_have_attribute("aria-valuenow", "0")
    first = [step for step in steps if step["mission"] == 0]
    for index, step in enumerate(first):
        expect(progress).to_have_attribute("aria-valuenow", str(index))
        kind = step["kind"]
        if kind == "recall":
            course_question(page, course, mission["preparation"][step["index"] - 1])
        elif kind == "exercise":
            course_question(page, course, mission["practice"][step["index"]])
        else:
            label = {"study": "Let’s practise", "words": "Enter the mission"}.get(kind, "Continue")
            button(page, label).click()
        if index == 0:
            expect(progress).to_have_attribute("aria-valuenow", "1")
            button(page, "Leave and save my place").click()
            saved = shared_state(page, language)
            assert saved["resume"] == "lesson" and saved["step"] == 1, saved
            page.reload(wait_until="domcontentloaded")
            expect(journey).to_be_visible(timeout=30000)
            journey.click()
            expect(progress).to_have_attribute("aria-valuenow", "1")
            expect(page.locator("[data-travel-film], [data-mission-film]")).to_have_count(0)
    close_cinema(page, '[data-mission-film="mission-success"]', "Continue")
    expect(page.get_by_role("heading", name=course["missions"][1]["title"]["en"], exact=True)).to_be_visible()
    state = shared_state(page, language)
    assert state["step"] == len(first), state
    assert {step["id"] for step in first}.issubset(state["visited"]), state
    assert {q["id"] for q in mission["practice"]}.issubset(state["completed"]), state
    assert not state["answers"] and not state["best"], "The first mission awarded final results"
    close_cinema(page, '[data-mission-film="mission-start"]', "Continue")
    button(page, "Leave and save my place").click()
    page.reload(wait_until="domcontentloaded")
    expect(journey).to_be_visible(timeout=30000)
    assert shared_state(page, language)["step"] == len(first)


def italian_exercise(page, activity):
    box = page.locator("[data-guided-game]")
    expect(box).to_have_attribute("data-guided-game", activity["id"])
    kind = activity["kind"]
    if kind == "listen" or activity.get("listeningText"):
        button(box, "Read instead of listen (with help)").click()
    if kind in ("type", "order"):
        words = box.get_by_role("group", name="Available words", exact=True)
        parts = activity["model"].split() if kind == "type" else activity["answer"]
        for part in parts:
            words.locator("button:not([disabled])").and_(button(words, part)).first.click()
        button(box, "Check").click()
    elif kind == "match":
        for pair in activity["pairs"]:
            button(box, pair["it"]).click()
            button(box, pair["meaning"]["en"]).click()
    else:
        turns = activity["turns"] if kind == "dialogue" else [activity]
        for index, turn in enumerate(turns):
            correct = next(option for option in turn["options"] if option["id"] == turn["correctId"])
            answer = button(box, correct.get("it") or correct["label"]["en"])
            page.wait_for_timeout(320)  # Ignore the same double-tap window as the real UI.
            answer.press("Enter")
            if index < len(turns) - 1:
                button(box, "Continue the conversation").click()
    expect(box.get_by_text("Well done!", exact=True)).to_be_visible()
    button(box, "Continue").click()



def italian(page):
    path = "/yo/langues/italien/parcours"
    welcome(page, path)
    expect(page.locator("[data-guided-italian]")).to_be_visible()
    close_cinema(page, "[data-travel-film]", "Skip")
    tour = button(page, "Skip the tour")
    if tour.is_visible():
        tour.click()
    travel = page.locator("[data-travel-continue]")
    expect(travel).to_have_count(1)
    travel.click()
    briefing = page.locator("[data-yoppo-mission-briefing]")
    button(briefing, "Start my mission").click()
    close_cinema(page, '[data-mission-film="mission-start"]', "Continue")
    progress = page.get_by_role("progressbar", name="Mission 1", exact=True)
    expect(progress).to_be_visible()
    expect(page.get_by_role("heading", name="Expressions before the mission", exact=True)).to_be_visible()
    button(page, "Next expression").click()
    expect(page.get_by_text("Expression 2 / 6", exact=True)).to_be_visible()
    heading = page.locator(".yo-mission-body h1").inner_text()
    counter = progress.get_attribute("aria-valuenow")
    button(page, "Leave and save my place").click()
    page.reload(wait_until="domcontentloaded")
    expect(travel).to_be_visible(timeout=30000)
    travel.click()
    expect(progress).to_have_attribute("aria-valuenow", counter)
    expect(page.locator(".yo-mission-body h1")).to_have_text(heading)
    expect(page.get_by_text("Expression 2 / 6", exact=True)).to_be_visible()
    expect(page.locator("[data-travel-film], [data-mission-film]")).to_have_count(0)

    while button(page, "Next expression").is_visible():
        button(page, "Next expression").click()
    button(page, "Let’s practise").click()
    ready = page.locator("[data-visual-ready]")
    for _ in range(3):
        recall = page.locator("[data-vocabulary-recall]")
        target = recall.get_attribute("data-vocabulary-recall")
        button(recall, "Read instead of listen").click()
        page.wait_for_timeout(320)
        recall.locator(f'[data-answer-id="{target}"]').press("Enter")
        expect(recall.get_by_text("Well done!", exact=True)).to_be_visible()
        button(recall, "Continue").click()
    button(ready, "Enter the mission").click()

    authored = json.loads((CATALOGUE.parent / "first-italian-mission.json").read_text())
    for step in authored["steps"][1:]:
        if step.get("activity"):
            italian_exercise(page, step["activity"])
        else:
            button(page.locator(".yo-mission-body"), "Continue").click()
    close_cinema(page, '[data-mission-film="mission-success"]', "Continue")
    close_cinema(page, '[data-mission-film="mission-start"]', "Continue")
    expect(page.get_by_role("progressbar", name="Mission 2", exact=True)).to_be_visible()
    button(page, "Leave and save my place").click()
    page.reload(wait_until="domcontentloaded")
    travel.click()
    expect(page.get_by_role("progressbar", name="Mission 2", exact=True)).to_be_visible()
    expect(page.locator("[data-travel-film], [data-mission-film]")).to_have_count(0)


def verify(browser, engine, item, width):
    language = item["course"]["language"] if item else "it"
    context = browser.new_context(viewport={"width": width, "height": 740}, locale="en-CA",
                                  is_mobile=True, has_touch=True, reduced_motion="reduce")
    page = context.new_page()
    page.set_default_timeout(15000)
    page.set_default_navigation_timeout(90000)
    context.add_init_script("""localStorage.setItem('yo.practice.auto-next.v1', 'off');""")
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        shared(page, item) if item else italian(page)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        assert not errors, errors
        page.screenshot(path=str(OUT / f"{engine}-first-mission-{language}-{width}.png"))
        print(f"PASS {engine} {language} {width}px: blank start and saved mission resume"
              + "; first mission complete", flush=True)
    except Exception:
        page.screenshot(path=str(OUT / f"{engine}-first-mission-{language}-{width}-failure.png"))
        print(page.locator("body").inner_text()[:3500], flush=True)
        raise
    finally:
        context.close()


if __name__ == "__main__":
    items = json.loads(CATALOGUE.read_text())
    selected = set(os.environ.get("YO_FIRST_MISSION_LANGUAGES", "").split(",")) - {""}
    assert len(items) == 7
    with sync_playwright() as playwright:
        for engine in os.environ.get("YO_JOURNAL_BROWSERS", "chromium,webkit").split(","):
            executable = os.environ.get("YO_CHROMIUM") if engine == "chromium" else None
            browser = getattr(playwright, engine).launch(executable_path=executable)
            try:
                for item in [None, *items]:
                    language = item["course"]["language"] if item else "it"
                    if not selected or language in selected:
                        verify(browser, engine, item, 320 if language in {"it", "fr-CA", "pt-BR", "zh-Hans"} else 393)
            finally:
                browser.close()
