// All departures are fictional teaching material, not timetable information.
import { nextMidnight } from "../scenarios/nextDay";
export type Mode = "guided" | "tomorrow" | "rehearsal";
export type Step = 0 | 1 | 2;
type Departure = readonly [string, string, string, number];
type Trip = { to: string; time: string; train: string; board: Departure[]; changed: number; platforms: number[]; phrases: string[] };
export const platformQuestion = "Da quale binario parte il treno?";
export const trips: Record<Mode, Trip> = {
  guided: { to:"Firenze", time:"08:20", train:"R 218", board:[["08:05","Firenze","R 204",1],["08:20","Firenze","R 218",5],["08:35","Parma","R 326",4]], changed:3, platforms:[5,4,3],
    phrases:["Quanto dura il viaggio?",platformQuestion,"Il treno è in ritardo?"] },
  tomorrow: { to:"Parma", time:"09:15", train:"R 412", board:[["09:10","Modena","R 409",4],["09:12","Parma","R 410",1],["09:15","Parma","R 412",2]], changed:6, platforms:[6,2,4],
    phrases:["A che ora parte il treno?","Quanto costa il biglietto?","Da quale binario parte?"] },
  rehearsal: { to:"Modena", time:"10:40", train:"R 508", board:[["10:40","Modena","R 508",4],["10:40","Ferrara","R 512",6],["10:50","Modena","R 516",3]], changed:1, platforms:[4,1,6],
    phrases:["Da quale binario parte?","Quanto dura il viaggio?","Quanto costa il biglietto?"] },
};
export type Attempt = { step: number; missed: boolean };
export type Memory = { version: 1; guided: Attempt; finished: number | null; due: number | null; tomorrow: Attempt };
export const key = "yo.scenario.it.bologna.train.v1";
export const fresh = (): Memory => ({version:1,guided:{step:0,missed:false},finished:null,due:null,tomorrow:{step:0,missed:false}});
export function eligible(m: Memory, now: number) { return m.guided.step===3 && m.due!==null && now>=m.due; }
export function answer(mode: Mode, step: number) {
  const t=trips[mode]; return step===0?t.train:step===1?(mode==="guided"?platformQuestion:"Da quale binario parte?"):String(t.changed);
}
export function submit(m: Memory, mode: Exclude<Mode,"rehearsal">, choice: string, now: number): Memory {
  const a=m[mode];
  if(a.step>=3 || (mode==="tomorrow" && !eligible(m,now))) return m;
  const correct=choice===answer(mode,a.step);
  const next={...m,[mode]:{step:a.step+(correct?1:0),missed:a.missed||!correct}};
  if(mode==="guided" && next.guided.step===3) return {...next,finished:now,due:nextMidnight(now)};
  return next;
}
export function restore(raw: string | null): Memory {
  try {
    const v=JSON.parse(raw??"null");
    if(v?.version!==1 || ![v.guided,v.tomorrow].every(x=>x && Number.isInteger(x.step) && x.step>=0 && x.step<=3 && typeof x.missed==="boolean")) return fresh();
    if(v.guided.step<3 && (v.finished!==null || v.due!==null || v.tomorrow.step!==0 || v.tomorrow.missed)) return fresh();
    if(v.guided.step===3 && (!Number.isSafeInteger(v.finished)||!Number.isSafeInteger(v.due)||v.due<=v.finished||v.due-v.finished>27*3600000)) return fresh();
    return {version:1,guided:{step:v.guided.step,missed:v.guided.missed},tomorrow:{step:v.tomorrow.step,missed:v.tomorrow.missed},finished:v.finished,due:v.due};
  } catch { return fresh(); }
}
