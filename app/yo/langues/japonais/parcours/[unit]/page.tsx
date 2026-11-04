import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getYoLocale } from "@/lib/yo/localize";
import { japaneseCourseUnits, japaneseCourseSources, japaneseFinalAssessment } from "@/lib/yo/japaneseCourse";
import type { JapaneseCourseUnit } from "@/lib/yo/japaneseCourseTypes";
import { JapaneseCoursePlayer } from "@/components/yo/japanese/JapaneseCoursePlayer";
import { YoMarkModuleCompletedButton } from "@/components/yo/YoMarkModuleCompletedButton";
import { japaneseJourneyUnits, japaneseFinalIds } from "@/lib/yo/foundationJourneyCatalogs";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ unit: string }>; searchParams: Promise<{ lang?: string | string[] }> };
function resolveUnit(slug: string): JapaneseCourseUnit | undefined {
  if (slug !== "bilan") return japaneseCourseUnits.find((unit) => unit.slug === slug);
  const last = japaneseCourseUnits[japaneseCourseUnits.length - 1];
  return {
    ...last, id: "jp-foundation-final", slug: "bilan", number: 9,
    title: { fr: "Une journée au Japon", en: "A day in Japan", es: "Un día en Japón" },
    subtitle: { fr: "Ta mission de synthèse : combine les acquis des huit modules dans de nouvelles situations.", en: "Your synthesis mission: combine practice from the eight modules in new situations.", es: "Tu misión de síntesis: combina lo practicado en los ocho módulos en situaciones nuevas." },
    setting: { fr: "Présentation, rendez-vous, déplacement, commande et récit : un bilan interne pour identifier tes prochains objectifs.", en: "Introductions, meetings, directions, ordering and recounting: an internal review to identify your next goals.", es: "Presentaciones, citas, trayectos, pedidos y relatos: un balance interno para identificar tus próximos objetivos." },
    goals: [
      { fr: "Réutiliser les formes étudiées sans regarder les modèles.", en: "Reuse practised forms without looking at the models.", es: "Reutilizar las formas estudiadas sin mirar los modelos." },
      { fr: "Repérer les situations qui demandent encore de la pratique.", en: "Identify situations that still need practice.", es: "Identificar situaciones que necesitan más práctica." },
      { fr: "Préparer un échange et une production libre avec un professeur.", en: "Prepare for a conversation and free production with a teacher.", es: "Preparar una conversación y producción libre con un profesor." },
    ],
    activities: japaneseFinalAssessment,
    roleplay: { title: last.roleplay.title, context: last.roleplay.context, turns: [] },
    kanji: [], kana: [],
  };
}
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const unit = resolveUnit((await params).unit);
  const locale = getYoLocale((await searchParams).lang);
  return { title: (unit?.title[locale] ?? "日本語") + " | YoPratiqo", description: unit?.subtitle[locale], robots: { index: false, follow: true } };
}
export default async function JapaneseUnitPage({ params, searchParams }: Props) {
  const unit = resolveUnit((await params).unit);
  if (!unit) notFound();
  const locale = getYoLocale((await searchParams).lang);
  return <JapaneseCoursePlayer key={unit.id} unit={unit} locale={locale} journeyUnits={japaneseJourneyUnits} finalIds={japaneseFinalIds} sources={japaneseCourseSources} final={unit.slug === "bilan"} completionAction={
    <YoMarkModuleCompletedButton locale={locale} payload={{
      course_id: "japanese-foundations", module_id: unit.id, module_title: unit.title[locale],
      discipline: "Japonais", level_label: "Fondations", progress_state: "completed",
      skill_tags: ["vocabulary", "grammar", "listening", "culture"],
      companion_stage: unit.slug === "bilan" ? "japanese_foundation_review" : "japanese_foundation_practice",
    }} />
  } />;
}
