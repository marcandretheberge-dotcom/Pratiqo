"""Read-only browser check of the deployed course and privacy page; no audio mocks."""
import os, re, json
from pathlib import Path
from playwright.sync_api import sync_playwright
base = os.environ['YO_BASE_URL']
root = Path('/tmp/yo-notices-live')
root.mkdir(parents=True, exist_ok=True)
results = []
copies = {
 'fr': dict(note='Préférences sur cet appareil uniquement.', badges=['Voix IA', 'Voix de l’appareil · aperçu'], steps=['Je pars de zéro', 'Voyager', 'Continuer', 'Commencer ici'], skip='Passer la visite', start='Commencer ma mission', build='Construire mon vocabulaire', answer='Personnage portant le prénom Nina', check='Vérifier', notebook='Carnet de mots', title='23. YoPratiqo : voix de synthèse et préférences', ai='intelligence artificielle'),
 'en': dict(note='Preferences stay on this device.', badges=['AI voice', 'Device voice · preview'], steps=['I’m starting from zero', 'Travel', 'Continue', 'Start here'], skip='Skip the tour', start='Start my mission', build='Build my vocabulary', answer='Character wearing the name Nina', check='Check', notebook='Word notebook', title='23. YoPratiqo: synthetic voices and preferences', ai='artificial intelligence'),
 'es': dict(note='Las preferencias quedan en este dispositivo.', badges=['Voz IA', 'Voz del dispositivo · vista previa'], steps=['Empiezo de cero', 'Viajar', 'Continuar', 'Empezar aquí'], skip='Omitir la visita', start='Empezar mi misión', build='Construir mi vocabulario', answer='Personaje con el nombre Nina', check='Comprobar', notebook='Cuaderno de palabras', title='23. YoPratiqo: voces sintéticas y preferencias', ai='inteligencia artificial'),
}
with sync_playwright() as pw:
 browser = pw.chromium.launch()
 for lang, c in copies.items():
  context = browser.new_context(viewport={'width': 390, 'height': 844}, locale={'fr': 'fr-CA', 'en': 'en-CA', 'es': 'es-UY'}[lang], reduced_motion='reduce')
  context.add_cookies([{'name': 'pratiqo-locale', 'value': lang, 'url': base}])
  context.add_init_script('localStorage.setItem("pratiqo-locale",' + json.dumps(lang) + ');')
  page = context.new_page()
  page.set_default_timeout(30000)
  errors = []
  page.on('pageerror', lambda e: errors.append(str(e)))
  page.add_init_script('''window.__yoCues=0;window.__yoRecorded=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.__yoCues++;return start.apply(this,args)};const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){this.addEventListener('playing',()=>window.__yoRecorded++,{once:true});return play.apply(this,args)};''')
  def dismiss_install():
   later = page.get_by_role('button', name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
   if later.count() and later.first.is_visible():
    later.first.click()
  try:
   response = page.goto(base + '/yo/langues/italien/parcours?lang=' + lang, timeout=60000)
   assert response and response.status == 200
   onboarding = page.locator('[data-yoppo-onboarding]')
   onboarding.wait_for()
   banner = page.get_by_test_id('cookie-consent-banner')
   banner.wait_for()
   banner.get_by_role('button', name=re.compile('^(Necessary only|Nécessaires seulement|Solo necesarias)$')).click()
   banner.wait_for(state='hidden')
   dismiss_install()
   assert c['note'] not in onboarding.inner_text()
   if lang == 'fr': page.screenshot(path=str(root / 'onboarding-fr.png'), full_page=True)
   for label in c['steps']:
    dismiss_install()
    onboarding.get_by_role('button', name=label, exact=True).click()
   shell = page.locator('[data-guided-italian]')
   shell.wait_for()
   for label in [c['skip'], c['start'], c['build']]:
    shell.get_by_role('button', name=label, exact=True).click()
   page.locator('[data-visual-vocabulary]').wait_for()
   page.wait_for_function('() => window.__yoRecorded > 0')
   for badge in c['badges']: assert shell.get_by_text(badge, exact=True).count() == 0
   shell.get_by_role('button', name=c['answer'], exact=True).click()
   shell.get_by_role('button', name=c['check'], exact=True).click()
   page.wait_for_function('() => window.__yoCues === 1')
   if lang == 'fr': page.screenshot(path=str(root / 'vocabulary-fr.png'), full_page=True)
   shell.get_by_role('button', name=c['notebook'], exact=True).click()
   dialog = page.get_by_role('dialog')
   dialog.wait_for()
   for badge in c['badges']: assert dialog.get_by_text(badge, exact=True).count() == 0
   page.keyboard.press('Escape')
   response = page.goto(base + '/legal/confidentialite', timeout=60000)
   assert response and response.status == 200
   heading = page.locator('h2#yopratiqo-voix-preferences')
   heading.wait_for()
   assert heading.inner_text() == c['title']
   assert page.locator('h2[id]').filter(has_text=re.compile(r'^\d+\. ')).count() == 23
   assert c['ai'] in page.locator('body').inner_text()
   links = page.locator('a[href="#yopratiqo-voix-preferences"]')
   assert links.count() >= 1
   links.first.click()
   page.wait_for_url('**#yopratiqo-voix-preferences')
   for width in [390, 1280]:
    page.set_viewport_size({'width': width, 'height': 900})
    assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth'), f'privacy overflow {lang} {width}'
   heading.scroll_into_view_if_needed()
   if lang == 'fr': page.screenshot(path=str(root / 'privacy-fr.png'), full_page=True)
   assert not errors, errors
   message = f'PASS {lang}: removed onboarding note and audio badges; real recording and success cue play; notebook opens; 23 privacy sections and new anchor work; no horizontal overflow or uncaught page errors.'
   print(message, flush=True)
   results.append(message)
  except Exception:
   page.screenshot(path=str(root / f'failure-{lang}.png'), full_page=True)
   (root / f'failure-{lang}.txt').write_text(page.locator('body').inner_text())
   raise
  finally:
   context.close()
 browser.close()
(root / 'results.json').write_text(json.dumps({'base': base, 'reviewed_sha': os.environ.get('YO_REVIEWED_SHA'), 'results': results}, indent=2))
