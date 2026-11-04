import type { Metadata } from "next";

import { YoLanguageLandingPage } from "@/components/yo/YoLanguageLandingPage";
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
  return buildYoPratiqoMetadata("englishLanding", params.lang);
}

export default async function YoEnglishLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = resolveYoPratiqoPageLocale("englishLanding", params.lang);

  return (
    <YoLanguageLandingPage
      locale={locale}
      moduleConfig={getYoPratiqoModuleBySlug("anglais")}
      content={yopratiqoLandingContent.anglais}
    />
  );
}
