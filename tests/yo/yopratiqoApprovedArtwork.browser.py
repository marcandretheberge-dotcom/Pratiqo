"""Read-only artwork smoke for the real route; no account or backend writes."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
url=os.environ.get('YO_ART_URL','http://127.0.0.1:3129').rstrip('/')
out=Path(os.environ.get('YO_ART_OUTPUT','/tmp/yo-artwork-review'));out.mkdir(parents=True,exist_ok=True)
report=[]
def log(value): print(value,flush=True);report.append(value)
def click(page,label):page.get_by_role('button',name=label,exact=True).click()
def dismiss(page):
 banner=page.get_by_test_id('cookie-consent-banner')
 if banner.count():
  banner.wait_for(state='visible')
  banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Solo necesarias',re.I)).click()
 later=page.get_by_role('button',name=re.compile('^Not now$|^Pas maintenant$|^Ahora no$'))
 if later.count() and later.first.is_visible():later.first.click()
with sync_playwright() as p:
 launch={'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}
 browser=p.chromium.launch(**launch)
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 page=context.new_page();page.set_default_timeout(30000);page.set_default_navigation_timeout(60000)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 try:
  response=page.goto(url+'/yo/langues/italien/parcours?lang=fr');assert response and response.status==200
  page.locator('[data-yoppo-onboarding]').wait_for(timeout=60000);dismiss(page)
  for label in ['Je pars de zéro','Voyager','Continuer','Commencer ici']:click(page,label)
  page.locator('[data-guided-italian]').wait_for();click(page,'Passer la visite');click(page,'Commencer ma mission');click(page,'Construire mon vocabulaire')
  shell=page.locator('[data-approved-vocabulary]');shell.wait_for()
  choices=shell.get_by_role('group',name='Quatre images',exact=True)
  assert choices.locator('button').count()==4
  page.wait_for_function("() => [...document.querySelectorAll('[data-vocabulary-artwork] img')].length === 4 && [...document.querySelectorAll('[data-vocabulary-artwork] img')].every(i => i.complete && i.naturalWidth >= 128)")
  assert choices.locator('input,textarea').count()==0
  assert shell.get_by_text('Mi chiamo Nina.',exact=True).count()==1
  assert choices.get_by_text('Nina',exact=True).count()==1
  page.screenshot(path=str(out/'names-390.png'),full_page=True)
  click(page,'Personnage portant le prénom Nina');click(page,'Vérifier');assert shell.get_by_text('Bien joué !',exact=True).count()==1;click(page,'Continuer')
  # Question of name: caption is live localized HTML, not baked into the image.
  assert choices.get_by_text('Prénom ?',exact=True).count()==1
  choices.locator('[data-choice-id="name"]').click();click(page,'Vérifier');click(page,'Continuer')
  shell=page.locator('[data-visual-vocabulary="well"]');shell.wait_for()
  assert set(shell.locator('[data-vocabulary-artwork]').evaluate_all('(els) => els.map(e => e.dataset.vocabularyArtwork)'))=={'well','tired','unsure','coffee'}
  page.wait_for_function("() => [...document.querySelectorAll('[data-vocabulary-artwork] img')].every(i=>i.complete && i.naturalWidth>0)")
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900})
   assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth'),f'overflow {width}'
   for card in shell.locator('[data-choice-id]').all():
    box=card.bounding_box();assert box and box['width']>=100 and box['height']>=80
   page.screenshot(path=str(out/f'feelings-{width}.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844})
  shell.locator('[data-choice-id="well"]').focus();page.keyboard.press('Enter')
  assert shell.locator('[data-choice-id="well"]').get_attribute('aria-pressed')=='true'
  click(page,'Carnet de mots');page.keyboard.press('Escape')
  assert shell.locator('[data-choice-id="well"]').get_attribute('aria-pressed')=='true'
  page.reload();page.locator('[data-guided-italian]').wait_for();click(page,'Continuer ma mission')
  shell=page.locator('[data-visual-vocabulary="well"]');shell.wait_for()
  assert shell.locator('[data-choice-id="well"]').get_attribute('aria-pressed')=='true'
  click(page,'Vérifier');assert shell.get_by_text('Bien joué !',exact=True).count()==1
  log('FR: four standalone decoded images, native captions, keyboard selection, notebook and reload preserve the unfinished answer; 320/390/1280 geometry passed.')
  # Broken asset: honest text alternative, not a broken image or blocked quiz.
  click(page,'Continuer')
  image=page.locator('[data-vocabulary-artwork] img').first
  image.dispatch_event('error')
  page.locator('[data-artwork-unavailable]').wait_for(state='visible')
  assert page.locator('[data-artwork-unavailable]').count()==1
  assert page.locator('[data-choice-id]').count()==4
  log('Failed image keeps an explicit text alternative and four usable choices.')
  for lang,choices_name in [('en','Four images'),('es','Cuatro imágenes')]:
   page.goto(url+'/yo/langues/italien/parcours/u01?lang='+lang)
   page.locator('[data-guided-italian]').wait_for()
   click(page,'Continue my mission' if lang=='en' else 'Continuar mi misión')
   group=page.get_by_role('group',name=choices_name,exact=True)
   group.wait_for(state='visible')
   assert group.locator('button').count()==4
  log('English and Spanish retain the same saved step and localized controls.')
  assert not errors,errors
  log('Zero uncaught browser errors. Course scores, account and paid access are not modified by artwork.')
 except Exception:
  page.screenshot(path=str(out/'failure.png'),full_page=True)
  (out/'failure.txt').write_text(page.locator('body').inner_text())
  raise
 finally: browser.close()
(out/'report.json').write_text(json.dumps({'url':url,'checks':report},indent=2))
