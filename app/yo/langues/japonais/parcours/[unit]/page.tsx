import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getYoLocale } from "@/lib/yo/localize";
import { japaneseCourseSources, japaneseFinalAssessment, japaneseExtendedFinalAssessment } from "@/lib/yo/japaneseCourse";
import { resolveJapaneseCourseUnit } from "@/lib/yo/japaneseCourseRouting";
import { JapaneseCoursePlayer } from "@/components/yo/japanese/JapaneseCoursePlayer";
import { YoMarkModuleCompletedButton } from "@/components/yo/YoMarkModuleCompletedButton";
import { japaneseJourneyUnits } from "@/lib/yo/foundationJourneyCatalogs";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ unit: string }>; searchParams: Promise<{ lang?: string | string[] }> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const unit = resolveJapaneseCourseUnit((await params).unit);
  const locale = getYoLocale((await searchParams).lang);
  return { title: (unit?.title[locale] ?? "日本語") + " | YoPratiqo", description: unit?.subtitle[locale], robots: { index: false, follow: true } };
}
export default async function JapaneseUnitPage({ params, searchParams }: Props) {
  const unit = resolveJapaneseCourseUnit((await params).unit);
  if (!unit) notFound();
  const locale = getYoLocale((await searchParams).lang);
  const final = unit.slug === "bilan" || unit.slug === "bilan-fondations";
  const legacyFinal = unit.slug === "bilan";
  const finalIds = (legacyFinal ? japaneseFinalAssessment : japaneseExtendedFinalAssessment).map(activity => activity.id);
  return <JapaneseCoursePlayer key={unit.id} unit={unit} locale={locale}
    journeyUnits={legacyFinal ? japaneseJourneyUnits.slice(0, 8) : japaneseJourneyUnits}
    finalIds={finalIds} sources={japaneseCourseSources} final={final} completionAction={
      <YoMarkModuleCompletedButton locale={locale} payload={{
        course_id: "japanese-foundations", module_id: unit.id, module_title: unit.title[locale],
        discipline: "Japonais", level_label: "Fondations", progress_state: "completed",
        skill_tags: final ? ["reading", "grammar", "vocabulary"] : unit.number > 8 ? ["reading", "grammar", "vocabulary", "culture"] : ["vocabulary", "grammar", "listening", "culture"],
        companion_stage: final ? "japanese_foundation_review" : "japanese_foundation_practice",
      }} />
    } />;
}
