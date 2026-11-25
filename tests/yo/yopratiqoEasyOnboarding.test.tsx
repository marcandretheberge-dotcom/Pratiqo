import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key,value] of Object.entries({ window:dom.window, self:dom.window, document:dom.window.document, navigator:dom.window.navigator, HTMLElement:dom.window.HTMLElement, Element:dom.window.Element, Node:dom.window.Node, NodeFilter:dom.window.NodeFilter, DocumentFragment:dom.window.DocumentFragment, HTMLInputElement:dom.window.HTMLInputElement, CustomEvent:dom.window.CustomEvent, Event:dom.window.Event, MutationObserver:dom.window.MutationObserver, getComputedStyle:dom.window.getComputedStyle, localStorage:dom.window.localStorage, requestAnimationFrame:(fn:FrameRequestCallback)=>{frames.set(++frameId,fn);return frameId;}, cancelAnimationFrame:(id:number)=>frames.delete(id), IS_REACT_ACT_ENVIRONMENT:true })) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};window.scrollTo=()=>{};
class FakeAudio extends dom.window.EventTarget { src:string;preload="none";playbackRate=1;preservesPitch=true;currentTime=0;constructor(src:string){super();this.src=src;}play(){this.dispatchEvent(new Event("playing"));return Promise.resolve();}pause(){}load(){}removeAttribute(){this.src="";} }
window.Audio=FakeAudio as unknown as typeof Audio;
process.env.NEXT_PUBLIC_SUPABASE_URL="https://audio.example.test";
const {render,cleanup,fireEvent,act}=require("@testing-library/react") as typeof import("@testing-library/react");

