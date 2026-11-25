import { notFound } from "next/navigation";
import { GermanCourseDashboard } from "../german/GermanCourseDashboard";
import { GermanCourseUnit } from "../german/GermanCourseUnit";
import { GermanCourseFinal } from "../german/GermanCourseFinal";
import { foundationContent } from "@/lib/yo/foundations/catalog.server";
import { foundationAudioPaths, foundationAudioCoverage } from "@/lib/yo/foundations/audio.server";
import { foundationSettings, type NewFoundationLanguage } from "@/lib/yo/foundations/experience";
import { getYoLocale } from "@/lib/yo/localize";
import type { Metadata } from "next";

export type FoundationQuery = { lang?: string | string[]; lesson?: string; activity?: string };
export async function FoundationHome({ language, searchParams }: { language: NewFoundationLanguage; searchParams: Promise<FoundationQuery> }) {
  const { catalog, sources, units, final } = foundationContent(language);
  const coverage = foundationAudioCoverage(language, [...units, final]);
  return <GermanCourseDashboard locale={getYoLocale((await searchParams).lang)} catalog={catalog} audioReady={coverage.missing === 0} audioCoverage={coverage} sources={sources}/>;
}
export async function FoundationUnit({ language, params, searchParams }: {
  language: NewFoundationLanguage; params: Promise<{ unitId: string }>; searchParams: Promise<FoundationQuery>;
}) {
  const { unitId } = await params, query = await searchParams, locale = getYoLocale(query.lang);
  const { catalog, units, final, sources } = foundationContent(language);
  if (unitId === "final") return <GermanCourseFinal key={`${language}:final`} assessment={final} catalog={catalog} locale={locale} audioPaths={foundationAudioPaths(language, final)}/>;
  const unit = units.find(unit => unit.id === unitId);
  if (!unit) notFound();
  return <GermanCourseUnit key={`${language}:${unitId}:${query.lesson ?? ""}:${query.activity ?? ""}`} unit={unit} catalog={catalog} locale={locale} audioPaths={foundationAudioPaths(language, unit)} sources={sources} initialLessonId={query.lesson} initialActivityId={query.activity}/>;
}
export async function foundationMetadata(language: NewFoundationLanguage, searchParams: Promise<FoundationQuery>, params?: Promise<{ unitId: string }>): Promise<Metadata> {
  const locale = getYoLocale((await searchParams).lang), settings = foundationSettings[language];
  if (!params) return { title: `${settings.title[locale]} | YoPratiqo`, robots: { index: false, follow: false } };
  const { unitId } = await params, content = foundationContent(language);
  const item = unitId === "final" ? content.final : content.units.find(unit => unit.id === unitId);
  if (!item) notFound();
  return { title: `${item.title[locale]} · ${settings.name} | YoPratiqo`, robots: { index: false, follow: false } };
}
