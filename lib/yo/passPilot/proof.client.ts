import type {Evidence,Round} from "./assessment";
import {passCities} from "./cities";

export const showPassPilot=process.env.NEXT_PUBLIC_YO_PASS_PILOT==="italian-test";
export const pilotPath="/yo/langues/italien/parcours/pass";
const prefix="yo.test-pass.evidence.v1.";
export function storeRound(round:Round,answers:Evidence[]){
  if(showPassPilot)try{sessionStorage.setItem(prefix+round,JSON.stringify(answers));}catch{/* An unsaved round can be replayed. */}
}
export async function submitRounds(send:(round:Round,a:Evidence[])=>Promise<boolean>){
  for(const round of ["bologna", ...passCities.map(city => city.round)] as const){
    let answers: Evidence[];
    try {
      const raw = sessionStorage.getItem(prefix + round);
      if (!raw) continue;
      answers = JSON.parse(raw);
    } catch { continue; }
    if (await send(round, answers)) {
      try { sessionStorage.removeItem(prefix + round); } catch { /* Resubmitting a score is idempotent. */ }
    }
  }
}
