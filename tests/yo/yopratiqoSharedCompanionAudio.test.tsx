import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as React from 'react';
import { YoAudioPlayer } from '../../components/yo/YoAudioPlayer';
import { ItalianStudyJourney } from '../../components/yo/italian/course/ItalianStudyJourney';
import type { CourseLesson } from '../../lib/yo/italian/course/courseTypes';
import { DeckYoppoCoach } from '../../components/yo/companion/DeckYoppoCoach';
const require = createRequire(process.cwd()+"/package.json");
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'https://example.org',pretendToBeVisual:true});
for (const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true,React})) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
globalThis.requestAnimationFrame = (cb:FrameRequestCallback) => { cb(0); return 0; };
window.scrollTo=()=>{};
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
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
for(const locale of ['fr','en','es'] as const) tests.push([`${locale}: companion opens context help, plays trivia and returns without unmounting lesson`,()=>{
 const titles={fr:'Commander',en:'Order a drink',es:'Pedir una bebida'};
 const open={fr:'Ouvrir Yoppo',en:'Open Yoppo',es:'Abrir Yoppo'};
 const play={fr:'On joue ?',en:"Let's play",es:'¿Jugamos?'};
 const back={fr:'Revenir à ma leçon',en:'Back to my lesson',es:'Volver a mi lección'};
 const v=render(<><input aria-label="draft" defaultValue="my unfinished response"/><DeckYoppoCoach locale={locale} screen={{id:'dialogue',kind:'dialogue',title:titles[locale],companionState:'idle',content:null}}/></>);
 fireEvent.click(v.getByRole('button',{name:open[locale]})); assert.ok(document.querySelector('dialog[open]'));
 assert.ok(v.getByText(titles[locale]));
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
}]);
async function main(){
let failures=0;
for(const [name,test] of tests){try{await test();console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,e);}finally{cleanup();}}
dom.window.close(); if(failures)process.exitCode=1;
}
void main();
