"""Exercise real route components. Fixtures are opt-in for isolated CI, never live playback proof."""
import io, json, math, os, re, struct, wave
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
out=Path(os.environ.get('YO_QA_DIR','/tmp/yo-tap-review'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('YO_TAP_URL','http://127.0.0.1:3129').rstrip('/')
fixtures=os.environ.get('YO_TAP_FIXTURES')=='1'
slugs=os.environ.get('YO_LANGUAGE','anglais,francais-quebec,espagnol,allemand,portugais-bresil,japonais,mandarin,italien').split(',')
locales=os.environ.get('YO_LOCALES','fr,en,es').split(',')
engines=os.environ.get('YO_ENGINES','chromium,webkit').split(',')
labels={
 'fr':dict(zero='Je pars de zéro',goal='Voyager',next='Continuer',start='Commencer ici',begin='Commencer ma mission',practice='Passer à la pratique',read='Lire plutôt qu’écouter',book='Carnet de mots',close='Fermer',tools='Mes outils',automatic='Question suivante automatique'),
 'en':dict(zero='I’m starting from zero',goal='Travel',next='Continue',start='Start here',begin='Start my mission',practice='Let’s practise',read='Read instead of listen',book='Word notebook',close='Close',tools='My tools',automatic='Automatic next question'),
 'es':dict(zero='Empiezo de cero',goal='Viajar',next='Continuar',start='Empezar aquí',begin='Empezar mi misión',practice='Vamos a practicar',read='Leer en vez de escuchar',book='Cuaderno de palabras',close='Cerrar',tools='Mis herramientas',automatic='Siguiente pregunta automática'),
}
voices=[{'lang':l}for l in ['en-CA','fr-CA','es-MX','de-DE','pt-BR','ja-JP','zh-CN','it-IT']]
speech="""window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,pending:false,getVoices:()=>VOICES,cancel(){},addEventListener(){},removeEventListener(){},speak(u){u.onstart?.();setTimeout(()=>u.onend?.(),80)}}});""".replace('VOICES',json.dumps(voices))
b=io.BytesIO()
with wave.open(b,'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(1000*math.sin(2*math.pi*440*i/22050)))for i in range(6000)))
report=[]
def click(p,name):p.get_by_role('button',name=name,exact=True).click()
def notices(p):
 banner=p.get_by_test_id('cookie-consent-banner')
 try:banner.wait_for(timeout=2500)
 except Exception:pass
 if banner.is_visible():banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Nécessaires uniquement|Solo necesarias',re.I)).click()
 later=p.get_by_role('button',name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
 if later.count() and later.first.is_visible():later.first.click()
def target_id(p,italian=False):
 if italian:return p.locator('[data-vocabulary-recall]').get_attribute('data-vocabulary-recall')
 key=p.locator('[data-intro-question]').get_attribute('data-intro-question')
 return ['hello','name','well','tired','how','name','thanks'][int(key.rsplit(':',1)[-1])]
def ready(p,c):
 group=p.get_by_role('group',name=re.compile('^(Réponses|Answers|Respuestas)$'))
 # On a deployed headless browser, missing device speech is explicitly readable practice.
 if group.get_by_role('button').first.is_disabled():click(p,c['read'])
 return group
with sync_playwright() as pw:
 for engine in engines:
  browser=getattr(pw,engine).launch()
  for slug in slugs:
   for locale in locales:
    c=labels[locale];italian=slug=='italien';name=f'{slug}-{locale}-{engine}'
    ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,color_scheme='dark',reduced_motion='reduce')
    if fixtures:
     ctx.add_init_script(speech)
     for pattern in ['**/storage/v1/object/public/**','**/audio/yo/**']:ctx.route(pattern,lambda r:r.fulfill(status=200,content_type='audio/wav',body=b.getvalue()))
    p=ctx.new_page();p.set_default_timeout(20000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    try:
     route=f'/yo/langues/{slug}/'+('parcours'if italian else'demarrer')+f'?lang={locale}'
     r=p.goto(base+route,wait_until='domcontentloaded',timeout=60000);assert r and r.status==200
     p.locator('[data-yoppo-onboarding]'if italian else'[data-shared-welcome]').wait_for();notices(p)
     click(p,c['zero']);click(p,c['goal'])
     if italian:p.locator('input[type=radio]').nth(2).locator('xpath=..').tap()
     else:p.locator('[data-shared-pace="120"]').tap()
     click(p,c['next']);click(p,c['start'])
     skip=p.get_by_role('button',name=re.compile('^(Passer la visite|Skip the tour|Omitir la visita)$'))
     if skip.count():skip.first.click()
     click(p,c['begin']);p.locator('[data-vocabulary-study]'if italian else'[data-tap-guide]').wait_for()
     # Reading/teaching stays learner-paced.
     p.wait_for_timeout(1400);assert p.get_by_role('button',name=c['practice'],exact=True).is_visible()
     click(p,c['practice']);g=ready(p,c);assert g.locator('img').count()==0
     assert p.get_by_role('button',name=re.compile('^(Vérifier|Check|Comprobar)$')).count()==0
     current=p.locator('[data-vocabulary-recall]'if italian else'[data-intro-question]');old=current.get_attribute('data-vocabulary-recall'if italian else'data-intro-question')
     answer=target_id(p,italian)
     wrong=g.locator(f'button[data-answer-id]:not([data-answer-id="{answer}"])').first
     wrong.tap();assert 'bg-red-50' in (wrong.get_attribute('class')or'')
     p.wait_for_timeout(1500);assert current.get_attribute('data-vocabulary-recall'if italian else'data-intro-question')==old
     assert p.get_by_role('button',name=re.compile('^(Réessayer|Try again|Reintentar)$')).count()==0
     g.locator(f'[data-answer-id="{answer}"]').tap();assert 'bg-emerald-50'in(g.locator(f'[data-answer-id="{answer}"]').get_attribute('class')or'')
     if locale=='fr':p.screenshot(path=str(out/f'{name}-success.png'),full_page=True)
     p.wait_for_function("([sel,attr,old])=>document.querySelector(sel)?.getAttribute(attr)!==old",arg=['[data-vocabulary-recall]'if italian else'[data-intro-question]','data-vocabulary-recall'if italian else'data-intro-question',old])
     p.wait_for_timeout(350)
     # Notebook pause: no disappearing answer behind an open dialog.
     g=ready(p,c);answer=target_id(p,italian);old=p.locator('[data-vocabulary-recall]'if italian else'[data-intro-question]').get_attribute('data-vocabulary-recall'if italian else'data-intro-question')
     g.locator(f'[data-answer-id="{answer}"]').tap();click(p,c['book']);dialog=p.get_by_role('dialog');dialog.wait_for()
     p.wait_for_timeout(1600);assert p.locator('[data-vocabulary-recall]'if italian else'[data-intro-question]').get_attribute('data-vocabulary-recall'if italian else'data-intro-question')==old
     dialog.get_by_role('button',name=c['close'],exact=True).click()
     p.wait_for_function("([sel,attr,old])=>document.querySelector(sel)?.getAttribute(attr)!==old",arg=['[data-vocabulary-recall]'if italian else'[data-intro-question]','data-vocabulary-recall'if italian else'data-intro-question',old])
     p.wait_for_timeout(350)
     tools={'fr':'Yoppo et mes outils','en':'Yoppo and my tools','es':'Yoppo y mis herramientas'}[locale]if italian else c['tools']
     click(p,tools);d=p.get_by_role('dialog');setting=d.get_by_role('switch',name=c['automatic'],exact=True);assert setting.get_attribute('aria-checked')=='true';setting.click();d.get_by_role('button',name=c['close'],exact=True).click()
     g=ready(p,c);answer=target_id(p,italian);g.locator(f'[data-answer-id="{answer}"]').tap();p.get_by_role('button',name=c['next'],exact=True).wait_for()
     p.wait_for_timeout(1500);assert p.get_by_role('button',name=c['next'],exact=True).is_visible()
     if not italian:
      p.reload(wait_until='domcontentloaded');p.locator('[data-shared-course]').wait_for();click(p,{'fr':'Continuer ma mission','en':'Continue my mission','es':'Continuar mi misión'}[locale]);p.get_by_role('button',name=c['next'],exact=True).wait_for()
      assert p.locator(f'[data-answer-id="{answer}"]').get_attribute('aria-pressed')=='true'
     for width in [320,390,1280]:p.set_viewport_size({'width':width,'height':844});assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
     assert not errors,errors
     report.append({'case':name,'passed':True});print('PASS '+name+': tap feedback, direct retry, auto-next, reading pause, notebook pause, manual setting, responsive bounds.',flush=True)
    except Exception as e:
     p.screenshot(path=str(out/f'{name}-failure.png'),full_page=True);(out/f'{name}-failure.txt').write_text(str(e)+'\n'+p.locator('body').inner_text());(out/'report.json').write_text(json.dumps(report));raise
    finally:ctx.close()
  browser.close()
(out/'report.json').write_text(json.dumps(report,indent=2));print(f'{len(report)} browser cases passed. Audio fixtures: {fixtures}; no physical-device audio certification.',flush=True)
