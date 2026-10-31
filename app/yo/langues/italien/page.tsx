import type { Metadata } from "next";

import { YoLanguageLandingPage } from "@/components/yo/YoLanguageLandingPage";
import { buildYoLocaleHref, getYoLocale, lstr } from "@/lib/yo/localize";
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
      practiceEntry={{
        href: buildYoLocaleHref("/yo/langues/italien/module-1", locale),
        title: lstr("Une matinée à Bologne", "A morning in Bologna", "Una mañana en Bolonia"),
        body: lstr("Un module complet pour jouer, commander au café et explorer la ville avec Yoppo : 16 défis, 24 expressions et huit façons de pratiquer.", "A complete module to play, order at a café and explore the city with Yoppo: 16 challenges, 24 expressions and eight ways to practise.", "Un módulo completo para jugar, pedir en un café y explorar la ciudad con Yoppo: 16 retos, 24 expresiones y ocho formas de practicar."),
        cta: lstr("Jouer le module 1", "Play module 1", "Jugar el módulo 1"),
      }}
    />
  );
}
