import type { Metadata } from "next";
import { getYoLocale } from "@/lib/yo/localize";
import { japaneseCourseUnits, japaneseCourseSources, japaneseFinalAssessment } from "@/lib/yo/japaneseCourse";
import { japaneseUnitPracticeIds } from "@/lib/yo/japaneseCourseProgress";
import { JapaneseCourseHome } from "@/components/yo/japanese/JapaneseCourseHome";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ lang?: string | string[] }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = getYoLocale((await searchParams).lang);
  return {
    title: { fr: "Japonais · Fondations — 8 modules avec Yoppo | YoPratiqo", en: "Japanese · Foundations — 8 modules with Yoppo | YoPratiqo", es: "Japonés · Fundamentos — 8 módulos con Yoppo | YoPratiqo" }[locale],
    description: { fr: "Un parcours de japonais débutant : scènes, kana, kanji, culture, écriture et révisions avec Yoppo.", en: "A beginner Japanese course with scenes, kana, kanji, culture, writing and review with Yoppo.", es: "Un curso inicial de japonés con escenas, kana, kanji, cultura, escritura y repaso con Yoppo." }[locale],
    robots: { index: false, follow: true },
  };
}
export default async function JapaneseCoursePage({ searchParams }: Props) {
  const locale = getYoLocale((await searchParams).lang);
  const units = japaneseCourseUnits.map((unit) => ({
    id: unit.id, slug: unit.slug, number: unit.number, title: unit.title, subtitle: unit.subtitle,
    goals: unit.goals, kanji: unit.kanji, kana: unit.kana, estimatedMinutes: unit.estimatedMinutes,
    practiceIds: japaneseUnitPracticeIds(unit),
  }));
  return <JapaneseCourseHome locale={locale} units={units} sources={japaneseCourseSources} finalIds={japaneseFinalAssessment.map((item) => item.id)} />;
}
