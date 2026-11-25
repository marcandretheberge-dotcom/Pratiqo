import {englishIntroAudio} from "../../lib/yo/audio/englishIntroAudio";
import {frQuebecPremiumLessonOneAudio} from "../../lib/yo/audio/frQuebecPremiumLessonOneAudio";
import {japaneseIntroAudio} from "../../lib/yo/audio/japaneseIntroAudio";
import {germanCourseAudio} from "../../lib/yo/audio/germanCourseAudio";
import {portugueseCourseAudio} from "../../lib/yo/audio/portugueseCourseAudio";
import {mandarinCourseAudio} from "../../lib/yo/audio/mandarinCourseAudio";
import type {YoAudioItem} from "../../lib/yo/audio/audioManifest.types-internal";
import type {FieldMission} from "../../lib/yo/scenarios/fieldMissions";

const registries:Record<string,readonly YoAudioItem[]> = {"fr-CA":frQuebecPremiumLessonOneAudio,"en-CA":englishIntroAudio,ja:japaneseIntroAudio,de:germanCourseAudio,"pt-BR":portugueseCourseAudio,"zh-Hans":mandarinCourseAudio};
export function sourceRecordings(mission:FieldMission){
  return mission.lines.map(line=>{
    const item=registries[mission.targetLang].find(i=>i.text===line.speechText);
    if(!item)throw Error("No recorded course line for "+mission.id+": "+line.speechText);
    return {id:line.id,storagePath:item.storagePath};
  });
}
