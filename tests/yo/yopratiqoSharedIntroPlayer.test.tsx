import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { introCourses } from "@/lib/yo/shared/course";
import { courseSteps } from "@/lib/yo/shared/steps";
import { introKey } from "@/lib/yo/shared/state";
import type { Exercise, IntroCourse } from "@/lib/yo/shared/types";
const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key,value] of Object.entries({ window:dom.window, self:dom.window, document:dom.window.document, navigator:dom.window.navigator, HTMLElement:dom.window.HTMLElement, Element:dom.window.Element, Node:dom.window.Node, NodeFilter:dom.window.NodeFilter, DocumentFragment:dom.window.DocumentFragment, HTMLInputElement:dom.window.HTMLInputElement, CustomEvent:dom.window.CustomEvent, Event:dom.window.Event, MutationObserver:dom.window.MutationObserver, getComputedStyle:dom.window.getComputedStyle, localStorage:dom.window.localStorage, requestAnimationFrame:(fn:FrameRequestCallback)=>{frames.set(++frameId,fn);return frameId;}, cancelAnimationFrame:(id:number)=>frames.delete(id), IS_REACT_ACT_ENVIRONMENT:true })) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};window.scrollTo=()=>{};
class FakeAudio extends dom.window.EventTarget { src:string;preload="none";playbackRate=1;preservesPitch=true;currentTime=0;constructor(src:string){super();this.src=src;}play(){this.dispatchEvent(new Event("playing"));return Promise.resolve();}pause(){}load(){}removeAttribute(){this.src="";} }
window.Audio=FakeAudio as unknown as typeof Audio;
process.env.NEXT_PUBLIC_SUPABASE_URL="https://audio.example.test";
const {render,cleanup,fireEvent,act,within}=require("@testing-library/react") as typeof import("@testing-library/react");

class Speech { text:string;lang="";voice:unknown;rate=1;onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text;} }
Object.defineProperty(globalThis,"SpeechSynthesisUtterance",{value:Speech,configurable:true});
Object.defineProperty(window,"speechSynthesis",{value:{speaking:false,pending:false,getVoices:()=>introCourses.map(c=>({lang:c.speechLocale,name:c.nativeName})),speak:(u:Speech)=>{u.onstart?.();u.onend?.();},cancel:()=>{},addEventListener:()=>{},removeEventListener:()=>{}},configurable:true});
const {SharedIntro}=require("@/components/yo/shared/SharedIntro") as typeof import("@/components/yo/shared/SharedIntro");
function flush(){for(let i=0;i<20&&frames.size;i++){const f=[...frames.values()];frames.clear();act(()=>f.forEach(fn=>fn(0)));}}
function click(el:HTMLElement){fireEvent.click(el);flush();}
function mount(c:IntroCourse){const v=render(<SharedIntro course={c} locale="en" audio={{}}/>);flush();return v;}
type View=ReturnType<typeof mount>;
function solve(v:View,c:IntroCourse,e:Exercise){
 const box=within(v.container.querySelector("[data-intro-question]") as HTMLElement);
 if(e.kind==="listen")click(box.getByRole("button",{name:"Listen to the message"}));
 if(e.kind==="order"){const group=within(box.getByRole("group",{name:"Available words"}));for(const part of c.phrases.find(p=>p.id===e.answer)!.parts!){const b=group.getAllByRole("button",{name:part}).find(b=>!(b as HTMLButtonElement).disabled)!;click(b);}}
 else click(box.getByRole("button",{name:(name:string)=>name.startsWith(c.phrases.find(p=>p.id===e.answer)!.text)}));
 click(box.getByRole("button",{name:"Check"}));click(box.getByRole("button",{name:"Continue"}));
}
let tests=0;
for(const c of introCourses){
 cleanup();localStorage.clear();frames.clear();localStorage.setItem('legacy-progress-sentinel','do-not-change');
 let v=mount(c);click(v.getByRole('button',{name:'I’m starting from zero'}));click(v.getByRole('button',{name:'Travel'}));
 assert.equal((v.getByRole('button',{name:'Continue'}) as HTMLButtonElement).disabled,true);
 click(v.getByRole('radio',{name:'120 min'}));assert.equal((v.getByRole('radio',{name:'120 min'}) as HTMLInputElement).checked,true);
 click(v.getByRole('button',{name:'Continue'}));assert.equal(v.queryByRole('combobox'),null);click(v.getByRole('button',{name:'Start here'}));
 click(v.getByRole('button',{name:'Word notebook'}));assert.ok(v.getByRole('dialog'));assert.ok(within(v.getByRole('dialog')).getByText(c.phrases.find(p=>p.id==='age30')!.text,{exact:true}));click(within(v.getByRole('dialog')).getByRole('button',{name:'Close'}));
 click(v.getByRole('button',{name:'Start my mission'}));
 for(const step of courseSteps(c)){
  const m=c.missions[step.mission];
  if(step.kind==='visual'){const item=m.visuals[step.index%m.visuals.length];const group=within(v.getByRole('group',{name:'Four images'}));assert.equal(group.getAllByRole('button').length,4);click(group.getByRole('button',{name:item.pictures.find(p=>p.id===item.answer)!.alt.en}));click(v.getByRole('button',{name:'Check'}));click(v.getByRole('button',{name:'Continue'}));}
  else if(step.kind==='exercise')solve(v,c,m.practice[step.index]);
  else click(v.getByRole('button',{name:step.kind==='words'?'Enter the mission':'Continue'}));
  assert.equal(v.container.querySelectorAll('textarea,input[type=text],input[type=checkbox]').length,0);
 }
 for(const e of c.final)solve(v,c,e);
 assert.ok(v.getByRole('heading',{name:'Your stamp is in your passport!'}));click(v.getByRole('button',{name:'Back to my journey'}));
 assert.ok(v.getByText('250 learning points',{exact:true}));const before=localStorage.getItem(introKey(c.language));cleanup();v=mount(c);assert.ok(v.getByText('250 learning points',{exact:true}));assert.equal(localStorage.getItem(introKey(c.language)),before);assert.equal(localStorage.getItem('legacy-progress-sentinel'),'do-not-change');
 console.log(`PASS ${c.slug}: onboarding, all visual/teaching/practice steps, independent final, bank, reload and untouched legacy`);tests++;
}
cleanup();console.log(`${tests} complete language journeys passed`);
