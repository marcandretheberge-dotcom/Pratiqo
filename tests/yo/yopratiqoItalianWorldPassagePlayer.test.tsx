/** Browser-like proof that a flute challenge is playable without writing and
 * never navigates until an independent four-of-five placement is complete. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { firstMeetingUnit } from "@/lib/yo/personalized/firstMeeting";
import type { ItalianWorldPassage } from "@/lib/yo/italian/worldPassage";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url:"https://example.test", pretendToBeVisual:true });
const frames = new Map<number,FrameRequestCallback>();
let frameId=0;
const requestAnimationFrame=(callback:FrameRequestCallback)=>{const id=++frameId;frames.set(id,callback);return id;};
const cancelAnimationFrame=(id:number)=>{frames.delete(id);};
for(const [name,value] of Object.entries({
 window:dom.window,self:dom.window,document:dom.window.document,navigator:dom.window.navigator,
 HTMLElement:dom.window.HTMLElement,Element:dom.window.Element,Node:dom.window.Node,Event:dom.window.Event,
 MouseEvent:dom.window.MouseEvent,MutationObserver:dom.window.MutationObserver,
 localStorage:dom.window.localStorage,requestAnimationFrame,cancelAnimationFrame,
 IS_REACT_ACT_ENVIRONMENT:true,
}))Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
process.env.NEXT_PUBLIC_SUPABASE_URL="https://audio.example.test";
const { ItalianWorldPassageChallenge }=require("@/components/yo/italian/guided/ItalianWorldPassageChallenge") as typeof import("@/components/yo/italian/guided/ItalianWorldPassageChallenge");
const { ItalianAudioProvider }=require("@/components/yo/italian/ItalianAudioProvider") as typeof import("@/components/yo/italian/ItalianAudioProvider");
const { render,cleanup,fireEvent,act,within }=require("@testing-library/react") as typeof import("@testing-library/react");

const source=firstMeetingUnit.quiz.questions[0];
assert.equal(source.kind,"choice");
const passage:ItalianWorldPassage={
 id:"italian-passage:discover:daily-life",sourceWorldId:"discover",targetWorldId:"daily-life",targetUnitId:"u05",
 questions:Array.from({length:5},(_,index)=>({...source,id:`warp-question-${index+1}`})),
};
type View=ReturnType<typeof render>;
function flush(){for(let tries=0;tries<12&&frames.size;tries++){const tasks=[...frames.values()];frames.clear();act(()=>tasks.forEach(fn=>fn(0)));}}
let clock=Date.now();Date.now=()=>clock;
function click(node:HTMLElement){clock+=500;fireEvent.click(node);flush();}
let travels:string[]=[];
function mount(save=true){localStorage.setItem("yo.practice.auto-next.v1","off");const view=render(<ItalianAudioProvider paths={{}}><ItalianWorldPassageChallenge passage={passage} locale="en" targetCity="Napoli" onTravel={id=>{travels.push(id);return save;}}/></ItalianAudioProvider>);flush();return view;}
function begin(view:View){
 const summary=view.getByText("Try the secret passage");
 click(summary);
 click(view.getByRole("button",{name:"Start the challenge"}));
}
function finish(view:View,wrong:number[]=[]){
 for(let i=0;i<5;i++){
  const box=within(view.container.querySelector("[data-guided-game]") as HTMLElement);
  assert.equal(view.container.querySelector("[data-yoppo-secret-question]")?.getAttribute("data-yoppo-secret-question"),passage.questions[i].id);
  const question=passage.questions[i];
  if(question.kind!=="choice")throw new Error("invalid test fixture");
  const option=question.options.find(o=>wrong.includes(i)?o.id!==question.correctId:o.id===question.correctId)!;
  click(box.getByRole("button",{name:option.it??option.label!.en}));
  click(box.getByRole("button",{name:i===4?"See the result":"Next question"}));
 }
}
const checks:[string,()=>void][]=[
 ["independent 4/5 opens secret passage, not a course score",()=>{
  const v=mount();begin(v);finish(v,[4]);
  assert.ok(v.container.querySelector('[data-yoppo-secret-result="passed"]'));
  assert.ok(v.getByText("Napoli"));
  assert.deepEqual(travels,[]);
  click(v.getByRole("button",{name:"Enter the portal"}));
  assert.deepEqual(travels,["u05"]);
  assert.equal(localStorage.length,1,"only explicit practice preference, no score, pass or wallet written");
 }],
 ["3/5 cannot enter portal; retry starts a clean independent round",()=>{
  const v=mount();begin(v);finish(v,[0,1]);
  assert.ok(v.container.querySelector('[data-yoppo-secret-result="review"]'));
  assert.equal(v.queryByRole("button",{name:"Enter the portal"}),null);
  assert.deepEqual(travels,[]);
  click(v.getByRole("button",{name:"Retry five questions"}));
  assert.ok(v.container.querySelector('[data-yoppo-secret-question="warp-question-1"]'));
 }],
 ["failed local preference persistence leaves portal blocked",()=>{
  const v=mount(false);begin(v);finish(v);
  click(v.getByRole("button",{name:"Enter the portal"}));
  assert.ok(v.getByRole("alert"));
  assert.deepEqual(travels,["u05"]);
 }],
];
let failures=0;
for(const [label,check]of checks){cleanup();localStorage.clear();frames.clear();travels=[];try{check();console.log("PASS "+label);}catch(err){failures++;console.error("FAIL "+label,err);}finally{cleanup();frames.clear();}}
console.log(`${checks.length-failures}/${checks.length} flute passage interactions passed`);
if(failures)process.exitCode=1;
