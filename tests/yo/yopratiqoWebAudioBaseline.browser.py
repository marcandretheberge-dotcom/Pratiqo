"""Standalone native audio: no application code, media fixtures or API monkeypatches."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ['YO_QA_DIR']);out.mkdir(parents=True,exist_ok=True)
url='https://pratiqo-g9p8vv4ag-marcandretheberge-dotcoms-projects.vercel.app/audio/yo/fr/tiens-tenez-v1.mp3'
oscillator="""<!doctype html><button id='play'>Play native audio</button><output id='result'>idle</output><script>
document.querySelector('#play').onclick=async()=>{try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();window.testContext=c;await c.resume();const oscillator=c.createOscillator(),gain=c.createGain();gain.gain.value=.05;oscillator.connect(gain);gain.connect(c.destination);oscillator.onended=()=>{document.querySelector('#result').textContent='ended';c.close();};oscillator.start();oscillator.stop(c.currentTime+.2);document.querySelector('#result').textContent='playing';}catch(e){document.querySelector('#result').textContent='error:'+e.name+':'+e.message;}};
</script>"""
def media(cleanup):
 return """<!doctype html><button id='play'>Play native audio</button><output id='result'>idle</output><script>
 document.querySelector('#play').onclick=()=>{
 const a=new Audio(URL),mode=MODE;window.testAudio=a;let cleaned=false;
 const dispose=()=>{if(cleaned)return;cleaned=true;a.pause();a.removeAttribute('src');a.load();};
 for(const event of ['playing','pause','ended','error'])a.addEventListener(event,()=>{
  window.recordNative({event,time:a.currentTime,duration:a.duration,ended:a.ended,error:a.error?.code});
  if(event==='ended'||(event==='pause'&&a.ended)){
   document.querySelector('#result').textContent='ended';
   if(mode==='immediate')dispose();
   if(mode==='deferred')setTimeout(dispose,0);
  }
 });
 a.play().catch(e=>{document.querySelector('#result').textContent='error:'+e.name;window.recordNative({error:e.name,message:e.message});});
 };
 </script>""".replace('URL',json.dumps(url)).replace('MODE',json.dumps(cleanup))
report=[]
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  for name in ['oscillator','mp3-none','mp3-immediate','mp3-deferred']:
   browser=getattr(pw,engine).launch();ctx=browser.new_context();p=ctx.new_page();errors=[];events=[]
   p.on('pageerror',lambda e:errors.append(str(e)));p.on('crash',lambda:errors.append('native page crash'))
   p.expose_function('recordNative',lambda e:events.append(e))
   print(f'CHECK {engine}/{name}',flush=True)
   try:
    p.set_content(oscillator if name=='oscillator' else media(name.split('-')[1]));p.get_by_role('button',name='Play native audio').click();p.wait_for_function("document.querySelector('#result').textContent==='ended'",timeout=10000)
    p.wait_for_timeout(1000);assert p.locator('#result').inner_text()=='ended';assert not errors,errors
    report.append({'engine':engine,'case':name,'passed':True,'errors':errors,'events':events})
    print(f'PASS {engine}/{name}',flush=True)
   except Exception as e:
    report.append({'engine':engine,'case':name,'passed':False,'error':str(e),'errors':errors,'events':events});print(f'FAIL {engine}/{name}: {e}',flush=True)
   finally:
    (out/'baseline.json').write_text(json.dumps(report,indent=2));ctx.close();browser.close()
if any(not r['passed']for r in report):raise SystemExit(1)
