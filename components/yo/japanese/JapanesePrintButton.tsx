"use client";
import type { YoLocale } from "@/lib/yo/types";
export function JapanesePrintButton({ locale }: { locale: YoLocale }) {
  return <button type="button" onClick={() => window.print()} className="rounded-full bg-indigo-700 px-5 py-3 text-sm font-semibold text-white print:hidden">{{ fr: "Imprimer / enregistrer en PDF", en: "Print / save as PDF", es: "Imprimir / guardar en PDF" }[locale]}</button>;
}
