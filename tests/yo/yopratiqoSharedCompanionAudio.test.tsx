import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as React from 'react';
import { YoAudioPlayer } from '../../components/yo/YoAudioPlayer';
import { ItalianStudyJourney } from '../../components/yo/italian/course/ItalianStudyJourney';
import type { CourseLesson } from '../../lib/yo/italian/course/courseTypes';
import { DeckYoppoCoach } from '../../components/yo/companion/DeckYoppoCoach';
import { YoStepNavigator } from '../../components/yo/YoStepNavigator';
import { SpanishRegionalPractice } from '../../components/yo/SpanishRegionalPractice';
import { spanishRegionalPractice } from '../../lib/yo/spanishRegionalPractice';
import { spanishIntroA1 } from '../../lib/yo/spanishIntroA1';
import { YoLanguageSelector } from '../../components/yo/YoLanguageSelector';
const require = createRequire(process.cwd()+"/package.json");
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'https://example.org',pretendToBeVisual:true});
Object.defineProperty(globalThis,'self',{value:dom.window,configurable:true});
for (const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true,React})) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
globalThis.requestAnimationFrame = (cb:FrameRequestCallback) => { cb(0); return 0; };
window.scrollTo=()=>{};
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
dom.window.HTMLElement.prototype.scrollTo=()=>{};
Object.defineProperty(dom.window.HTMLDialogElement.prototype,'showModal',{value:function(){this.setAttribute('open','');}});
Object.defineProperty(dom.window.HTMLDialogElement.prototype,'close',{value:function(){this.removeAttribute('open');}});
const {render,fireEvent,act,cleanup}=require('@testing-library/react');
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
const audios: FakeAudio[]=[];
class FakeAudio extends dom.window.EventTarget {
 src:string; preload=''; crossOrigin=''; currentTime=0; playCalls=0; pauses=0; loads=0;
 constructor(src:string){super();this.src=src;audios.push(this);}
 play(){this.playCalls++;return Promise.resolve();}
 pause(){this.pauses++;this.dispatchEvent(new Event('pause'));}
 load(){this.loads++;}
 emit(name:string){this.dispatchEvent(new Event(name));}
}
window.Audio=FakeAudio as unknown as typeof Audio;
const tests:[string,()=>void|Promise<void>][]=[];

