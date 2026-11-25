import {personalizedItalianUnits} from "../personalized/courseData";
import {buildItalianTrivia, ITALIAN_TRIVIA_PASS} from "../italian/trivia";
import {matchesItalianAnswer} from "../italian/italianModuleLogic";

import {cityForRound, type CityRound} from "./cities";

export type Evidence={answer:string;assisted:boolean};
export type Round = "bologna" | CityRound;
// Never accept the client's score, best-result counter, stamp or placement preference as payment evidence.
export function passedRound(round:Round,raw:unknown){
  if(!Array.isArray(raw)||raw.length!==5||raw.some(x=>!x||typeof x.answer!=="string"||x.answer.length>100||x.assisted!==false))return false;
  const q=personalizedItalianUnits[0].quiz;
  if(round==="bologna")return q.questions.filter((item,i)=>item.kind==="type"?matchesItalianAnswer(raw[i].answer,item.accepted):raw[i].answer===item.correctId).length>=Math.ceil(q.passPercent*q.questions.length/100);
  const city = cityForRound(round);
  const unit = personalizedItalianUnits.find(item => item.id === city?.unit);
  if (!unit) return false;
  return buildItalianTrivia(unit).filter((item,i)=>item.correctOptionId===raw[i].answer).length>=ITALIAN_TRIVIA_PASS;
}
