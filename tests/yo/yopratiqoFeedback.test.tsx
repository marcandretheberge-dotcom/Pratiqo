import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { woodSamples } from "@/lib/yo/feedback/woodSound";
import { firstMeetingUnit, firstMeetingVisuals } from "@/lib/yo/personalized/firstMeeting";
import { emptyGame, type GameDraft } from "@/lib/yo/italian/course/guidedItalian";
import type { ItalianActivity } from "@/lib/yo/italian/italianModuleTypes";
const require = createRequire(`${process.cwd()}/package.json`), { JSDOM } = require("jsdom");
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test", pretendToBeVisual: true });
const frames = new Map<number, FrameRequestCallback>(); let frame = 0;
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter, DocumentFragment: dom.window.DocumentFragment, HTMLInputElement: dom.window.HTMLInputElement, CustomEvent: dom.window.CustomEvent, Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle, localStorage: dom.window.localStorage, requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++frame,fn); return frame; }, cancelAnimationFrame: (id:number) => frames.delete(id), IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
let starts=0,stops=0,closes=0; const gains: {value:number}[]=[]; const vibrations: (number|number[])[]=[];
class Context {
 state="running";destination={};
 createGain(){const gain={value:1};gains.push(gain);return{gain,connect(){},disconnect(){}};}
 createBuffer(_channels:number,length:number){return{copyToChannel:(data:Float32Array)=>assert.equal(data.length,length)};}
 createBufferSource(){return {buffer:null,onended:null,connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}
 resume(){return Promise.resolve();}close(){closes++;return Promise.resolve();}
}
Object.defineProperty(window,"AudioContext",{value:Context,writable:true});
Object.defineProperty(navigator,"vibrate",{value:(pattern:number|number[])=>{vibrations.push(pattern);return true;},configurable:true});
Object.defineProperty(navigator,"userActivation",{value:{hasBeenActive:true},configurable:true});
const {render,cleanup,fireEvent,act,within}=require("@testing-library/react") as typeof import("@testing-library/react");
const {LearningFeedbackProvider,FeedbackSettings,useLearningFeedback,HAPTICS_KEY}=require("@/components/yo/feedback/LearningFeedback") as typeof import("@/components/yo/feedback/LearningFeedback");
const {GuidedGame}=require("@/components/yo/italian/guided/GuidedGame") as typeof import("@/components/yo/italian/guided/GuidedGame");
const {VisualVocabulary}=require("@/components/yo/personalized/VisualVocabulary") as typeof import("@/components/yo/personalized/VisualVocabulary");
const {FeedbackPlayer,variedPlaybackRate}=require("@/lib/yo/feedback/feedbackPlayer") as typeof import("@/lib/yo/feedback/feedbackPlayer");
const {beginLessonAudio,lessonAudioIsBusy}=require("@/lib/yo/audio/lessonAudioActivity") as typeof import("@/lib/yo/audio/lessonAudioActivity");
const EFFECTS_KEY="yopratiqo.audio.muted";
function flush(){for(let i=0;i<12&&frames.size;i++){const f=[...frames.values()];frames.clear();act(()=>f.forEach(fn=>fn(0)));}}
let clock=Date.now();Date.now=()=>clock;
function click(button:HTMLElement){clock+=500;fireEvent.click(button);flush();}
const tick=()=>act(async()=>{await Promise.resolve();});
function Harness({activity,assessment=false,attempt=()=>{}}:{activity:ItalianActivity;assessment?:boolean;attempt?:(correct:boolean,assisted:boolean)=>void}) {
 const [value,setValue]=React.useState<GameDraft>(emptyGame);
 return <LearningFeedbackProvider><FeedbackSettings locale="en"/><GuidedGame activity={activity} locale="en" value={value} onChange={setValue} onAttempt={attempt} onContinue={()=>{}} assessment={assessment}/></LearningFeedbackProvider>;
}
function EventHarness(){const feedback=useLearningFeedback();return <><button onClick={()=>feedback.emit("one")}>Emit</button><button onClick={()=>feedback.emit("two")}>Another</button><FeedbackSettings locale="en"/></>;}
const tests:[string,()=>void|Promise<void>][]=[];
function test(name:string,fn:()=>void|Promise<void>){tests.push([name,fn]);}
test("sound A is finite, bounded and lasts 800 ms with two soft wooden notes",()=>{const samples=woodSamples();assert.equal(samples.length,35280);assert.ok(samples.every(Number.isFinite));assert.ok(Math.abs(Math.max(...samples.map(Math.abs))-.22)<.000001);assert.ok(samples.slice(0,1543).every(n=>n===0));assert.ok(samples.slice(19000).every(n=>n===0));assert.notDeepEqual(woodSamples("stamp"),samples);});
test("correct single-tap assessment sounds once; wrong answer and rerender are silent",()=>{const q=firstMeetingUnit.quiz.questions[0];assert.equal(q.kind,"choice");if(q.kind!=="choice")return;const v=render(<Harness activity={q} assessment/>);flush();click(v.getByRole("button",{name:"Mi chiamo Nina."}));assert.equal(v.queryByRole("button",{name:"Check"}),null);assert.equal(starts,1);assert.ok(v.container.querySelector('[data-yoppo-success="1"]'));click(v.getByRole("button",{name:"Continue"}));assert.equal(starts,1);v.rerender(<Harness activity={q} assessment/>);assert.equal(starts,1);cleanup();const wrong=render(<Harness activity={q} assessment/>);flush();click(wrong.getByRole("button",{name:"Sono canadese."}));assert.equal(starts,1);assert.equal(wrong.container.querySelector('[data-yoppo-success]'),null);});
test("practice correction receives confirmation without duplicate scoring",()=>{const q=firstMeetingUnit.quiz.questions[0];const attempts:boolean[]=[];const v=render(<Harness activity={q} attempt={c=>attempts.push(c)}/>);flush();click(v.getByRole("button",{name:"Sono canadese."}));assert.equal(starts,0);click(v.getByRole("button",{name:"Mi chiamo Nina."}));assert.equal(starts,1);assert.deepEqual(attempts,[false,true]);});
test("every successful pair sounds, last pair not twice; aggregate scoring is unchanged",()=>{const a=firstMeetingUnit.lessons[0].activities.find(a=>a.kind==="match")!;assert.ok(a.kind==="match");if(a.kind!=="match")return;let scored=0;const v=render(<Harness activity={a} attempt={c=>{if(c)scored++;}}/>);flush();const box=within(v.container.querySelector('[data-guided-game]') as HTMLElement);for(const [i,p]of a.pairs.entries()){click(box.getByRole("button",{name:p.it}));click(box.getByRole("button",{name:p.meaning.en}));assert.equal(starts,i+1);}assert.equal(scored,1);});
test("each correct dialogue turn sounds while one final completion is scored",()=>{const a=firstMeetingUnit.lessons[2].activities.find(a=>a.kind==="dialogue")!;assert.ok(a.kind==="dialogue");if(a.kind!=="dialogue")return;let scored=0;const v=render(<Harness activity={a} attempt={c=>{if(c)scored++;}}/>);flush();const box=within(v.container.querySelector('[data-guided-game]') as HTMLElement);for(const [i,t]of a.turns.entries()){const o=t.options.find(o=>o.id===t.correctId)!;click(box.getByRole("button",{name:o.it??o.label!.en}));assert.equal(starts,i+1);if(i<a.turns.length-1)click(box.getByRole("button",{name:"Continue the conversation"}));}assert.equal(scored,1);});
test("meaning recall: wrong tap is silent, correct tap sounds once and restore is silent",()=>{
 const words=firstMeetingVisuals["it2-u01-l1"];
 const mount=()=>{const v=render(<LearningFeedbackProvider><VisualVocabulary words={words} lessonId="sound-test" locale="en" onReady={()=>{}}/></LearningFeedbackProvider>);flush();return v;};
 let v=mount();click(v.getByRole('button',{name:'Let’s practise'}));click(v.getByRole('button',{name:'Read instead of listen'}));
 const target=v.container.querySelector('[data-vocabulary-recall]')!.getAttribute('data-vocabulary-recall');
 click(v.container.querySelector(`[data-answer-id]:not([data-answer-id="${target}"])`) as HTMLElement);assert.equal(starts,0);
 click(v.container.querySelector(`[data-answer-id="${target}"]`) as HTMLElement);assert.equal(starts,1);
 cleanup();v=mount();assert.equal(starts,1);assert.equal(v.container.querySelector('[data-yoppo-success]'),null);
});
test("legacy mute retained; independent haptics, event deduplication, sample and persisted settings",()=>{localStorage.setItem(EFFECTS_KEY,"true");const v=render(<LearningFeedbackProvider><EventHarness/></LearningFeedbackProvider>);flush();click(v.getByRole("switch",{name:"Vibrations"}));click(v.getByRole("button",{name:"Emit"}));click(v.getByRole("button",{name:"Emit"}));assert.equal(starts,0);assert.deepEqual(vibrations,[12]);assert.equal(localStorage.getItem(HAPTICS_KEY),"true");click(v.getByRole("switch",{name:"Success sounds"}));click(v.getByRole("button",{name:"Another"}));assert.equal(starts,1);assert.deepEqual(vibrations,[12,12]);click(v.getByRole("button",{name:"Preview the soft wood sound"}));assert.equal(starts,2);assert.equal(vibrations.length,2);click(v.getByRole("switch",{name:"Success sounds"}));assert.equal(localStorage.getItem(EFFECTS_KEY),"true");assert.ok(stops>=1);});
test("no audio API degrades to visuals; no false promise of browser vibration support",()=>{const ctor=window.AudioContext;Object.defineProperty(window,"AudioContext",{value:undefined,writable:true});const vib=navigator.vibrate;Object.defineProperty(navigator,"vibrate",{value:undefined,configurable:true});try{const v=render(<LearningFeedbackProvider><EventHarness/></LearningFeedbackProvider>);flush();assert.ok((v.getByRole('switch',{name:'Vibrations'}) as HTMLButtonElement).disabled);click(v.getByRole('button',{name:'Emit'}));assert.equal(starts,0);}finally{Object.defineProperty(window,"AudioContext",{value:ctor,writable:true});Object.defineProperty(navigator,"vibrate",{value:vib,configurable:true});}});
test("lesson speech is never interrupted: cue waits, no backlog, cancellation suppresses stale sound",async()=>{const p=new FeedbackPlayer(),release=beginLessonAudio();try{await p.play();await p.play();assert.equal(starts,0);assert.equal(lessonAudioIsBusy(),true);release();assert.equal(starts,1);const release2=beginLessonAudio();await p.play();window.dispatchEvent(new Event('yo-italian-audio-stop'));release2();assert.equal(starts,1);}finally{release();p.dispose();}});
test("a longer spoken phrase still receives its queued success cue",async()=>{const p=new FeedbackPlayer(),release=beginLessonAudio();try{await p.play();clock+=5000;assert.equal(starts,0);release();assert.equal(starts,1);}finally{release();p.dispose();}});
test("hidden page and disposal cancel queued feedback",async()=>{const p=new FeedbackPlayer(),release=beginLessonAudio();await p.play();Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));release();assert.equal(starts,0);Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});await p.play();assert.equal(starts,1);p.dispose();await p.play();assert.equal(starts,1);assert.ok(closes>0);});
test("late AudioContext resume cannot play after cancellation",async()=>{const ctor=window.AudioContext;let resume!:()=>void;class Suspended extends Context {state="suspended";resume(){return new Promise<void>(r=>{resume=()=>{this.state='running';r();};});}}Object.defineProperty(window,'AudioContext',{value:Suspended,writable:true});const p=new FeedbackPlayer();try{const wait=p.play();p.cancel();resume();await wait;assert.equal(starts,0);}finally{p.dispose();Object.defineProperty(window,'AudioContext',{value:ctor,writable:true});}});
test("repeated feedback gets subtle pitch variation without changing milestone identity",()=>{
 const close=(a:number,b:number)=>Math.abs(a-b)<.000001;
 assert.ok(close(variedPlaybackRate("correct",0),.965));
 assert.ok(close(variedPlaybackRate("correct",1),1.035));
 assert.ok(close(variedPlaybackRate("step",0),.975));
 assert.ok(close(variedPlaybackRate("step",1),1.025));
 assert.ok(close(variedPlaybackRate("unlock",0),.988));
 assert.ok(close(variedPlaybackRate("unlock",1),1.012));
 assert.ok(close(variedPlaybackRate("mission",.5),1));
});
test("movement, mission and unlock use distinct restrained wooden cues",()=>{
 const kinds=["correct","stamp","step","mission","unlock"] as const;
 const arrays=kinds.map(kind=>woodSamples(kind));
 for(let i=0;i<arrays.length;i++){assert.ok(arrays[i].every(Number.isFinite));assert.ok(arrays[i].every(n=>Math.abs(n)<=.220001));for(let j=i+1;j<arrays.length;j++)assert.notDeepEqual(arrays[i],arrays[j]);}
 assert.ok(woodSamples("step").every(n=>Math.abs(n)<=.090001));
});
test("volume changes affect active effects only; zero cancels a queued cue",async()=>{
 const p=new FeedbackPlayer();try{p.setVolume(.35);await p.play("mission");assert.equal(gains.at(-1)?.value,.35);p.setVolume(.1);assert.equal(gains.at(-1)?.value,.1);
 const release=beginLessonAudio();await p.play("stamp");const before=starts;p.setVolume(0);release();assert.equal(starts,before);await p.play("unlock");assert.equal(starts,before);
 }finally{p.dispose();}
});
test("gesture preparation is silent and does not play a stale reward",async()=>{
 const p=new FeedbackPlayer();try{await p.unlock();assert.equal(starts,0);await p.play("unlock");assert.equal(starts,1);p.dispose();await p.unlock();assert.equal(starts,1);}finally{p.dispose();}
});
test("effect samples and volume persist without altering learning progress",()=>{
 localStorage.setItem('yo.shared-intro.v1.en','unchanged');const v=render(<LearningFeedbackProvider><EventHarness/></LearningFeedbackProvider>);flush();
 fireEvent.change(v.getByRole('slider'),{target:{value:'40'}});assert.equal(localStorage.getItem('yopratiqo.audio.effects-volume.v1'),'0.4');
 click(v.getByRole('button',{name:'Preview the other sounds'}));const vibrationCount=vibrations.length;
 fireEvent.change(v.getByRole('combobox'),{target:{value:'unlock'}});click(v.getByRole('button',{name:'Preview this effect'}));assert.equal(starts,1);assert.equal(vibrations.length,vibrationCount);assert.equal(localStorage.getItem('yo.shared-intro.v1.en'),'unchanged');
});
async function main(){let failures=0;for(const[name,fn]of tests){cleanup();localStorage.clear();frames.clear();localStorage.setItem("yo.practice.auto-next.v1","off");starts=0;stops=0;closes=0;vibrations.length=0;try{await fn();await tick();console.log(`PASS ${name}`);}catch(e){failures++;console.error(`FAIL ${name}`,e);}finally{cleanup();frames.clear();}}console.log(`${tests.length-failures}/${tests.length} feedback checks passed`);if(failures)process.exitCode=1;}
void main();
