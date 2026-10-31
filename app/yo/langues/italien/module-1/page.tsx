import type { Metadata } from "next";
import { ItalianAdventure } from "@/components/yo/italian/ItalianAdventure";
import { getYoLocale } from "@/lib/yo/localize";
import { moduleCopy } from "@/lib/yo/italian/italianModuleData";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = getYoLocale(lang);
  const language = { fr: "Italien", en: "Italian", es: "Italiano" }[locale];
  return { title: `${moduleCopy.title[locale]} · ${language} A1 · YoPratiqo`, description: moduleCopy.subtitle[locale], robots: { index: false, follow: false } };
}

export default async function ItalianModuleOnePage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const { lang } = await searchParams;
  return <ItalianAdventure locale={getYoLocale(lang)}/>;
}
