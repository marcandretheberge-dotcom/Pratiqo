"""Run against the full preview app. Start from its learner-facing language card."""
import os
import re
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

base = os.environ.get("YO_PREVIEW_URL", "http://127.0.0.1:3264").rstrip("/")
path = "/yo/langues/francais-quebec"
legacy_key = "yo.shared-intro.v1.fr-CA"


def exercise(browser):
    ctx = browser.new_context(is_mobile=True, has_touch=True, viewport={"width": 375, "height": 812},
                              reduced_motion="reduce", locale="fr-CA", service_workers="block")
    errors, blocked = [], []
    def route(request):
        url = urlsplit(request.request.url)
        if url.netloc != urlsplit(base).netloc or (url.path.startswith("/api/") and url.path != "/api/geo"):
            blocked.append(url.path)
            request.abort()
        else:
            request.continue_()
    ctx.route("**/*", route)
    ctx.add_init_script("""window.__pilotMic = 0;
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        window.__pilotMic++; throw Error('Microphone requested');
      };""")
    page = ctx.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_default_timeout(20000)
    banner = page.get_by_test_id("cookie-consent-banner")
    page.add_locator_handler(banner, lambda: banner.get_by_role("button", name=re.compile("Nécessaires|Necessary")).click())
    install = page.get_by_label("Installer Pratiqo", exact=True)
    page.add_locator_handler(install, lambda: install.get_by_role("button", name="Pas maintenant", exact=True).first.click())

    def button(name):
        return page.get_by_role("button", name=name, exact=True)

    def entry():
        page.goto(base + "/yo", wait_until="domcontentloaded")
        page.get_by_role("link", name=re.compile("^Français québécois")).click()
        expect(page).to_have_url(re.compile(path + "/demarrer"))

    def select_goal():
        page.get_by_role("button", name=re.compile("^Francisation au Québec")).click()
        expect(page.get_by_role("heading", name="Donner mon nom et mes coordonnées")).to_be_focused()

    def answer(name):
        page.get_by_role("radio", name=name, exact=True).check()
        button("Vérifier").click()

    def value(key):
        return page.evaluate("k => localStorage.getItem(k)", key)

    # Verify server HTML with JavaScript disabled, including both resource directions.
    seo = browser.new_context(java_script_enabled=False)
    html = seo.new_page()
    html.goto(base + path)
    expect(html).to_have_title("Francisation au Québec en ligne | YoPratiqo")
    expect(html.locator('meta[name="robots"]')).to_have_attribute("content", re.compile("noindex"))
    expect(html.locator('meta[property="og:title"]')).to_have_attribute("content", html.title())
    expect(html.locator('meta[name="description"]')).to_have_attribute("content", re.compile("autonomie"))
    expect(html.locator('link[rel="canonical"]')).to_have_attribute("href", re.compile(path + "$"))
    expect(html.get_by_role("heading", level=1)).to_have_text("Francisation au Québec en ligne")
    expect(html.get_by_text(re.compile("^Parcours indépendant"))).to_be_visible()
    expect(html.locator('a[href="/francisation"]')).to_be_visible()
    expect(html.locator('a[href="https://www.quebec.ca/education/apprendre-le-francais"]')).to_be_visible()
    html.locator('a[href="/francisation"]').click()
    expect(html.get_by_role("link", name="Trouver un professeur de français").first).to_be_visible()
    assert html.locator(f'a[href="{path}"]').count()
    seo.close()

    entry()
    button("Je pars de zéro").click()
    for name in ("Voyager", "Famille et amis", "Travail ou études", "Parler au quotidien", "Apprendre en profondeur"):
        expect(button(name)).to_be_visible()
    select_goal()
    page.go_back()
    expect(button("Travail ou études")).to_be_visible()
    select_goal()
    button("Commencer").focus()
    page.keyboard.press("Enter")
    expect(page.get_by_role("heading", name="Repérer le numéro corrigé")).to_be_focused()
    button("Voir un indice").click()
    answer("418 555-0116")
    expect(page.get_by_role("status").filter(has_text="À revoir")).to_be_visible()
    answer("418 555-0161")
    page.reload()
    button("Continuer").click()
    expect(page.get_by_role("radio", name="418 555-0161")).to_be_checked()
    button("Continuer").click()
    button("Retour à la mission").click()
    button("Retour aux langues").click()
    entry()
    button("Continuer").click()
    expect(page.get_by_role("heading", name="Vérifier le nom")).to_be_visible()
    answer("C’est Leduc, L-E-D-U-C. Vous pouvez me le répéter ?")
    button("Continuer").click()
    answer("Sam Roy. Mon courriel est sam.roy@example.org. On vérifie ensemble ?")
    button("Continuer").click()
    expect(page.get_by_text(re.compile("Tu avais choisi « 418 555-0116"))).to_be_visible()
    answer("418 555-0161")
    button("Continuer").click()
    expect(page.get_by_role("heading", name="Mission terminée")).to_be_focused()
    assert value(legacy_key) is None
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1 && !window.__pilotMic")
    assert not blocked, blocked

    # Complete ordinary onboarding and enter its first lesson via real controls.
    button("Changer d’objectif").click()
    button("Travail ou études").click()
    button("Continuer").click()
    page.get_by_role("radio", name="À mon rythme").check()
    button("Continuer").click()
    button("Commencer ici").click()
    world = page.locator("[data-shared-world-map]")
    expect(world).to_be_visible()
    def skip_films():
        for _ in range(5):
            page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
            film = page.locator("[data-travel-film], [data-mission-film]")
            if not film.count():
                return
            film.first.get_by_role("button", name=re.compile("Passer|Ignorer")).click()
    skip_films()
    world.get_by_role("button", name="Continuer", exact=True).click()
    expect(page.get_by_role("progressbar")).to_be_visible()
    skip_films()
    button("Entrer dans la mission").click()
    legacy = value(legacy_key)
    assert legacy
    button("Mes outils").click()
    button("Ajuster mon départ et mon rythme").click()
    button("Je pars de zéro").click()
    select_goal()
    button("Continuer").click()
    expect(page.get_by_role("heading", name="Mission terminée")).to_be_visible()
    button("Refaire la mission en pratique").click()
    expect(page.get_by_role("heading", name="Repérer le numéro corrigé")).to_be_visible()
    assert value(legacy_key) == legacy
    button("Changer d’objectif").click()
    button("Garder mon parcours").click()
    expect(page.get_by_role("progressbar")).to_be_visible()
    assert value(legacy_key) == legacy
    assert not errors, errors
    ctx.close()


with sync_playwright() as pw:
    for engine in os.environ.get("YO_BROWSERS", "chromium,webkit").split(","):
        binary = os.environ.get("YO_" + engine.upper() + "_EXECUTABLE")
        browser = getattr(pw, engine).launch(executable_path=binary)
        try:
            exercise(browser)
            print(f"PASS {engine}: SEO HTML, learner entry, resume, transfer, review and existing French lesson", flush=True)
        finally:
            browser.close()
