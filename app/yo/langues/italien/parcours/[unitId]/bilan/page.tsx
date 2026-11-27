import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItalianAchievementPrintable } from "@/components/yo/italian/guided/ItalianAchievementPrintable";
import { personalizedItalianCatalog, personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import { printableItalianEdition, printableItalianCatalog } from "@/lib/yo/italian/interests/printableEdition.server";
import { getYoLocale } from "@/lib/yo/localize";

export const metadata: Metadata = { title: "Mon bilan de voyage · Italiano · YoPratiqo", robots: { index: false, follow: false } };
type Props = { params: Promise<{ unitId: string }>; searchParams: Promise<{ lang?: string | string[]; edition?: string | string[] }> };

export function generateStaticParams() { return personalizedItalianUnits.map(unit => ({ unitId: unit.id })); }

export default async function CityAchievementPage({ params, searchParams }: Props) {
  const [p, q] = await Promise.all([params, searchParams]);
  const base = personalizedItalianUnits.find(item => item.id === p.unitId);
  if (!base) notFound();
  const edition = printableItalianEdition(base, q.edition);
  if (!edition) notFound();
  const catalog = printableItalianCatalog(personalizedItalianCatalog, edition);
  const unit = catalog.units.find(item => item.id === p.unitId)!;
  return <ItalianAchievementPrintable unit={unit} catalog={catalog} locale={getYoLocale(q.lang)} edition={typeof q.edition === "string" ? q.edition : undefined} />;
}
