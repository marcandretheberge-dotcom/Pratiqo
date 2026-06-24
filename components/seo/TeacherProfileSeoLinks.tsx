import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { getResourceArticleForDisciplineLabel } from "@/lib/marketing/resourceGuideHub";
import { resolveTeacherDisciplineHubHref, resolveTeacherLocalDiscoveryLinkLabel } from "@/lib/seo/resolveTeacherDisciplineLink";

export function TeacherProfileSeoLinks({
  locale,
  discipline,
  city,
  region,
}: {
  locale: Locale;
  discipline?: string | null;
  city?: string | null;
  region?: string | null;
}) {
  const href = resolveTeacherDisciplineHubHref({ discipline, city, region });
  const resourceGuide = getResourceArticleForDisciplineLabel(discipline);
  const label = resolveTeacherLocalDiscoveryLinkLabel({ discipline, city, region, locale });

  return (
    <nav
      aria-label={locale === "fr" ? "Pages connexes" : locale === "es" ? "Páginas relacionadas" : "Related pages"}
      className="mx-auto max-w-3xl px-4 sm:px-6 pb-4"
    >
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={href} className="font-semibold text-teal-700 hover:underline">
          {label}
        </Link>
        <span className="text-[#D3D1C7]" aria-hidden>
          ·
        </span>
        <Link href="/trouver-un-prof" className="font-semibold text-teal-700 hover:underline">
          {locale === "fr"
            ? "Voir les professeurs disponibles"
            : locale === "es"
              ? "Ver profesores disponibles"
              : "See available teachers"}
        </Link>
        <span className="text-[#D3D1C7]" aria-hidden>
          ·
        </span>
        <Link href="/ressources" className="font-semibold text-teal-700 hover:underline">
          {locale === "fr" ? "Guides Pratiqo" : locale === "es" ? "Guías Pratiqo" : "Pratiqo guides"}
        </Link>
        {resourceGuide ? (
          <>
            <span className="text-[#D3D1C7]" aria-hidden>
              ·
            </span>
            <Link
              href={`/ressources/${resourceGuide.slug}`}
              className="font-semibold text-teal-700 hover:underline"
            >
              {locale === "fr"
                ? "Guide connexe"
                : locale === "es"
                  ? "Guía relacionada"
                  : "Related guide"}
            </Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}
