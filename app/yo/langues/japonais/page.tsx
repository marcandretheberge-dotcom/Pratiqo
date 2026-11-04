import type { Metadata } from "next";

import { YoLanguageLandingPage } from "@/components/yo/YoLanguageLandingPage";
import { lstr } from "@/lib/yo/localize";
import { yopratiqoLandingContent } from "@/lib/yo/yopratiqoLandingContent";
import { buildYoPratiqoMetadata, resolveYoPratiqoPageLocale } from "@/lib/yo/yopratiqoSeo";
import { getYoPratiqoModuleBySlug } from "@/lib/yo/yopratiqoProductConfig";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("japaneseLanding", params.lang);
}

export default async function YoJapaneseLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = resolveYoPratiqoPageLocale("japaneseLanding", params.lang);

  return (
    <YoLanguageLandingPage
      locale={locale}
      moduleConfig={getYoPratiqoModuleBySlug("japonais")}
      content={yopratiqoLandingContent.japonais}
      languageLabelOverride={lstr("Japonais", "Japanese", "Japonés")}
      entryHref="/yo/langues/japonais/parcours"
      entryCta={lstr("Commencer le parcours japonais", "Start the Japanese course", "Empezar el curso de japonés")}
      entryBadge={lstr("8 modules · Fondations", "8 modules · Foundations", "8 módulos · Fundamentos")}
    />
  );
}
