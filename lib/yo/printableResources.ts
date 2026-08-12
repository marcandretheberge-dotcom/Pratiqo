import { lstr } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";

export type YoPrintableResourceType = "print-route" | "pdf";
export type YoPrintableResourceCategory =
  | "survival-kit"
  | "vocabulary"
  | "grammar"
  | "teacher-practice"
  | "summary"
  | "workbook";

export type YoPrintableResource = {
  id: string;
  title: YoLocalizedString;
  description: YoLocalizedString;
  type: YoPrintableResourceType;
  href: string;
  locale: YoLocale | "all";
  moduleId: string;
  lessonId?: string;
  category: YoPrintableResourceCategory;
  available: boolean;
};

export const yoPrintableResources: readonly YoPrintableResource[] = [
  {
    id: "fr-qc-m1-l3-survival-kit",
    title: lstr(
      "Kit de survie Pratiqo — Poser une question sans bloquer",
      "Pratiqo survival kit — Asking a question without freezing up",
      "Kit de supervivencia Pratiqo — Hacer una pregunta sin bloquearse",
    ),
    description: lstr(
      "Amorces sûres, mots-questions, reformulations et mini-script à imprimer pour pratiquer au travail.",
      "Safe openers, question words, reformulations, and a mini-script to print for workplace practice.",
      "Inicios seguros, palabras interrogativas, reformulaciones y un mini-guion para imprimir y practicar en el trabajo.",
    ),
    type: "print-route",
    href: "/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie",
    locale: "all",
    moduleId: "francais-quebec-module-1",
    lessonId: "lecon-3",
    category: "survival-kit",
    available: true,
  },
  {
    id: "rd-m2-arrival-kit",
    title: lstr(
      "Cahier YoPratiqo 02 — Arriver et se débrouiller en République dominicaine",
      "YoPratiqo Workbook 02 — Arrive and get around in the Dominican Republic",
      "Cuaderno YoPratiqo 02 — Llegar y desenvolverte en República Dominicana",
    ),
    description: lstr(
      "Cahier imprimable avec pratique guidée, récupération, scénarios, écoute simulée, écriture, mission orale et corrigé final.",
      "Printable workbook with guided practice, retrieval, scenarios, simulated listening, writing, speaking mission, and final answer key.",
      "Cuaderno imprimible con práctica guiada, recuperación, escenarios, escucha simulada, escritura, misión oral y clave final.",
    ),
    type: "print-route",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee",
    locale: "all",
    moduleId: "dominican-republic-module-2",
    category: "workbook",
    available: true,
  },
  {
    id: "rd-m3-practice-sheets",
    title: lstr(
      "Fiches de pratique — table dominicaine",
      "Practice sheets — Dominican table",
      "Hojas de práctica — mesa dominicana",
    ),
    description: lstr(
      "Menu, vocabulaire des plats, commande, paiement et culture locale dans un document imprimable.",
      "Menu, food vocabulary, ordering, payment, and local culture in one printable document.",
      "Menú, vocabulario de platos, pedido, pago y cultura local en un documento imprimible.",
    ),
    type: "print-route",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-3/ressources/fiches-pratique",
    locale: "all",
    moduleId: "dominican-republic-module-3",
    category: "vocabulary",
    available: true,
  },
  {
    id: "rd-m4-exploration-sheets",
    title: lstr(
      "Fiches d'exploration — directions et sorties",
      "Exploration sheets — directions and outings",
      "Hojas de exploración — direcciones y salidas",
    ),
    description: lstr(
      "Exercices imprimables pour demander son chemin, se déplacer et raconter une petite sortie.",
      "Printable exercises for asking directions, getting around, and describing a short outing.",
      "Ejercicios imprimibles para pedir direcciones, moverse y contar una salida corta.",
    ),
    type: "print-route",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-4/ressources/fiches-exploration",
    locale: "all",
    moduleId: "dominican-republic-module-4",
    category: "grammar",
    available: true,
  },
  {
    id: "rd-m5-a2-workbook",
    title: lstr(
      "Cahier A2 — mission finale République dominicaine",
      "A2 workbook — Dominican Republic final mission",
      "Cuaderno A2 — misión final República Dominicana",
    ),
    description: lstr(
      "Cahier imprimable pour les imprévus, le passé, l'écriture polie et la mission finale A2.",
      "Printable workbook for unexpected situations, past-tense work, polite writing, and the final A2 mission.",
      "Cuaderno imprimible para imprevistos, pasado, escritura amable y misión final A2.",
    ),
    type: "print-route",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-5/ressources/cahier-a2",
    locale: "all",
    moduleId: "dominican-republic-module-5",
    category: "workbook",
    available: true,
  },
];

export function getPrintableResourceById(id: string): YoPrintableResource | undefined {
  return yoPrintableResources.find((resource) => resource.id === id);
}

export const getYoPrintableResource = getPrintableResourceById;

export function getPrintableResourcesForModule(moduleId: string): YoPrintableResource[] {
  return yoPrintableResources.filter((resource) => resource.moduleId === moduleId);
}

export function getPrintableResourcesForLesson(
  moduleId: string,
  lessonId: string,
): YoPrintableResource[] {
  return yoPrintableResources.filter(
    (resource) => resource.moduleId === moduleId && resource.lessonId === lessonId,
  );
}

export function isPrintablePdfResource(
  resource: YoPrintableResource,
): resource is YoPrintableResource & { type: "pdf" } {
  return resource.type === "pdf";
}

export function isPrintableRouteResource(
  resource: YoPrintableResource,
): resource is YoPrintableResource & { type: "print-route" } {
  return resource.type === "print-route";
}
