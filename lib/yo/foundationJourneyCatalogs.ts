import { japaneseCourseUnits, japaneseFinalAssessment } from "./japaneseCourse";
import { japaneseUnitPracticeIds } from "./japaneseCourseProgress";
import { mandarinUnits, getMandarinUnit } from "./mandarin/course";
import images from "./mandarin/imageAssets.json";
import { sceneDescriptions } from "./mandarin/visuals";
import type { JourneyUnit } from "./learningJourney";

// Only these plain summaries cross the server/client boundary, not the full courses.
export const japaneseJourneyUnits: JourneyUnit[] = japaneseCourseUnits.map(unit => ({
  id: unit.slug, number: unit.number, title: unit.title, subtitle: unit.subtitle,
  objectives: unit.goals, activityIds: japaneseUnitPracticeIds(unit),
}));
export const japaneseFinalIds = japaneseFinalAssessment.map(item => item.id);
export const mandarinJourneyUnits: JourneyUnit[] = mandarinUnits.map(unit => {
  const photo = images[unit.scene as keyof typeof images];
  const description = sceneDescriptions[unit.scene as keyof typeof sceneDescriptions];
  return {
    id: unit.id, number: unit.number, title: unit.title, subtitle: unit.setting,
    objectives: unit.goals, activityIds: unit.exercises.map(item => item.id),
    photo: {
      src: photo.src, width: photo.width, height: photo.height, alt: description,
      caption: description, author: photo.credit, sourceUrl: photo.source,
      license: photo.license, licenseUrl: photo.licenseUrl,
    },
  };
});
export const mandarinFinalIds = getMandarinUnit("bilan")!.exercises.map(item => item.id);
