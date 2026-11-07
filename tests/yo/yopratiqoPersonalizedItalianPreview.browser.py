"""Read-only public preview check. No account, fixture, payment or security-policy changes."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(os.environ.get('YO_QA_DIR','/tmp/yo-guided-qa'));root.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch();page=browser.new_page(viewport={'width':390,'height':844});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(30000)
 page.add_init_script("window.__yoPlaying=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){this.addEventListener('playing',()=>{window.__yoPlaying++},{once:true});return play.apply(this,args)};")
 try:
  response=page.goto(os.environ['YO_PREVIEW_URL']+'?lang=fr',timeout=60000);assert response and response.status==200
  onb=page.locator('[data-yoppo-onboarding]');onb.wait_for(timeout=60000)
  for label in ['Je pars de zéro','Voyager','Continuer','Commencer ici']:onb.get_by_role('button',name=label,exact=True).click()
  shell=page.locator('[data-guided-italian]');shell.wait_for();shell.get_by_role('button',name='Passer la visite',exact=True).click()
  page.screenshot(path=str(root/'deployed-map-fr.png'),full_page=True)
  shell.get_by_role('button',name='Commencer ma mission',exact=True).click();shell.get_by_role('button',name='Construire mon vocabulaire',exact=True).click()
  page.wait_for_function('() => window.__yoPlaying > 0',timeout=30000)
  assert shell.get_by_role('group',name='Quatre images',exact=True).locator('button').count()==4
  page.screenshot(path=str(root/'deployed-vocabulary-fr.png'),full_page=True)
  assert not errors,errors
  print('Deployed French preview: HTTP 200, onboarding and visual preparation work; an existing real recorded clip reached playing. No fixture or CSP bypass.',flush=True)
 except Exception:
  page.screenshot(path=str(root/'preview-failure.png'),full_page=True)
  (root/'preview-failure.txt').write_text(page.locator('body').inner_text());raise
 finally:browser.close()
