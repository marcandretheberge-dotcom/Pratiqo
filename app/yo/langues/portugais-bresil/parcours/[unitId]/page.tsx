import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GermanCourseUnit } from "@/components/yo/german/GermanCourseUnit";
import { GermanCourseFinal } from "@/components/yo/german/GermanCourseFinal";
import {
  portugueseCatalog,
  portugueseFinal,
  portugueseCultureFinal,
  getPortugueseUnit,
} from "@/lib/yo/portuguese/courseData";
import { portugueseAudioPaths } from "@/lib/yo/portuguese/courseAudio.server";
import { getYoLocale } from "@/lib/yo/localize";
type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{
    lang?: string | string[];
    lesson?: string;
    activity?: string;
  }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { unitId } = await params,
    locale = getYoLocale((await searchParams).lang);
  const item =
    unitId === "final"
      ? portugueseFinal
      : unitId === "culture"
        ? portugueseCultureFinal
        : getPortugueseUnit(unitId);
  if (!item) notFound();
  return {
    title: `${item.title[locale]} · Português do Brasil | YoPratiqo`,
    robots: { index: false, follow: false },
  };
}
export default async function PortugueseUnitPage({
  params,
  searchParams,
}: Props) {
  const { unitId } = await params,
    query = await searchParams,
    locale = getYoLocale(query.lang);
  const assessment =
    unitId === "final"
      ? portugueseFinal
      : unitId === "culture"
        ? portugueseCultureFinal
        : null;
  if (assessment)
    return (
      <GermanCourseFinal
        key={unitId}
        assessment={assessment}
        catalog={portugueseCatalog}
        locale={locale}
        audioPaths={portugueseAudioPaths(assessment)}
      />
    );
  const unit = getPortugueseUnit(unitId);
  if (!unit) notFound();
  return (
    <GermanCourseUnit
      key={`${unitId}-${query.lesson ?? ""}-${query.activity ?? ""}`}
      unit={unit}
      catalog={portugueseCatalog}
      locale={locale}
      audioPaths={portugueseAudioPaths(unit)}
      initialLessonId={query.lesson}
      initialActivityId={query.activity}
    />
  );
}
