import { createHash } from "node:crypto";
import type { YoAudioItem } from "./audioManifest.types-internal";
import { buildAudioSlug } from "./audioManifest.types-internal";
import {
  portugueseCourseUnits,
  portugueseFinal,
  portugueseCultureFinal,
} from "../portuguese/courseData";
import { portugueseUnitSpeech } from "../portuguese/courseAudio.server";
import {
  assessmentSpeech,
  distinctSpeech,
} from "../italian/course/courseSpeech";
/** Server/offline plan only. Never import the full course into a browser audio control. */
export const portugueseCourseAudio: readonly YoAudioItem[] = distinctSpeech([
  ...portugueseCourseUnits.flatMap(portugueseUnitSpeech),
  ...assessmentSpeech(portugueseFinal),
  ...assessmentSpeech(portugueseCultureFinal),
]).map((text) => {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 12);
  // Initial provider response for this scene was only 48 ms; retain a distinct retake path.
  const revision = hash === "db93f93ca173" ? "-r2" : "";
  const slug = `${buildAudioSlug(text).slice(0, 48).replace(/-$/, "")}-${hash}${revision}`;
  return {
    id: "ptbr-course-" + slug,
    targetLanguage: "pt",
    moduleId: "portuguese-course-foundations",
    lessonId: "v1",
    type: "sentence",
    text,
    spokenText: text,
    storagePath: `yo/pt-br/portuguese-course-foundations/v1/brazilian-portuguese/sentence/${slug}.mp3`,
    accentProfile: "brazilian_portuguese",
  };
});
