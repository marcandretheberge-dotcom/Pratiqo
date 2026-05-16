import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { QC_CITIES, findCityBySlug } from "@/lib/constants/cities";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { haversineDistance } from "@/lib/geo";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import type { Teacher } from "@/types";
import { CityMapSection } from "@/components/CityMapSection";
import { CityLinksFooter } from "@/components/CityLinksFooter";
import { MarketingPublicLayout } from "@/components/marketing/MarketingPublicLayout";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { MarketingResourceBlock } from "@/components/seo/MarketingResourceBlock";
import {
  SeoBreadcrumbBar,
  SeoDiscoveryGrid,
  SeoHeroShell,
  SeoHowPratiqoWorks,
  SeoTeacherRatingBadge,
  SeoTransparencyBlock,
  SeoTutorCityEmptyState,
} from "@/components/seo/SeoLandingUi";
import { getDictionary } from "@/lib/i18n/server";
import { getCitySeoGuideLinks } from "@/lib/seo/internalLinks";
import { buildAlternates } from "@/lib/seo/alternates";
import { withLocale } from "@/lib/i18n/routing";
import { normalizeLocale, type Locale } from "@/lib/i18n/types";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";
import {
  buildServiceJsonLd,
  buildTutorCitySeoContent,
  buildTutorCityFaqs,
  PRIORITY_CITY_HUBS,
} from "@/lib/seo/localSeoContent";
import {
  getCityBySlug,
  getCoursePagePath,
  getNearbyCities,
  getSubjectBySlug,
  getTutorCityPagePath,
} from "@/lib/seo/seo-data";

import { SITE_URL } from "@/lib/seo/site";

const BASE_URL = SITE_URL;

// Columns needed for teacherRowToTeacher + map markers.
const TEACHER_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, verification_level, identity_verified, diploma_verified, phone_verified, country_code, timezone, currency, city, region";

// ── Cached DB fetch (shared across all city page renders at build time) ────────
//
// `unstable_cache` deduplicates the DB call so all 53 pre-rendered city pages
// share a single round-trip instead of 53 separate queries.
const getAllTeachers = unstable_cache(
  async (): Promise<Teacher[]> => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("teachers")
        .select(TEACHER_SELECT)
        .order("rating", { ascending: false });
      if (error || !data) return [];
      return (data as TeacherRow[]).map(teacherRowToTeacher);
    } catch {
      return [];
    }
  },
  ["city-page-teachers-v2"],
  { revalidate: 3600 },
);

// ── Proximity sort + filter ───────────────────────────────────────────────────

type TeachersResult = { teachers: Teacher[]; isNearby: boolean };

async function findTeachersForCity(lat: number, lng: number): Promise<TeachersResult> {
  const all = await getAllTeachers();

  const withDist = all
    .filter(
      (t) =>
        typeof t.location?.lat === "number" &&
        typeof t.location?.lng === "number" &&
        Number.isFinite(t.location.lat) &&
        Number.isFinite(t.location.lng) &&
        !(t.location.lat === 0 && t.location.lng === 0),
    )
    .map((t) => ({
      teacher: t,
      distKm: haversineDistance(lat, lng, t.location.lat, t.location.lng),
    }))
    .sort((a, b) => a.distKm - b.distKm);

  // Primary: within 30 km of the city centre
  const primary = withDist.filter((x) => x.distKm <= 30).map((x) => x.teacher);
  if (primary.length >= 2) return { teachers: primary.slice(0, 9), isNearby: false };

  // Fallback: within 150 km (labelled "nearby")
  const expanded = withDist.filter((x) => x.distKm <= 150).map((x) => x.teacher);
  if (expanded.length >= 1) return { teachers: expanded.slice(0, 9), isNearby: true };

  // Final fallback: the N closest teachers regardless of distance
  return { teachers: withDist.slice(0, 9).map((x) => x.teacher), isNearby: true };
}

// ── Static params — pre-renders all city pages at build time ─────────────────

