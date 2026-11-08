"""Exercise actual deployed audio across two Spanish lesson steps in native browsers.
No speech mocks, audio replacements, credentials or security-policy changes."""
import os, re, json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
out=Path('/tmp/yo-transition-live');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('YO_PREVIEW','https://pratiqo-gasbkrv86-marcandretheberge-dotcoms-projects.vercel.app')
reports=[]
def ck(page,text):page.get_by_role('button',name=text,exact=True).click()
def consent(page):
 banner=page.get_by_test_id('cookie-consent-banner')
 try:banner.wait_for(timeout=4000)
 except Exception:pass
 if banner.count() and banner.is_visible():banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Solo necesarias',re.I)).click()
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  browser=getattr(pw,engine).launch()
  context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
  page=context.new_page();page.set_default_timeout(18000)
  errors=[];media=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:media.append((r.status,r.url)) if '.mp3' in r.url else None)
  try:
   response=page.goto(base+'/yo/langues/espagnol/demarrer?lang=fr',wait_until='domcontentloaded',timeout=60000)
   assert response and response.status==200
   page.locator('[data-shared-welcome]').wait_for();consent(page)
   ck(page,'Je pars de zéro');ck(page,'Voyager')
   page.locator('[data-shared-pace="120"]').tap()
   ck(page,'Continuer');ck(page,'Commencer ici')
   tour=page.get_by_role('button',name=re.compile('^(Passer la visite|Skip the tour|Omitir la visita)
   first=page.locator('[data-intro-question]');first.wait_for()
   first_id=first.get_attribute('data-intro-question')
   assert first_id
   page.wait_for_timeout(1500)
   choices=first.locator('[data-answer-id]')
   if choices.first.is_disabled():
    assert page.locator('[data-audio-tap-required]').count()>0, 'No audio and no recovery message'
    first.get_by_role('button',name='Écouter le message').click()
    expect(choices.first).to_be_enabled(timeout=15000)
   answer=first.locator('[data-answer-id="hello"]')
   assert answer.count()==1
   answer.tap()
   page.wait_for_function('([old])=>document.querySelector("[data-intro-question]")?.getAttribute("data-intro-question")!==old',arg=[first_id],timeout=16000)
   second=page.locator('[data-intro-question]');second.wait_for()
   page.wait_for_timeout(2000)
   playback_state=second.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state')
   # When no compatible device voice is installed, the learner must still have an explicit recovery.
   if second.locator('[data-answer-id]').first.is_disabled():
    assert second.locator('[data-audio-tap-required]').count()>0, 'Second question silently blocked without tap recovery'
    second.get_by_role('button',name='Écouter le message').click()
    page.wait_for_timeout(2100)
    assert second.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state') != 'loading', 'Second player stuck loading'
    assert second.locator('[data-answer-id]').first.is_enabled() or second.get_by_role('button',name='Lire plutôt qu’écouter').count()>0
   assert not errors,errors
   reports.append({'engine':engine,'passed':True,'first':first_id,'second':second.get_attribute('data-intro-question'),'state':playback_state,'mp3Responses':media})
   print('PASS '+engine+': real first audio, automatic question transition, second audio or visible recovery',flush=True)
  except Exception as error:
   reports.append({'engine':engine,'passed':False,'error':str(error),'mp3Responses':media,'uncaught':errors})
   try:page.screenshot(path=str(out/(engine+'-fail.png')),full_page=True,timeout=3000)
   except Exception:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(reports,indent=2))
   context.close();browser.close()
))
   if tour.count():tour.first.click()
   ck(page,'Commencer ma mission')
   tour=page.get_by_role('button',name=re.compile('^(Passer la visite|Skip the tour|Omitir la visita)
   first=page.locator('[data-intro-question]');first.wait_for()
   first_id=first.get_attribute('data-intro-question')
   assert first_id
   page.wait_for_timeout(1500)
   choices=first.locator('[data-answer-id]')
   if choices.first.is_disabled():
    assert page.locator('[data-audio-tap-required]').count()>0, 'No audio and no recovery message'
    first.get_by_role('button',name='Écouter le message').click()
    expect(choices.first).to_be_enabled(timeout=15000)
   answer=first.locator('[data-answer-id="hello"]')
   assert answer.count()==1
   answer.tap()
   page.wait_for_function('([old])=>document.querySelector("[data-intro-question]")?.getAttribute("data-intro-question")!==old',arg=[first_id],timeout=16000)
   second=page.locator('[data-intro-question]');second.wait_for()
   page.wait_for_timeout(2000)
   playback_state=second.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state')
   # When no compatible device voice is installed, the learner must still have an explicit recovery.
   if second.locator('[data-answer-id]').first.is_disabled():
    assert second.locator('[data-audio-tap-required]').count()>0, 'Second question silently blocked without tap recovery'
    second.get_by_role('button',name='Écouter le message').click()
    page.wait_for_timeout(2100)
    assert second.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state') != 'loading', 'Second player stuck loading'
    assert second.locator('[data-answer-id]').first.is_enabled() or second.get_by_role('button',name='Lire plutôt qu’écouter').count()>0
   assert not errors,errors
   reports.append({'engine':engine,'passed':True,'first':first_id,'second':second.get_attribute('data-intro-question'),'state':playback_state,'mp3Responses':media})
   print('PASS '+engine+': real first audio, automatic question transition, second audio or visible recovery',flush=True)
  except Exception as error:
   reports.append({'engine':engine,'passed':False,'error':str(error),'mp3Responses':media,'uncaught':errors})
   try:page.screenshot(path=str(out/(engine+'-fail.png')),full_page=True,timeout=3000)
   except Exception:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(reports,indent=2))
   context.close();browser.close()
))
   if tour.count() and tour.first.is_visible():tour.first.click()
   ck(page,'Passer à la pratique')
   first=page.locator('[data-intro-question]');first.wait_for()
   first_id=first.get_attribute('data-intro-question')
   assert first_id
   page.wait_for_timeout(1500)
   choices=first.locator('[data-answer-id]')
   if choices.first.is_disabled():
    assert page.locator('[data-audio-tap-required]').count()>0, 'No audio and no recovery message'
    first.get_by_role('button',name='Écouter le message').click()
    expect(choices.first).to_be_enabled(timeout=15000)
   answer=first.locator('[data-answer-id="hello"]')
   assert answer.count()==1
   answer.tap()
   page.wait_for_function('([old])=>document.querySelector("[data-intro-question]")?.getAttribute("data-intro-question")!==old',arg=[first_id],timeout=16000)
   second=page.locator('[data-intro-question]');second.wait_for()
   page.wait_for_timeout(2000)
   playback_state=second.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state')
   # When no compatible device voice is installed, the learner must still have an explicit recovery.
   if second.locator('[data-answer-id]').first.is_disabled():
    assert second.locator('[data-audio-tap-required]').count()>0, 'Second question silently blocked without tap recovery'
    second.get_by_role('button',name='Écouter le message').click()
    page.wait_for_timeout(2100)
    assert second.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state') != 'loading', 'Second player stuck loading'
    assert second.locator('[data-answer-id]').first.is_enabled() or second.get_by_role('button',name='Lire plutôt qu’écouter').count()>0
   assert not errors,errors
   reports.append({'engine':engine,'passed':True,'first':first_id,'second':second.get_attribute('data-intro-question'),'state':playback_state,'mp3Responses':media})
   print('PASS '+engine+': real first audio, automatic question transition, second audio or visible recovery',flush=True)
  except Exception as error:
   reports.append({'engine':engine,'passed':False,'error':str(error),'mp3Responses':media,'uncaught':errors})
   try:page.screenshot(path=str(out/(engine+'-fail.png')),full_page=True,timeout=3000)
   except Exception:pass
   raise
  finally:
   (out/'report.json').write_text(json.dumps(reports,indent=2))
   context.close();browser.close()
