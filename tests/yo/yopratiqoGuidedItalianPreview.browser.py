"""Read-only public-preview smoke: no account, payment, or media fixture."""
import os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(os.environ.get('YO_QA_DIR','/tmp/yo-guided-qa'))
url=os.environ['YO_PREVIEW_URL']
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 context=browser.new_context(viewport={'width':390,'height':844})
 page=context.new_page();page.set_default_navigation_timeout(60000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""window.__yoPlaying=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){this.addEventListener('playing',()=>{window.__yoPlaying++},{once:true});return play.apply(this,args)};""")
 response=page.goto(url+'?lang=fr')
 assert response and response.status==200, f'Preview status {response.status if response else None}'
 shell=page.locator('[data-guided-italian]');shell.wait_for(timeout=60000)
 shell.get_by_role('button',name='Passer la visite',exact=True).click()
 page.screenshot(path=str(root/'deployed-map-mobile.png'),full_page=True)
 shell.get_by_role('button',name='Commencer ma mission',exact=True).click()
 shell.get_by_role('button',name=re.compile('^Écouter :')).first.click()
 page.wait_for_function('window.__yoPlaying > 0',timeout=30000)
 page.screenshot(path=str(root/'deployed-mission-mobile.png'),full_page=True)
 assert shell.locator('input,textarea').count()==0
 assert not errors,errors
 print('Public deployed French preview: HTTP 200, tour/start work, actual recorded clip reached playing; no audio fixture.',flush=True)
 browser.close()
