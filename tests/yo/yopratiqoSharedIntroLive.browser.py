"""Real immutable-preview smoke. No account, media fixture, voice stub or security bypass."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(os.environ['YO_QA_DIR']);root.mkdir(parents=True,exist_ok=True)
base=os.environ['YO_SHARED_URL'].rstrip('/')
files=sorted(Path('lib/yo/shared/content').glob('*.json'))
labels={
 'fr':('Je pars de zéro','Voyager','Continuer','Commencer ici','Carnet de mots','Fermer','Commencer ma mission','Quatre images','Vérifier','Quitter et garder ma place','Continuer ma mission'),
 'en':('I’m starting from zero','Travel','Continue','Start here','Word notebook','Close','Start my mission','Four images','Check','Leave and save my place','Continue my mission'),
 'es':('Empiezo de cero','Viajar','Continuar','Empezar aquí','Cuaderno de palabras','Cerrar','Empezar mi misión','Cuatro imágenes','Comprobar','Salir y guardar mi lugar','Continuar mi misión'),
}
report=[]
def notices(page):
 banner=page.get_by_test_id('cookie-consent-banner')
 try:banner.wait_for(timeout=5000)
 except Exception:pass
 if banner.is_visible():
  banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Nécessaires uniquement|Solo necesarias',re.I)).click()
 later=page.get_by_role('button',name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
 if later.count() and later.first.is_visible():later.first.click()
def click(page,name):page.get_by_role('button',name=name,exact=True).click()
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  browser=getattr(pw,engine).launch()
  for file in files:
   course=json.loads(file.read_text());slug=course['slug']
   for locale,(zero,travel,nxt,start,notebook,close,begin,images,check,leave,resume) in labels.items():
    ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
    page=ctx.new_page();page.set_default_timeout(20000);errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    name=f'{slug}-{locale}-{engine}'
    try:
     response=page.goto(f'{base}/yo/langues/{slug}/demarrer?lang={locale}',timeout=60000)
     assert response and response.status==200
     page.locator('[data-shared-welcome]').wait_for();notices(page)
     click(page,zero);click(page,travel)
     assert page.get_by_role('button',name=nxt,exact=True).is_disabled()
     page.locator('[data-shared-pace="120"]').tap()
     assert page.locator('input[type=radio][value="120"]').is_checked()
     click(page,nxt)
     assert page.get_by_role('combobox').count()==0
     assert len(page.locator('[data-shared-recommendation]').inner_text())<450
     page.locator('[data-shared-guide] img').wait_for()
     if locale=='fr' and engine=='webkit':page.screenshot(path=str(root/f'{name}-welcome.png'),full_page=True)
     click(page,start);page.locator('[data-shared-course]').wait_for()
     profile=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).profile',f"yo.shared-intro.v1.{course['language']}")
     assert profile['minutes']==120 and profile['entry']==0 and profile['goal']=='travel'
     click(page,notebook);dialog=page.get_by_role('dialog');dialog.wait_for()
     assert dialog.get_by_text(course['phrases'][-1][1],exact=True).count()==1
     dialog.get_by_role('button',name=close,exact=True).click()
     click(page,begin);group=page.get_by_role('group',name=images,exact=True)
     assert group.locator('button').count()==4
     for image in group.locator('img').all():page.wait_for_function('(img)=>img.complete&&img.naturalWidth>0',arg=image.element_handle())
     answer=course['names'][0]['alt'][locale]
     group.get_by_role('button',name=answer,exact=True).tap()
     click(page,check);assert page.get_by_role('button',name=nxt,exact=True).is_enabled()
     if locale=='fr' and engine=='webkit':page.screenshot(path=str(root/f'{name}-images.png'),full_page=True)
     click(page,leave);page.wait_for_load_state('networkidle')
     page.reload();page.locator('[data-shared-course]').wait_for();page.wait_for_load_state('networkidle')
     assert page.locator('[data-shared-welcome]').count()==0
     # Validated but not yet continued first task retains its exact checked draft.
     begin_button=page.get_by_role('button',name=begin,exact=True)
     (begin_button if begin_button.count() else page.get_by_role('button',name=resume,exact=True)).click()
     assert page.get_by_role('button',name=nxt,exact=True).is_enabled()
     assert page.get_by_role('button',name=answer,exact=True).get_attribute('aria-pressed')=='true'
     bank=ctx.new_page();r=bank.goto(f'{base}/yo/langues/{slug}/demarrer/vocabulaire?lang={locale}',timeout=60000)
     assert r and r.status==200;bank.locator('[data-shared-print]').wait_for()
     assert bank.locator('tbody tr').count()==len(course['phrases'])+len(course['glossary'])
     for width in [320,390,1280]:
      page.set_viewport_size({'width':width,'height':844})
      assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
     assert not errors,errors
     report.append({'case':name,'passed':True})
     print('PASS '+name+': actual onboarding, saved pace, upfront bank, four approved images, checked answer and exact resume.',flush=True)
    except Exception as error:
     page.screenshot(path=str(root/f'failure-{name}.png'),full_page=True)
     (root/f'failure-{name}.json').write_text(json.dumps({'error':str(error),'pageErrors':errors,'url':page.url},indent=2))
     (root/'report.json').write_text(json.dumps(report,indent=2));raise
    finally:ctx.close()
  browser.close()
(root/'report.json').write_text(json.dumps(report,indent=2))
print(f'{len(report)} live cases passed. Device voices and physical-device pronunciation are not certified by these interaction checks.',flush=True)
