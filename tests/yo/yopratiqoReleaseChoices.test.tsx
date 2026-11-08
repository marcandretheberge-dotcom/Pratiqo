import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { visibleIntroPace, selectIntroVoice } from "@/lib/yo/shared/releaseChoices";
import { introCourses } from "@/lib/yo/shared/course";
import { emptyDraft, independentScore } from "@/lib/yo/shared/state";
import type { IntroProfile, Draft } from "@/lib/yo/shared/types";
let count=0;
function check(name:string,fn:()=>void){fn();count++;console.log('PASS '+name);}
check('custom minutes are not a visible preset',()=>{assert.equal(visibleIntroPace(90,false,'90'),null);assert.equal(visibleIntroPace(90,true,'90'),90);});
check('presets and no-goal retain exact values',()=>{for(const n of [0,30,60,120,180])assert.equal(visibleIntroPace(n,false,''),n);assert.equal(visibleIntroPace(null,false,''),null);});
check('custom bounds and integer validation',()=>{for(const t of ['', '0', '14', '1201','90.5','1e2','-30',' 90'])assert.equal(visibleIntroPace(null,true,t),null);for(const n of [15,90,1200])assert.equal(visibleIntroPace(null,true,String(n)),n);});
check('Mandarin never takes another Chinese variety',()=>{for(const lang of ['zh-HK','zh_TW','yue-CN','zh','zh-Hant-HK','en-US'])assert.equal(selectIntroVoice([{lang}],'zh-CN'),undefined);});
check('Mandarin exact voice and explicit compatible tags',()=>{for(const lang of ['zh-CN','ZH_cn','zh-Hans-CN','cmn-CN','cmn-Hans-CN'])assert.equal(selectIntroVoice([{lang}],'zh-CN')?.lang,lang);});
check('exact Mandarin wins regardless of list order',()=>assert.equal(selectIntroVoice([{lang:'zh-HK'},{lang:'cmn-CN'},{lang:'zh-CN'}],'zh-CN')?.lang,'zh-CN'));
check('regional French and Portuguese do not change dialect',()=>{assert.equal(selectIntroVoice([{lang:'fr-FR'}],'fr-CA'),undefined);assert.equal(selectIntroVoice([{lang:'pt-PT'}],'pt-BR'),undefined);assert.equal(selectIntroVoice([{lang:'FR_ca'}],'fr-CA')?.lang,'FR_ca');});
check('other target languages retain language-matched fallback',()=>{assert.equal(selectIntroVoice([{lang:'en-US'}],'en-CA')?.lang,'en-US');assert.equal(selectIntroVoice([{lang:'fr-FR'}],'en-CA'),undefined);});
const require=createRequire(`${process.cwd()}/package.json`),{JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://example.test/',pretendToBeVisual:true});
const frames=new Map<number,FrameRequestCallback>();let frameId=0;
for(const [key,value]of Object.entries({window:dom.window,self:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Element:dom.window.Element,Node:dom.window.Node,NodeFilter:dom.window.NodeFilter,DocumentFragment:dom.window.DocumentFragment,HTMLInputElement:dom.window.HTMLInputElement,CustomEvent:dom.window.CustomEvent,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,getComputedStyle:dom.window.getComputedStyle,localStorage:dom.window.localStorage,requestAnimationFrame:(fn:FrameRequestCallback)=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:(id:number)=>frames.delete(id),IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};window.scrollTo=()=>{};
const {render,cleanup,fireEvent,act}=require('@testing-library/react') as typeof import('@testing-library/react');
const {IntroWelcome}=require('@/components/yo/shared/IntroWelcome') as typeof import('@/components/yo/shared/IntroWelcome');
const {IntroAudio}=require('@/components/yo/shared/IntroAudio') as typeof import('@/components/yo/shared/IntroAudio');
const {IntroQuestion}=require('@/components/yo/shared/IntroQuestion') as typeof import('@/components/yo/shared/IntroQuestion');
const {LearningFeedbackProvider}=require('@/components/yo/feedback/LearningFeedback') as typeof import('@/components/yo/feedback/LearningFeedback');
function flush(){for(let i=0;i<20&&frames.size;i++){const all=[...frames.values()];frames.clear();act(()=>all.forEach(f=>f(0)));}}
function click(el:HTMLElement){fireEvent.click(el);flush();}
const labels={fr:['Je pars de zéro','Voyager','Continuer','Choisir une autre durée','Retour','Commencer ici','Passer'],en:['I’m starting from zero','Travel','Continue','Choose another duration','Back','Start here','Skip'],es:['Empiezo de cero','Viajar','Continuar','Elegir otra duración','Volver','Empezar aquí','Omitir']} as const;
for(const c of introCourses)for(const locale of ['fr','en','es'] as const){
 const [zero,travel,next,toggle,back,start,skip]=labels[locale];
 for(const skipHidden of [false,true])check(`${c.slug}/${locale}: ${skipHidden?'skip never submits invisible minutes':'hide/reopen/back/custom/preset consistency'}`,()=>{
  cleanup();localStorage.clear();frames.clear();const saved:IntroProfile[]=[];
  const v=render(<LearningFeedbackProvider><IntroWelcome course={c} locale={locale} audio={{}} initial={{experience:'new',goal:'travel',minutes:90,entry:0}} onComplete={p=>saved.push(p)}/></LearningFeedbackProvider>);flush();
  click(v.getByRole('button',{name:zero}));click(v.getByRole('button',{name:travel}));
  assert.equal((v.getByRole('spinbutton') as HTMLInputElement).value,'90');
  click(v.getByRole('button',{name:toggle}));assert.equal(v.queryByRole('spinbutton'),null);assert.equal(v.container.querySelectorAll('input[type=radio]:checked').length,0);assert.equal((v.getByRole('button',{name:next}) as HTMLButtonElement).disabled,true);
  if(skipHidden){click(v.getByRole('button',{name:skip}));click(v.getByRole('button',{name:start}));assert.equal(saved[0].minutes,0);}
  else{click(v.getByRole('button',{name:toggle}));assert.equal((v.getByRole('spinbutton') as HTMLInputElement).value,'90');click(v.getByRole('button',{name:next}));assert.match(v.container.textContent??'',/90 min/);click(v.getByRole('button',{name:back}));assert.equal((v.getByRole('spinbutton') as HTMLInputElement).value,'90');click(v.getByRole('button',{name:toggle}));click(v.getByRole('radio',{name:'120 min'}));click(v.getByRole('button',{name:next}));click(v.getByRole('button',{name:start}));assert.equal(saved[0].minutes,120);}
 });
}
async function audioChecks(){
 cleanup();frames.clear();let spoken=0,heard=0;
 class Speech{constructor(public text:string){}}
 Object.defineProperty(globalThis,'SpeechSynthesisUtterance',{value:Speech,configurable:true});
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-HK'}],speak:()=>spoken++,cancel:()=>{},addEventListener:()=>{},removeEventListener:()=>{}},configurable:true});
 const v=render(<IntroAudio text="我很累。" speechLocale="zh-CN" locale="en" onListen={()=>heard++}/>);
 click(v.getByRole('button',{name:'Listen to the message'}));await act(async()=>{await new Promise(r=>setTimeout(r,1900));});
 check('Cantonese-only device shows audio failure without fake listening',()=>{assert.equal(spoken,0);assert.equal(heard,0);assert.match(v.getByRole('status').textContent??'',/Audio is unavailable/);});
 cleanup();const c=introCourses.find(c=>c.language==='zh-Hans')!,e=c.final.find(e=>e.kind==='listen')!;let last:Draft=emptyDraft();
 function Question(){const [d,setD]=React.useState(emptyDraft);return <LearningFeedbackProvider><IntroQuestion course={c} locale="en" audio={{}} exercise={e} assessment value={d} onChange={v=>{last=v;setD(v);}} onContinue={()=>{}}/></LearningFeedbackProvider>;}
 const q=render(<Question/>);click(q.getByRole('button',{name:'Read the message'}));const text=c.phrases.find(p=>p.id===e.answer)!.text;
 click(q.getByRole('button',{name:(name:string)=>name.startsWith(text)}));click(q.getByRole('button',{name:'Check'}));
 check('unavailable-audio transcript remains assisted, not independent mastery',()=>{assert.equal(last.correct,true);assert.equal(last.assisted,true);assert.equal(last.heard,false);assert.equal(independentScore([last]),0);});
 cleanup();dom.window.close();console.log(`${count} release safety checks passed`);
}
void audioChecks().catch(e=>{cleanup();console.error(e);process.exitCode=1;});
