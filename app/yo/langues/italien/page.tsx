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
        eyebrow: lstr("Cours italien · Fondations A1", "Italian course · A1 foundations", "Curso de italiano · Bases A1"),
        href: buildYoLocaleHref("/yo/langues/italien/parcours", locale),
        title: lstr("Italien 1 · La vie en italien", "Italian 1 · Life in Italian", "Italiano 1 · La vida en italiano"),
        body: lstr("Un cours progressif avec Yoppo : douze unités, trente-six leçons, des jeux, des lectures, des bilans et des projets écrits et oraux.", "A progressive course with Yoppo: twelve units, thirty-six lessons, games, readings, checkpoints and written and spoken projects.", "Un curso progresivo con Yoppo: doce unidades, treinta y seis lecciones, juegos, lecturas, balances y proyectos escritos y orales."),
        cta: lstr("Explorer le cours italien", "Explore the Italian course", "Explorar el curso de italiano"),
      }}
    />
  );
}
