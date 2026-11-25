"use client";

import { useEffect, useState } from "react";
import { learningLanguageId } from "@/lib/yo/config/languages";
import type { LearningProfile } from "@/lib/yo/personalized/profile";
import { readStudyPreferences, studyGoalFocus, studyPaceText, studyPreferenceSource, studyPreferences, type StudyPreferences } from "@/lib/yo/studyPlan";
import type { YoLocale } from "@/lib/yo/types";

type Props = { language: string; locale: YoLocale; profile?: LearningProfile };

/** Supporting guidance only: the course retains its one primary action and exact resume target. */
export function CourseStudyPlan(props: Props) {
  const language = learningLanguageId(props.language);
  return language ? <StudyPlan key={language} {...props} language={language}/> : null;
}

function StudyPlan({ language, locale, profile }: Props) {
  const [stored, setStored] = useState<StudyPreferences | null>(null);
  useEffect(() => {
    if (profile !== undefined) return;
    const source = studyPreferenceSource(language)!;
    const refresh = () => {
      try { setStored(readStudyPreferences(window.localStorage, language)); }
      catch { setStored(null); }
    };
    const frame = window.requestAnimationFrame(refresh);
    const onStorage = (event: StorageEvent) => {
      try { if (event.storageArea && event.storageArea !== window.localStorage) return; }
      catch { setStored(null); return; }
      if (event.key === null || event.key === source.key || event.key === source.epochKey) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [language, profile]);
  const preferences = profile === undefined ? stored : learningLanguageId(profile.language) === language ? studyPreferences(profile) : null;
  if (!preferences) return null;
  return <div data-course-study-plan={language} className="my-4 min-w-0 border-l-2 border-[#c9d8bd] pl-3 text-sm leading-6 text-[#52614e]">
    <p>{studyGoalFocus[preferences.goal][locale]}</p>
    <p className="mt-1 text-xs text-[#776a55]">{studyPaceText(preferences.weeklyMinutes)[locale]}</p>
  </div>;
}
