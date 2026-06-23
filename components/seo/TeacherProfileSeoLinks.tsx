import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { resolveTeacherDisciplineHubHref } from "@/lib/seo/resolveTeacherDisciplineLink";

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
  const subject = discipline?.trim() || (locale === "fr" ? "cette discipline" : locale === "es" ? "esta disciplina" : "this subject");
  const label =
    locale === "fr"
      ? `Voir les cours de ${subject} sur Pratiqo`
      : locale === "es"
        ? `Ver clases de ${subject} en Pratiqo`
        : `Browse ${subject} lessons on Pratiqo`;

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
      </div>
    </nav>
  );
}
