import type { IntroCourse, Step } from "./types";
export function courseSteps(course: IntroCourse): Step[] {
  // Keep the old v-step identifiers and positions: saved lesson/assessment drafts remain aligned.
  return course.missions.flatMap((m, mission) => [
    ...Array.from({ length: m.visuals.length * 2 }, (_, index) => ({ id: `${m.id}:v${index}`, mission, kind: index === 0 ? "study" as const : "recall" as const, index })),
    { id: `${m.id}:words`, mission, kind: "words" as const, index: 0 },
    { id: `${m.id}:scene`, mission, kind: "scene" as const, index: 0 },
    ...m.concepts.map((_, index) => ({ id: `${m.id}:c${index}`, mission, kind: "concept" as const, index })),
    ...m.practice.map((e, index) => ({ id: e.id, mission, kind: "exercise" as const, index })),
  ]);
}
