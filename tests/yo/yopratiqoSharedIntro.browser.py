"""Real components and assets. Audio/speech fixtures validate flow, not voice quality or availability."""
import io, json, math, os, re, struct, wave
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('YO_QA_DIR','/tmp/yo-shared-review'));out.mkdir(parents=True,exist_ok=True)
items=json.loads((out/'courses.json').read_text());base='http://127.0.0.1:3129'
report=[]
def log(s):print(s,flush=True);report.append(s)
buf=io.BytesIO()
with wave.open(buf,'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(1200*math.sin(2*math.pi*440*i/22050))) for i in range(6000)))
voices=json.dumps([{'lang':i['course']['speechLocale'],'name':i['course']['nativeName']} for i in items])
speech=f"""window.SpeechSynthesisUtterance=class {{constructor(text){{this.text=text}}}};
Object.defineProperty(window,'speechSynthesis',{{configurable:true,value:{{speaking:false,pending:false,getVoices:()=>{voices},cancel(){{}},addEventListener(){{}},removeEventListener(){{}},speak(u){{u.onstart?.();setTimeout(()=>u.onend?.(),25)}}}}}});"""
def click(p,s):p.get_by_role('button',name=s,exact=True).click()
def solve(p,c,e):
 box=p.locator('[data-intro-question]');box.wait_for();phrase=next(x for x in c['phrases'] if x['id']==e['answer'])
 if e['kind']=='listen':box.get_by_role('button',name='Listen to the message',exact=True).click()
 if e['kind']=='order':
  group=box.get_by_role('group',name='Available words',exact=True)
  for part in phrase['parts']:group.locator('button:not([disabled])').filter(has_text=re.compile('^'+re.escape(part)+'$')).first.click()
 else:box.get_by_role('button',name=re.compile('^'+re.escape(phrase['text']))).click()
 box.get_by_role('button',name='Check',exact=True).click();box.get_by_role('button',name='Continue',exact=True).click()
def context(browser):
 ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
 ctx.add_init_script(speech)
 for pattern in ['**/storage/v1/object/public/**','**/audio/yo/**']:ctx.route(pattern,lambda r:r.fulfill(status=200,content_type='audio/wav',body=buf.getvalue()))
 return ctx
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for item in items:
  c=item['course'];ctx=context(browser);p=ctx.new_page();p.set_default_timeout(20000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  try:
   p.goto(f"{base}/yo/langues/{c['slug']}/demarrer?lang=en",timeout=60000);p.locator('[data-shared-welcome]').wait_for(timeout=60000)
   p.evaluate("localStorage.setItem('legacy-sentinel','unchanged')")
   click(p,'I’m starting from zero');click(p,'Travel');assert p.get_by_role('button',name='Continue',exact=True).is_disabled()
   for n in [30,60,120,180,0,120]:
    p.locator(f'[data-shared-pace="{n}"]').tap();assert p.locator(f'input[type=radio][value="{n}"]').is_checked();assert p.locator('input[type=radio]:checked').count()==1
   click(p,'Continue');assert p.get_by_role('combobox').count()==0;assert len(p.locator('[data-shared-recommendation]').inner_text())<350
   p.screenshot(path=str(out/f"{c['slug']}-welcome.png"),full_page=True)
   click(p,'Start here');click(p,'Word notebook');dialog=p.get_by_role('dialog');dialog.wait_for()
   assert dialog.get_by_text(c['phrases'][-1]['text'],exact=True).count()==1
   for _ in range(10):p.keyboard.press('Tab');assert p.evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)")
   p.keyboard.press('Escape');click(p,'Start my mission')
   for step in item['steps']:
    m=c['missions'][step['mission']]
    if step['kind']=='visual':
     v=m['visuals'][step['index']%len(m['visuals'])];g=p.get_by_role('group',name='Four images',exact=True);assert g.locator('button').count()==4
     for image in g.locator('img').all():image.wait_for();p.wait_for_function('(img)=>img.complete&&img.naturalWidth>0',arg=image.element_handle())
     if step['mission']==0 and step['index']==0:
      wrong=next(x for x in v['pictures'] if x['id']!=v['answer']);g.get_by_role('button',name=wrong['alt']['en'],exact=True).click();click(p,'Check');assert p.get_by_role('button',name='Continue',exact=True).count()==0;click(p,'Try again')
     correct=next(x for x in v['pictures'] if x['id']==v['answer']);g.get_by_role('button',name=correct['alt']['en'],exact=True).click()
     if step['mission']==0 and step['index']==1:p.screenshot(path=str(out/f"{c['slug']}-images.png"),full_page=True)
     click(p,'Check');click(p,'Continue')
    elif step['kind']=='exercise':solve(p,c,m['practice'][step['index']])
    else:
     if step['kind']=='concept' and step['mission']==2:p.screenshot(path=str(out/f"{c['slug']}-grammar.png"),full_page=True)
     click(p,'Enter the mission' if step['kind']=='words' else 'Continue')
    assert p.locator('textarea,input[type=text],input[type=checkbox]').count()==0
   for e in c['final']:solve(p,c,e)
   p.get_by_role('heading',name='Your stamp is in your passport!',exact=True).wait_for();click(p,'Back to my journey')
   assert p.get_by_text('250 learning points',exact=True).count()==1
   before=p.evaluate(f"localStorage.getItem('yo.shared-intro.v1.{c['language']}')")
   p.reload();p.locator('[data-shared-course]').wait_for();assert p.get_by_text('250 learning points',exact=True).count()==1
   assert p.evaluate(f"localStorage.getItem('yo.shared-intro.v1.{c['language']}')")==before
   assert p.evaluate("localStorage.getItem('legacy-sentinel')")=='unchanged'
   for width in [320,390,1280]:
    p.set_viewport_size({'width':width,'height':844});assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for locale in ['fr','en','es']:
    p.goto(f"{base}/yo/langues/{c['slug']}/demarrer/vocabulaire?lang={locale}")
    p.locator('[data-shared-print]').wait_for();assert p.locator('tbody tr').count()==len(c['phrases'])+len(c['glossary'])
    assert p.locator('td[lang]').filter(has_text=re.compile('^'+re.escape(c['phrases'][-1]['text']))).count()==1
   assert not errors,errors
   log(c['slug']+': complete 3-mission flow, 4 images, wrong-answer guard, 15 exercises, final, 250 points, preserved legacy/reload, 3 translated banks and responsive widths passed.')
  except Exception:
   p.screenshot(path=str(out/f"failure-{c['slug']}.png"),full_page=True);(out/f"failure-{c['slug']}.txt").write_text(p.locator('body').inner_text());raise
  finally:ctx.close()
 browser.close()
 # WebKit touch, readable target scripts and concise onboarding across both additional interface languages.
 browser=pw.webkit.launch()
 for item in items:
  c=item['course']
  for locale,zero,goal,nxt,start,begin,images in [('fr','Je pars de zéro','Voyager','Continuer','Commencer ici','Commencer ma mission','Quatre images'),('es','Empiezo de cero','Viajar','Continuar','Empezar aquí','Empezar mi misión','Cuatro imágenes')]:
   ctx=context(browser);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.goto(f"{base}/yo/langues/{c['slug']}/demarrer?lang={locale}",timeout=60000);p.locator('[data-shared-welcome]').wait_for();click(p,zero);click(p,goal)
   p.locator('[data-shared-pace="120"]').tap();assert p.locator('input[type=radio][value="120"]').is_checked();click(p,nxt)
   assert p.get_by_role('combobox').count()==0
   box=p.locator('[data-shared-guide]').bounding_box();assert box and box['y']>=0
   click(p,start);click(p,begin);assert p.get_by_role('group',name=images,exact=True).locator('button').count()==4
   for width in [320,390]:p.set_viewport_size({'width':width,'height':844});assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert not errors,errors;ctx.close()
  log(c['slug']+': WebKit touch and four-image entry passed in French and Spanish.')
 browser.close()
(out/'report.json').write_text(json.dumps(report,indent=2))
