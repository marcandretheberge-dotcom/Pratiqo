import type { Metadata } from "next";

import { YoPrintCard, YoPrintPageShell } from "@/components/yo/YoPrintPageShell";
import { dominicanRepublicA2Capstone } from "@/lib/yo/dominicanRepublicA2Capstone";
import { getYoLocale, t } from "@/lib/yo/localize";
import { getPrintableResourceById } from "@/lib/yo/printableResources";

export const metadata: Metadata = {
  title: "Cahier A2 - Republique dominicaine Module 5 | YoPratiqo",
  description:
    "Cahier imprimable YoPratiqo pour les imprevus, le passe, l'ecriture polie et la mission finale A2.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function DominicanModule5A2WorkbookPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const suffix = locale === "fr" ? "" : `?lang=${locale}`;
  const resource = getPrintableResourceById("rd-m5-a2-workbook");
  const data = dominicanRepublicA2Capstone;

  return (
    <YoPrintPageShell
      locale={locale}
      title={resource ? t(resource.title, locale) : "Cahier A2"}
      description={
        resource
          ? t(resource.description, locale)
          : "Cahier imprimable pour les imprevus, le passe et la mission finale A2."
      }
      moduleLabel="YoPratiqo - Espagnol Republique dominicaine"
      lessonLabel="Module 5"
      backHref={`/yo/langues/espagnol/pays/republique-dominicaine/module-5${suffix}`}
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
