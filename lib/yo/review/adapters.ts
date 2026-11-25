import { learningLanguageId } from "@/lib/yo/config/languages";
import type { ItemRef, LocaleText } from "@/lib/yo/config/languageConfig";
import type { ItalianActivity, ItalianOption } from "@/lib/yo/italian/italianModuleTypes";
import type { CourseUnit } from "@/lib/yo/italian/course/courseTypes";
import type { JapaneseActivity, JapaneseChoice, JapaneseCourseUnit } from "@/lib/yo/japaneseCourseTypes";
import type { Unit as MandarinUnit } from "@/lib/yo/mandarin/types";

const same = (text: string): LocaleText => ({ fr: text, en: text, es: text });
const optionForm = (option: ItalianOption | undefined): LocaleText => option?.it ? same(option.it) : option?.label ?? same("");
const japaneseChoiceForm = (choice: JapaneseChoice | undefined): LocaleText => choice?.ja ? same(choice.ja) : choice?.label ?? same("");
const combine = (forms: LocaleText[]): LocaleText => ({
  fr: forms.map((form) => form.fr).join(" · "), en: forms.map((form) => form.en).join(" · "), es: forms.map((form) => form.es).join(" · "),
});

function courseForm(activity: ItalianActivity): LocaleText {
  switch (activity.kind) {
    case "choice": case "listen": case "culture": return optionForm(activity.options.find((option) => option.id === activity.correctId));
    case "type": return same(activity.model);
    case "order": return same(activity.it);
    case "match": return combine(activity.pairs.map((pair) => ({ fr: `${pair.it} — ${pair.meaning.fr}`, en: `${pair.it} — ${pair.meaning.en}`, es: `${pair.it} — ${pair.meaning.es}` })));
    case "dialogue": return combine(activity.turns.map((turn) => optionForm(turn.options.find((option) => option.id === turn.correctId))));
    case "cafe": return same(activity.order.map((order) => `${order.quantity} × ${activity.menu.find((item) => item.id === order.itemId)?.it ?? ""}`).join(" · "));
    case "map": return same(activity.instructions.join(" → "));
  }
}

/** Italian, German and Portuguese share this authored catalog shape; none of their progress is migrated here. */
export function courseReviewItems(language: string, units: readonly CourseUnit[]): ItemRef[] {
  const id = learningLanguageId(language);
  if (!id) return [];
  return units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.activities.map((activity): ItemRef => ({
    id: `course:${unit.id}:${lesson.id}:${activity.id}`, language: id, courseId: `${id}-course`, unitId: unit.id,
    lessonId: lesson.id, activityId: activity.id, kind: activity.kind, prompt: activity.prompt,
    correctForm: courseForm(activity), feedback: activity.explanation,
    skillTags: [activity.kind === "listen" ? "listening" : activity.kind === "order" ? "word-order" : "vocabulary"], difficultyTags: [],
  }))));
}

function japaneseForm(activity: JapaneseActivity): LocaleText {
  switch (activity.kind) {
    case "choice": case "listening": case "culture": return japaneseChoiceForm(activity.choices.find((choice) => choice.id === activity.answerId));
    case "build": return same(activity.phrase.ja);
    case "reading": return same(activity.answer);
    case "match": return same(activity.pairs.map((pair) => pair.phrase.ja).join(" · "));
  }
}

export function japaneseReviewItems(units: readonly JapaneseCourseUnit[]): ItemRef[] {
  return units.flatMap((unit) => [
    ...unit.activities.map((activity): ItemRef => ({
      id: `course:${unit.id}:practice:${activity.id}`, language: "ja", courseId: "ja-foundations", unitId: unit.id,
      lessonId: "practice", activityId: activity.id, kind: activity.kind, prompt: activity.prompt,
      correctForm: japaneseForm(activity), feedback: activity.explanation, skillTags: [activity.skill], difficultyTags: [],
    })),
    ...unit.roleplay.turns.map((turn): ItemRef => ({
      id: `course:${unit.id}:roleplay:${turn.id}`, language: "ja", courseId: "ja-foundations", unitId: unit.id,
      lessonId: "roleplay", activityId: turn.id, kind: "roleplay", prompt: turn.goal,
      correctForm: japaneseChoiceForm(turn.choices.find((choice) => choice.id === turn.answerId)),
      feedback: turn.choices.find((choice) => choice.id === turn.answerId)?.feedback ?? turn.hint,
      skillTags: ["interaction"], difficultyTags: [],
    })),
  ]);
}

export function mandarinReviewItems(units: readonly MandarinUnit[]): ItemRef[] {
  return units.flatMap((unit) => unit.exercises.map((exercise): ItemRef => ({
    id: `course:${unit.id}:practice:${exercise.id}`, language: "zh", courseId: "zh-foundations", unitId: unit.id,
    lessonId: "practice", activityId: exercise.id, kind: exercise.kind, prompt: exercise.prompt,
    // Keep the author's model; do not manufacture a pronunciation score from a tone choice.
    correctForm: same(exercise.model.hanzi), feedback: exercise.explanation,
    skillTags: [exercise.kind === "listen" || exercise.kind === "tone" ? "listening" : exercise.kind === "build" ? "word-order" : "vocabulary"], difficultyTags: [],
  })));
}