export function generateStaticParams() {
  const locales: Locale[] = ["en", "fr", "es"];
  return locales.flatMap((locale) => QC_CITIES.map((city) => ({ locale, citySlug: city.slug })));
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; citySlug: string }>;
}): Promise<Metadata> {
  const { locale: loc, citySlug } = await params;
  const locale = normalizeLocale(loc);
  const city = findCityBySlug(citySlug);
  if (!city) return { title: "Tuteurs privés | Pratiqo" };

  const title = `Tuteurs privés à ${city.name} | Tutorat et cours privés | Pratiqo`;
  const description =
    `Trouvez un tuteur privé à ${city.name} pour les devoirs, les matières scolaires, les langues ou la musique. ` +
    `Profils locaux, réservation simple et paiement sécurisé.`;

  const path = `/tuteurs-prive/${citySlug}`;
  const localizedPaths = { en: path, fr: path, es: path };

  return {
    title,
    description,
    robots: { index: true, follow: true },
    keywords: [
      `tuteur privé ${city.name}`,
      `tutorat ${city.name}`,
      `aide aux devoirs ${city.name}`,
      `cours privés ${city.name}`,
      `prof privé ${city.name}`,
      `cours particuliers ${city.name}`,
    ],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}${withLocale(path, locale)}`,
      siteName: "Pratiqo",
      locale: "fr_CA",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
    ...buildAlternates({ localizedPaths }),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function teachingModeLabel(mode: string): string {
  if (mode === "online") return "En ligne";
  if (mode === "person") return "En présentiel";
  return "En ligne & présentiel";
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CityTutorsPage({
  params,
}: {
  params: Promise<{ locale: string; citySlug: string }>;
}) {
  const { locale: loc, citySlug } = await params;
  const city = findCityBySlug(citySlug);
  if (!city) notFound();

  const urlLocale = normalizeLocale(loc);
  const { teachers, isNearby } = await findTeachersForCity(city.lat, city.lng);

  const locale = urlLocale;
  const dict = getDictionary(locale);
  const cityGuideLinks = getCitySeoGuideLinks(citySlug, locale);

  const seoCity = getCityBySlug(citySlug);
  if (!seoCity) notFound();

  const tutorSeo = buildTutorCitySeoContent({ locale, city: seoCity, citySlug });
  const cityFaq = buildTutorCityFaqs(seoCity);
  const hub = PRIORITY_CITY_HUBS[citySlug];
  const geoNearby = getNearbyCities(citySlug, 8).filter((c) => c.slug !== citySlug);
  const hubNearbySlugs = hub?.nearbySlugs ?? [];
  const merged = new Map<string, (typeof geoNearby)[0]>();
  for (const c of geoNearby) merged.set(c.slug, c);
  for (const slug of hubNearbySlugs) {
    if (!merged.has(slug) && slug !== citySlug) {
      const c = getCityBySlug(slug);
      if (c) merged.set(slug, c);
    }
  }
  const nearbyCities = Array.from(merged.values()).slice(0, 8);

  const hubPath = `/tuteurs-prive/${citySlug}`;
  const serviceJsonLd = buildServiceJsonLd({
    name: `Tuteurs privés à ${city.name}`,
    description: `Tutorat et cours privés à ${city.name} — Pratiqo.`,
    cityName: city.name,
    serviceType: "Tutorat et cours privés",
    canonicalPath: hubPath,
  });

  const subjectQuickSlugs = ["mathematiques", "francais", "anglais", "piano", "guitare", "francisation"] as const;
  const subjectCards = subjectQuickSlugs
    .map((slug) => {
      const meta = getSubjectBySlug(slug);
      return meta ? { slug, meta } : null;
    })
    .filter(Boolean) as { slug: string; meta: NonNullable<ReturnType<typeof getSubjectBySlug>> }[];

  const countLabel =
    teachers.length === 0
      ? "Aucun tuteur"
      : teachers.length === 1
      ? "1 tuteur trouvé"
      : `${teachers.length} tuteurs trouvés`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: withLocale("/", locale) },
          { name: "Trouver un prof", href: withLocale("/trouver-un-prof", locale) },
          { name: city.name, href: withLocale(`/tuteurs-prive/${citySlug}`, locale) },
        ]}
      />
      <FAQSchema items={cityFaq} />

      <MarketingPublicLayout className="bg-[#FAFCFB]">

        <SeoBreadcrumbBar
          items={[
            { label: "Accueil", href: withLocale("/", locale) },
            { label: "Trouver un prof", href: withLocale("/trouver-un-prof", locale) },
            { label: city.name, href: withLocale(`/tuteurs-prive/${citySlug}`, locale) },
          ]}
        />

        <SeoHeroShell
          regionLabel={`${city.region}, Québec`}
          title={`Tuteurs privés à ${city.name}`}
          intro={tutorSeo.intro}
          trustChips={[
            "Aide aux devoirs",
            "Matières scolaires",
            "Langues et musique",
            `Profs locaux à ${city.name}`,
          ]}
          primaryCta={{
            href: withLocaleHref("/trouver-un-prof", locale),
            label: "Trouver un tuteur",
          }}
          secondaryCta={{
            href: withLocaleHref("/become-teacher", locale),
            label: "Devenir tuteur",
          }}
        />

        <section id="matieres-populaires" className="bg-white border-b border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#6B6760] mb-6">
              Cours populaires à {city.name}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjectCards.map(({ slug, meta }) => (
                <Link
                  key={slug}
                  href={withLocale(getCoursePagePath(slug, citySlug), locale)}
                  className="rounded-2xl border border-[#E8E6DF] bg-[#FAFCFB] p-4 hover:border-teal-500/40 hover:shadow-sm transition-shadow"
                >
                  <p className="font-bold text-sm text-[#2C2C2A]">
                    {meta.label.charAt(0).toUpperCase() + meta.label.slice(1)}
                  </p>
                  <p className="mt-1 text-xs text-[#6B6760] leading-relaxed">
                    {meta.searchLabel} à {city.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAP ───────────────────────────────────────────────────────── */}
        {teachers.length > 0 ? (
          <section className="bg-[#F1EFE8] px-4 sm:px-6 pt-6">
            <div className="mx-auto max-w-5xl">
              <CityMapSection
                teachers={teachers}
                cityLat={city.lat}
                cityLng={city.lng}
                cityName={city.name}
              />
            </div>
          </section>
        ) : null}

        {/* ── TEACHER LIST ──────────────────────────────────────────────── */}
        <section className="flex-1 bg-[#F1EFE8] py-6 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">

            {/* Count + nearby badge */}
            <div className="flex items-center gap-2 mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">
                {countLabel}
              </p>
              {isNearby && teachers.length > 0 ? (
                <span className="rounded-full bg-[#FFF7E6] border border-[#F6C96E] px-2 py-0.5 text-[10px] font-semibold text-[#92600A]">
                  proches de {city.name}
                </span>
              ) : null}
            </div>

            {teachers.length === 0 ? (
              <SeoTutorCityEmptyState
                locale={locale}
                cityName={city.name}
                nearbyCities={nearbyCities.map((c) => ({ slug: c.slug, name: c.name }))}
                subjectQuickLinks={subjectCards.map(({ slug, meta }) => ({
                  slug,
                  label: meta.label,
                }))}
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={withLocaleHref(`/teacher/profile/${encodeURIComponent(teacher.id)}`, locale)}
                      className="block rounded-2xl bg-white border border-[#E8E6DF] p-4 shadow-[0_8px_32px_rgba(44,44,42,0.05)] hover:shadow-[0_12px_40px_rgba(44,44,42,0.10)] transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-11 w-11 shrink-0 rounded-full bg-teal-500/15 text-teal-800 flex items-center justify-center text-sm font-bold overflow-hidden"
                            aria-hidden
                          >
                            {teacher.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={teacher.imageUrl}
                                alt=""
                                width={44}
                                height={44}
                                className="h-full w-full object-cover rounded-full"
                                loading="lazy"
                              />
                            ) : (
                              initials(teacher.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm text-[#2C2C2A]">
                              {teacher.name}
                            </p>
                            <p className="truncate text-xs text-[#6B6760]">
                              {teacher.discipline}
                            </p>
                          </div>
                        </div>
                        <SeoTeacherRatingBadge rating={teacher.rating} reviews={teacher.reviews} />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#6B6760]">
                        <span>{teachingModeLabel(teacher.teachingMode)}</span>
                        <span className="font-bold text-teal-700">
                          {Math.round(Number(teacher.pricePerLesson))}$/h
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <Link
                    href={withLocaleHref("/trouver-un-prof", locale)}
                    className="inline-flex h-11 w-full max-w-md items-center justify-center rounded-2xl bg-teal-700 px-7 text-sm font-bold text-white shadow-sm hover:brightness-105 sm:mx-auto sm:w-auto"
                  >
                    Trouver un tuteur
                  </Link>
                  <p className="mt-2 text-xs text-[#6B6760]">
                    Inscription gratuite · Aucun engagement
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <SeoHowPratiqoWorks />
        <SeoTransparencyBlock />

        <section className="bg-[#FAFAF8] border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-4 text-sm text-[#2C2C2A] leading-relaxed">
            {tutorSeo.bodyParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <p className="text-[#6B6760]">
              Mots-clés utiles : tuteur privé {city.name}, tutorat {city.name}, aide aux devoirs {city.name}, cours privés {city.name}, prof privé {city.name}.
            </p>
          </div>
        </section>

        <section className="bg-white border-t border-[#E8E6DF] py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <MarketingResourceBlock
              id="city-seo-guides"
              title={dict.seoLocalGuidesTitle}
              links={cityGuideLinks}
              className="border-[#E8E6DF] bg-[#FAFAF8]"
            />
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="bg-[#FAFAF8] border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-lg font-bold text-[#2C2C2A] mb-6">
              Questions fréquentes — tuteurs privés à {city.name}
            </h2>
            <div className="space-y-3">
              {cityFaq.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-[#E8E6DF] bg-white open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-sm text-[#2C2C2A] flex items-center justify-between gap-2 marker:content-none">
                    <span>{item.question}</span>
                    <span className="text-teal-700 text-xs shrink-0 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-[#6B6760] leading-relaxed border-t border-[#F1EFE8] pt-3">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="villes-voisines" className="bg-white border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B6760] mb-4">Villes voisines</h2>
            <ul className="flex flex-wrap gap-3 text-sm">
              {nearbyCities.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={withLocale(`/tuteurs-prive/${c.slug}`, locale)}
                    className="rounded-full border border-[#E8E6DF] bg-[#FAFCFB] px-3 py-1.5 font-semibold text-teal-700 hover:border-teal-500/40"
                  >
                    Tuteurs privés à {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <SeoDiscoveryGrid
          columns={[
            {
              title: "Matières populaires",
              links: subjectCards.map(({ slug, meta }) => ({
                href: withLocale(getCoursePagePath(slug, citySlug), locale),
                label: `Cours de ${meta.label} à ${city.name}`,
              })),
            },
            {
              title: "Villes voisines",
              links: nearbyCities.map((c) => ({
                href: withLocale(getTutorCityPagePath(c.slug), locale),
                label: `Tuteurs privés à ${c.name}`,
              })),
            },
            {
              title: "Ressources utiles",
              links: [
                {
                  href: withLocale("/trouver-un-prof", locale),
                  label: "Trouver un prof",
                },
                {
                  href: withLocaleHref("/become-teacher", locale),
                  label: "Devenir enseignant",
                },
                {
                  href: withLocale("/tarifs", locale),
                  label: "Tarifs",
                },
                {
                  href: withLocale("/charte-de-confiance", locale),
                  label: "Charte de confiance",
                },
                {
                  href: withLocale("/contact", locale),
                  label: "Contact",
                },
              ],
            },
          ]}
        />

        {/* ── CITY LINKS (internal linking) ─────────────────────────────── */}
        <CityLinksFooter currentSlug={citySlug} />

      </MarketingPublicLayout>
    </>
  );
}
