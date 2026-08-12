import type { Metadata } from "next";

import { DominicanRepublicModule3Workbook } from "@/components/yo/DominicanRepublicModule3Workbook";
import { YoPrintPageShell } from "@/components/yo/YoPrintPageShell";
import { getYoLocale, t } from "@/lib/yo/localize";
import { getPrintableResourceById } from "@/lib/yo/printableResources";

export const metadata: Metadata = {
  title: "Cahier Module 3 - Republique dominicaine | YoPratiqo",
  description:
    "Cahier imprimable YoPratiqo pour pratiquer le restaurant, la comida tipica, la commande et le paiement.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function DominicanModule3PracticeSheetsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const suffix = locale === "fr" ? "" : `?lang=${locale}`;
  const resource = getPrintableResourceById("rd-m3-practice-sheets");

  return (
    <YoPrintPageShell
      locale={locale}
      title={resource ? t(resource.title, locale) : "Fiches de pratique"}
      description={
        resource
          ? t(resource.description, locale)
          : "Fiches imprimables pour pratiquer le restaurant et la culture culinaire."
      }
      moduleLabel="YoPratiqo - Espagnol Republique dominicaine"
      lessonLabel="Module 3"
      backHref={`/yo/langues/espagnol/pays/republique-dominicaine/module-3${suffix}`}
      backLabel={locale === "en" ? "Back to module" : locale === "es" ? "Volver al modulo" : "Retour au module"}
    >
      <DominicanRepublicModule3Workbook locale={locale} />
    </YoPrintPageShell>
  );
}
