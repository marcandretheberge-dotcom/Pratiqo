import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/tmp/yo-webkit-state');out.mkdir(parents=True,exist_ok=True)
url='https://pratiqo-g9p8vv4ag-marcandretheberge-dotcoms-projects.vercel.app/yo/langues/anglais/demarrer?lang=en'
def click(p,t):p.get_by_role('button',name=t,exact=True).click()
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch();c=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);p=c.new_page()
  p.set_default_timeout(12000);net=[];err=[]
  p.on('response',lambda x:net.append({'status':x.status,'url':x.url}) if '.mp3' in x.url else None)
  p.on('requestfailed',lambda x:net.append({'failed':x.failure,'url':x.url}) if '.mp3' in x.url else None)
  p.on('pageerror',lambda e:err.append(str(e)));p.on('crash',lambda:err.append('crash'))
  logs=[]
  try:
   p.goto(url,wait_until='domcontentloaded',timeout=60000);p.locator('[data-shared-welcome]').wait_for()
   banner=p.get_by_test_id('cookie-consent-banner')
   if banner.count() and banner.is_visible():banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Solo necesarias')).click()
   click(p,'I’m starting from zero');click(p,'Travel');p.locator('[data-shared-pace="120"]').tap();click(p,'Continue');click(p,'Start here');click(p,'Word notebook')
   dialog=p.get_by_role('dialog');row=dialog.locator('p[lang]').filter(has_text=re.compile('^Thank you!$')).first.locator('xpath=..')
   logs.append({'t':'before','html':row.inner_text(),'state':row.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state')})
   row.get_by_role('button',name=re.compile('^Listen')).click()
   for tick in [0.1,0.3,0.8,1.7,2.5,4.5,10]:
    p.wait_for_timeout(int(tick*1000))
    logs.append({'after_s':tick,'state':row.locator('[data-pronunciation-state]').get_attribute('data-pronunciation-state'),'text':row.inner_text()[-170:]})
   logs.append({'network':net,'errors':err})
  except Exception as e:logs.append({'exception':str(e),'network':net,'errors':err})
  (out/f'{engine}.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2));print(engine,logs,flush=True)
  c.close();b.close()
