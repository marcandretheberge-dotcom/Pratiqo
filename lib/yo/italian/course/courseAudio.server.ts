import { getItalianCourseAudioItem } from "../../audio/italianCourseAudio";
import { distinctSpeech } from "./courseSpeech";
/** Server-side projection: no full curriculum or global audio registry enters the lesson client. */
export function courseAudioPaths(texts:readonly string[]):Record<string,string>{
 const paths:Record<string,string>={};
 for(const text of distinctSpeech(texts)){const item=getItalianCourseAudioItem(text);if(item)paths[text]=item.storagePath;}
 return paths;
}
