"use client";
import type {
  CourseAssessment,
  CourseCatalog,
} from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { GERMAN_PROGRESS_KEY } from "@/lib/yo/german/courseLogic";
import { ItalianAudioProvider } from "../italian/ItalianAudioProvider";
import { useItalianCourseProgress } from "../italian/course/useItalianCourseProgress";
import { GermanCourseShell, copy } from "./GermanCourseShared";
import { GermanAssessment } from "./GermanAssessment";
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
  const state = useItalianCourseProgress(catalog, GERMAN_PROGRESS_KEY);
  return (
    <ItalianAudioProvider paths={audioPaths} language="de">
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
        <GermanAssessment
          key={state.progress.resetAt}
          assessment={assessment}
          locale={locale}
          onComplete={state.recordAssessment}
        />
      </GermanCourseShell>
    </ItalianAudioProvider>
  );
}
