import { createHash } from "node:crypto";
import type { YoAudioItem } from "./audioManifest.types-internal";
import { buildAudioSlug } from "./audioManifest.types-internal";
import {
  germanCourseUnits,
  germanFinal,
  germanCultureFinal,
} from "../german/courseData";
import { germanUnitSpeech } from "../german/courseAudio.server";
import {
  assessmentSpeech,
  distinctSpeech,
} from "../italian/course/courseSpeech";
/** Server/offline plan only. Never import the full course into a browser audio control. */
export const germanCourseAudio: readonly YoAudioItem[] = distinctSpeech([
  ...germanCourseUnits.flatMap(germanUnitSpeech),
  ...assessmentSpeech(germanFinal),
  ...assessmentSpeech(germanCultureFinal),
]).map((text) => {
  const slug = `${buildAudioSlug(text).slice(0, 48).replace(/-$/, "")}-${createHash("sha256").update(text).digest("hex").slice(0, 12)}`;
  return {
    id: "de-course-" + slug,
    targetLanguage: "de",
    moduleId: "german-course-foundations",
    lessonId: "v1",
    type: "sentence",
    text,
    spokenText: text,
    storagePath: `yo/de/german-course-foundations/v1/german-standard/sentence/${slug}.mp3`,
    accentProfile: "german_standard",
  };
});
