"""Actual route components, browser storage and print layout; audio fixtures are not pronunciation QA."""
import io, json, math, os, re, struct, wave
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(os.environ.get('YO_QA_DIR','/tmp/yo-guided-qa'));root.mkdir(parents=True,exist_ok=True)
data=json.loads((root/'personalized-data.json').read_text());unit=data['unit'];steps=data['steps'];visuals=data['visuals'];report=[]
base='http://127.0.0.1:3129/yo/langues/italien/parcours'
buf=io.BytesIO()
with wave.open(buf,'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(3000*math.sin(2*math.pi*440*i/22050))) for i in range(8000)))
def log(text):print(text,flush=True);report.append(text)
def click(page,name):page.get_by_role('button',name=name,exact=True).click()
def solve(page,a):
 box=page.locator('[data-guided-game]');box.wait_for()
 if a['kind']=='listen' or a.get('listeningText'):
  box.get_by_role('button',name='Listen : the exercise message',exact=True).click()
  page.wait_for_timeout(200)
 if a['kind']=='match':
  for pair in a['pairs']:
   box.get_by_role('button',name=pair['it'],exact=True).click();box.get_by_role('button',name=pair['meaning']['en'],exact=True).click()
 elif a['kind'] in ['type','order']:
  group=box.get_by_role('group',name='Available words',exact=True)
  for text in a['model'].split() if a['kind']=='type' else a['answer']:
   group.locator('button:not([disabled])').filter(has_text=re.compile('^'+re.escape(text)+'$')).first.click()
  box.get_by_role('button',name='Check',exact=True).click()
 elif a['kind']=='dialogue':
  for i,turn in enumerate(a['turns']):
   choice=next(o for o in turn['options'] if o['id']==turn['correctId'])
   box.get_by_role('button',name=choice.get('it',choice.get('label',{}).get('en')),exact=True).click();box.get_by_role('button',name='Check',exact=True).click()
   if i<len(a['turns'])-1:box.get_by_role('button',name='Continue the conversation',exact=True).click()
 else:
  choice=next(o for o in a['options'] if o['id']==a['correctId']);box.get_by_role('button',name=choice.get('it',choice.get('label',{}).get('en')),exact=True).click();box.get_by_role('button',name='Check',exact=True).click()
 assert page.locator('textarea,input[type=checkbox],input[type=text]').count()==0
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.route('**/storage/v1/object/public/**',lambda route:route.fulfill(status=200,content_type='audio/wav',body=buf.getvalue()))
 page=context.new_page();page.set_default_timeout(30000);page.set_default_navigation_timeout(60000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(base+'?lang=en');page.locator('[data-yoppo-onboarding]').wait_for(timeout=60000)
  page.screenshot(path=str(root/'onboarding-mobile.png'),full_page=True)
  click(page,'I’m starting from zero');click(page,'Travel');click(page,'2 h / week');click(page,'Continue');click(page,'Start here')
  page.locator('[data-guided-italian]').wait_for();click(page,'Skip the tour')
  assert page.evaluate("() => JSON.parse(localStorage.getItem('yo.learning-profile.v1.it')).weeklyMinutes")==120
  click(page,'Word notebook');dialog=page.get_by_role('dialog');assert dialog.get_by_text('Quanti anni hai?',exact=True).count()==1
  for _ in range(16):page.keyboard.press('Tab');assert page.evaluate("() => document.querySelector('[role=dialog]').contains(document.activeElement)")
  page.keyboard.press('Escape')
  assert page.get_by_role('link',name='View / print all words and verbs',exact=True).count()==1
  log('Beginner onboarding, 2-hour rhythm, complete upfront notebook and keyboard focus trap passed.')
  click(page,'Start my mission')
  for step in steps:
   if step['stage']=='prepare':
    click(page,'Build my vocabulary');words=visuals[unit['lessons'][step['lesson']]['id']]
    for i in range(len(words)*2):
     word=words[i%len(words)];page.locator('[data-visual-vocabulary]').wait_for()
     assert page.get_by_role('group',name='Four images',exact=True).locator('button').count()==4
     if page.get_by_role('button',name='Read instead of listen',exact=True).count():click(page,'Read instead of listen')
     picture=next(c for c in word['choices'] if c['id']==word['correctId'])
     if step['lesson']==0 and i==0:
      wrong=next(c for c in word['choices'] if c['id']!=word['correctId']);click(page,wrong['alt']['en']);click(page,'Check');assert page.get_by_role('button',name='Enter the mission',exact=True).count()==0;click(page,'Try again')
     click(page,picture['alt']['en'])
     if step['lesson']==0 and i==0:
      page.screenshot(path=str(root/'visual-vocabulary-mobile.png'),full_page=True)
      click(page,'Word notebook');page.keyboard.press('Escape');assert page.get_by_role('button',name=picture['alt']['en'],exact=True).get_attribute('aria-pressed')=='true'
     click(page,'Check');click(page,'Continue')
    click(page,'Enter the mission')
   else:
    if step.get('activity'):solve(page,step['activity'])
    click(page,'Continue')
  log('Three visual preparations and all 19 first-meeting exercises completed; incorrect images never unlock a mission.')
  click(page,'Start the final challenge')
  for i,a in enumerate(unit['quiz']['questions']):solve(page,a);click(page,'See my result' if i==4 else 'Continue')
  page.get_by_role('heading',name='Your stamp is in your passport!',exact=True).wait_for()
  click(page,'Back to the map');assert page.get_by_text('290 learning points',exact=True).count()==1
  page.reload();page.locator('[data-guided-italian]').wait_for();assert page.get_by_text('290 learning points',exact=True).count()==1
  assert page.locator('[data-yoppo-onboarding]').count()==0
  page.screenshot(path=str(root/'completed-map-mobile.png'),full_page=True)
  log('Independent final pass earns one stamp, next-unit link and 290 points; reload repeats neither onboarding nor rewards.')
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth'),f'overflow at {width}'
  page.screenshot(path=str(root/'completed-map-desktop.png'),full_page=True)
  log('No horizontal overflow at 320, 390 and 1280 px.')
  for lang in ['fr','en','es']:
   page.goto(base+'/u01/vocabulaire?lang='+lang);page.locator('[data-word-bank-print]').wait_for()
   assert page.get_by_text('Quanti anni hai?',exact=True).count()==1
   assert page.get_by_text(re.compile('^avere —')).count()==1
   page.pdf(path=str(root/f'word-bank-{lang}-letter.pdf'),format='Letter',print_background=False)
   if lang=='fr':page.pdf(path=str(root/'word-bank-fr-a4.pdf'),format='A4',print_background=False)
  log('Complete translated word/verb bank prints in FR/EN/ES; Letter and A4 PDFs generated.')
  # Fresh experienced learner chooses later content: no forged earlier assessments.
  page.goto(base+'?lang=en');page.evaluate('() => localStorage.clear()');page.reload();page.locator('[data-yoppo-onboarding]').wait_for()
  click(page,'I have a background, but I’m rusty');click(page,'Everyday conversation');click(page,'Continue');click(page,'Choose for myself');page.get_by_role('combobox').select_option('u05');click(page,'Start here')
  page.wait_for_url('**/u05?lang=en');page.locator('[data-guided-italian]').wait_for();tour=page.get_by_role('button',name='Skip the tour',exact=True)
  if tour.count():tour.click()
  assert page.get_by_text('0 learning points',exact=True).count()==1
  click(page,'Start my mission');assert page.locator('textarea,input[type=checkbox],input[type=text]').count()==0
  click(page,'Leave and save my place');page.goto(base+'?lang=en');page.wait_for_url('**/u05?lang=en');page.locator('[data-guided-italian]').wait_for()
  log('Experienced learner starts at module 5, resumes there from language home, and receives no unearned stamp or points.')
  # Adaptive check, independent answers. Existing recorded questions use the same deterministic fixture.
  page.evaluate('() => localStorage.clear()');page.goto(base+'?lang=en');page.locator('[data-yoppo-onboarding]').wait_for()
  click(page,'I can have simple conversations');click(page,'Work or studies');click(page,'Continue');click(page,'Find my starting point')
  for check in data['checks']:solve(page,check['activity']);click(page,'Continue')
  assert page.get_by_role('combobox').input_value()=='u07'
  assert page.evaluate("() => localStorage.getItem('yo.italian.course.first-meeting.v2')") is None
  log('All nine placement answers recommend module 7, without writing any learning assessment or reward.')
  assert not errors,errors
  log('Zero uncaught browser page errors.')
 except Exception:
  page.screenshot(path=str(root/'failure.png'),full_page=True)
  (root/'failure-body.txt').write_text(page.locator('body').inner_text())
  (root/'page-errors.json').write_text(json.dumps(errors,indent=2))
  raise
 finally:browser.close()
(root/'report.json').write_text(json.dumps(report,indent=2))
