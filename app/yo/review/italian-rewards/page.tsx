import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ItalianRewardsPreview } from "@/components/yo/rewards/ItalianRewardsPreview";
import { personalizedItalianUnits as units, personalizedItalianCatalog as catalog, moduleBank } from "@/lib/yo/personalized/courseData";
import { courseAudioPaths } from "@/lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "@/lib/yo/italian/course/courseSpeech";
import { FLORENCE_DISCOVERY_PHRASES } from "@/lib/yo/italian/travel/journey";
import { getYoLocale } from "@/lib/yo/localize";
import { italianRewardsPreviewEnabled } from "@/lib/yo/rewards/previewGate";
import "@/components/yo/challenge/finalChallenge.css";
import "@/components/yo/challenge/challengeGame.css";
import "@/components/yo/challenge/challengeProgress.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Italian journey · Private review", robots: { index: false, follow: false } };

export default async function ItalianRewardsReview({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  if (!italianRewardsPreviewEnabled(process.env)) notFound();
  const locale = getYoLocale((await searchParams).lang);
  return <ItalianRewardsPreview locale={locale} units={units} catalog={catalog}
    banks={Object.fromEntries(units.map(unit => [unit.id, moduleBank(unit)]))}
    audioPaths={courseAudioPaths([...units.flatMap(unitSpeech), ...units.flatMap(u => moduleBank(u).map(p => p.it)), ...FLORENCE_DISCOVERY_PHRASES])}/>;
}
