"use client";
import { CourseAdventure } from "../journey/AdventureProgress";
import { useCourseExperience } from "./CourseExperience";
import type {
  CourseAssessment,
  CourseCatalog,
} from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianAudioProvider } from "../italian/ItalianAudioProvider";
import { useItalianCourseProgress } from "../italian/course/useItalianCourseProgress";
import { GermanCourseShell, copy } from "./GermanCourseShared";
import { GermanAssessment } from "./GermanAssessment";
import { CourseJourneyGate } from "../journey/CourseJourney";
import { canEnterCourseAssessment } from "@/lib/yo/courseJourney";
import { useEffect } from "react";
import { MissionFilm } from "../travel/MissionFilm";
import { useMissionCinema } from "../travel/useMissionCinema";
export function GermanCourseFinal({
  assessment,
  catalog,
  locale,
  audioPaths,
}: {
  assessment: CourseAssessment;
  catalog: CourseCatalog;
  locale: YoLocale;
  audioPaths: Record<string, string>;
}) {
  const experience = useCourseExperience();
  const state = useItalianCourseProgress(catalog, experience.progressKey);
  const allowed = canEnterCourseAssessment(catalog, state.progress, assessment.id);
  const { scene, present, finish } = useMissionCinema(`${experience.progressKey}:${state.progress.resetAt}`, { active: state.ready && allowed });
  useEffect(() => {
    if (!state.ready || !allowed) return;
    present({ id: `${assessment.id}:start`, kind: "mission-start", title: assessment.title[locale], detail: assessment.description[locale] });
  }, [state.ready, allowed, assessment, locale, present]);
  if (!state.ready || !allowed) return <CourseJourneyGate locale={locale} ready={state.ready} href={experience.href(locale)} />;
  return (
    <ItalianAudioProvider paths={audioPaths} language={experience.language}>
      <GermanCourseShell
        locale={locale}
        unit={assessment.theme === "culture" ? "culture" : "final"}
      >
        <h1 className="mb-6 font-serif text-4xl text-emerald-950">
          {assessment.title[locale]}
        </h1>
        <p className="mb-5 text-xs text-gray-600" role="status">
          {state.ready && !state.storageAvailable
            ? copy[locale].blocked
            : copy[locale].local}
        </p>
        <CourseAdventure catalog={catalog} progress={state.progress} locale={locale} ready={state.ready} href={experience.href(locale)} cinematic />
        <GermanAssessment
          key={state.progress.resetAt}
          assessment={assessment}
          locale={locale}
          onComplete={state.recordAssessment}
        />
        {scene && <MissionFilm scene={scene} locale={locale} onContinue={finish}/>}
      </GermanCourseShell>
    </ItalianAudioProvider>
  );
}
