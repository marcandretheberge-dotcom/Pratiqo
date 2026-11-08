"""WebKit actual-preview native audio after the sound-cue sequence. No native API patches, media fixtures or accounts."""
import os,re,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.getenv("YO_QA_DIR","/tmp/yo-audio-sequence"));out.mkdir(parents=True,exist_ok=True)
base="https://pratiqo-g9p8vv4ag-marcandretheberge-dotcoms-projects.vercel.app"
report=[]
def button(p,t):p.get_by_role('button',name=t,exact=True).click()
def notices(p):
 banner=p.get_by_test_id('cookie-consent-banner')
 if banner.count() and banner.is_visible():
  banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Solo necesarias')).click()
 later=p.get_by_role('button',name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
 if later.count() and later.first.is_visible():later.first.click()
def setup(p):
 resp=p.goto(base+'/yo/langues/anglais/demarrer?lang=en',wait_until='domcontentloaded',timeout=60000);assert resp.status==200
 p.locator('[data-shared-welcome]').wait_for();notices(p)
 button(p,'I’m starting from zero');button(p,'Travel');p.locator('[data-shared-pace="120"]').tap();button(p,'Continue');button(p,'Start here')
def perform(p,with_effects):
 if with_effects:
  button(p,'My tools');dialog=p.get_by_role('dialog');dialog.wait_for()
  button(dialog,'Preview the soft wood sound')
  button(dialog,'Preview the other sounds')
  for kind in ['step','mission','stamp','unlock']:
   dialog.get_by_role('combobox',name='Event').select_option(kind)
   button(dialog,'Preview this effect');p.wait_for_timeout(400)
  slider=dialog.get_by_role('slider',name=re.compile('Effects volume'));slider.focus();p.keyboard.press('Home')
  dialog.get_by_role('switch',name='Success sounds',exact=True).click();button(dialog,'Close')
  p.reload(wait_until='domcontentloaded');p.locator('[data-shared-course]').wait_for()
 button(p,'Word notebook');dialog=p.get_by_role('dialog')
 row=dialog.locator('p[lang]').filter(has_text=re.compile(r'^Thank you!$')).first.locator('xpath=..')
 assert row.count()==1
 sound=row.get_by_role('button',name=re.compile('^Listen'))
 sound.click();row.locator('[data-pronunciation-state="playing"]').wait_for(timeout=15000)
 row.locator('[data-pronunciation-state="idle"]').wait_for(timeout=15000)
 row.get_by_role('button',name=re.compile('Slow down')).click()
 row.get_by_role('button',name=re.compile('^Listen')).click()
 row.locator('[data-pronunciation-state="playing"]').wait_for(timeout=15000)
 row.get_by_role('button',name=re.compile('^Listen')).wait_for(timeout=15000)
 button(dialog,'Close')
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  for effects in [False,True]:
   browser=getattr(pw,engine).launch();ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
   p=ctx.new_page();p.set_default_timeout(18000);errors=[]
   p.on('pageerror',lambda e:errors.append(str(e)));p.on('crash',lambda:errors.append('page crashed'))
   name=engine+('-effects-first' if effects else '-fresh')
   try:
    setup(p);perform(p,effects);assert not errors,errors
    report.append({'case':name,'pass':True});print('PASS '+name,flush=True)
   except Exception as e:
    report.append({'case':name,'pass':False,'error':str(e),'errors':errors});print('FAIL '+name+': '+str(e),flush=True)
    try:p.screenshot(path=str(out/(name+'.png')),timeout=2500)
    except Exception:pass
   finally:
    (out/'results.json').write_text(json.dumps(report,indent=2));ctx.close();browser.close()
if any(not r['pass'] for r in report):raise SystemExit(1)
