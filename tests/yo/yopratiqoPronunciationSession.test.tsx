import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {buildPublicAudioUrl} from "@/lib/yo/audio/audioUrl";
import {BUNDLED_AUDIO_REPAIRS} from "@/lib/yo/audio/bundledRepairs";
import {validateMp3} from "../../scripts/generate-yopratiqo-audio";
import { createRequire } from "node:module";
import * as React from "react";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { italianBolognaAudio } from "@/lib/yo/audio/italianBolognaAudio";
const require=createRequire(`${process.cwd()}/package.json`),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><body></body></html>',{url:'https://example.test',pretendToBeVisual:true});
for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
const {render,cleanup,fireEvent,act}=require('@testing-library/react') as typeof import('@testing-library/react');
const {IntroAudio}=require('@/components/yo/shared/IntroAudio') as typeof import('@/components/yo/shared/IntroAudio');
const {LearningAudio}=require('@/components/yo/personalized/LearningAudio') as typeof import('@/components/yo/personalized/LearningAudio');
const {lessonAudioIsBusy}=require('@/lib/yo/audio/lessonAudioActivity') as typeof import('@/lib/yo/audio/lessonAudioActivity');
process.env.NEXT_PUBLIC_SUPABASE_URL='https://audio.example.test';
const timers=new Map<number,{fn:()=>void;ms:number}>();let timerId=0;
const originalTimeout=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
Object.defineProperty(globalThis,'setTimeout',{value:(fn:()=>void,ms:number)=>{timers.set(++timerId,{fn,ms});return timerId;},configurable:true});
Object.defineProperty(globalThis,'clearTimeout',{value:(id:number)=>timers.delete(id),configurable:true});
let audios:Audio[]=[],utterances:Speech[]=[],voices:{lang:string}[]=[];
class Audio extends dom.window.EventTarget {
 src:string;preload='';playbackRate=1;preservesPitch=false;currentTime=0;paused=0;
 constructor(src:string){super();this.src=src;audios.push(this);}play(){return Promise.resolve();}pause(){this.paused++;}load(){}removeAttribute(){this.src='';}emit(event:string){this.dispatchEvent(new Event(event));}
}
class Speech {text:string;lang='';voice:unknown;rate=1;onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text;}}
const voiceEvents=new dom.window.EventTarget();
Object.defineProperty(window,'Audio',{value:Audio,configurable:true});
Object.defineProperty(globalThis,'SpeechSynthesisUtterance',{value:Speech,configurable:true});
Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voices,speak:(u:Speech)=>utterances.push(u),cancel:()=>{},addEventListener:voiceEvents.addEventListener.bind(voiceEvents),removeEventListener:voiceEvents.removeEventListener.bind(voiceEvents)},configurable:true});
const mount=(path?:string,lang='en-CA',onListen=()=>{})=>render(<IntroAudio text="Hello!" speechLocale={lang} locale="en" path={path} onListen={onListen}/>);
const click=(v:ReturnType<typeof mount>)=>fireEvent.click(v.getByRole('button',{name:'Listen to the message'}));
const tick=(ms:number)=>act(()=>{const pending=[...timers.entries()].filter(([,v])=>v.ms===ms);for(const [id,{fn}]of pending){timers.delete(id);fn();}});
const cases:[string,()=>void][]=[];const test=(name:string,fn:()=>void)=>cases.push([name,fn]);
test('recorded playback counts actual sound once, never the request or buffering',()=>{
 let heard=0;const v=mount('yo/en/hello.mp3','en-CA',()=>heard++);click(v);assert.equal(heard,0);assert.ok(lessonAudioIsBusy());
 act(()=>audios[0].emit('playing'));act(()=>audios[0].emit('waiting'));act(()=>audios[0].emit('playing'));assert.equal(heard,1);assert.equal(utterances.length,0);
 act(()=>audios[0].emit('ended'));assert.equal(lessonAudioIsBusy(),false);
});
test('missing recording falls back to the exact regional voice without fabricated listening',()=>{
 voices=[{lang:'pt-PT'},{lang:'pt-BR'}];let heard=0;const v=mount('yo/pt-br/missing.mp3','pt-BR',()=>heard++);click(v);act(()=>audios[0].emit('error'));
 assert.equal(heard,0);assert.equal(utterances.length,1);assert.deepEqual(utterances[0].voice,{lang:'pt-BR'});assert.ok(lessonAudioIsBusy());
 act(()=>utterances[0].onstart?.());assert.equal(heard,1);act(()=>utterances[0].onend?.());assert.equal(lessonAudioIsBusy(),false);
});
test('stalled recording has a bounded fallback, and does not leave automatic next paused forever',()=>{
 voices=[{lang:'en-CA'}];const v=mount('yo/en/stall.mp3');click(v);act(()=>audios[0].emit('playing'));act(()=>audios[0].emit('stalled'));tick(12000);assert.equal(utterances.length,1);
 act(()=>utterances[0].onerror?.());assert.equal(lessonAudioIsBusy(),false);assert.match(v.getByRole('status').textContent??'',/unavailable/);
});
test('a second tap stops a loading file and late events cannot restart it',()=>{
 voices=[{lang:'en-CA'}];let heard=0;const v=mount('yo/en/loading.mp3','en-CA',()=>heard++);click(v);click(v);assert.equal(lessonAudioIsBusy(),false);
 act(()=>{audios[0].emit('playing');audios[0].emit('error');});tick(12000);assert.equal(heard,0);assert.equal(utterances.length,0);
});
test('voices that arrive after the click are used; cancelling removes the delayed listener',()=>{
 const v=mount();click(v);assert.equal(utterances.length,0);voices=[{lang:'en-CA'}];act(()=>voiceEvents.dispatchEvent(new Event('voiceschanged')));assert.equal(utterances.length,1);
 click(v);assert.equal(lessonAudioIsBusy(),false);act(()=>voiceEvents.dispatchEvent(new Event('voiceschanged')));assert.equal(utterances.length,1);
});
test('Mandarin does not use Cantonese; unavailable voice releases the lock',()=>{
 voices=[{lang:'zh-HK'}];let heard=0;const v=mount(undefined,'zh-CN',()=>heard++);click(v);tick(1800);assert.equal(utterances.length,0);assert.equal(heard,0);assert.equal(lessonAudioIsBusy(),false);assert.ok(v.getByRole('status'));
});
test('regional French never silently switches to France French',()=>{
 voices=[{lang:'fr-FR'}];const v=mount(undefined,'fr-CA');click(v);tick(1800);assert.equal(utterances.length,0);assert.equal(lessonAudioIsBusy(),false);
});
test('route cancellation and hidden pages stop speech and pending sounds safely',()=>{
 voices=[{lang:'en-CA'}];const v=mount();click(v);act(()=>utterances[0].onstart?.());act(()=>window.dispatchEvent(new Event('yo-audio-stop')));assert.equal(lessonAudioIsBusy(),false);
 click(v);Object.defineProperty(document,'hidden',{value:true,configurable:true});act(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(lessonAudioIsBusy(),false);Object.defineProperty(document,'hidden',{value:false,configurable:true});
});
test('slow replay preserves the recording and pitch; switching speed cancels the old session',()=>{
 const v=mount('yo/en/speed.mp3');click(v);fireEvent.click(v.getByRole('button',{name:'1× · Slow down'}));assert.equal(lessonAudioIsBusy(),false);click(v);assert.equal(audios[1].playbackRate,.78);assert.equal(audios[1].preservesPitch,true);assert.match(audios[1].src,/speed.mp3$/);
});
test('unmount clears active and delayed audio lifecycles',()=>{
 const v=mount();click(v);v.unmount();voices=[{lang:'en-CA'}];act(()=>voiceEvents.dispatchEvent(new Event('voiceschanged')));tick(1800);assert.equal(utterances.length,0);assert.equal(lessonAudioIsBusy(),false);
});
test('Italian reuses existing Bologna recordings even without a provider projection',()=>{
 const p=italianBolognaAudio[0];const v=render(<LearningAudio text={p.text} locale="en"/>);fireEvent.click(v.getByRole('button',{name:`Listen : ${p.text}`}));assert.equal(audios.length,1);assert.ok(audios[0].src.endsWith(p.storagePath));assert.equal(utterances.length,0);
});
test('Italian projection ignores presentation punctuation only, never substitutes another name',()=>{
 const paths=courseAudioPaths(['Grazie!','Grazie.','Mi chiamo NeverRecordedName.']);assert.ok(paths['Grazie!']);assert.equal(paths['Grazie!'],paths['Grazie.']);assert.equal(paths['Mi chiamo NeverRecordedName.'],undefined);
});
test('audited missing Quebec object resolves to a validated, provenance-tracked recording',()=>{
 const [path,local]=Object.entries(BUNDLED_AUDIO_REPAIRS)[0];const data=readFileSync('public'+local);const meta=JSON.parse(readFileSync('docs/yo/QUEBEC_AUDIO_REPAIR.json','utf8'));
 assert.equal(createHash('sha256').update(data).digest('hex'),meta.sha256);assert.ok(validateMp3(data,'audio/mpeg').durationSeconds>1.7);assert.equal(buildPublicAudioUrl(path),local);assert.ok(buildPublicAudioUrl(path,{bucket:'another'})?.includes('/another/'));
});
let failed=0;
try{for(const [name,fn]of cases){cleanup();timers.clear();audios=[];utterances=[];voices=[];try{fn();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name,e);}finally{cleanup();assert.equal(lessonAudioIsBusy(),false);}}}
finally{Object.defineProperty(globalThis,'setTimeout',{value:originalTimeout,configurable:true});Object.defineProperty(globalThis,'clearTimeout',{value:originalClear,configurable:true});dom.window.close();}
console.log(`${cases.length-failed}/${cases.length} pronunciation lifecycle checks passed`);if(failed)process.exitCode=1;
