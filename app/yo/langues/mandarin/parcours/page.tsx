import type { Metadata } from "next";
import { getYoLocale } from "@/lib/yo/localize";
import { MandarinCourseHome } from "@/components/yo/mandarin/MandarinCourseHome";
import { L } from "@/lib/yo/mandarin/types";
import {
  MANDARIN_LANGUAGE_SOURCE,
} from "@/lib/yo/mandarin/course";
import { mandarinJourneyUnits, mandarinFinalIds } from "@/lib/yo/foundationJourneyCatalogs";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ lang?: string | string[] }> };
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const locale = getYoLocale((await searchParams).lang);
  return {
    title: L(
      "Mandarin · Fondations avec Yoppo | YoPratiqo",
      "Mandarin · Foundations with Yoppo | YoPratiqo",
      "Mandarín · Fundamentos con Yoppo | YoPratiqo",
    )[locale],
    robots: { index: false, follow: true },
  };
}
export default async function Page({ searchParams }: Props) {
  return (
    <MandarinCourseHome
      locale={getYoLocale((await searchParams).lang)}
      units={mandarinJourneyUnits}
      finalIds={mandarinFinalIds}
      languageSource={MANDARIN_LANGUAGE_SOURCE}
    />
  );
}
