import type { Metadata } from "next";

import { DominicanRepublicModule2Workbook } from "@/components/yo/DominicanRepublicModule2Workbook";
import { YoPrintPageShell } from "@/components/yo/YoPrintPageShell";
import { getYoLocale, t } from "@/lib/yo/localize";
import { getPrintableResourceById } from "@/lib/yo/printableResources";

export const metadata: Metadata = {
  title: "Cahier Module 2 - Republique dominicaine | YoPratiqo",
  description:
    "Cahier imprimable YoPratiqo pour pratiquer l'aeroport, le taxi, le check-in, les imprévus simples et les demandes de clarification.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function DominicanModule2ArrivalKitPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const suffix = locale === "fr" ? "" : `?lang=${locale}`;
  const resource = getPrintableResourceById("rd-m2-arrival-kit");

  return (
    <YoPrintPageShell
      locale={locale}
      title={resource ? t(resource.title, locale) : "Cahier YoPratiqo 02"}
      description={
        resource
          ? t(resource.description, locale)
          : "Cahier imprimable pour pratiquer les premiers echanges a l'arrivee."
      }
      moduleLabel="YoPratiqo - Espagnol Republique dominicaine"
      lessonLabel="Module 2"
      backHref={`/yo/langues/espagnol/pays/republique-dominicaine/module-2${suffix}`}
      backLabel={locale === "en" ? "Back to module" : locale === "es" ? "Volver al modulo" : "Retour au module"}
    >
      <DominicanRepublicModule2Workbook locale={locale} />
    </YoPrintPageShell>
  );
}
