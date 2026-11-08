import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";


import { ITALIAN_COURSE_PROGRESS_KEY } from "@/lib/yo/italian/course/courseProgress";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";


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

import { firstMeetingUnit, firstMeetingVisuals, firstMeetingBank } from "@/lib/yo/personalized/firstMeeting";
import { personalizedItalianCatalog, placementChecks } from "@/lib/yo/personalized/courseData";
import { profileKey, GUIDED_PROGRESS_KEY, type LearningProfile } from "@/lib/yo/personalized/profile";
import { activitySpeech } from "@/lib/yo/italian/course/courseSpeech";
const { ItalianOnboarding }=require("@/components/yo/personalized/ItalianOnboarding") as typeof import("@/components/yo/personalized/ItalianOnboarding");
const { ItalianLearningEntry }=require("@/components/yo/personalized/ItalianLearningEntry") as typeof import("@/components/yo/personalized/ItalianLearningEntry");
const { VisualVocabulary }=require("@/components/yo/personalized/VisualVocabulary") as typeof import("@/components/yo/personalized/VisualVocabulary");
const { ItalianAudioProvider }=require("@/components/yo/italian/ItalianAudioProvider") as typeof import("@/components/yo/italian/ItalianAudioProvider");
type View=ReturnType<typeof render>;
function flush(){for(let i=0;i<15&&frames.size;i++){const f=[...frames.values()];frames.clear();act(()=>f.forEach(fn=>fn(0)));}}
let clock=Date.now();Date.now=()=>clock;
function click(el:HTMLElement){clock+=500;fireEvent.click(el);flush();}
const tests:[string,()=>void][]=[];
const audio=courseAudioPaths(placementChecks.flatMap(c=>activitySpeech(c.activity)));
function onboarding(done:(p:LearningProfile)=>void){const v=render(<ItalianOnboarding locale="en" catalog={personalizedItalianCatalog} checks={placementChecks} audioPaths={audio} onComplete={done}/>);flush();return v;}
tests.push(["beginner answers level, purpose and time; no test or score is forced",()=>{let result:LearningProfile|undefined;const v=onboarding(p=>{result=p;});click(v.getByRole("button",{name:"I’m starting from zero"}));click(v.getByRole("button",{name:"Travel"}));click(v.getByRole("radio",{name:"2 h / week"}));click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Start here"}));assert.equal(result?.startUnitId,"u01");assert.equal(result?.weeklyMinutes,120);assert.equal(result?.goal,"travel");assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),null);}]);
tests.push(["experienced learner can manually choose a later module without spending or awarding",()=>{let result:LearningProfile|undefined;const v=onboarding(p=>{result=p;});click(v.getByRole("button",{name:"I have a background, but I’m rusty"}));click(v.getByRole("button",{name:"Family and friends"}));click(v.getByRole("radio",{name:"1 h / week"}));click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Choose for myself"}));fireEvent.change(v.getByRole("combobox"),{target:{value:"u05"}});click(v.getByRole("button",{name:"Start here"}));assert.equal(result?.startUnitId,"u05");assert.equal(result?.placement,"manual");assert.equal([...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).filter(k=>k!=="yo.practice.auto-next.v1").length,0);}]);
tests.push(["three failed checked placement answers recommend foundations without awarding mastery",()=>{let result:LearningProfile|undefined;const v=onboarding(p=>{result=p;});click(v.getByRole("button",{name:"I know a few words"}));click(v.getByRole("button",{name:"Learn the language thoroughly"}));click(v.getByRole("radio",{name:"1 h / week"}));click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Find my starting point"}));for(let i=0;i<3;i++){const q=placementChecks[i].activity;const box=within(v.container.querySelector("[data-guided-game]") as HTMLElement);const read=box.queryByRole("button",{name:"Read instead of listen (with help)"});if(read)click(read);if(q.kind==="type"){click(within(box.getByRole("group",{name:"Available words"})).getAllByRole("button")[0]);}else{const wrong=q.options.find(o=>o.id!==q.correctId)!;click(box.getByRole("button",{name:wrong.it??wrong.label!.en}));}if(q.kind==="type")click(box.getByRole("button",{name:"Check"}));click(box.getByRole("button",{name:"Continue"}));}click(v.getByRole("button",{name:"Start here"}));assert.equal(result?.startUnitId,"u01");assert.ok(result?.reviewUnitIds.length);assert.equal([...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).filter(k=>k!=="yo.practice.auto-next.v1").length,0);}]);
tests.push(["meaning recall replaces labelled portraits, checks taps and preserves checked answer on remount",()=>{
 const words=firstMeetingVisuals["it2-u01-l1"];let entered=0;
 const mount=()=>{const v=render(<ItalianAudioProvider paths={courseAudioPaths(words.map(w=>w.it))}><VisualVocabulary words={words} lessonId="v-test" locale="en" onReady={()=>entered++}/></ItalianAudioProvider>);flush();return v;};
 let v=mount();click(v.getByRole("button",{name:"Let’s practise"}));
 assert.equal(v.queryByRole("group",{name:"Four images"}),null);
 const first=v.container.querySelector('[data-vocabulary-recall]')!.getAttribute('data-vocabulary-recall');
 const read=v.queryByRole('button',{name:'Read instead of listen'});if(read)click(read);
 click(v.container.querySelector(`[data-answer-id="${first}"]`) as HTMLElement);
 assert.equal(v.queryByRole('button',{name:'Check'}),null);assert.ok(v.getByRole('button',{name:'Continue'}));
 cleanup();v=mount();assert.equal(v.container.querySelector(`[data-answer-id="${first}"]`)?.getAttribute('aria-pressed'),'true');
 let tasks=0;while(v.container.querySelector('[data-vocabulary-recall]')){
   const id=v.container.querySelector('[data-vocabulary-recall]')!.getAttribute('data-vocabulary-recall');
   const done=v.queryByRole('button',{name:'Continue'});
   if(!done){const read=v.queryByRole('button',{name:'Read instead of listen'});if(read)click(read);click(v.container.querySelector(`[data-answer-id="${id}"]`) as HTMLElement);}
   assert.equal(entered,0);click(v.getByRole('button',{name:'Continue'}));if(++tasks>words.length*3)throw new Error('Recall loop did not terminate');
 }
 assert.equal(tasks,Math.min(3,words.length),"warmup checks each target once and stays short");click(v.getByRole('button',{name:'Enter the mission'}));assert.equal(entered,1);assert.equal(v.container.querySelectorAll('textarea,input').length,0);
}]);
tests.push(["returning learner skips onboarding; notebook is complete before any exercise",()=>{localStorage.setItem(profileKey("it"),JSON.stringify({version:1,language:"it",experience:"new",goal:"thorough",weeklyMinutes:60,startUnitId:"u01",placement:"beginner",reviewUnitIds:[],updatedAt:Date.now()}));const v=render(<ItalianLearningEntry unit={firstMeetingUnit} catalog={personalizedItalianCatalog} locale="en" audioPaths={courseAudioPaths(unitSpeech(firstMeetingUnit))} wordBank={firstMeetingBank} visualWords={firstMeetingVisuals} checks={placementChecks} placementAudio={audio}/>);flush();assert.equal(v.container.querySelector("[data-yoppo-onboarding]"),null);const skip=v.queryByRole("button",{name:"Skip the tour"});if(skip)click(skip);click(v.getByRole("button",{name:"Word notebook"}));const box=within(v.getByRole("dialog"));assert.ok(box.getByText("Quanti anni hai?",{exact:true}));assert.ok(box.getByRole("link",{name:"Print the complete bank"}));assert.equal(localStorage.getItem(GUIDED_PROGRESS_KEY),null);}]);
let failures=0;for(const[name,test]of tests){cleanup();localStorage.clear();frames.clear();localStorage.setItem("yo.practice.auto-next.v1","off");try{test();console.log(`PASS ${name}`);}catch(e){failures++;console.error(`FAIL ${name}`,e);}finally{cleanup();frames.clear();}}console.log(`${tests.length-failures}/${tests.length} personalized player checks passed`);if(failures)process.exitCode=1;
