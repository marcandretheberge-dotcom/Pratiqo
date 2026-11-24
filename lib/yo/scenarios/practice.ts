import { nextMidnight } from "./nextDay";
export type Locale = "fr" | "en" | "es";
export const tr = (fr: string, en: string, es: string) => ({fr,en,es});
export type Text = ReturnType<typeof tr>;
export const modes = ["guided","tomorrow"] as const;
export type Mode = typeof modes[number];
export type Beat = {
  task:Text; hint:Text;
  prompt: {clip:string} | {text:string};
  choices: readonly [string,string,string];
  answer:string;
};

export type Practice = {
 key:string; targetLang:string; badge:string; title:Text; slip:Text; finish:Text; outcome:Text;
 visits:Record<Mode,{guest:string;city:string;beats:Beat[]}>;
 lines:readonly {id:string;speechText:string;target:string;translation:Partial<Text>;isLearner:boolean}[];
};
export type State={version:1;guided:number;tomorrow:number;due:number|null;corrected:boolean};
export const fresh=():State=>({version:1,guided:0,tomorrow:0,due:null,corrected:false});
export function progressFor(visits: Practice["visits"]){
const total=(mode:Mode)=>visits[mode].beats.length;
function restore(raw:string|null):State{
  try{
    const s=JSON.parse(raw??"null");
    if(s?.version!==1||typeof s.corrected!=="boolean"||!modes.every(m=>Number.isInteger(s[m])&&s[m]>=0&&s[m]<=total(m)))return fresh();
    if(s.guided===total("guided") ? !Number.isSafeInteger(s.due)||s.due<=0 : s.due!==null||s.tomorrow!==0||s.corrected)return fresh();
    return {version:1,guided:s.guided,tomorrow:s.tomorrow,due:s.due,corrected:s.corrected};
  }catch{return fresh();}
}
function ready(s:State,now:number){return s.guided===total("guided")&&s.due!==null&&now>=s.due;}
function submit(s:State,mode:Mode,choice:string,now:number):State{
  const beat=visits[mode].beats[s[mode]];
  if(!beat || (mode==="tomorrow"&&!ready(s,now)) || !beat.choices.includes(choice))return s;
  if(choice!==beat.answer)return mode==="tomorrow"?{...s,corrected:true}:s;
  const n=s[mode]+1;
  return {...s,[mode]:n,due:mode==="guided"&&n===total(mode)?nextMidnight(now):s.due};
}
return {restore,ready,submit};
}
