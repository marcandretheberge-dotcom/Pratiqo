"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { YoLocale } from "@/lib/yo/types";

const points = [[120,162],[350,270],[130,396],[350,516]];
const bends = [[[120,210],[390,190]],[[310,340],[110,300]],[[150,480],[385,440]]];
/** Sample the illustrated road, including reverse travel. No progress is written. */
export function companionRoute(from:number,to:number) {
  const route:number[][] = [];
  const low=Math.min(from,to), high=Math.max(from,to);
  for(let segment=low;segment<high;segment++) {
    const [a,d]=[points[segment],points[segment+1]], [b,c]=bends[segment];
    for(let i=0;i<=12;i++) {
      const t=i/12, s=1-t;
      route.push([0,1].map(axis=>s*s*s*a[axis]+3*s*s*t*b[axis]+3*s*t*t*c[axis]+t*t*t*d[axis]));
    }
  }
  if(from>to) route.reverse();
  return route.length?route:[points[to]??points[0]];
}
export function ItalianMapCompanion({index,locale,active=true}:{index:number;locale:YoLocale;active?:boolean}) {
  const [origin]=useState(()=>points[index] ?? points[0]);
  const controls=useAnimationControls(), reduce=useReducedMotion(), previous=useRef<number|null>(null);
  useEffect(()=>{
    if(!active || index<0 || index>3) return;
    const from=previous.current; previous.current=index;
    const target={left:`${points[index][0]/4.8}%`,top:`${points[index][1]/6}%`};
    if(from===null || reduce || from===index) controls.set(target);
    else {
      const route=companionRoute(from,index);
      void controls.start({left:route.map(p=>`${p[0]/4.8}%`),top:route.map(p=>`${p[1]/6}%`)},{duration:Math.min(3,1.15*Math.abs(from-index)),ease:"easeInOut"});
    }
    return ()=>controls.stop();
  },[index,controls,reduce,active]);
  if(index<0 || index>3)return null;
  return <motion.div data-yoppo-traveler className="yo-map-companion" initial={false} animate={controls} style={{left:`${origin[0]/4.8}%`,top:`${origin[1]/6}%`}} aria-label={{fr:"Yoppo t'attend",en:"Yoppo awaits",es:"Yoppo te espera"}[locale]}>
    <CompanionAvatar visualId="travel" state="map" locale={locale} size="sm" compact/>
  </motion.div>;
}