import { personalizedItalianCatalog, placementChecks } from "@/lib/yo/personalized/courseData";
import { GUIDED_PROGRESS_KEY, type LearningProfile } from "@/lib/yo/personalized/profile";
const { ItalianOnboarding }=require("@/components/yo/personalized/ItalianOnboarding") as typeof import("@/components/yo/personalized/ItalianOnboarding");
type View=ReturnType<typeof render>;
function flush(){for(let i=0;i<15&&frames.size;i++){const f=[...frames.values()];frames.clear();act(()=>f.forEach(fn=>fn(0)));}}
function click(el:HTMLElement){fireEvent.click(el);flush();}
const tests:[string,()=>void][]=[];
const initial:LearningProfile={version:1,language:"it",experience:"new",goal:"travel",weeklyMinutes:90,startUnitId:"u01",placement:"beginner",reviewUnitIds:[],updatedAt:Date.now()};
function mount(locale:"fr"|"en"|"es"="en",profile?:LearningProfile){
 let saved:LearningProfile|undefined;
 const view=render(<ItalianOnboarding locale={locale} catalog={personalizedItalianCatalog} checks={placementChecks} audioPaths={{}} initial={profile} onComplete={p=>{saved=p;}}/>);flush();
 return {view,result:()=>saved};
}
function time(v:View){click(v.getByRole("button",{name:"I’m starting from zero"}));click(v.getByRole("button",{name:"Travel"}));}
const options=[[30,"30 min / week"],[60,"1 h / week"],[120,"2 h / week"],[180,"3 h / week"],[0,"At my pace"]] as const;
for(const [minutes,label] of options)tests.push([`${minutes}: visible exclusive selection and exact saved pace`,()=>{
 const {view:v,result}=mount();time(v);
 assert.equal((v.getByRole("button",{name:"Continue"}) as HTMLButtonElement).disabled,true);
 assert.equal(v.container.querySelectorAll("input[type=radio]:checked").length,0);
 click(v.getByRole("radio",{name:label}));
 assert.equal(v.container.querySelectorAll("input[type=radio]:checked").length,1);
 assert.equal(v.container.querySelectorAll('[data-pace-selected="true"]').length,1);
 assert.ok(v.container.querySelector(`[data-pace-choice="${minutes}"] [data-pace-selected="true"] svg`));
 click(v.getByRole("button",{name:"Continue"}));
 assert.equal(v.container.querySelector("[data-pace-summary]")?.textContent,label);
 assert.equal(v.queryByRole("combobox"),null);
 assert.equal(v.queryByRole("button",{name:"Skip"}),null);
 assert.doesNotMatch(v.container.textContent??"",/certification|Paid access|stamps|Your goal:/);
 click(v.getByRole("button",{name:"Start here"}));
 assert.equal(result()?.weeklyMinutes,minutes);assert.equal(result()?.startUnitId,"u01");assert.equal(result()?.goal,"travel");assert.equal(localStorage.length,0);
}]);
tests.push(["changing an option clears the previous check; Back preserves the final choice",()=>{
 const {view:v,result}=mount();time(v);
 for(const [,label] of options)click(v.getByRole("radio",{name:label}));
 click(v.getByRole("radio",{name:"2 h / week"}));click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Back"}));
 assert.equal((v.getByRole("radio",{name:"2 h / week"}) as HTMLInputElement).checked,true);
 click(v.getByRole("radio",{name:"30 min / week"}));click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Start here"}));assert.equal(result()?.weeklyMinutes,30);
}]);
tests.push(["custom duration validates blank, negative, fractional and excessive values",()=>{
 const {view:v,result}=mount();time(v);click(v.getByRole("button",{name:"Choose another duration"}));
 const input=v.getByRole("spinbutton"),next=v.getByRole("button",{name:"Continue"}) as HTMLButtonElement;
 for(const value of ["","-1","0","14","15.5","1201"]){fireEvent.change(input,{target:{value}});assert.equal(next.disabled,true,value);}
 fireEvent.change(input,{target:{value:"90"}});assert.equal(next.disabled,false);
 click(next);assert.equal(v.container.querySelector("[data-pace-summary]")?.textContent,"90 min / week");click(v.getByRole("button",{name:"Start here"}));assert.equal(result()?.weeklyMinutes,90);
}]);
tests.push(["existing custom preferences are visible on edit and not reset",()=>{
 const {view:v,result}=mount("en",initial);time(v);
 assert.equal((v.getByRole("spinbutton") as HTMLInputElement).value,"90");
 click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Start here"}));assert.equal(result()?.weeklyMinutes,90);
}]);
tests.push(["hiding a restored custom value cannot leave an invisible selected pace",()=>{
 const {view:v}=mount("en",initial);time(v);click(v.getByRole("button",{name:"Choose another duration"}));
 assert.equal(v.queryByRole("spinbutton"),null);assert.equal((v.getByRole("button",{name:"Continue"}) as HTMLButtonElement).disabled,true);
}]);
tests.push(["preset choice replaces custom duration rather than keeping a hidden value",()=>{
 const {view:v,result}=mount("en",initial);time(v);click(v.getByRole("radio",{name:"3 h / week"}));assert.equal(v.queryByRole("spinbutton"),null);
 click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Start here"}));assert.equal(result()?.weeklyMinutes,180);
}]);
tests.push(["mission picker is optional and still changes the actual starting unit",()=>{
 const {view:v,result}=mount();time(v);click(v.getByRole("radio",{name:"1 h / week"}));click(v.getByRole("button",{name:"Continue"}));
 assert.equal(v.queryByRole("combobox"),null);click(v.getByRole("button",{name:"Change mission"}));fireEvent.change(v.getByRole("combobox"),{target:{value:"u05"}});
 click(v.getByRole("button",{name:"Change mission"}));assert.equal(v.queryByRole("combobox"),null);click(v.getByRole("button",{name:"Start here"}));
 assert.equal(result()?.startUnitId,"u05");assert.equal(result()?.placement,"manual");assert.equal(localStorage.getItem(GUIDED_PROGRESS_KEY),null);
}]);
tests.push(["skip without a pace uses untimed mode, not an invented commitment",()=>{
 const {view:v,result}=mount();click(v.getByRole("button",{name:"Skip"}));assert.ok(v.getByRole("combobox"));click(v.getByRole("button",{name:"Start here"}));assert.equal(result()?.weeklyMinutes,0);
}]);
for(const [locale,zero,travel,next,start]of [["fr","Je pars de zéro","Voyager","Continuer","Commencer ici"],["es","Empiezo de cero","Viajar","Continuar","Empezar aquí"]] as const)tests.push([`${locale}: guide stays in the DOM, focused title and uncluttered recommendation`,()=>{
 const {view:v,result}=mount(locale);click(v.getByRole("button",{name:zero}));click(v.getByRole("button",{name:travel}));
 click(v.getAllByRole("radio")[2]);click(v.getByRole("button",{name:next}));assert.ok(v.container.querySelector("[data-yoppo-guide] img"));assert.equal(document.activeElement,v.getByRole("heading",{level:1}));
 assert.equal(v.queryByRole("combobox"),null);assert.equal(v.queryByRole("checkbox"),null);click(v.getByRole("button",{name:start}));assert.equal(result()?.weeklyMinutes,120);
}]);
let failures=0;for(const[name,test]of tests){cleanup();localStorage.clear();frames.clear();try{test();console.log(`PASS ${name}`);}catch(e){failures++;console.error(`FAIL ${name}`,e);}finally{cleanup();frames.clear();}}console.log(`${tests.length-failures}/${tests.length} easy onboarding checks passed`);if(failures)process.exitCode=1;
