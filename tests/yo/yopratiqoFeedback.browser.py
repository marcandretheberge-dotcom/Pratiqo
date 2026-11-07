"""Real UI and real WebAudio nodes; deterministic lesson audio only, no claim about physical haptics."""
import io, json, math, os, struct, wave
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(os.environ.get('YO_QA_DIR','/tmp/yo-feedback-qa'));root.mkdir(parents=True,exist_ok=True)
base=os.environ.get('YO_FEEDBACK_URL','http://127.0.0.1:3129/yo/langues/italien/parcours')
buf=io.BytesIO()
with wave.open(buf,'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(2000*math.sin(2*math.pi*440*i/22050))) for i in range(8000)))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'));context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 context.route('**/storage/v1/object/public/**',lambda r:r.fulfill(status=200,content_type='audio/wav',body=buf.getvalue()))
 context.add_init_script("""window.__cues=[];window.__vibes=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.__cues.push({time:performance.now(),samples:this.buffer?.length,peak:Math.max(...this.buffer.getChannelData(0).map(Math.abs))});return start.apply(this,args)};Object.defineProperty(navigator,'vibrate',{value:(p)=>{window.__vibes.push(p);return true;},configurable:true});""")
 page=context.new_page();page.set_default_timeout(30000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def click(label):page.get_by_role('button',name=label,exact=True).click()
 def count():return page.evaluate('window.__cues.length')
 try:
  page.goto(base+'?lang=en');page.locator('[data-yoppo-onboarding]').wait_for(timeout=60000)
  for name in ['I’m starting from zero','Travel']:click(name)
  page.get_by_role('radio',name='1 h / week',exact=True).check()
  for name in ['Continue','Start here']:click(name)
  page.locator('[data-guided-italian]').wait_for();click('Skip the tour');click('Start my mission');click('Build my vocabulary')
  page.locator('[data-visual-vocabulary]').wait_for();page.wait_for_timeout(600)
  assert count()==0
  group=page.get_by_role('group',name='Four images',exact=True)
  group.get_by_role('button',name='Character wearing the name Luca',exact=True).click();click('Check');assert count()==0
  click('Try again');group.get_by_role('button',name='Character wearing the name Nina',exact=True).click();assert count()==0
  click('Check');page.wait_for_function('window.__cues.length === 1');assert page.locator('[data-yoppo-success]').count()==1
  assert page.locator('.yo-success-entrance').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
  cue=page.evaluate('window.__cues[0]');assert cue['samples']==35280 and abs(cue['peak']-.22)<.000001
  page.screenshot(path=str(root/'correct-vocabulary-mobile.png'),full_page=True)
  click('Word notebook');page.keyboard.press('Escape');assert count()==1
  click('Leave and save my place');click('Yoppo and my tools')
  page.get_by_role('switch',name='Success sounds',exact=True).click();page.get_by_role('switch',name='Vibrations',exact=True).click()
  assert page.get_by_role('switch',name='Success sounds',exact=True).get_attribute('aria-checked')=='false'
  page.screenshot(path=str(root/'feedback-settings-mobile.png'),full_page=True)
  page.keyboard.press('Escape');click('Continue my mission');click('Continue')
  group=page.get_by_role('group',name='Four images',exact=True)
  group.get_by_role('button',name='A person asks about a name badge',exact=True).click();click('Check')
  assert count()==1;assert page.evaluate('window.__vibes.filter(v=>v===12).length')==1
  page.reload();page.locator('[data-guided-italian]').wait_for();assert count()==0
  click('Yoppo and my tools');assert page.get_by_role('switch',name='Success sounds').get_attribute('aria-checked')=='false';assert page.get_by_role('switch',name='Vibrations').get_attribute('aria-checked')=='true'
  page.get_by_role('switch',name='Success sounds').click();page.get_by_role('switch',name='Vibrations').click();click('Preview the soft wood sound');page.wait_for_function('window.__cues.length===1');page.keyboard.press('Escape')
  # A correct final answer has its own cue, independent from the old aggregate callback.
  click('Already confident? Try the final challenge');click('Start the final challenge');click('Mi chiamo Nina.');click('Check');page.wait_for_function('window.__cues.length===2')
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(root/'correct-final-desktop.png'),full_page=True)
  assert not errors,errors
  print('PASS real WebAudio wood buffer; correct-only vocabulary and final cues; no notebook/reload replay; independent persisted haptics; reduced motion; 320/390/1280 px; zero page errors. Vibration call mocked, not physical-device certification.',flush=True)
 except Exception:
  page.screenshot(path=str(root/'feedback-failure.png'),full_page=True);(root/'feedback-failure.txt').write_text(page.locator('body').inner_text());raise
 finally:browser.close()
