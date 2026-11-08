"""Real unmodified Chromium/WebKit course transitions. No audio fixtures or security bypass."""
import os,re,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.getenv('YO_QA_DIR','/tmp/yo-audio-transition-live'));out.mkdir(parents=True,exist_ok=True)
base=os.environ['YO_PREVIEW_URL'].rstrip('/')
slug=os.environ.get('YO_LANGUAGE','anglais')
correct=['hello','name','well','tired','how','name','thanks']
results=[]
def click(p,name):p.get_by_role('button',name=name,exact=True).click()
def notices(p):
 banner=p.get_by_test_id('cookie-consent-banner')
 try:banner.wait_for(timeout=2200)
 except Exception:pass
 if banner.is_visible():banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Solo necesarias',re.I)).click()
 later=p.get_by_role('button',name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
 if later.count() and later.first.is_visible():later.first.click()
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  browser=getattr(pw,engine).launch()
  ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,color_scheme='dark',reduced_motion='reduce')
  p=ctx.new_page();p.set_default_timeout(15000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('crash',lambda:errors.append('page crash'))
  name=slug+'-'+engine
  try:
   italian=slug=='italien'
   response=p.goto(base+'/yo/langues/'+slug+('/parcours' if italian else '/demarrer')+'?lang=en',wait_until='domcontentloaded',timeout=60000)
   assert response and response.status==200,(response.status if response else None)
   p.locator('[data-yoppo-onboarding]' if italian else '[data-shared-welcome]').wait_for()
   notices(p);click(p,'I’m starting from zero');click(p,'Travel')
   if italian:p.locator('input[type=radio]').nth(2).locator('xpath=..').tap()
   else:p.locator('[data-shared-pace="120"]').tap()
   click(p,'Continue');click(p,'Start here')
   tour=p.get_by_role('button',name='Skip the tour',exact=True)
   if tour.count():tour.click()
   click(p,'Start my mission')
   p.locator('[data-vocabulary-study]' if italian else '[data-tap-guide]').wait_for()
   click(p,'Let’s practise')
   question=p.locator('[data-vocabulary-recall]' if italian else '[data-intro-question]')
   first=question.get_attribute('data-vocabulary-recall' if italian else 'data-intro-question')
   options=p.get_by_role('group',name='Answers')
   p.wait_for_timeout(2500)
   recovery=False
   if options.get_by_role('button').first.is_disabled():
    tap=p.locator('[data-audio-tap-required]')
    tap.wait_for(timeout=5000)
    assert 'listen' in tap.inner_text().lower(),tap.inner_text()
    recovery=True
    audio=question.get_by_role('button',name=re.compile('^Listen'))
    audio.first.click()
    p.wait_for_timeout(2500)
   if options.get_by_role('button').first.is_disabled():
    click(p,'Read instead of listen')
   assert options.get_by_role('button').first.is_enabled(),'Question stays inaccessible after audio / reading recovery'
   if italian:
    answer=first
   else:
    ix=int(first.rsplit('v',1)[-1]);answer=correct[ix]
   p.locator('[data-answer-id="'+answer+'"]').first.tap()
   p.wait_for_function("([selector,old])=>document.querySelector(selector)?.getAttribute(selector==='[data-vocabulary-recall]'?'data-vocabulary-recall':'data-intro-question')!==old",arg=['[data-vocabulary-recall]' if italian else '[data-intro-question]',first],timeout=12000)
   p.wait_for_timeout(2400)
   nextQuestion=p.locator('[data-vocabulary-recall]' if italian else '[data-intro-question]')
   assert nextQuestion.count()==1
   assert p.locator('[data-pronunciation-state]').count()+p.locator('[data-no-deck-swipe]').count()>0
   assert not errors,errors
   results.append({'case':name,'pass':True,'recoveryRequired':recovery})
   print('PASS '+name+': auto audio or visible retry, explicit recovery/read works, correct answer advances, next audio control present',flush=True)
  except Exception as e:
   results.append({'case':name,'pass':False,'error':str(e),'pageErrors':errors})
   try:p.screenshot(path=str(out/(name+'.png')),full_page=True,timeout=3500)
   except Exception:pass
   print('FAIL '+name+': '+str(e),flush=True)
  finally:
   (out/'results.json').write_text(json.dumps(results,indent=2))
   ctx.close();browser.close()
if any(not item['pass'] for item in results):raise SystemExit(1)
