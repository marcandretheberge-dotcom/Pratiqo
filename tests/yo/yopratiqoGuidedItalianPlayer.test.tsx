import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { dismissMissionFilms, prepareCinemaMedia } from "../helpers/lessonCinema";
import { italianCourseUnits, italianCourseCatalog } from "@/lib/yo/italian/course/courseData";
import { emptyGame, guidedSteps, GUIDED_KEY, initialGuided, parseGuided, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import { guidedMissionOrder } from "@/lib/yo/italian/course/guidedMissionOrder";
import { ITALIAN_COURSE_PROGRESS_KEY } from "@/lib/yo/italian/course/courseProgress";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import type { ItalianActivity } from "@/lib/yo/italian/italianModuleTypes";
import type { YoLocale } from "@/lib/yo/types";
import type { RankingAnswer } from "@/lib/yo/rankings/contract";
const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://example.test/", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
for (const [key,value] of Object.entries({ window:dom.window, self:dom.window, document:dom.window.document, navigator:dom.window.navigator, HTMLElement:dom.window.HTMLElement, Element:dom.window.Element, Node:dom.window.Node, NodeFilter:dom.window.NodeFilter, DocumentFragment:dom.window.DocumentFragment, HTMLInputElement:dom.window.HTMLInputElement, CustomEvent:dom.window.CustomEvent, Event:dom.window.Event, MutationObserver:dom.window.MutationObserver, getComputedStyle:dom.window.getComputedStyle, localStorage:dom.window.localStorage, requestAnimationFrame:(fn:FrameRequestCallback)=>{frames.set(++frameId,fn);return frameId;}, cancelAnimationFrame:(id:number)=>frames.delete(id), IS_REACT_ACT_ENVIRONMENT:true })) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};window.scrollTo=()=>{};
prepareCinemaMedia();
class FakeAudio extends dom.window.EventTarget { src:string;preload="none";playbackRate=1;preservesPitch=true;currentTime=0;constructor(src:string){super();this.src=src;}play(){this.dispatchEvent(new Event("playing"));return Promise.resolve();}pause(){}load(){}removeAttribute(){this.src="";} }
window.Audio=FakeAudio as unknown as typeof Audio;
process.env.NEXT_PUBLIC_SUPABASE_URL="https://audio.example.test";
const { GuidedItalianCourse } = require("@/components/yo/italian/guided/GuidedItalianCourse") as typeof import("@/components/yo/italian/guided/GuidedItalianCourse");
const { GuidedGame } = require("@/components/yo/italian/guided/GuidedGame") as typeof import("@/components/yo/italian/guided/GuidedGame");
const {render,cleanup,fireEvent,act,within}=require("@testing-library/react") as typeof import("@testing-library/react");
const unit=italianCourseUnits[0],canonicalSteps=guidedSteps(unit),steps=guidedMissionOrder(canonicalSteps).map(index=>canonicalSteps[index]);
type View=ReturnType<typeof render>;
function flush(){for(let i=0;i<10&&frames.size;i++){const pending=[...frames.values()];frames.clear();act(()=>pending.forEach(fn=>fn(0)));}dismissMissionFilms();}
let clock=Date.now();Date.now=()=>clock;
function click(el:HTMLElement){clock+=500;fireEvent.click(el);flush();}
function mount(extra:Partial<React.ComponentProps<typeof GuidedItalianCourse>>={}){localStorage.setItem("yo.practice.auto-next.v1","off");const v=render(<GuidedItalianCourse unit={unit} catalog={italianCourseCatalog} locale="en" audioPaths={courseAudioPaths(unitSpeech(unit))} {...extra}/>);flush();return v;}
function mountGame(activity:ItalianActivity, initial:GameDraft=emptyGame(), assessment=false) {
 const answers:RankingAnswer[]=[];
 let draft=initial,replayNeeded=0;
 function Game(){const [value,setValue]=React.useState(initial);return <GuidedGame activity={activity} locale="en" value={value} onChange={next=>{draft=next;setValue(next);return next;}} onAttempt={()=>{}} onContinue={()=>{}} onAnswer={answer=>answers.push(answer)} onReplayNeeded={()=>{replayNeeded++;}} assessment={assessment}/>;}
 localStorage.setItem("yo.practice.auto-next.v1","off");
 return {view:render(<Game/>),answers,draft:()=>draft,replayNeeded:()=>replayNeeded};
}
function resumeGame(activity:ItalianActivity,draft:GameDraft){const state={...initialGuided(),view:"mission" as const,resumeView:"mission" as const,step:canonicalSteps.findIndex(step=>step.id===activity.id),game:draft};return parseGuided(JSON.stringify(state),unit,0).game;}
function skip(v:View){const b=v.queryByRole("button",{name:"Skip the tour"});if(b)click(b);}
function solve(v:View,a:ItalianActivity,wrong=false){
 const box=within(document.querySelector("[data-guided-game]") as HTMLElement);
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
tests.push(["first visit is skippable and starts a real mission",()=>{const v=mount();assert.ok(v.getByRole("button",{name:"Skip the tour"}));skip(v);assert.ok(v.container.querySelector("[data-yoppo-map-only]"));click(v.getByRole("button",{name:"Start my mission"}));assert.ok(document.querySelector("[data-yoppo-mission-briefing]"));click(v.getByRole("button",{name:"Start my mission"}));assert.ok(v.getByRole("heading",{name:"Word notebook"}),"the first mission starts with vocabulary before the scene");assert.equal(v.getAllByRole("button",{name:"Next expression"}).length,1);assert.equal(v.queryByRole("button",{name:"Continue"}),null,"study cannot skip its remaining expressions");}]);
tests.push(["all 19 exercises finish sequentially with no typing or self-rating; final challenge follows",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Start my mission"}));click(v.getByRole("button",{name:"Start my mission"}));for(const step of steps){if(step.stage==="words"){for(const [index,phrase] of unit.lessons[step.lesson].vocabulary.entries()){assert.ok(v.getByText(phrase.it));if(index<unit.lessons[step.lesson].vocabulary.length-1)click(v.getByRole("button",{name:"Next expression"}));}}if(step.activity)solve(v,step.activity);click(v.getByRole("button",{name:"Continue"}));}assert.ok(v.getByRole("button",{name:"Start the challenge"}));const p=JSON.parse(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY)!);assert.equal(Object.values(p.activities).filter((a:unknown)=>(a as {completed:boolean}).completed).length,19);}]);
tests.push(["four independent correct answers earn one stamp and unlock the next unit",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Start my mission"}));click(v.getByRole("button",{name:"Already confident? Try the final challenge"}));click(v.getByRole("button",{name:"Start the challenge"}));unit.quiz.questions.forEach((q,i)=>{solve(v,q,i===4);click(v.getByRole("button",{name:i===4?"See my result":"Continue"}));});assert.ok(v.getByRole("heading",{name:"Challenge complete!"}));click(v.getByRole("button",{name:"Back to the map"}));assert.equal(v.getByRole("button",{name:/Explore Parma/}).getAttribute("aria-pressed"),"true");assert.equal(v.getByRole("link",{name:"Continue"}).getAttribute("href"),"/yo/langues/italien/parcours/u02?lang=en&mission=continue");const saved=localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY);cleanup();mount();assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),saved);}]);
tests.push(["notebook and reload preserve a selected response in an incoming exercise link",()=>{const props={initialLessonId:"it1-u01-l1",initialActivityId:"it1-u01-l1-read"};let v=mount(props);click(v.getByRole("button",{name:"Prego!"}));click(v.getByRole("button",{name:"Word notebook"}));const tools = document.querySelector("[data-yoppo-tools-dialog]") as HTMLElement;assert.ok(tools);click(within(tools).getByRole("button",{name:"Close"}));assert.equal(v.getByRole("button",{name:"Prego!"}).getAttribute("aria-pressed"),"true");cleanup();v=mount(props);assert.equal(v.getByRole("button",{name:"Prego!"}).getAttribute("aria-pressed"),"true");}]);
tests.push(["a partly answered challenge resumes its exact question and selection",()=>{let v=mount();skip(v);click(v.getByRole("button",{name:"Start my mission"}));click(v.getByRole("button",{name:"Already confident? Try the final challenge"}));click(v.getByRole("button",{name:"Start the challenge"}));solve(v,unit.quiz.questions[0]);click(v.getByRole("button",{name:"Continue"}));click(v.getByRole("button",{name:"Listen : the exercise message"}));click(v.getByRole("button",{name:"Leggi."}));click(v.getByRole("button",{name:"Leave and save my place"}));cleanup();v=mount();click(v.getByRole("button",{name:"Final challenge"}));assert.equal(document.querySelector("[data-guided-game]")?.getAttribute("data-guided-game"),"it1-u01-q2");assert.equal(v.getByRole("button",{name:"Leggi."}).getAttribute("aria-pressed"),"true");}]);
tests.push(["transcript-assisted final does not silently earn an independent stamp",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Start my mission"}));click(v.getByRole("button",{name:"Already confident? Try the final challenge"}));click(v.getByRole("button",{name:"Start the challenge"}));unit.quiz.questions.forEach((q,i)=>{if(i===1)click(v.getByRole("button",{name:"Read instead of listen (with help)"}));solve(v,q);click(v.getByRole("button",{name:i===4?"See my result":"Continue"}));});assert.ok(v.getByRole("heading",{name:"Ready to try again?"}));assert.ok(v.getByText("You used some help. Try again without hints to earn the stamp."));const p=JSON.parse(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY)!);assert.equal(p.assessments[unit.quiz.id].bestIndependent,null);}]);
tests.push(["French and Spanish open the same guided structure",()=>{for(const locale of ["fr","es"] as YoLocale[]){const v=mount({locale});assert.ok(v.container.querySelector("[data-yoppo-map-only]"));assert.ok(v.getByRole("button",{name:locale==="fr"?"Commencer ma mission":"Empezar mi misión"}));assert.equal(v.container.querySelectorAll("input,textarea").length,0);cleanup();localStorage.clear();}}]);
tests.push(["Pratiqo Match uses real teacher search, not an invented matching endpoint",()=>{const v=mount();skip(v);click(v.getByRole("button",{name:"Yoppo and my tools"}));assert.equal(v.getByRole("link",{name:"Find an Italian teacher"}).getAttribute("href"),"/trouver-un-prof?q=italien&lang=en");assert.ok(v.getByText(/No Pass is spent in this pilot/));}]);
tests.push(["malformed UI storage never crashes or changes canonical evidence",()=>{localStorage.setItem(GUIDED_KEY,"{bad json");const v=mount();skip(v);assert.ok(v.getByRole("button",{name:"Start my mission"}));assert.equal(localStorage.getItem(ITALIAN_COURSE_PROGRESS_KEY),null);}]);
tests.push(["guided ranking answers retain the selected word tiles and every dialogue turn",()=>{
 const activities=unit.lessons.flatMap(lesson=>lesson.activities);
 const typed=activities.find(activity=>activity.kind==="type")!;
 assert.equal(typed.kind,"type");if(typed.kind!=="type")return;
 const actual={...typed,model:"BUONGIORNO!",accepted:["Buongiorno."],listeningText:undefined};
 let game=mountGame(actual);assert.deepEqual(game.answers,[]);solve(game.view,actual);assert.deepEqual(game.answers,["BUONGIORNO!"]);cleanup();
 const dialogue=activities.find(activity=>activity.kind==="dialogue")!;
 assert.equal(dialogue.kind,"dialogue");if(dialogue.kind!=="dialogue")return;
 game=mountGame(dialogue);solve(game.view,dialogue);assert.deepEqual(game.answers,[dialogue.turns.map(turn=>turn.correctId)]);cleanup();
 game=mountGame(dialogue,{...emptyGame(),turn:dialogue.turns.length-1});const last=dialogue.turns.at(-1)!;const selected=last.options.find(option=>option.id===last.correctId)!;
 click(game.view.getByRole("button",{name:selected.it??selected.label!.en}));assert.deepEqual(game.answers,[],"a resumed conversation cannot fabricate earlier selected answers");
 assert.equal(game.replayNeeded(),1,"offer an honest replay instead of a fabricated award");
 assert.deepEqual(resumeGame(dialogue,game.draft()),game.draft(),"old-format completion remains reloadable without sparse invented history");
}]);
tests.push(["guided matching submits full actual pairs and never reconstructs restored pairs",()=>{
 const activity=unit.lessons.flatMap(lesson=>lesson.activities).find(activity=>activity.kind==="match")!;
 assert.equal(activity.kind,"match");if(activity.kind!=="match")return;
 let game=mountGame(activity);solve(game.view,activity);assert.deepEqual(game.answers,[Object.fromEntries(activity.pairs.map(pair=>[pair.id,pair.id]))]);cleanup();
 game=mountGame(activity,{...emptyGame(),pairs:activity.pairs.slice(0,-1).map(pair=>pair.id)});const pair=activity.pairs.at(-1)!;click(game.view.getByRole("button",{name:pair.it}));click(game.view.getByRole("button",{name:pair.meaning.en}));assert.deepEqual(game.answers,[],"restored matches are local progress, not new submitted evidence");
 assert.equal(game.replayNeeded(),1);
}]);
tests.push(["guided assessment answers never enter ranking awards",()=>{
 const activity=unit.quiz.questions.find(activity=>activity.kind==="choice")!;const game=mountGame(activity,emptyGame(),true);solve(game.view,activity);assert.deepEqual(game.answers,[]);
}]);
tests.push(["a partial matching draft reloads actual pair choices and submits only after new completion",()=>{
 const activity=unit.lessons.flatMap(lesson=>lesson.activities).find(activity=>activity.kind==="match")!;if(activity.kind!=="match")throw new Error("missing match");
 let game=mountGame(activity);const first=activity.pairs[0];click(game.view.getByRole("button",{name:first.it}));click(game.view.getByRole("button",{name:first.meaning.en}));
 const draft=resumeGame(activity,game.draft());assert.deepEqual(draft.submittedPairs,{[first.id]:first.id});assert.deepEqual(game.answers,[]);cleanup();
 game=mountGame(activity,draft);assert.deepEqual(game.answers,[],"rehydration never submits an award");
 for(const pair of activity.pairs.slice(1)){click(game.view.getByRole("button",{name:pair.it}));click(game.view.getByRole("button",{name:pair.meaning.en}));}
 assert.deepEqual(game.answers,[Object.fromEntries(activity.pairs.map(pair=>[pair.id,pair.id]))]);const complete=resumeGame(activity,game.draft());cleanup();
 game=mountGame(activity,complete);assert.deepEqual(game.answers,[],"a completed historical draft never imports XP");
}]);
tests.push(["a partial dialogue reloads actual turn choices and submits all turns on its final action",()=>{
 const activity=unit.lessons.flatMap(lesson=>lesson.activities).find(activity=>activity.kind==="dialogue")!;if(activity.kind!=="dialogue"||activity.turns.length<2)throw new Error("missing multi-turn dialogue");
 let game=mountGame(activity);const first=activity.turns[0],answer=first.options.find(option=>option.id===first.correctId)!;click(game.view.getByRole("button",{name:answer.it??answer.label!.en}));click(game.view.getByRole("button",{name:"Continue the conversation"}));
 const draft=resumeGame(activity,game.draft());assert.deepEqual(draft.submittedTurns,[first.correctId]);assert.deepEqual(game.answers,[]);cleanup();
 game=mountGame(activity,draft);assert.deepEqual(game.answers,[]);
 for(const [i,turn] of activity.turns.slice(1).entries()){const selected=turn.options.find(option=>option.id===turn.correctId)!;click(game.view.getByRole("button",{name:selected.it??selected.label!.en}));if(i<activity.turns.length-2)click(game.view.getByRole("button",{name:"Continue the conversation"}));}
 assert.deepEqual(game.answers,[activity.turns.map(turn=>turn.correctId)]);
}]);
tests.push(["old partial drafts preserve progress and assistance; an explicit replay can earn XP",()=>{
 const activities=unit.lessons.flatMap(lesson=>lesson.activities),matching=activities.find(activity=>activity.kind==="match")!,dialogue=activities.find(activity=>activity.kind==="dialogue")!;
 if(matching.kind!=="match"||dialogue.kind!=="dialogue")throw new Error("missing activities");
 const oldMatch={...emptyGame(),pairs:[matching.pairs[0].id],assisted:true},oldDialogue={...emptyGame(),turn:1,assisted:true};
 assert.deepEqual(resumeGame(matching,oldMatch),oldMatch);assert.deepEqual(resumeGame(dialogue,oldDialogue),oldDialogue);
 const game=mountGame(matching);assert.deepEqual(game.answers,[]);solve(game.view,matching);assert.equal(game.answers.length,1);assert.equal(game.replayNeeded(),0);
}]);
let failures=0;for(const [name,test] of tests){cleanup();localStorage.clear();frames.clear();try{test();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}`,error);}finally{cleanup();frames.clear();}}
console.log(`${tests.length-failures}/${tests.length} guided player checks passed`);if(failures)process.exitCode=1;
