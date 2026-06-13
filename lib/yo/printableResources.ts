import { lstr } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

export type YoPrintableResourceType = "print-route" | "pdf";

export type YoPrintableResource = {
  id: string;
  title: YoLocalizedString;
  type: YoPrintableResourceType;
  href: string;
  locale: YoLocale | "all";
  module: string;
  lesson: string;
};

export const yoPrintableResources: readonly YoPrintableResource[] = [
  {
    id: "fr-qc-m1-l3-survival-kit",
    title: lstr(
      "Kit de survie Pratiqo — Poser une question sans bloquer",
      "Pratiqo survival kit — Asking a question without freezing up",
      "Kit de supervivencia Pratiqo — Hacer una pregunta sin bloquearse",
    ),
    type: "print-route",
    href: "/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie",
    locale: "all",
    module: "francais-quebec-module-1",
    lesson: "lecon-3",
  },
];

export function getYoPrintableResource(id: string): YoPrintableResource | undefined {
  return yoPrintableResources.find((resource) => resource.id === id);
}
