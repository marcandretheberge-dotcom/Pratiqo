import type { ItalianActivity } from "../italianModuleTypes";
import type { CourseAssessment, CourseUnit } from "./courseTypes";

/** Italian utterances only. Translations and learner-entered text never enter TTS. */
export function activitySpeech(activity:ItalianActivity):string[]{
 switch(activity.kind){
  case "match":return activity.pairs.map(pair=>pair.it);
  case "order":return [activity.it];
  case "type":return [activity.model];
  case "choice":case "culture":case "listen":return [...(activity.stimulus?[activity.stimulus]:[]),...activity.options.flatMap(option=>option.it?[option.it]:[])];
  case "dialogue":return activity.turns.flatMap(turn=>[turn.line,...turn.options.flatMap(option=>option.it?[option.it]:[])]);
  case "cafe":return [activity.orderText,...activity.menu.map(item=>item.it)];
  case "map":return activity.instructions;
 }
}
export function assessmentSpeech(assessment:CourseAssessment){return assessment.questions.flatMap(activitySpeech);}
export function unitSpeech(unit:CourseUnit){return [
 ...unit.lessons.flatMap(lesson=>[...lesson.vocabulary.map(item=>item.it),...lesson.grammar.examples.map(item=>item.it),...lesson.pronunciation.practice,lesson.reading.it,...lesson.activities.flatMap(activitySpeech)]),
 ...assessmentSpeech(unit.quiz),unit.production.model,
];}
export function distinctSpeech(texts:readonly string[]){return [...new Set(texts.map(text=>text.normalize("NFC").trim()).filter(Boolean))];}
