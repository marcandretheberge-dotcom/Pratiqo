import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

export function JapaneseCourseHeader({ locale, pathname, backHref, title }: { locale: YoLocale; pathname: string; backHref: string; title: string }) {
  const label = backHref === "/yo/langues"
    ? { fr: "Retour aux langues", en: "Back to languages", es: "Volver a los idiomas" }[locale]
    : { fr: "Retour au parcours", en: "Back to course", es: "Volver al curso" }[locale];
  return <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#e7dfcf] bg-[#fbf8f1] px-3 sm:h-16 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <Link href={buildYoLocaleHref(backHref, locale)} aria-label={label} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 focus-visible:outline focus-visible:outline-2"><ArrowLeft size={18} aria-hidden /></Link>
      <span className="hidden sm:block"><YoPratiqoLogo size="sm" priority={false} /></span>
      <span className="truncate text-sm font-semibold text-slate-800">{title}</span>
    </div>
    <nav aria-label={{ fr: "Langue des explications", en: "Explanation language", es: "Idioma de las explicaciones" }[locale]} className="flex shrink-0 rounded-full border border-slate-200 bg-white p-1">
      {(["fr", "en", "es"] as const).map((language) => <Link key={language} href={buildYoLocaleHref(pathname, language)} aria-current={locale === language ? "page" : undefined} aria-label={{ fr: "Français", en: "English", es: "Español" }[language]} className={"flex min-h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 " + (locale === language ? "bg-indigo-700 text-white" : "text-slate-600 hover:bg-slate-100")}>{language.toUpperCase()}</Link>)}
    </nav>
  </header>;
}
