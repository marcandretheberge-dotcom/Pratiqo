import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GermanCourseUnit } from "@/components/yo/german/GermanCourseUnit";
import { GermanCourseFinal } from "@/components/yo/german/GermanCourseFinal";
import {
  germanCatalog,
  germanFinal,
  germanCultureFinal,
  getGermanUnit,
} from "@/lib/yo/german/courseData";
import { germanAudioPaths } from "@/lib/yo/german/courseAudio.server";
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
      ? germanFinal
      : unitId === "culture"
        ? germanCultureFinal
        : getGermanUnit(unitId);
  if (!item) notFound();
  return {
    title: `${item.title[locale]} · Deutsch | YoPratiqo`,
    robots: { index: false, follow: false },
  };
}
export default async function GermanUnitPage({ params, searchParams }: Props) {
  const { unitId } = await params,
    query = await searchParams,
    locale = getYoLocale(query.lang);
  const assessment =
    unitId === "final"
      ? germanFinal
      : unitId === "culture"
        ? germanCultureFinal
        : null;
  if (assessment)
    return (
      <GermanCourseFinal
        key={unitId}
        assessment={assessment}
        catalog={germanCatalog}
        locale={locale}
        audioPaths={germanAudioPaths(assessment)}
      />
    );
  const unit = getGermanUnit(unitId);
  if (!unit) notFound();
  return (
    <GermanCourseUnit
      key={`${unitId}-${query.lesson ?? ""}-${query.activity ?? ""}`}
      unit={unit}
      catalog={germanCatalog}
      locale={locale}
      audioPaths={germanAudioPaths(unit)}
      initialLessonId={query.lesson}
      initialActivityId={query.activity}
    />
  );
}
