import { japaneseCourseUnits, japaneseFinalAssessment, japaneseExtendedFinalAssessment } from "./japaneseCourse";
import { japaneseUnitPracticeIds } from "./japaneseCourseProgress";
import { mandarinUnits, mandarinFinal, mandarinExtendedFinal } from "./mandarin/course";
import images from "./mandarin/imageAssets.json";
import { sceneDescriptions } from "./mandarin/visuals";
import type { JourneyUnit } from "./learningJourney";
import { japaneseReviewItems, mandarinReviewItems } from "./review/adapters";

// Only these plain summaries cross the server/client boundary, not the full courses.
export const japaneseJourneyUnits: JourneyUnit[] = japaneseCourseUnits.map(unit => ({
  id: unit.slug, number: unit.number, title: unit.title, subtitle: unit.subtitle,
  objectives: unit.goals, activityIds: japaneseUnitPracticeIds(unit),
}));
export const japaneseFinalIds = japaneseExtendedFinalAssessment.map(item => item.id);
export const japaneseLegacyFinalIds = japaneseFinalAssessment.map(item => item.id);
export const japaneseCourseReviewIds = japaneseReviewItems(japaneseCourseUnits).map(item => item.id);
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
export const mandarinFinalIds = mandarinExtendedFinal.exercises.map(item => item.id);
export const mandarinLegacyFinalIds = mandarinFinal.exercises.map(item => item.id);
export const mandarinCourseReviewIds = mandarinReviewItems(mandarinUnits).map(item => item.id);
