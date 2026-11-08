"""Independent native-audio baseline. No Pratiqo code, routes, stubs or instrumentation."""
import json,os,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ['YO_QA_DIR']);out.mkdir(parents=True,exist_ok=True)
html="""<!doctype html><button id='play'>Play native audio</button><output id='result'>idle</output><script>
document.querySelector('#play').onclick=async()=>{try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();window.testContext=c;await c.resume();const oscillator=c.createOscillator(),gain=c.createGain();gain.gain.value=.05;oscillator.connect(gain);gain.connect(c.destination);oscillator.onended=()=>{document.querySelector('#result').textContent='ended';c.close();};oscillator.start();oscillator.stop(c.currentTime+.2);document.querySelector('#result').textContent='playing';}catch(e){document.querySelector('#result').textContent='error:'+e.name+':'+e.message;}};
</script>"""
report=[]
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  browser=getattr(pw,engine).launch();ctx=browser.new_context();p=ctx.new_page();errors=[]
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('crash',lambda:errors.append('native page crash'))
  try:
   p.set_content(html);p.get_by_role('button',name='Play native audio').click();p.wait_for_function("document.querySelector('#result').textContent==='ended'",timeout=10000)
   report.append({'engine':engine,'baseline':'standalone WebAudio oscillator','passed':True,'errors':errors})
   print('PASS '+engine+' independent WebAudio baseline',flush=True)
  except Exception as e:
   report.append({'engine':engine,'baseline':'standalone WebAudio oscillator','passed':False,'error':str(e),'errors':errors});print('FAIL '+engine+': '+str(e),flush=True)
  finally:
   (out/'baseline.json').write_text(json.dumps(report,indent=2));ctx.close();browser.close()
if any(not r['passed']for r in report):raise SystemExit(1)
