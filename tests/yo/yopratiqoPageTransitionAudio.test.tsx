import assert from "node:assert/strict";
import {createRequire} from "node:module";
import * as React from "react";
const require=createRequire(process.cwd()+"/package.json");
const {JSDOM}=require("jsdom");
const dom=new JSDOM("<html><body></body></html>",{url:"https://pratiqo.example.test",pretendToBeVisual:true});
for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true}))
 Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
process.env.NEXT_PUBLIC_SUPABASE_URL="https://audio.example.test";
const {render,cleanup,fireEvent,act}=require("@testing-library/react") as typeof import("@testing-library/react");
const {IntroAudio}=require("@/components/yo/shared/IntroAudio") as typeof import("@/components/yo/shared/IntroAudio");
const {LearningAudio}=require("@/components/yo/personalized/LearningAudio") as typeof import("@/components/yo/personalized/LearningAudio");
const {ItalianAudioProvider}=require("@/components/yo/italian/ItalianAudioProvider") as typeof import("@/components/yo/italian/ItalianAudioProvider");
const {lessonAudioIsBusy}=require("@/lib/yo/audio/lessonAudioActivity") as typeof import("@/lib/yo/audio/lessonAudioActivity");
let gesture=false,starts=0,heard=0;
const recordings:Media[]=[];
class Media extends dom.window.EventTarget{
 src:string;preload="";playbackRate=1;preservesPitch=true;currentTime=0;
 constructor(url:string){super();this.src=url;recordings.push(this);}
 play(){if(!gesture)return Promise.reject(Object.assign(new Error("user activation required"),{name:"NotAllowedError"}));
  starts++;this.dispatchEvent(new Event("playing"));return Promise.resolve();}
 pause(){}load(){}removeAttribute(){this.src="";}
 end(){this.dispatchEvent(new Event("ended"));}
}
Object.defineProperty(window,"Audio",{value:Media,configurable:true});
function tap(el:Element){gesture=true;try{fireEvent.click(el);}finally{gesture=false;}}
async function flush(){await act(async()=>{await Promise.resolve();await Promise.resolve();});}
const cases:Array<[string,()=>Promise<void>]>=[];
const test=(name:string,fn:()=>Promise<void>)=>cases.push([name,fn]);
test("blocked automatic recording releases the lock and a real tap restores listening",async()=>{
 const v=render(<IntroAudio text="Hello" path="yo/en/hello.mp3" speechLocale="en-CA" locale="en" autoPlay onListen={()=>heard++}/>);
 await flush();assert.equal(starts,0);assert.equal(heard,0);assert.equal(lessonAudioIsBusy(),false);
 assert.ok(v.getByText(/automatic playback was blocked/i));tap(v.getByRole("button",{name:"Listen to the message"}));await flush();
 assert.equal(starts,1);assert.equal(heard,1);assert.equal(lessonAudioIsBusy(),true);
 act(()=>recordings.at(-1)?.end());assert.equal(lessonAudioIsBusy(),false);
});
test("new question cancels the old clip; stale events do not count as listening",async()=>{
 const v=render(<IntroAudio text="Hello" path="yo/en/hello.mp3" speechLocale="en-CA" locale="en" autoPlay onListen={()=>heard++}/>);
 await flush();tap(v.getByRole("button",{name:"Listen to the message"}));await flush();
 const old=recordings.at(-1)!;assert.equal(lessonAudioIsBusy(),true);
 v.rerender(<IntroAudio text="Thank you" path="yo/en/thanks.mp3" speechLocale="en-CA" locale="en" autoPlay onListen={()=>heard++}/>);
 await flush();assert.equal(lessonAudioIsBusy(),false);act(()=>old.dispatchEvent(new Event("playing")));
 assert.equal(heard,1);assert.ok(v.getByText(/automatic playback was blocked/i));
 tap(v.getByRole("button",{name:"Listen to the message"}));await flush();assert.equal(heard,2);
});
test("Italian recordings share the tap recovery instead of a synthetic delayed click",async()=>{
 const v=render(<ItalianAudioProvider paths={{"Ciao!":"yo/it/ciao.mp3"}}><LearningAudio text="Ciao!" locale="en" autoPlay onListen={()=>heard++}/></ItalianAudioProvider>);
 await flush();assert.equal(starts,0);assert.equal(lessonAudioIsBusy(),false);
 assert.ok(v.getByText(/autoplay was blocked/i));
 tap(v.getByRole("button",{name:"Listen : Ciao!"}));await flush();
 assert.equal(starts,1);assert.equal(heard,1);assert.equal(lessonAudioIsBusy(),true);
});
async function main(){let failures=0;try{for(const [name,fn]of cases){
 cleanup();gesture=false;starts=0;heard=0;recordings.length=0;
 try{await fn();console.log("PASS "+name);}catch(e){failures++;console.error("FAIL "+name,e);}
 finally{cleanup();assert.equal(lessonAudioIsBusy(),false);}
}}finally{dom.window.close();}
 console.log(String(cases.length-failures)+"/"+cases.length+" page-transition audio checks passed");
 if(failures)process.exitCode=1;
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
