import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {pilotEnabled} from "@/lib/yo/passPilot/account.server";
import {personalizedItalianUnits} from "@/lib/yo/personalized/courseData";
import {ITALIAN_WORLDS} from "@/lib/yo/italian/worlds";
import {PassDesk} from "@/components/yo/italian/pass/PassDesk";
import {RailSample} from "@/components/yo/italian/pass/RailSample";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Le billet pour Parme · YoPratiqo",robots:{index:false,follow:false}};
export default function Page(){
  if(!pilotEnabled()){
    if(process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_GIT_COMMIT_REF==="feat/yo-pass-italian-test-pilot")return <RailSample/>;
    notFound();
  }
  const itinerary=ITALIAN_WORLDS.flatMap(w=>w.cities).map(c=>({city:c.name,task:personalizedItalianUnits.find(u=>u.id===c.unitId)!.objectives[0].fr}));
  return <PassDesk itinerary={itinerary}/>;
}
