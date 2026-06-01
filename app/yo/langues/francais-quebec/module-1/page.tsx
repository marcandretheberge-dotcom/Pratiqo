/**
 * YoPratiqo — Quebec French / Francisation, Module 1
 * "Workplace and Daily-Life Survival" — content shell only.
 *
 * STATUS: planned / coming soon. The route is intentionally noindex,
 * is not listed in the sitemap, and never injects Course JSON-LD.
 * It carries NO checkout, NO Stripe, NO payment hook, NO booking
 * logic and NO Membre Pro coupling.
 *
 * Gating contract — keep these invariants when editing:
 *   - `yopratiqoProductConfig.premiumModulesEnabled` is the global
 *     kill switch and stays `false` for the duration of the shell.
 *   - The module's per-entry `publicLaunchEnabled` and
 *     `checkoutEnabled` flags remain `false`. Tests pin both.
 *   - `buildYoPratiqoMetadata("frenchQuebecModuleOne", lang)` is the
 *     single source of truth for robots/canonical metadata. Do NOT
 *     hand-roll `<meta>` tags here.
 *   - Course JSON-LD is gated by `shouldPublishYoCourseSchema(slug,
 *     pageType)` which already returns `false` for any pageType
 *     other than "landing"; the future-premium pageType therefore
 *     never receives a Course schema.
 *
 * Honest copy contract — never advertise:
 *   - guaranteed fluency
 *   - guaranteed exam success (TEF / TEFAQ / TCF / TCFQ / IELTS …)
 *   - guaranteed employment outcome
 *   - guaranteed immigration result
 *   - government accreditation / OQLF / MIFI partnership
 *   - fake reviews / fake ratings / fake discounts / fake countdown
 */

import type { Metadata } from "next";

import { getYoLocale } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { frQuebecWorkplaceSurvivalModule } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";
import { YoPremiumModuleShell } from "@/components/yo/YoPremiumModuleShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("frenchQuebecModuleOne", params.lang);
}

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

export default async function YoFrancaisQuebecModuleOnePage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);

  const langSuffix =
    locale === "fr" ? "" : locale === "es" ? "?lang=es" : "?lang=en";
  const introHref = `/yo/langues/francais-quebec/intro${langSuffix}`;
  const teacherBridgeHref =
    locale === "fr"
      ? "/trouver-un-prof?q=francais"
      : locale === "es"
        ? "/trouver-un-prof?q=francais&lang=es"
        : "/trouver-un-prof?q=francais&lang=en";

  return (
    <YoPremiumModuleShell
      locale={locale}
      titleFr={frQuebecWorkplaceSurvivalModule.titleFr}
      titleEn={frQuebecWorkplaceSurvivalModule.titleEn}
      titleEs={frQuebecWorkplaceSurvivalModule.titleEs}
      taglineFr={frQuebecWorkplaceSurvivalModule.taglineFr}
      taglineEn={frQuebecWorkplaceSurvivalModule.taglineEn}
      taglineEs={frQuebecWorkplaceSurvivalModule.taglineEs}
      audienceFr={frQuebecWorkplaceSurvivalModule.audienceFr}
      audienceEn={frQuebecWorkplaceSurvivalModule.audienceEn}
      audienceEs={frQuebecWorkplaceSurvivalModule.audienceEs}
      honestPromiseFr={frQuebecWorkplaceSurvivalModule.honestPromiseFr}
      honestPromiseEn={frQuebecWorkplaceSurvivalModule.honestPromiseEn}
      honestPromiseEs={frQuebecWorkplaceSurvivalModule.honestPromiseEs}
      lessons={frQuebecWorkplaceSurvivalModule.lessons}
      teacherBridgeTitleFr={
        frQuebecWorkplaceSurvivalModule.teacherBridgeTitleFr
      }
      teacherBridgeTitleEn={
        frQuebecWorkplaceSurvivalModule.teacherBridgeTitleEn
      }
      teacherBridgeTitleEs={
        frQuebecWorkplaceSurvivalModule.teacherBridgeTitleEs
      }
      teacherBridgeBodyFr={frQuebecWorkplaceSurvivalModule.teacherBridgeBodyFr}
      teacherBridgeBodyEn={frQuebecWorkplaceSurvivalModule.teacherBridgeBodyEn}
      teacherBridgeBodyEs={frQuebecWorkplaceSurvivalModule.teacherBridgeBodyEs}
      comingSoonBodyFr={frQuebecWorkplaceSurvivalModule.comingSoonBodyFr}
      comingSoonBodyEn={frQuebecWorkplaceSurvivalModule.comingSoonBodyEn}
      comingSoonBodyEs={frQuebecWorkplaceSurvivalModule.comingSoonBodyEs}
      languageBreadcrumbFr="Français québécois"
      languageBreadcrumbEn="Quebec French"
      languageBreadcrumbEs="Francés de Quebec"
      futureCrumbFr="Module futur"
      futureCrumbEn="Future module"
      futureCrumbEs="Módulo futuro"
      introHref={introHref}
      teacherBridgeHref={teacherBridgeHref}
    />
  );
}
