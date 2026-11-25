import type { Metadata } from "next";

import { YoLanguageLandingPage } from "@/components/yo/YoLanguageLandingPage";
import { YoUpcomingModuleCard } from "@/components/yo/YoUpcomingModuleCard";
import type { YoLocale } from "@/lib/yo/types";
import { yopratiqoLandingContent } from "@/lib/yo/yopratiqoLandingContent";
import { buildYoPratiqoMetadata, resolveYoPratiqoPageLocale } from "@/lib/yo/yopratiqoSeo";
import { getYoPratiqoModuleBySlug } from "@/lib/yo/yopratiqoProductConfig";

import Link from "next/link";
import { francisationPreviewEnabled } from "@/lib/yo/francisation/preview";
import { freeCourses, goal, missionTitle, notice, purpose } from "@/lib/yo/francisation/mission";

export const dynamic = "force-dynamic";

// Locale-aware destination for the (noindex) Quebec French / Francisation
// workplace module shell. The three literals are intentional: the spec
// requires explicit `?lang=fr|en|es` (even for the default FR locale) so
// the URL always reads as a fully-qualified locale URL that the language
// switcher inside the shell can mirror back. We keep all three forms in
// the source — never compose them via `?lang=${locale}` only — so the
// discoverability test can pin each literal independently.
const MODULE_HREF_BY_LOCALE: Record<YoLocale, string> = {
  fr: "/yo/langues/francais-quebec/module-1?lang=fr",
  en: "/yo/langues/francais-quebec/module-1?lang=en",
  es: "/yo/langues/francais-quebec/module-1?lang=es",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const metadata = buildYoPratiqoMetadata("frenchQuebecLanding", params.lang);
  if (!francisationPreviewEnabled()) return metadata;
  const robots = { index: false, follow: false };
  if (resolveYoPratiqoPageLocale("frenchQuebecLanding", params.lang) !== "fr") return { ...metadata, robots };
  const title = "Francisation au Québec en ligne | YoPratiqo";
  const description = "Pratiquez le français en autonomie avec Yoppo. Une mission gratuite pour vérifier un nom et des coordonnées dans une situation fictive au Québec.";
  return { ...metadata, title: { absolute: title }, description, robots,
    openGraph: { ...metadata.openGraph, title, description },
    twitter: { ...metadata.twitter, title, description } };
}

export default async function YoFrenchQuebecLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = resolveYoPratiqoPageLocale("frenchQuebecLanding", params.lang);
  const moduleHref = MODULE_HREF_BY_LOCALE[locale];

  if (francisationPreviewEnabled() && locale === "fr") {
    return <main lang="fr-CA" className="min-h-dvh bg-emerald-50 px-5 py-10 text-emerald-950">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/yo" className="underline">Retour à YoPratiqo</Link>
        <h1 className="text-4xl font-bold">{goal} en ligne</h1>
        <p>{purpose} Avance à ton rythme dans cette activité de stade débutant.</p>
        <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">{missionTitle}</h2>
          <p>Avec Yoppo, suis un échange à l’accueil d’un atelier. Repère une correction, puis essaie avec la fiche d’un nouveau personnage.</p>
          <Link href="/yo/langues/francais-quebec/demarrer#francisation" className="inline-flex min-h-12 items-center rounded-xl bg-emerald-800 px-5 font-bold text-white">Découvrir la mission gratuite</Link>
          <p className="text-sm">{notice}</p>
        </section>
        <nav aria-label="Autres ressources en français" className="flex flex-col items-start gap-3 underline">
          <Link href="/yo/langues/francais-quebec/demarrer#objectifs">Choisir un autre objectif de français</Link>
          <Link href="/yo/langues/francais-quebec/intro?lang=fr">Découvrir l’introduction culturelle</Link>
          <Link href={moduleHref}>Découvrir le module sur le travail</Link>
          <Link href="/francisation">Trouver un professeur de francisation</Link>
          <a href={freeCourses}>Consulter les cours de français gratuits du gouvernement du Québec</a>
        </nav>
      </div>
    </main>;
  }

  return (
    <>
      <YoLanguageLandingPage
        locale={locale}
        moduleConfig={getYoPratiqoModuleBySlug("francais-quebec")}
        content={yopratiqoLandingContent["francais-quebec"]}
      />
      {/*
       * Upcoming-module entry-point. Rendered as a sibling section so the
       * shared YoLanguageLandingPage stays untouched and no other module's
       * hub picks up this Quebec-specific pitch by accident. The teacher
       * search link is intentionally omitted here because the landing
       * page above already exposes one in both the hero and the teacher
       * bridge card.
       */}
      <section
        aria-label={
          locale === "es"
            ? "Módulo próximamente"
            : locale === "en"
              ? "Upcoming module"
              : "Module à venir"
        }
        className="bg-[#FAFCFB] text-[#0F6E56]"
      >
        <div className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <YoUpcomingModuleCard locale={locale} href={moduleHref} />
        </div>
      </section>
    </>
  );
}
