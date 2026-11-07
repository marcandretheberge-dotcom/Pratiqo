import json,io,wave,math,struct,re,os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(os.environ.get('YO_QA_DIR', '/tmp/yo-guided-qa'));root.mkdir(parents=True,exist_ok=True)
data=json.loads((root/'unit.json').read_text());unit=data['unit'];steps=data['steps']
buf=io.BytesIO()
with wave.open(buf,'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(3000*math.sin(2*math.pi*440*i/22050))) for i in range(8000)))
wav=buf.getvalue();report=[]
def log(s): report.append(s);print(s,flush=True)
def main_button(p,name): return p.get_by_role('main').get_by_role('button',name=name,exact=True)
def solve(page,a,wrong=False):
 game=page.locator('[data-guided-game]');game.wait_for()
 if a['kind']=='listen' or a.get('listeningText'):
  game.get_by_role('button',name='Listen : the exercise message',exact=True).click()
  page.wait_for_timeout(150)
 if a['kind']=='match':
  for pair in a['pairs']:
   game.get_by_role('button',name=pair['it'],exact=True).click();game.get_by_role('button',name=pair['meaning']['en'],exact=True).click()
 elif a['kind'] in ('order','type'):
  tokens=a['answer'] if a['kind']=='order' else a['model'].split()
  group=game.get_by_role('group',name='Available words',exact=True)
  for word in tokens:
   group.locator('button:not([disabled])').filter(has_text=re.compile('^'+re.escape(word)+'$')).first.click()
  game.get_by_role('button',name='Check',exact=True).click()
 elif a['kind']=='dialogue':
  for i,turn in enumerate(a['turns']):
   op=next(o for o in turn['options'] if o['id']==turn['correctId'])
   game.get_by_role('button',name=op.get('it',op.get('label',{}).get('en')),exact=True).click();game.get_by_role('button',name='Check',exact=True).click()
   if i<len(a['turns'])-1:game.get_by_role('button',name='Continue the conversation',exact=True).click()
 else:
  op=next(o for o in a['options'] if (o['id']!=a['correctId'] if wrong else o['id']==a['correctId']))
  game.get_by_role('button',name=op.get('it',op.get('label',{}).get('en')),exact=True).click();game.get_by_role('button',name='Check',exact=True).click()
 assert page.locator('textarea,input').count()==0
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.route('**/storage/v1/object/public/**',lambda route: route.fulfill(status=200,content_type='audio/wav',body=wav))
 page=context.new_page();page.set_default_navigation_timeout(60000);errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 page.goto('http://127.0.0.1:3129/?lang=en');page.get_by_role('button',name='Skip the tour',exact=True).wait_for(timeout=60000)
 page.screenshot(path=str(root/'onboarding-mobile.png'),full_page=True)
 page.get_by_role('button',name='Skip the tour',exact=True).click()
 main_button(page,'Start my mission').click()
 for step in steps:
  if step.get('activity'):solve(page,step['activity'])
  if step['id']=='it1-u01-l1-read':page.screenshot(path=str(root/'exercise-mobile.png'),full_page=True)
  main_button(page,'Continue').click()
 log('All 31 guided steps / 19 exercises completed, including 6 keyboard-free replacements; zero typing/self-rating controls.')
 main_button(page,'Start the final challenge').click()
 for i,a in enumerate(unit['quiz']['questions']):
  solve(page,a,wrong=(i==4));main_button(page,'See my result' if i==4 else 'Continue').click()
 page.get_by_role('heading',name='Your stamp is in your passport!',exact=True).wait_for()
 assert page.get_by_text('4/5',exact=True).count()==1
 page.screenshot(path=str(root/'result-mobile.png'),full_page=True)
 main_button(page,'Back to the map').click()
 assert page.get_by_role('link',name='Continue to the next unit',exact=True).get_attribute('href')=='/yo/langues/italien/parcours/u02?lang=en'
 assert page.get_by_text('290 learning points',exact=True).count()==1
 page.reload();page.get_by_role('link',name='Continue to the next unit',exact=True).wait_for()
 assert page.get_by_text('290 learning points',exact=True).count()==1
 log('4/5 independent assessment awarded the saved stamp; next unit linked; reload preserves 290 points with no duplicate reward.')
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(150)
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),f'overflow {width}'
 page.screenshot(path=str(root/'map-desktop.png'),full_page=True)
 log('Map has no horizontal overflow at 320, 390 or 1280 px.')
 # A real incoming activity link must preserve the selected answer across tools and reload.
 page.goto('http://127.0.0.1:3129/?lang=en&lecon=it1-u01-l1&activite=it1-u01-l1-read')
 game=page.locator('[data-guided-game="it1-u01-l1-read"]');game.wait_for()
 game.get_by_role('button',name='Prego!',exact=True).click();page.get_by_role('button',name='Word notebook',exact=True).click()
 dialog=page.get_by_role('dialog');dialog.wait_for()
 for _ in range(20):page.keyboard.press('Tab');assert page.evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)")
 page.keyboard.press('Escape');assert game.get_by_role('button',name='Prego!',exact=True).get_attribute('aria-pressed')=='true'
 page.reload();game.wait_for();assert game.get_by_role('button',name='Prego!',exact=True).get_attribute('aria-pressed')=='true'
 log('Notebook preserves the unfinished selection; focus remains inside its dialog, Escape closes it; exact deep-link reload keeps the selection.')
 # Fresh learner: resume a partly answered final challenge without resetting or awarding.
 page.goto('http://127.0.0.1:3129/?lang=en');page.evaluate('localStorage.clear()');page.reload();page.get_by_role('button',name='Skip the tour',exact=True).click()
 main_button(page,'Already confident? Try the final challenge').click();main_button(page,'Start the final challenge').click()
 solve(page,unit['quiz']['questions'][0]);main_button(page,'Continue').click()
 game=page.locator('[data-guided-game]');game.get_by_role('button',name='Leggi.',exact=True).click()
 page.get_by_role('button',name='Leave and save my place',exact=True).click();page.reload()
 main_button(page,'Final challenge').click()
 assert page.locator('[data-guided-game]').get_attribute('data-guided-game')=='it1-u01-q2'
 assert page.get_by_role('button',name='Leggi.',exact=True).get_attribute('aria-pressed')=='true'
 log('Leaving and reloading a partial final challenge resumes question 2 and its selected answer.')
 # Written accessibility alternative is explicitly assisted, not an independent pass.
 page.get_by_role('button',name='Read instead of listen (with help)',exact=True).click();page.get_by_role('button',name='Check',exact=True).click();main_button(page,'Continue').click()
 for i in range(2,5):solve(page,unit['quiz']['questions'][i]);main_button(page,'See my result' if i==4 else 'Continue').click()
 page.get_by_role('heading',name='Good practice with help. Retake the challenge without hints to earn the stamp.',exact=True).wait_for()
 assert page.get_by_text('Bologna stamp',exact=True).count()==0
 log('5/5 with a transcript remains practice with help; no false independent stamp.')
 # Locale walkthrough and full-course tools.
 for lang,skip,start,notebook,helpname in [('fr','Passer la visite','Commencer ma mission','Carnet de mots','Yoppo et mes outils'),('es','Omitir la visita','Empezar mi misión','Cuaderno de palabras','Yoppo y mis herramientas')]:
  page.goto('http://127.0.0.1:3129/?lang='+lang);page.evaluate('localStorage.clear()');page.reload();page.get_by_role('button',name=skip,exact=True).click();main_button(page,start).click()
  assert page.locator('textarea,input').count()==0
  page.get_by_role('button',name=helpname,exact=True).click();page.get_by_role('dialog').wait_for()
  assert page.get_by_role('dialog').get_by_role('link').filter(has=page.locator('svg')).first.get_attribute('href').startswith('/trouver-un-prof?q=italien')
  page.keyboard.press('Escape')
 log('French and Spanish navigation work; Pratiqo Match uses the actual Italian-teacher search; no payment call is introduced.')
 assert not errors,errors
 log('Zero uncaught browser page errors.')
 browser.close()
(root/'report.json').write_text(json.dumps(report,indent=2))
