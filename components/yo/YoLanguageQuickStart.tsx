import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { YoLanguageBadge, type YoLanguageBadgeId } from "@/components/yo/YoLanguageBadge";
import { buildYoLocaleHref, lstr, t } from "@/lib/yo/localize";
import { yopratiqoProductConfig } from "@/lib/yo/yopratiqoProductConfig";
import type { YoLocale } from "@/lib/yo/types";

const presentation = {
  italien: { badge: "it", name: lstr("Italien", "Italian", "Italiano"), detail: lstr("La vie en italien · 12 unités", "Life in Italian · 12 units", "La vida en italiano · 12 unidades"), path: "/yo/langues/italien/parcours" },
  japonais: { badge: "ja", name: lstr("Japonais", "Japanese", "Japonés"), detail: lstr("Premiers pas au Japon · 8 modules", "First steps in Japan · 8 modules", "Primeros pasos en Japón · 8 módulos"), path: "/yo/langues/japonais/parcours" },
  espagnol: { badge: "es", name: lstr("Espagnol", "Spanish", "Español"), detail: lstr("Premières conversations · introduction", "First conversations · introduction", "Primeras conversaciones · introducción"), path: "/yo/langues/espagnol/intro" },
  "francais-quebec": { badge: "fr-ca", name: lstr("Français québécois / Francisation", "Quebec French / Francization", "Francés quebequense / Francización"), detail: lstr("La vie au Québec · introduction", "Life in Quebec · introduction", "La vida en Quebec · introducción"), path: "/yo/langues/francais-quebec/intro" },
  anglais: { badge: "en", name: lstr("Anglais", "English", "Inglés"), detail: lstr("Oser parler · introduction", "Start speaking · introduction", "Atreverse a hablar · introducción"), path: "/yo/langues/anglais/intro" },
} satisfies Record<string, { badge: YoLanguageBadgeId; name: ReturnType<typeof lstr>; detail: ReturnType<typeof lstr>; path: string }>;

/** Public learning destinations only; access policies remain owned by each route. */
export function YoLanguageQuickStart({ locale }: { locale: YoLocale }) {
  const languages = yopratiqoProductConfig.currentFreeIntroModules.filter(language => language.isAccessibleForFree);
  return <section data-testid="yo-language-quick-start" className="w-full min-w-0">
    <div className="mb-5 flex items-center gap-4">
      <CompanionAvatar visualId="travel" state="map" locale={locale} size="sm" compact />
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-emerald-950">{t(lstr("Quelle langue veux-tu vivre ?", "Which language will you explore?", "¿Qué idioma quieres vivir?"), locale)}</h2>
        <p className="mt-1 text-sm text-emerald-900">{t(lstr("Je suis Yoppo. On fait le premier pas ensemble ?", "I’m Yoppo. Shall we take the first step together?", "Soy Yoppo. ¿Damos el primer paso juntos?"), locale)}</p>
      </div>
    </div>
    <ul className="grid min-w-0 gap-3 md:grid-cols-2" aria-label={t(lstr("Choisis ta langue", "Pick your language", "Elige tu idioma"), locale)}>
      {languages.map(language => {
        const item = presentation[language.slug];
        return <li key={language.id} className="min-w-0"><Link href={buildYoLocaleHref(item.path, locale)} className="group flex min-h-24 min-w-0 items-center gap-3 rounded-lg border border-emerald-100 bg-white p-4 text-emerald-950 shadow-sm transition hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          <YoLanguageBadge language={item.badge} ariaLabel={t(item.name, locale)} />
          <span className="min-w-0 flex-1"><span className="block break-words text-base font-bold">{t(item.name, locale)}</span><span className="mt-1 block text-xs leading-relaxed text-gray-600">{t(item.detail, locale)}</span></span>
          <ArrowRight size={18} className="shrink-0 text-emerald-700" aria-hidden />
        </Link></li>;
      })}
      <li className="min-w-0"><Link href={buildYoLocaleHref("/yo/langues/allemand/parcours", locale)} className="group flex min-h-24 min-w-0 items-center gap-3 rounded-lg border border-emerald-100 bg-white p-4 text-emerald-950 shadow-sm transition hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
        <YoLanguageBadge language="de" ariaLabel={t(lstr("Allemagne", "Germany", "Alemania"), locale)} />
        <span className="min-w-0 flex-1"><span className="block break-words text-base font-bold">{t(lstr("Allemand", "German", "Alemán"), locale)}</span><span className="mt-1 block text-xs leading-relaxed text-gray-600">{t(lstr("Premiers pas avec Yoppo · 8 étapes", "First steps with Yoppo · 8 stops", "Primeros pasos con Yoppo · 8 etapas"), locale)}</span></span>
        <ArrowRight size={18} className="shrink-0 text-emerald-700" aria-hidden />
      </Link></li>
      <li className="min-w-0"><Link href={buildYoLocaleHref("/yo/langues/portugais-bresil/parcours", locale)} className="group flex min-h-24 min-w-0 items-center gap-3 rounded-lg border border-emerald-100 bg-white p-4 text-emerald-950 shadow-sm transition hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
        <YoLanguageBadge language="pt-br" ariaLabel={t(lstr("Brésil", "Brazil", "Brasil"), locale)} />
        <span className="min-w-0 flex-1"><span className="block break-words text-base font-bold">{t(lstr("Portugais du Brésil", "Brazilian Portuguese", "Portugués de Brasil"), locale)}</span><span className="mt-1 block text-xs leading-relaxed text-gray-600">{t(lstr("Premières rencontres au Brésil · 8 étapes", "First encounters in Brazil · 8 stops", "Primeros encuentros en Brasil · 8 etapas"), locale)}</span></span>
        <ArrowRight size={18} className="shrink-0 text-emerald-700" aria-hidden />
      </Link></li>
    </ul>
  </section>;
}
