/**
 * CityLinksFooter — Strategic internal linking section.
 *
 * Renders two columns of crawlable links:
 *  1. All Quebec city landing pages  (/tuteurs-prive/[citySlug])
 *  2. Montevideo barrios column      (/clases/montevideo/[barrioSlug])
 *
 * Placed at the bottom of landing pages so Google discovers every entry point
 * from a single crawl. Pure server component — no client JS required.
 */
import Link from "next/link";
import { QC_CITIES, MV_BARRIOS } from "../lib/constants/cities";

export function CityLinksFooter({ currentSlug }: { currentSlug?: string }) {
  return (
    <section
      className="border-t border-[#E8E6DF] bg-[#F8F7F3] py-8 px-4 sm:px-6"
      aria-label="Cours particuliers dans d'autres villes"
    >
      <div className="mx-auto max-w-5xl space-y-8">

        {/* ── Québec cities ─────────────────────────────────────────────── */}
        <div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#6B6760]">
            Cours particuliers dans d&apos;autres villes du Québec
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {QC_CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/tuteurs-prive/${city.slug}`}
                aria-current={city.slug === currentSlug ? "page" : undefined}
                className={
                  city.slug === currentSlug
                    ? "text-xs font-semibold text-[#0F6E56]"
                    : "text-xs text-[#6B6760] transition-colors hover:text-[#0F6E56] hover:underline"
                }
              >
                Tuteurs à {city.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Montevideo barrios ─────────────────────────────────────────── */}
        <div>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#6B6760]">
            Clases particulares en Montevideo, Uruguay
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {MV_BARRIOS.map((barrio) => (
              <Link
                key={barrio.slug}
                href={`/clases/montevideo/${barrio.slug}`}
                aria-current={barrio.slug === currentSlug ? "page" : undefined}
                className={
                  barrio.slug === currentSlug
                    ? "text-xs font-semibold text-[#0F6E56]"
                    : "text-xs text-[#6B6760] transition-colors hover:text-[#0F6E56] hover:underline"
                }
              >
                Clases en {barrio.name}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
