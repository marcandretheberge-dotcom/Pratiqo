import type { Metadata } from "next";
import { ItalianLearningEntry } from "@/components/yo/personalized/ItalianLearningEntry";
import { personalizedItalianUnits, personalizedItalianCatalog, moduleBank, moduleVisuals, placementChecks } from "@/lib/yo/personalized/courseData";
import { buildItalianWorldPassages } from "@/lib/yo/italian/worldPassage";
import { italianWorldForUnit } from "@/lib/yo/italian/worlds";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech, activitySpeech } from "@/lib/yo/italian/course/courseSpeech";
import { getYoLocale } from "@/lib/yo/localize";

export const metadata: Metadata = { title: "Italiano · Ton parcours avec Yoppo · YoPratiqo", robots: { index: false, follow: false } };

export default async function ItalianCoursePage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const unit = personalizedItalianUnits[0];
  const passage = buildItalianWorldPassages(personalizedItalianUnits).find(
    item => item.sourceWorldId === italianWorldForUnit(unit.id)?.id,
  );
  const audio = [
    ...unitSpeech(unit),
    ...moduleBank(unit).map(word => word.it),
    ...(passage?.questions.flatMap(question => activitySpeech(question)) ?? []),
  ];
  return <ItalianLearningEntry entryHome locale={getYoLocale((await searchParams).lang)} unit={unit}
    catalog={personalizedItalianCatalog} audioPaths={courseAudioPaths(audio)}
    wordBank={moduleBank(unit)} visualWords={moduleVisuals(unit)}
    worldPassage={passage} checks={placementChecks}
    placementAudio={courseAudioPaths(placementChecks.flatMap(check => activitySpeech(check.activity)))} />;
}
