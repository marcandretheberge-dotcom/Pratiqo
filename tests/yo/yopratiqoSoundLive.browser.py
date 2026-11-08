"""Actual preview: native WebAudio/media observed, never replaced. No voice stubs/accounts."""
import hashlib, json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
out=Path(os.environ['YO_QA_DIR']);out.mkdir(parents=True,exist_ok=True)
base=os.environ['YO_SOUND_URL'].rstrip('/')
slug=os.environ['YO_LANGUAGE']
recorded={'anglais':'Thank you!','francais-quebec':'Bonjour !','espagnol':'¡Hola!','allemand':'Wie heißt du?','portugais-bresil':'Como você se chama?','japonais':'こんにちは。','mandarin':'你好！','italien':'Ciao!'}
observe="""(()=>{
 window.__soundAudit={buffers:[],media:[],gains:[]};
 const a=window.__soundAudit;
 const C=window.AudioContext||window.webkitAudioContext;
 if(C){const gain=C.prototype.createGain;C.prototype.createGain=function(...args){const g=gain.apply(this,args);a.gains.push(g);return g;};}
 const start=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(...args){
  const result=start.apply(this,args),data=this.buffer?.getChannelData(0);
  if(data){let hash=2166136261,peak=0;for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));hash=Math.imul(hash^Math.round(data[i]*1000000),16777619);}
  a.buffers.push({hash:hash>>>0,peak,samples:data.length,rate:this.buffer.sampleRate,state:this.context.state,volume:a.gains.at(-1)?.gain.value});}return result;
 };
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(...args){
  if(!this.__observed){this.__observed=true;for(const event of ['playing','ended','error','pause'])this.addEventListener(event,()=>a.media.push({event,url:this.currentSrc||this.src,rate:this.playbackRate,time:this.currentTime,duration:this.duration,ended:this.ended,error:this.error?.code}),{capture:true});}
  return play.apply(this,args);
 };
})();"""
# A player may release src/load during its pause callback at the natural end.
# Observe the native ended flag in capture phase before that cleanup. A manual pause never qualifies.
complete="window.__soundAudit.media.filter(e=>e.event==='ended'||(e.event==='pause'&&e.ended&&e.duration>0&&e.time>=e.duration-.02)).length"
def click(p,name):p.get_by_role('button',name=name,exact=True).click()
def count(p):return p.evaluate('window.__soundAudit.buffers.length')
def notices(p):
 banner=p.get_by_test_id('cookie-consent-banner')
 try:banner.wait_for(timeout=3000)
 except Exception:pass
 if banner.is_visible():banner.get_by_role('button',name=re.compile('Necessary only|Nécessaires seulement|Nécessaires uniquement|Solo necesarias',re.I)).click()
 later=p.get_by_role('button',name=re.compile('^(Not now|Pas maintenant|Ahora no)$'))
 if later.count() and later.first.is_visible():later.first.click()
def sample(p,dialog,name):
 before=count(p);dialog.get_by_role('button',name=name,exact=True).click()
 p.wait_for_function('(n)=>window.__soundAudit.buffers.length===n+1',arg=before)
 item=p.evaluate('window.__soundAudit.buffers.at(-1)');assert item['state']=='running' and 0<item['peak']<.25
 p.wait_for_timeout(850);return item
