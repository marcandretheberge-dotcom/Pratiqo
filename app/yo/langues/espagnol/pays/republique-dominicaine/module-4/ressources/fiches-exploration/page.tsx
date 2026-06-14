import type { Metadata } from "next";

import { YoPrintCard, YoPrintPageShell } from "@/components/yo/YoPrintPageShell";
import { dominicanRepublicExplore } from "@/lib/yo/dominicanRepublicExplore";
import { getYoLocale, t } from "@/lib/yo/localize";
import { getPrintableResourceById } from "@/lib/yo/printableResources";

export const metadata: Metadata = {
  title: "Fiches exploration - Republique dominicaine Module 4 | YoPratiqo",
  description:
    "Document imprimable YoPratiqo pour pratiquer les directions, les transports et une petite sortie.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function DominicanModule4ExplorationSheetsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const suffix = locale === "fr" ? "" : `?lang=${locale}`;
  const resource = getPrintableResourceById("rd-m4-exploration-sheets");
  const data = dominicanRepublicExplore;

  return (
    <YoPrintPageShell
      locale={locale}
      title={resource ? t(resource.title, locale) : "Fiches exploration"}
      description={
        resource
          ? t(resource.description, locale)
          : "Exercices imprimables pour demander son chemin et raconter une sortie."
      }
      moduleLabel="YoPratiqo - Espagnol Republique dominicaine"
      lessonLabel="Module 4"
      backHref={`/yo/langues/espagnol/pays/republique-dominicaine/module-4${suffix}`}
      backLabel={locale === "en" ? "Back to module" : locale === "es" ? "Volver al modulo" : "Retour au module"}
    >
      {data.printableSheets.map((sheet) => (
        <YoPrintCard key={sheet.id} title={t(sheet.title, locale)}>
          <p className="mb-3">{t(sheet.instructions, locale)}</p>
          <ol className="grid gap-3">
            {sheet.items.map((item, index) => (
              <li key={item.id} className="rounded-2xl bg-white p-3 print:border print:border-[#D8ECE6]">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
                  {index + 1}
                </p>
                {item.target ? (
                  <p className="mt-1 font-black text-[#0F6E56]" lang="es">
                    {item.target}
                  </p>
                ) : null}
                <p className="mt-1">{t(item.prompt, locale)}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[#0F6E56]/55">
                  {locale === "en" ? "Answer key" : locale === "es" ? "Respuestas" : "Corrige"}
                </p>
                <p className="mt-1 text-[#0F6E56]/75">{t(item.answer, locale)}</p>
              </li>
            ))}
          </ol>
        </YoPrintCard>
      ))}
    </YoPrintPageShell>
  );
}
