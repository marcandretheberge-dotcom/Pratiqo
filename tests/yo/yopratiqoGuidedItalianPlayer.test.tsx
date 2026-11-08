import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { italianCourseUnits, italianCourseCatalog } from "@/lib/yo/italian/course/courseData";
import { guidedSteps, GUIDED_KEY } from "@/lib/yo/italian/course/guidedItalian";
import { ITALIAN_COURSE_PROGRESS_KEY } from "@/lib/yo/italian/course/courseProgress";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import type { ItalianActivity } from "@/lib/yo/italian/italianModuleTypes";
import type { YoLocale } from "@/lib/yo/types";
const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key,value] of Object.entries({ window:dom.window, self:dom.window, document:dom.window.document, navigator:dom.window.navigator, HTMLElement:dom.window.HTMLElement, Element:dom.window.Element, Node:dom.window.Node, NodeFilter:dom.window.NodeFilter, DocumentFragment:dom.window.DocumentFragment, HTMLInputElement:dom.window.HTMLInputElement, CustomEvent:dom.window.CustomEvent, Event:dom.window.Event, MutationObserver:dom.window.MutationObserver, getComputedStyle:dom.window.getComputedStyle, localStorage:dom.window.localStorage, requestAnimationFrame:(fn:FrameRequestCallback)=>{frames.set(++frameId,fn);return frameId;}, cancelAnimationFrame:(id:number)=>frames.delete(id), IS_REACT_ACT_ENVIRONMENT:true })) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};window.scrollTo=()=>{};
class FakeAudio extends dom.window.EventTarget { src:string;preload="none";playbackRate=1;preservesPitch=true;currentTime=0;constructor(src:string){super();this.src=src;}play(){this.dispatchEvent(new Event("playing"));return Promise.resolve();}pause(){}load(){}removeAttribute(){this.src="";} }
window.Audio=FakeAudio as unknown as typeof Audio;
process.env.NEXT_PUBLIC_SUPABASE_URL="https://audio.example.test";
const { GuidedItalianCourse } = require("@/components/yo/italian/guided/GuidedItalianCourse") as typeof import("@/components/yo/italian/guided/GuidedItalianCourse");
const {render,cleanup,fireEvent,act,within}=require("@testing-library/react") as typeof import("@testing-library/react");
const unit=italianCourseUnits[0],steps=guidedSteps(unit);
type View=ReturnType<typeof render>;
function flush(){for(let i=0;i<10&&frames.size;i++){const pending=[...frames.values()];frames.clear();act(()=>pending.forEach(fn=>fn(0)));}}
let clock=Date.now();Date.now=()=>clock;
function click(el:HTMLElement){clock+=500;fireEvent.click(el);flush();}
function mount(extra:Partial<React.ComponentProps<typeof GuidedItalianCourse>>={}){localStorage.setItem("yo.practice.auto-next.v1","off");const v=render(<GuidedItalianCourse unit={unit} catalog={italianCourseCatalog} locale="en" audioPaths={courseAudioPaths(unitSpeech(unit))} {...extra}/>);flush();return v;}
function skip(v:View){const b=v.queryByRole("button",{name:"Skip the tour"});if(b)click(b);}
function solve(v:View,a:ItalianActivity,wrong=false){
 const box=within(v.container.querySelector("[data-guided-game]") as HTMLElement);
 if(a.kind==="listen"||(a.kind==="type"&&a.listeningText))click(box.getByRole("button",{name:"Listen : the exercise message"}));
 if(a.kind==="match")for(const pair of a.pairs){click(box.getByRole("button",{name:pair.it}));click(box.getByRole("button",{name:pair.meaning.en}));}
 else if(a.kind==="order"||a.kind==="type"){
  const group=within(box.getByRole("group",{name:"Available words"}));
  for(const word of a.kind==="order"?a.answer:a.model.split(/\s+/))click(group.getAllByRole("button",{name:word}).find(b=>!(b as HTMLButtonElement).disabled)!);
  click(box.getByRole("button",{name:"Check"}));
 }else if(a.kind==="dialogue")for(const [i,t] of a.turns.entries()){
  const option=t.options.find(o=>o.id===t.correctId)!;click(box.getByRole("button",{name:option.it??option.label!.en}));assert.equal(box.queryByRole("button",{name:"Check"}),null);if(i<a.turns.length-1)click(box.getByRole("button",{name:"Continue the conversation"}));
 }else if(a.kind==="choice"||a.kind==="listen"||a.kind==="culture"){
  const option=a.options.find(o=>wrong?o.id!==a.correctId:o.id===a.correctId)!;click(box.getByRole("button",{name:option.it??option.label!.en}));assert.equal(box.queryByRole("button",{name:"Check"}),null);
 }
 assert.equal(v.container.querySelectorAll("input,textarea").length,0);
}
const tests:[string,()=>void][]=[];
tests.push(["first visit is skippable and starts a real mission",()=>{const v=mount();assert.ok(v.getByRole("button",{name:"Skip the tour"}));skip(v);click(v.getByRole("button",{name:"Start my mission"}));assert.ok(v.getByText(unit.lessons[0].reading.it,{exact:true}));assert.equal(v.getAllByRole("button",{name:"Continue"}).length,1);}]);
tests.push(["all 19 exercises finish sequentially with no typing or self-rating; final challenge follows",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Start my mission"}));for(const step of steps){if(step.activity)solve(v,step.activity);click(v.getByRole("button",{name:"Continue"}));}assert.ok(v.getByRole("button",{name:"Start the final challenge"}));const p=JSON.parse(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY)!);assert.equal(Object.values(p.activities).filter((a:unknown)=>(a as {completed:boolean}).completed).length,19);}]);
tests.push(["four independent correct answers earn one stamp and unlock the next unit",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Already confident? Try the final challenge"}));click(v.getByRole("button",{name:"Start the final challenge"}));unit.quiz.questions.forEach((q,i)=>{solve(v,q,i===4);click(v.getByRole("button",{name:i===4?"See my result":"Continue"}));});assert.ok(v.getByRole("heading",{name:"Your stamp is in your passport!"}));click(v.getByRole("button",{name:"Back to the map"}));assert.equal(v.getByRole("link",{name:"Continue to the next unit"}).getAttribute("href"),"/yo/langues/italien/parcours/u02?lang=en");const saved=localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY);cleanup();mount();assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),saved);}]);
tests.push(["notebook and reload preserve a selected response in an incoming exercise link",()=>{const props={initialLessonId:"it1-u01-l1",initialActivityId:"it1-u01-l1-read"};let v=mount(props);click(v.getByRole("button",{name:"Prego!"}));click(v.getByRole("button",{name:"Word notebook"}));assert.ok(v.getByRole("dialog"));click(within(v.getByRole("dialog")).getByRole("button",{name:"Close"}));assert.equal(v.getByRole("button",{name:"Prego!"}).getAttribute("aria-pressed"),"true");cleanup();v=mount(props);assert.equal(v.getByRole("button",{name:"Prego!"}).getAttribute("aria-pressed"),"true");}]);
tests.push(["a partly answered challenge resumes its exact question and selection",()=>{let v=mount();skip(v);click(v.getByRole("button",{name:"Already confident? Try the final challenge"}));click(v.getByRole("button",{name:"Start the final challenge"}));solve(v,unit.quiz.questions[0]);click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Listen : the exercise message"}));click(v.getByRole("button",{name:"Leggi."}));click(v.getByRole("button",{name:"Leave and save my place"}));cleanup();v=mount();click(v.getByRole("button",{name:"Final challenge"}));assert.equal(v.container.querySelector("[data-guided-game]")?.getAttribute("data-guided-game"),"it1-u01-q2");assert.equal(v.getByRole("button",{name:"Leggi."}).getAttribute("aria-pressed"),"true");}]);
tests.push(["transcript-assisted final does not silently earn an independent stamp",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Already confident? Try the final challenge"}));click(v.getByRole("button",{name:"Start the final challenge"}));unit.quiz.questions.forEach((q,i)=>{if(i===1)click(v.getByRole("button",{name:"Read instead of listen (with help)"}));solve(v,q);click(v.getByRole("button",{name:i===4?"See my result":"Continue"}));});assert.ok(v.getByRole("heading",{name:"Good practice with help. Retake the challenge without hints to earn the stamp."}));const p=JSON.parse(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY)!);assert.equal(p.assessments[unit.quiz.id].bestIndependent,null);}]);
tests.push(["French and Spanish open the same guided structure",()=>{for(const locale of ["fr","es"] as YoLocale[]){const v=mount({locale});assert.ok(v.getByRole("heading",{name:"Ciao, Bologna."}));assert.equal(v.container.querySelectorAll("input,textarea").length,0);cleanup();localStorage.clear();}}]);
tests.push(["Pratiqo Match uses real teacher search, not an invented matching endpoint",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Yoppo and my tools"}));assert.equal(v.getByRole("link",{name:"Find an Italian teacher"}).getAttribute("href"),"/trouver-un-prof?q=italien&lang=en");assert.ok(v.getByText(/No Pass is spent in this pilot/));}]);
tests.push(["malformed UI storage never crashes or changes canonical evidence",()=>{localStorage.setItem(GUIDED_KEY,"{bad json");const v=mount();skip(v);assert.ok(v.getByRole("button",{name:"Start my mission"}));assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),null);}]);
let failures=0;for(const [name,test] of tests){cleanup();localStorage.clear();frames.clear();try{test();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}`,error);}finally{cleanup();frames.clear();}}
console.log(`${tests.length-failures}/${tests.length} guided player checks passed`);if(failures)process.exitCode=1;
