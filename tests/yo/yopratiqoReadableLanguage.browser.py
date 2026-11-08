"""Readability in actual course routes; synthetic browser-local drafts only."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(os.environ.get('YO_QA_DIR','/tmp/yo-readable-review'));root.mkdir(parents=True,exist_ok=True)
data=json.loads((root/'personalized-data.json').read_text())
base='http://127.0.0.1:3129/yo/langues/italien/parcours/u01'
report=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for locale,resume,cont,notebook,close in [('fr','Continuer ma mission','Continuer','Carnet de mots','Fermer'),('en','Continue my mission','Continue','Word notebook','Close'),('es','Continuar mi misión','Continuar','Cuaderno de palabras','Cerrar')]:
  for li in range(3):
   index=next(i for i,s in enumerate(data['steps']) if s['lesson']==li and s['stage']=='language')
   state={'version':1,'resetAt':0,'step':index,'seen':[s['id'] for s in data['steps'][:index] if not s.get('activity')],'view':'map','resumeView':'mission','game':{'selected':None,'tiles':[],'pairs':[],'left':None,'turn':0,'feedback':None,'assisted':False,'heard':False,'transcript':False,'complete':False},'quizIndex':0,'answers':[],'runStartedAt':0,'submitted':False}
   profile={'version':1,'language':'it','experience':'conversation','goal':'thorough','weeklyMinutes':60,'startUnitId':'u01','placement':'manual','reviewUnitIds':[],'updatedAt':0}
   ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
   seed={'yo.learning-profile.v1.it':profile,'yo.italian.guided.v2.u01':state}
   ctx.add_init_script("for (const [k,v] of Object.entries("+json.dumps(seed)+")) { if (!localStorage.getItem(k)) localStorage.setItem(k,JSON.stringify(v)); } localStorage.setItem('yo.italian.guided.tour.v1','seen');")
   page=ctx.new_page();page.set_default_timeout(30000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    page.goto(base+'?lang='+locale,timeout=60000)
    page.get_by_role('button',name=resume,exact=True).click()
    explanation=page.locator('[data-language-explanation]');explanation.wait_for()
    assert explanation.get_attribute('data-language-explanation')==data['unit']['lessons'][li]['id']
    assert explanation.locator('[data-language-concept]').count()==5
    assert explanation.locator('input,textarea,button').count()==0
    assert explanation.locator('details[open]').count()==0
    canonical_before=page.evaluate("() => localStorage.getItem('yo.italian.course.first-meeting.v2')")
    summary=explanation.locator('summary');summary.focus();page.keyboard.press('Enter')
    assert explanation.locator('details[open]').count()==1
    assert page.evaluate("() => localStorage.getItem('yo.italian.course.first-meeting.v2')")==canonical_before
    page.get_by_role('button',name=notebook,exact=True).click();page.get_by_role('dialog').get_by_role('button',name=close,exact=True).click()
    assert explanation.locator('details[open]').count()==1
    for width in [320,390,1280]:
     page.set_viewport_size({'width':width,'height':844})
     assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth'),(locale,li,width)
    summary.click();page.set_viewport_size({'width':390,'height':844})
    if locale=='fr':explanation.screenshot(path=str(root/f'grammar-mission-{li+1}-fr.png'))
    page.get_by_role('main').get_by_role('button',name=cont,exact=True).click()
    assert page.locator('[data-language-explanation]').count()==0
    assert page.evaluate("() => JSON.parse(localStorage.getItem('yo.italian.guided.v2.u01')).step")==index+1
    # Normal navigation may update resume, never learning outcomes or stamps.
    before=json.loads(canonical_before or '{}')
    after=json.loads(page.evaluate("() => localStorage.getItem('yo.italian.course.first-meeting.v2')") or '{}')
    for field in ['activities','assessments','productions']:assert after.get(field,{})==before.get(field,{})
    assert not errors,errors
    report.append(f'{locale}, mission {li+1}: readable explanation, keyboard details, notebook continuity, 320/390/1280 layout, unchanged scoring and normal next step PASS')
   except Exception:
    page.screenshot(path=str(root/f'failure-{locale}-{li}.png'),full_page=True)
    raise
   finally:ctx.close()
 browser.close()
(root/'readability-report.json').write_text(json.dumps(report,indent=2))
for line in report:print(line,flush=True)
