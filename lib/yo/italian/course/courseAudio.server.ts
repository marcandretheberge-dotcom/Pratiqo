import { getItalianCourseAudioItem } from "../../audio/italianCourseAudio";
import { italianIntroAudio } from "../../audio/italianIntroAudio";
import { italianBolognaAudio } from "../../audio/italianBolognaAudio";
import { distinctSpeech } from "./courseSpeech";
const spokenKey = (text:string) => text.normalize("NFC").replace(/[’‘]/g,"'").replace(/[.,!?]/g,"").replace(/\s+/g," ").trim().toLowerCase();
const existing = new Map([...italianIntroAudio,...italianBolognaAudio].map(item=>[spokenKey(item.text),item.storagePath]));
/** Only existing same-language recordings. No approximation of names, numbers or words. */
export function courseAudioPaths(texts:readonly string[]):Record<string,string>{
 const paths:Record<string,string>={};
 for(const text of distinctSpeech(texts)){
  const path=getItalianCourseAudioItem(text)?.storagePath??existing.get(spokenKey(text));
  if(path)paths[text]=path;
 }
 return paths;
}
