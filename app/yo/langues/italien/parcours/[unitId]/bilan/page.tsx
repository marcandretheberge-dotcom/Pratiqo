import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItalianAchievementPrintable } from "@/components/yo/italian/guided/ItalianAchievementPrintable";
import { personalizedItalianCatalog, personalizedItalianUnits } from "@/lib/yo/personalized/courseData";
import { getYoLocale } from "@/lib/yo/localize";

export const metadata: Metadata = { title: "Mon bilan de voyage · Italiano · YoPratiqo", robots: { index: false, follow: false } };
type Props = { params: Promise<{ unitId: string }>; searchParams: Promise<{ lang?: string | string[] }> };

export function generateStaticParams() { return personalizedItalianUnits.map(unit => ({ unitId: unit.id })); }

export default async function CityAchievementPage({ params, searchParams }: Props) {
  const [p, q] = await Promise.all([params, searchParams]);
  const unit = personalizedItalianCatalog.units.find(item => item.id === p.unitId);
  if (!unit) notFound();
  return <ItalianAchievementPrintable unit={unit} catalog={personalizedItalianCatalog} locale={getYoLocale(q.lang)} />;
}
