import type { Metadata } from "next";
import { GermanCourseDashboard } from "@/components/yo/german/GermanCourseDashboard";
import {
  portugueseCatalog,
  portugueseCourseUnits,
  portugueseFinal,
  portugueseCultureFinal,
} from "@/lib/yo/portuguese/courseData";
import { portuguesePublishedAudio } from "@/lib/yo/portuguese/courseAudioPublished";
import { portugueseUnitSpeech } from "@/lib/yo/portuguese/courseAudio.server";
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
      fr: "Portugais du Brésil · Premiers pas avec Yoppo | YoPratiqo",
      en: "Brazilian Portuguese · First steps with Yoppo | YoPratiqo",
      es: "Portugués de Brasil · Primeros pasos con Yoppo | YoPratiqo",
    }[locale],
    robots: { index: false, follow: false },
  };
}
export default async function PortugueseCoursePage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  return (
    <GermanCourseDashboard
      locale={getYoLocale((await searchParams).lang)}
      catalog={portugueseCatalog}
      audioReady={[
        ...portugueseCourseUnits.flatMap(portugueseUnitSpeech),
        ...assessmentSpeech(portugueseFinal),
        ...assessmentSpeech(portugueseCultureFinal),
      ].every((text) =>
        Boolean(portuguesePublishedAudio[text.normalize("NFC").trim()]),
      )}
    />
  );
}
