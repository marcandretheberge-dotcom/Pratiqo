"""Touch, keyboard and viewport regression; no backend writes or synthetic learning rewards."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('YO_QA_DIR','/tmp/yo-onboarding-review'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('YO_ONBOARDING_URL','http://127.0.0.1:3129/yo/langues/italien/parcours')
public=not base.startswith('http://127.0.0.1')
texts={
 'fr':('Je pars de zéro','Voyager','Continuer','Commencer ici','Retour','Changer de mission','Choisir une autre durée','semaine'),
 'en':('I’m starting from zero','Travel','Continue','Start here','Back','Change mission','Choose another duration','week'),
 'es':('Empiezo de cero','Viajar','Continuar','Empezar aquí','Volver','Cambiar de misión','Elegir otra duración','semana'),
}
report=[]
def log(text):report.append(text);print(text,flush=True)
def settle(page):page.wait_for_timeout(120)
def guide_visible(page):
 settle(page)
 box=page.locator('[data-yoppo-guide]').bounding_box()
 assert box and box['y']>=0 and box['y']+box['height']<=page.viewport_size['height'],box
 assert page.locator('[data-yoppo-guide] img').evaluate('(image) => image.complete && image.naturalWidth > 0')
 assert page.locator('h1').evaluate('(h) => h === document.activeElement')
def notices(page):
 if not public:return
 banner=page.get_by_test_id('cookie-consent-banner')
 try:banner.wait_for(timeout=6000)
 except Exception:pass
 if banner.is_visible():banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Nécessaires uniquement|Solo necesarias',re.I)).click()
 later=page.get_by_role('button',name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
 if later.count() and later.first.is_visible():later.first.click()
with sync_playwright() as pw:
 for engine in os.environ.get('YO_TEST_BROWSERS','chromium,webkit').split(','):
  browser=getattr(pw,engine).launch()
  for locale,(zero,goal,next_label,start,back,change,other,week) in texts.items():
   ctx=browser.new_context(viewport={'width':390,'height':660},has_touch=True,is_mobile=True,reduced_motion='reduce')
   page=ctx.new_page();page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    page.goto(base+'?lang='+locale,timeout=60000);page.locator('[data-yoppo-onboarding]').wait_for(timeout=60000);notices(page)
    page.get_by_role('button',name=zero,exact=True).tap();page.get_by_role('button',name=goal,exact=True).tap()
    guide_visible(page)
    assert page.get_by_role('button',name=next_label,exact=True).is_disabled()
    assert page.locator('input[type=radio]:checked').count()==0
    # Touch the complete card, not a DOM assignment or a forced click.
    for n in [30,60,120,180,0,120]:
     page.locator(f'[data-pace-choice="{n}"]').tap()
     assert page.locator(f'input[type=radio][value="{n}"]').is_checked()
     assert page.locator('input[type=radio]:checked').count()==1
     selected=page.locator(f'[data-pace-choice="{n}"] [data-pace-selected="true"]')
     assert selected.locator('svg').count()==1
     assert selected.evaluate('(e) => getComputedStyle(e).backgroundColor')!=page.locator('[data-pace-selected="false"]').first.evaluate('(e) => getComputedStyle(e).backgroundColor')
    page.screenshot(path=str(out/f'pace-{locale}-{engine}-390.png'),full_page=True)
    # Keyboard-native radios work too; restore the selected two hours for the summary.
    radio=page.locator('input[type=radio][value="120"]');radio.focus();page.keyboard.press('ArrowRight')
    assert page.locator('input[type=radio][value="180"]').is_checked()
    page.keyboard.press('ArrowLeft');assert radio.is_checked()
    page.evaluate('() => window.scrollTo(0,document.body.scrollHeight)')
    page.get_by_role('button',name=next_label,exact=True).tap();guide_visible(page)
    assert page.get_by_role('combobox').count()==0
    assert page.locator('[data-pace-summary]').inner_text()==f'2 h / {week}'
    result=page.locator('[data-onboarding-recommendation]')
    assert len(result.inner_text())<400
    assert not re.search('certification|paid access|accès payant|acceso de pago|tampons|stamps|sellos',result.inner_text(),re.I)
    assert page.get_by_role('button',name=re.compile('^(Skip|Passer|Omitir)$')).count()==0
    assert result.get_by_role('button',name=start,exact=True).count()==1
    page.screenshot(path=str(out/f'recommendation-{locale}-{engine}-390.png'),full_page=True)
    for width in [320,390,1280]:
     page.set_viewport_size({'width':width,'height':660});settle(page)
     assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth'),(locale,width)
    page.set_viewport_size({'width':390,'height':660})
    page.get_by_role('button',name=change,exact=True).tap();page.get_by_role('combobox').select_option('u05')
    assert page.get_by_role('combobox').input_value()=='u05'
    page.get_by_role('combobox').select_option('u01');page.get_by_role('button',name=change,exact=True).tap()
    page.get_by_role('button',name=back,exact=True).tap();guide_visible(page)
    assert page.locator('input[type=radio][value="120"]').is_checked()
    page.get_by_role('button',name=other,exact=True).tap();custom=page.get_by_role('spinbutton')
    for value in ['', '0', '14', '1201']:
     custom.fill(value);assert page.get_by_role('button',name=next_label,exact=True).is_disabled(),value
    custom.fill('90');page.get_by_role('button',name=next_label,exact=True).tap();guide_visible(page)
    assert page.locator('[data-pace-summary]').inner_text()==f'90 min / {week}'
    page.get_by_role('button',name=start,exact=True).tap();page.locator('[data-guided-italian]').wait_for()
    profile=page.evaluate("() => JSON.parse(localStorage.getItem('yo.learning-profile.v1.it'))")
    assert profile['weeklyMinutes']==90 and profile['startUnitId']=='u01' and profile['goal']=='travel'
    assert page.evaluate("() => localStorage.getItem('yo.italian.course.first-meeting.v2')") is None
    page.reload();page.locator('[data-guided-italian]').wait_for();assert page.locator('[data-yoppo-onboarding]').count()==0
    assert not errors,errors
    log(f'{engine}/{locale}: all pace cards respond to touch and keyboard, exact custom pace saved, optional picker, guide in view, responsive summary and silent resume passed.')
   except Exception:
    page.screenshot(path=str(out/f'failure-{engine}-{locale}.png'),full_page=True)
    (out/f'failure-{engine}-{locale}.txt').write_text(page.locator('body').inner_text());raise
   finally:ctx.close()
  browser.close()
(out/'onboarding-report.json').write_text(json.dumps(report,indent=2))
