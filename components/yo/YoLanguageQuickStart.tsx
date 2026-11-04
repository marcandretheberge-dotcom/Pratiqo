import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { YoLanguageBadge } from "@/components/yo/YoLanguageBadge";
import { buildYoLocaleHref, lstr, t } from "@/lib/yo/localize";
import { getYoPublicLanguages } from "@/lib/yo/publicCatalog";
import type { YoLocale } from "@/lib/yo/types";

/** Direct learning links stay primary; the program is an optional discovery link. */
export function YoLanguageQuickStart({ locale }: { locale: YoLocale }) {
  const languages = getYoPublicLanguages();
  return <section data-testid="yo-language-quick-start" className="w-full min-w-0">
    <div className="mb-5 flex items-center gap-4">
      <CompanionAvatar visualId="travel" state="map" locale={locale} size="sm" compact />
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-emerald-950">{t(lstr("Quelle langue veux-tu vivre ?", "Which language will you explore?", "¿Qué idioma quieres vivir?"), locale)}</h2>
        <p className="mt-1 text-sm text-emerald-900">{t(lstr("Je suis Yoppo. On fait le premier pas ensemble ?", "I’m Yoppo. Shall we take the first step together?", "Soy Yoppo. ¿Damos el primer paso juntos?"), locale)}</p>
      </div>
    </div>
    <ul className="grid min-w-0 gap-3 md:grid-cols-2" aria-label={t(lstr("Choisis ta langue", "Pick your language", "Elige tu idioma"), locale)}>
      {languages.map(item => {
        const presentationLocale = item.presentationLocales.includes(locale) ? locale : "fr";
        return <li key={item.slug} className="min-w-0 rounded-lg border border-emerald-100 bg-white text-emerald-950 shadow-sm">
          <Link href={buildYoLocaleHref(item.path, locale)} className="group flex min-h-24 min-w-0 items-center gap-3 rounded-lg p-4 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            <YoLanguageBadge language={item.badge} ariaLabel={t(item.name, locale)} />
            <span className="min-w-0 flex-1"><span className="block break-words text-base font-bold">{t(item.name, locale)}</span><span className="mt-1 block text-xs leading-relaxed text-gray-600">{t(item.detail, locale)}</span></span>
            <ArrowRight size={18} className="shrink-0 text-emerald-700" aria-hidden />
          </Link>
          <Link href={buildYoLocaleHref(item.landingRoute, presentationLocale)} hrefLang={presentationLocale} className="mx-4 mb-2 inline-flex min-h-11 items-center text-xs font-semibold text-emerald-800 underline underline-offset-4">
            {t(lstr("Voir le programme", "View the program", "Ver el programa"), locale)}
            {presentationLocale !== locale ? " (FR)" : ""}
            <span className="sr-only"> : {t(item.name, locale)}</span>
          </Link>
        </li>;
      })}
    </ul>
  </section>;
}
