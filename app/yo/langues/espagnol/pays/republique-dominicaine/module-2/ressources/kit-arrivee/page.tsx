import type { Metadata } from "next";

import { DominicanModulePrintables } from "@/components/yo/DominicanModulePrintables";
import { YoPrintCard, YoPrintPageShell } from "@/components/yo/YoPrintPageShell";
import { dominicanRepublicHotelAirport } from "@/lib/yo/dominicanRepublicHotelAirport";
import { getYoLocale, t } from "@/lib/yo/localize";
import { module2PrintablePack } from "@/lib/yo/dominicanRepublicPrintables";
import { getPrintableResourceById } from "@/lib/yo/printableResources";

export const metadata: Metadata = {
  title: "Kit arrivee - Republique dominicaine Module 2 | YoPratiqo",
  description:
    "Document imprimable YoPratiqo pour pratiquer l'aeroport, le taxi, le check-in et les imprévus simples.",
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
  const { miniMission } = dominicanRepublicHotelAirport;

  return (
    <YoPrintPageShell
      locale={locale}
      title={resource ? t(resource.title, locale) : "Kit d'arrivee"}
      description={
        resource
          ? t(resource.description, locale)
          : "Fiches imprimables pour pratiquer les premiers echanges a l'arrivee."
      }
      moduleLabel="YoPratiqo - Espagnol Republique dominicaine"
      lessonLabel="Module 2"
      backHref={`/yo/langues/espagnol/pays/republique-dominicaine/module-2${suffix}`}
      backLabel={locale === "en" ? "Back to module" : locale === "es" ? "Volver al modulo" : "Retour au module"}
    >
      <DominicanModulePrintables pack={module2PrintablePack} locale={locale} />

      <YoPrintCard
        title={
          locale === "en"
            ? "Arrival mission checklist"
            : locale === "es"
              ? "Checklist de la mision de llegada"
              : "Checklist mission arrivee"
        }
      >
        <ol className="grid gap-2">
          {miniMission.steps.map((step, index) => (
            <li key={step.id} className="flex items-start gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#0F6E56] text-[0.65rem] font-black text-white">
                {index + 1}
              </span>
              <span>{locale === "en" ? step.taskEn : step.taskFr}</span>
            </li>
          ))}
        </ol>
      </YoPrintCard>
    </YoPrintPageShell>
  );
}
