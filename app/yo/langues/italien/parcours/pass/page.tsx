import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {pilotEnabled} from "@/lib/yo/passPilot/account.server";
import {cityForUnit, passCities} from "@/lib/yo/passPilot/cities";
import {PassDesk} from "@/components/yo/italian/pass/PassDesk";
import {situationBeat} from "@/lib/yo/passPilot/situations";
import {RailSample} from "@/components/yo/italian/pass/RailSample";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Mon itinéraire italien · YoPratiqo",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{city?:string}>}){
  const query = await searchParams;
  const city = query.city === undefined ? passCities[0] : cityForUnit(query.city);
  if (!city) notFound();
  if(!pilotEnabled()){
    if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "feat/yo-pass-italian-test-pilot") {
      if (city.round === "parma") return <RailSample/>;
      if (city.round === "napoli") {
        const sample = situationBeat(city, {step: 2, attempt: 0, mistakes: 0, interest: "travel"});
        return <RailSample key={city.unit} city={city.city} title={city.title} sample={sample}/>;
      }
    }
    notFound();
  }
  return <PassDesk key={city.unit} city={city}/>;
}
