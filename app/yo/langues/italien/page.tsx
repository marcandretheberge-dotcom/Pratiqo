import type { Metadata } from "next";

import { YoLanguageLandingPage } from "@/components/yo/YoLanguageLandingPage";
import { getYoLocale } from "@/lib/yo/localize";
import { yopratiqoLandingContent } from "@/lib/yo/yopratiqoLandingContent";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { getYoPratiqoModuleBySlug } from "@/lib/yo/yopratiqoProductConfig";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("italianLanding", params.lang);
}

export default async function YoItalianLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);

  return (
    <YoLanguageLandingPage
      locale={locale}
      moduleConfig={getYoPratiqoModuleBySlug("italien")}
      content={yopratiqoLandingContent.italien}
    />
  );
}