report=[]
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  browser=getattr(pw,engine).launch();ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,color_scheme='dark',reduced_motion='reduce')
  ctx.add_init_script(observe);p=ctx.new_page();p.set_default_timeout(20000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  italian=slug=='italien';route=f'/yo/langues/{slug}/'+('parcours' if italian else 'demarrer')+'?lang=en'
  try:
   r=p.goto(base+route,wait_until='domcontentloaded',timeout=60000);assert r and r.status==200
   p.locator('[data-yoppo-onboarding]' if italian else '[data-shared-welcome]').wait_for();notices(p)
   click(p,'I’m starting from zero');click(p,'Travel')
   if italian:p.locator('input[type=radio]').nth(2).locator('xpath=..').tap()
   else:p.locator('[data-shared-pace="120"]').tap()
   click(p,'Continue');click(p,'Start here')
   tour=p.get_by_role('button',name='Skip the tour',exact=True)
   if tour.count():tour.click()
   click(p,'Yoppo and my tools' if italian else 'My tools');dialog=p.get_by_role('dialog');dialog.wait_for()
   assert count(p)==0,'Restoring a page/opening tools must be silent'
   cues={'correct':sample(p,dialog,'Preview the soft wood sound')}
   dialog.get_by_role('button',name='Preview the other sounds',exact=True).click()
   for kind in ['step','mission','stamp','unlock']:
    dialog.get_by_role('combobox',name='Event',exact=True).select_option(kind)
    cues[kind]=sample(p,dialog,'Preview this effect')
   assert len({v['hash'] for v in cues.values()})==5,'All five cues must differ'
   slider=dialog.get_by_role('slider',name=re.compile('Effects volume'))
   slider.focus();p.keyboard.press('Home')
   expect(slider).to_have_value('0');before=count(p)
   dialog.get_by_role('button',name='Preview the soft wood sound',exact=True).click();p.wait_for_timeout(950);assert count(p)==before
   slider.focus()
   for _ in range(10):p.keyboard.press('ArrowRight')
   expect(slider).to_have_value('50');half=sample(p,dialog,'Preview this effect');assert abs(half['volume']-.5)<.001
   sound=dialog.get_by_role('switch',name='Success sounds',exact=True);sound.click();expect(sound).to_have_attribute('aria-checked','false')
   expect(dialog.get_by_role('button',name='Preview this effect',exact=True)).to_be_disabled()
   p.screenshot(path=str(out/f'{slug}-{engine}-settings.png'),full_page=True)
   (out/f'{slug}-{engine}-effects.json').write_text(json.dumps({'cues':cues,'halfVolume':half,'muteAndZeroPassed':True},indent=2))
   dialog.get_by_role('button',name='Close',exact=True).click();p.reload(wait_until='domcontentloaded')
   p.locator('[data-guided-italian]' if italian else '[data-shared-course]').wait_for();p.wait_for_timeout(1000)
   assert count(p)==0,'Reload must not replay effects'
   click(p,'Yoppo and my tools' if italian else 'My tools');dialog=p.get_by_role('dialog')
   expect(dialog.get_by_role('switch',name='Success sounds',exact=True)).to_have_attribute('aria-checked','false')
   expect(dialog.get_by_role('slider',name=re.compile('Effects volume'))).to_have_value('50')
   dialog.get_by_role('button',name='Close',exact=True).click();click(p,'Word notebook');dialog=p.get_by_role('dialog')
   row=dialog.locator('p[lang]').filter(has_text=re.compile('^'+re.escape(recorded[slug])+'$')).first.locator('xpath=..')
   assert row.count()==1
   starts=[]
   for slow in [False,True]:
    if slow:row.get_by_role('button',name=re.compile('Slow down')).click()
    before=p.evaluate(complete)
    row.get_by_role('button',name=re.compile('^Listen')).click()
    p.wait_for_function('(n)=>'+complete+'>n',arg=before,timeout=20000)
    events=p.evaluate('window.__soundAudit.media');played=[e for e in events if e['event']=='playing'][-1]
    assert abs(played['rate']-(.78 if slow else 1))<.001
    assert '/audio/yo/' in played['url'] or '/yopratiqo-audio/' in played['url']
    starts.append(played)
   assert count(p)==0,'Pronunciation with muted effects must not create a feedback sound'
   dialog.get_by_role('button',name='Close',exact=True).click()
   repair=ctx.request.get(base+'/audio/yo/fr/tiens-tenez-v1.mp3')
   assert repair.status==200 and hashlib.sha256(repair.body()).hexdigest()=='47a45862fb14e3d764eb1d3b4a993c36003209fad4bb273eee602569dac70a17'
   decoded=p.evaluate("""async()=>{const data=await(await fetch('/audio/yo/fr/tiens-tenez-v1.mp3')).arrayBuffer();const C=window.AudioContext||window.webkitAudioContext;const c=new C();try{const b=await c.decodeAudioData(data);return {duration:b.duration,channels:b.numberOfChannels};}finally{await c.close();}}""")
   assert 1<decoded['duration']<4 and decoded['channels']==1
   assert not errors,errors
   report.append({'language':slug,'engine':engine,'cues':cues,'halfVolume':half['volume'],'recordedPlayback':starts,'repair':decoded,'passed':True})
   print(f'PASS {slug}/{engine}: 5 distinct native effects, volume/mute/reload, real normal/slow pronunciation independent of muted effects, repaired MP3 hash and decode.',flush=True)
  except Exception as e:
   p.screenshot(path=str(out/f'{slug}-{engine}-failure.png'),full_page=True)
   (out/f'{slug}-{engine}-failure.json').write_text(json.dumps({'error':str(e),'pageErrors':errors,'url':p.url},indent=2));raise
  finally:
   try:(out/f'{slug}-{engine}-observed-media.json').write_text(json.dumps(p.evaluate('window.__soundAudit.media'),indent=2))
   except Exception:pass
   (out/'sound-report.json').write_text(json.dumps(report,indent=2));ctx.close();browser.close()
print('These are native playback/interaction checks, not subjective listening or physical-device certification.',flush=True)
