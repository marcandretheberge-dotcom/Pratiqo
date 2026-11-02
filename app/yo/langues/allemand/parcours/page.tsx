import type { Metadata } from "next";
import { GermanCourseDashboard } from "@/components/yo/german/GermanCourseDashboard";
import {
  germanCatalog,
  germanCourseUnits,
  germanFinal,
  germanCultureFinal,
} from "@/lib/yo/german/courseData";
import { germanPublishedAudio } from "@/lib/yo/german/courseAudioPublished";
import { germanUnitSpeech } from "@/lib/yo/german/courseAudio.server";
import { assessmentSpeech } from "@/lib/yo/italian/course/courseSpeech";
import { getYoLocale } from "@/lib/yo/localize";
type Query = { lang?: string | string[] };
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const locale = getYoLocale((await searchParams).lang);
  return {
    title: {
      fr: "Allemand · Premiers pas avec Yoppo | YoPratiqo",
      en: "German · First steps with Yoppo | YoPratiqo",
      es: "Alemán · Primeros pasos con Yoppo | YoPratiqo",
    }[locale],
    robots: { index: false, follow: false },
  };
}
export default async function GermanCoursePage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  return (
    <GermanCourseDashboard
      locale={getYoLocale((await searchParams).lang)}
      catalog={germanCatalog}
      audioReady={[
        ...germanCourseUnits.flatMap(germanUnitSpeech),
        ...assessmentSpeech(germanFinal),
        ...assessmentSpeech(germanCultureFinal),
      ].every((text) =>
        Boolean(germanPublishedAudio[text.normalize("NFC").trim()]),
      )}
    />
  );
}