for (const variant of ['pill-bar','desktop-dropdown'] as const) tests.push([`Quebec intro ${variant}: French is explicit and untranslated Spanish is not linked`,()=>{
 const v=render(<YoLanguageSelector locale="en" pathname="/yo/langues/francais-quebec/intro" variant={variant}/>);
 assert.equal(v.getByRole('link',{name:'Français'}).getAttribute('href'),'/yo/langues/francais-quebec/intro?lang=fr');
 assert.equal(v.queryByRole('link',{name:'Español'}),null);
 assert.equal(v.getByTestId('yo-language-selector-disabled-pill').getAttribute('aria-disabled'),'true');
}]);
tests.push(['Spanish accent context does not assign a single sound to a country',()=>{
 const accent=spanishIntroA1.variations.find(item=>item.id==='variation_accent')!;
 for(const locale of ['fr','en','es'] as const) assert.ok(accent.body[locale]);
 assert.match(accent.body.en,/within the same country/);
 assert.doesNotMatch(accent.body.en,/slower and clearer|fast and musical|emphasizes/);
}]);
tests.push(['audio errors are retryable and recovery follows the playing event',async()=>{
 const v=render(<YoAudioPlayer storagePath="yo/it/test.mp3" label="Ciao"/>); const a=audios.at(-1)!;
 assert.equal(a.preload,'none');
 fireEvent.click(v.getByRole('button',{name:'Listen — Ciao'}));
 act(()=>a.emit('error'));
 const retry=v.getByRole('button',{name:'Listen — Ciao (retry audio)'});assert.equal(retry.disabled,false);
 fireEvent.click(retry);assert.equal(a.loads,1);assert.equal(a.playCalls,2);
 act(()=>a.emit('playing'));assert.ok(v.getByRole('button',{name:'Stop — Ciao'}));
}]);
tests.push(['opening another recording stops previous playback and a shared break stops both',()=>{
 const v=render(<><YoAudioPlayer storagePath="a.mp3" label="One"/><YoAudioPlayer storagePath="b.mp3" label="Two"/></>);
 const [a,b]=audios.slice(-2);
 fireEvent.click(v.getByRole('button',{name:'Listen — One'}));act(()=>a.emit('playing'));
 fireEvent.click(v.getByRole('button',{name:'Listen — Two'}));assert.ok(a.pauses>0);
 act(()=>b.emit('playing'));act(()=>window.dispatchEvent(new Event('yo-audio-stop')));
 assert.ok(v.getByRole('button',{name:'Listen — One'}));assert.ok(v.getByRole('button',{name:'Listen — Two'}));
}]);
tests.push(['a cancelled load cannot restart playback through a late playing event',()=>{
 const v=render(<YoAudioPlayer storagePath="a.mp3" label="Pending"/>);const a=audios.at(-1)!;
 fireEvent.click(v.getByRole('button',{name:'Listen — Pending'}));
 act(()=>window.dispatchEvent(new Event('yo-audio-stop')));
 const before=a.pauses;act(()=>a.emit('playing'));
 assert.ok(a.pauses>before);assert.equal(v.getByRole('button').getAttribute('aria-pressed'),'false');
}]);
tests.push(['a mounted recording stops when its lesson panel becomes hidden',async()=>{
 const v=render(<div data-testid="panel"><YoAudioPlayer storagePath="a.mp3" label="Panel"/></div>);const a=audios.at(-1)!;
 fireEvent.click(v.getByRole('button'));act(()=>a.emit('playing'));
 const before=a.pauses;
 await act(async()=>{v.getByTestId('panel').setAttribute('aria-hidden','true');await Promise.resolve();});
 assert.ok(a.pauses>before);
 assert.equal(v.getByTestId('panel').querySelector('button').getAttribute('data-yo-audio-state'),'idle');
}]);
tests.push(['real non-deck navigation preserves unfinished input and blocks arrows behind Yoppo',()=>{
 const v=render(<YoStepNavigator companion variant="embedded" surfaceId="quality-test" locale="en" steps={[
  {id:'first',label:'First lesson',content:<textarea aria-label="Unfinished answer" defaultValue=""/>},
  {id:'second',label:'Second lesson',content:<p>Next situation</p>}
 ]}/>);
 fireEvent.change(v.getByLabelText('Unfinished answer'),{target:{value:'My unfinished answer'}});
 v.getByLabelText('Unfinished answer').focus();
 const panel=v.getAllByTestId('yo-step-navigator-step')[0];panel.scrollTop=123;
 fireEvent.keyDown(v.getByRole('button',{name:'Open Yoppo'}),{key:'ArrowRight'});
 assert.equal(panel.getAttribute('data-yo-step-navigator-step-active'),'true');
 fireEvent.click(v.getByRole('button',{name:'Open Yoppo'}));
 assert.equal(v.getAllByRole('dialog').length,1);
 fireEvent.keyDown(window,{key:'ArrowRight'});
 assert.equal(panel.getAttribute('data-yo-step-navigator-step-active'),'true');
 fireEvent.click(v.getByRole('button',{name:'Back to my lesson'}));
 assert.equal(v.getByLabelText('Unfinished answer').value,'My unfinished answer');assert.equal(panel.scrollTop,123);
 fireEvent.click(v.getByTestId('yo-step-navigator-next'));fireEvent.click(v.getByTestId('yo-step-navigator-back'));
 assert.equal(v.getByLabelText('Unfinished answer').value,'My unfinished answer');
}]);
tests.push(['regional practice keeps answers, explains context, and never changes mastery',()=>{
 window.localStorage.setItem('progress-sentinel','unchanged');
 const v=render(<><SpanishRegionalPractice locale="en"/><DeckYoppoCoach locale="en" screen={{kind:'culture',title:'Regional words'}}/></>);
 for(const item of spanishRegionalPractice){assert.ok(item.source.startsWith('https://'));assert.ok((item.choices as readonly string[]).includes(item.answer));}
 fireEvent.click(v.getByRole('button',{name:'computadora',exact:true}));
 assert.ok(v.getByRole('status').textContent.includes('same device'));
 fireEvent.click(v.getByRole('button',{name:'Open Yoppo'}));fireEvent.click(v.getByRole('button',{name:'Back to my lesson'}));
 assert.equal(v.getByRole('button',{name:'computadora',exact:true}).getAttribute('aria-pressed'),'true');
 fireEvent.click(v.getByRole('button',{name:'Next example'}));fireEvent.click(v.getByRole('button',{name:'Previous example'}));
 assert.equal(v.getByRole('button',{name:'computadora',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(window.localStorage.getItem('progress-sentinel'),'unchanged');
}]);
tests.push(['quiz companion never exposes unchecked helper answers',()=>{
 const v=render(<DeckYoppoCoach locale="en" screen={{kind:'quiz',title:'Independent checkpoint',helperText:'The hidden answer is quattro'}}/>);
 fireEvent.click(v.getByRole('button',{name:'Open Yoppo'}));
 fireEvent.click(v.getByRole('button',{name:'Help me'}));
 assert.equal(v.queryByText('The hidden answer is quattro'),null);
 assert.ok(v.getByText('Try from memory. Then use the exercise hints to check your reasoning.'));
}]);
for(const locale of ['fr','en','es'] as const) tests.push([`${locale}: companion opens context help, plays trivia and returns without unmounting lesson`,()=>{
 const titles={fr:'Commander',en:'Order a drink',es:'Pedir una bebida'};
 const open={fr:'Ouvrir Yoppo',en:'Open Yoppo',es:'Abrir Yoppo'};
 const play={fr:'On joue ?',en:"Let's play",es:'¿Jugamos?'};
 const help={fr:'Aide-moi',en:'Help me',es:'Ayúdame'};
 const menu={fr:'Autre chose',en:'Something else',es:'Otra cosa'};
 const back={fr:'Revenir à ma leçon',en:'Back to my lesson',es:'Volver a mi lección'};
 const v=render(<><input aria-label="draft" defaultValue="my unfinished response"/><DeckYoppoCoach locale={locale} screen={{id:'dialogue',kind:'dialogue',title:titles[locale],companionState:'idle',content:null}}/></>);
 fireEvent.click(v.getByRole('button',{name:open[locale]})); assert.ok(document.querySelector('dialog[open]'));
 assert.ok(v.getByText(titles[locale]));
 fireEvent.click(v.getByRole('button',{name:help[locale]}));
 fireEvent.click(v.getByRole('button',{name:menu[locale]}));
 fireEvent.click(v.getByRole('button',{name:play[locale]}));
 const choices=Array.from(document.querySelectorAll('dialog button[aria-pressed]')) as HTMLButtonElement[];
 assert.ok(choices.length>=2);fireEvent.click(choices.at(-1)!);
 assert.ok(v.getByRole('status'));
 fireEvent.click(v.getByRole('button',{name:back[locale]}));
 assert.equal(document.querySelector('dialog[open]'),null);
 assert.equal(v.getByLabelText('draft').value,'my unfinished response');
}]);
tests.push(['Italian introduces the scene before vocabulary and offers optional recall',()=>{
 const l=(text:string)=>({fr:text,en:text,es:text});
 const phrase={it:'Ciao',meaning:l('Hello')};
 const lesson:CourseLesson={id:'example',title:l('Meeting someone'),goal:l('Introduce yourself'),vocabulary:[phrase],grammar:{title:l('Greeting'),body:l('Choose a greeting.'),examples:[phrase]},pronunciation:{body:l('Listen and repeat.'),practice:['Ciao']},reading:{it:'Ciao, Lina!',meaning:l('Hello, Lina!')},activities:[],speaking:{prompt:l('Say hello.'),checklist:[l('I greeted someone.')]}};
 const v=render(<ItalianStudyJourney lesson={lesson} locale="en" onPractice={()=>{}}/>);
 fireEvent.click(v.getByRole('button',{name:'2. The scene'}));assert.ok(v.getByText('Ciao, Lina!'));
 fireEvent.click(v.getByRole('button',{name:'3. Words'}));assert.ok(v.getByRole('table'));assert.equal(v.queryByText('Hello'),null);
 fireEvent.click(v.getByRole('button',{name:'Show translation'}));assert.ok(v.getByText('Hello'));
 fireEvent.click(v.getByRole('button',{name:'Practise from memory'}));assert.equal(v.queryByRole('table'),null);assert.ok(v.getByRole('button',{name:'Check the meaning'}));
 fireEvent.click(v.getByRole('button',{name:'Check the meaning'}));
 fireEvent.click(v.getByRole('button',{name:'4. Language'}));fireEvent.click(v.getByRole('button',{name:'3. Words'}));
 assert.ok(v.getByRole('button',{name:'Recalled'}));
 fireEvent.click(v.getByRole('button',{name:'6. Your turn'}));
 fireEvent.change(v.getByLabelText('My attempt in Italian'),{target:{value:'Ciao, mi chiamo Lina'}});
 fireEvent.click(v.getByRole('checkbox'));
 fireEvent.click(v.getByRole('button',{name:'2. The scene'}));fireEvent.click(v.getByRole('button',{name:'6. Your turn'}));
 assert.equal(v.getByLabelText('My attempt in Italian').value,'Ciao, mi chiamo Lina');assert.equal(v.getByRole('checkbox').checked,true);
}]);
async function main(){
let failures=0;
for(const [name,test] of tests){try{await test();console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,e);}finally{cleanup();}}
dom.window.close(); if(failures)process.exitCode=1;
}
void main();
