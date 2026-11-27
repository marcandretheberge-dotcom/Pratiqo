import type { Metadata } from "next";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoDocumentLanguage } from "@/components/yo/YoDocumentLanguage";
import { YoRankings } from "@/components/yo/rankings/YoRankings";
import { rankingCopy } from "@/lib/yo/rankings/copy";
import { getYoLocale } from "@/lib/yo/localize";

type Props = { searchParams: Promise<{ lang?: string | string[] }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = getYoLocale((await searchParams).lang);
  return { title: `${rankingCopy[locale].rankings} · YoPratiqo`, robots: { index: false, follow: false } };
}
export default async function RankingsPage({ searchParams }: Props) {
  const locale = getYoLocale((await searchParams).lang), c = rankingCopy[locale];
  return <div className="min-h-[100dvh] bg-[#F6F9F5]" lang={locale}>
    <YoDocumentLanguage locale={locale} />
    <YoAppHeader locale={locale} backHref={`/yo/langues${locale === "fr" ? "" : `?lang=${locale}`}`} backLabel={c.back} title={c.rankings} selectorPath="/yo/classement" surfaceId="rankings" />
    <YoRankings locale={locale} />
  </div>;
}
