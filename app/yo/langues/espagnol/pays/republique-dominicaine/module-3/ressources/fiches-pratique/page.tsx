import type { Metadata } from "next";

import { DominicanModulePrintables } from "@/components/yo/DominicanModulePrintables";
import { YoPrintCard, YoPrintPageShell } from "@/components/yo/YoPrintPageShell";
import { dominicanRepublicFoodCulture } from "@/lib/yo/dominicanRepublicFoodCulture";
import { module3PrintablePack } from "@/lib/yo/dominicanRepublicPrintables";
import { getYoLocale, t } from "@/lib/yo/localize";
import { getPrintableResourceById } from "@/lib/yo/printableResources";

export const metadata: Metadata = {
  title: "Fiches pratique - Republique dominicaine Module 3 | YoPratiqo",
  description:
    "Document imprimable YoPratiqo pour pratiquer le restaurant, la comida tipica, la commande et le paiement.",
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
  const data = dominicanRepublicFoodCulture;

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
      {data.printableSheets.map((sheet) => (
        <YoPrintCard key={sheet.id} title={t(sheet.title, locale)}>
          <ul className="grid gap-1.5">
            {sheet.keyPhrases.map((phrase) => (
              <li key={phrase} className="font-black text-[#0F6E56]" lang="es">
                {phrase}
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-2xl bg-white p-3 print:border print:border-[#D8ECE6]">
            <p>{t(sheet.miniExercise, locale)}</p>
            <p className="mt-2 font-semibold">{t(sheet.roleplayOrChecklist, locale)}</p>
          </div>
        </YoPrintCard>
      ))}

      <DominicanModulePrintables pack={module3PrintablePack} locale={locale} />
    </YoPrintPageShell>
  );
}
