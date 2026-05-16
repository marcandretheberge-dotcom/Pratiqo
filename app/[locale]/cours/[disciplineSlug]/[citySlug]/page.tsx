import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { findCityBySlug } from "@/lib/constants/cities";
import type { Teacher } from "@/types";
import { findDisciplineBySlug, DISCIPLINE_CITY_PAIRS } from "@/lib/seo/disciplines";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { haversineDistance } from "@/lib/geo";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { CityLinksFooter } from "@/components/CityLinksFooter";
import { MarketingPublicLayout } from "@/components/marketing/MarketingPublicLayout";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { MarketingResourceBlock } from "@/components/seo/MarketingResourceBlock";
import {
  SeoBreadcrumbBar,
  SeoCourseCityEmptyState,
  SeoDiscoveryGrid,
  SeoHeroShell,
  SeoHowPratiqoWorks,
  SeoTeacherRatingBadge,
  SeoTransparencyBlock,
} from "@/components/seo/SeoLandingUi";
import { getDictionary, t } from "@/lib/i18n/server";
import { getOpenGraphLocale, tFormat } from "@/lib/i18n/format";
import {
  seoCourseTeacherCountLabel,
  seoCourseLinkLabel,
  seoPrivateTutorsLinkLabel,
  seoTeachingModeLabel,
} from "@/lib/seo/seoLandingI18n";
import { getDisciplineCitySeoGuideLinks } from "@/lib/seo/internalLinks";
import type { DisciplineConfig } from "@/lib/seo/types";

import { SITE_URL } from "@/lib/seo/site";
import { buildAlternates } from "@/lib/seo/alternates";
import { withLocale } from "@/lib/i18n/routing";
import { normalizeLocale, type Locale } from "@/lib/i18n/types";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";
import {
  buildCourseCityFaqs,
  getCityBySlug,
  getCoursePagePath,
  getNearbyCities,
  getRelatedSubjects,
  getSubjectBySlug,
  getTutorCityPagePath,
} from "@/lib/seo/seo-data";
import {
  buildCourseCitySeoContent,
  buildServiceJsonLd,
  PRIORITY_CITY_HUBS,
} from "@/lib/seo/localSeoContent";

const BASE_URL = SITE_URL;

const TEACHER_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, verification_level, identity_verified, diploma_verified, phone_verified, country_code, timezone, currency, city, region";

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
  ["discipline-city-teachers-v1"],
  { revalidate: 3600 },
);

async function findTeachersForDisciplineCity(
  lat: number,
  lng: number,
  discipline: DisciplineConfig,
): Promise<{ teachers: Teacher[]; isNearby: boolean }> {
  const all = await getAllTeachers();
  const { dbCategory, dbDiscipline } = discipline;

  const filtered = all.filter((t) => {
    if (discipline.matchesTeacher) {
      return discipline.matchesTeacher(t);
    }
    if (dbDiscipline) {
      return t.discipline === dbDiscipline || t.category === dbCategory;
    }
    return t.category === dbCategory;
  });

  const withDist = filtered
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

  const primary = withDist.filter((x) => x.distKm <= 30).map((x) => x.teacher);
  if (primary.length >= 2) return { teachers: primary.slice(0, 9), isNearby: false };

  const expanded = withDist.filter((x) => x.distKm <= 150).map((x) => x.teacher);
  if (expanded.length >= 1) return { teachers: expanded.slice(0, 9), isNearby: true };

  return { teachers: withDist.slice(0, 9).map((x) => x.teacher), isNearby: true };
}

export function generateStaticParams() {
  const locales: Locale[] = ["en", "fr", "es"];
  return locales.flatMap((locale) =>
    DISCIPLINE_CITY_PAIRS.map((pair) => ({
      locale,
      disciplineSlug: pair.disciplineSlug,
      citySlug: pair.citySlug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; disciplineSlug: string; citySlug: string }>;
}): Promise<Metadata> {
  const { locale: loc, disciplineSlug, citySlug } = await params;
  const locale = normalizeLocale(loc);
  const discipline = findDisciplineBySlug(disciplineSlug);
  const city = findCityBySlug(citySlug);

  if (!discipline || !city) {
    return { title: t(locale, "seoLandingCourseMetaFallbackTitle") };
  }

  const seoCity = getCityBySlug(citySlug);
  const seoSubject = getSubjectBySlug(disciplineSlug);
  if (!seoCity || !seoSubject) {
    return { title: t(locale, "seoLandingCourseMetaFallbackTitle") };
  }

  const path = `/cours/${disciplineSlug}/${citySlug}`;
  const localizedPaths = { en: path, fr: path, es: path };

  const title = tFormat(locale, "seoLandingCourseMetaTitle", {
    discipline: discipline.name,
    city: city.name,
  });
  const description = tFormat(locale, "seoLandingCourseMetaDescription", {
    teacherNoun: seoSubject.teacherNoun,
    city: city.name,
  });

  return {
    title,
    description,
    robots: { index: true, follow: true },
    keywords: [
      `cours ${seoSubject.label} ${city.name}`,
      `${seoSubject.searchLabel} ${city.name}`,
      `${seoSubject.teacherNoun} ${city.name}`,
      `cours particuliers ${city.name}`,
    ],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}${withLocale(path, locale)}`,
      siteName: "Pratiqo",
      locale: getOpenGraphLocale(locale),
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

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function DisciplineCityPage({
  params,
}: {
  params: Promise<{ locale: string; disciplineSlug: string; citySlug: string }>;
}) {
  const { locale: loc, disciplineSlug, citySlug } = await params;
  const discipline = findDisciplineBySlug(disciplineSlug);
  const city = findCityBySlug(citySlug);

  if (!discipline || !city) notFound();

  const { teachers, isNearby } = await findTeachersForDisciplineCity(
    city.lat,
    city.lng,
    discipline,
  );

  const locale = normalizeLocale(loc);
  const dict = getDictionary(locale);
  const disciplineGuideLinks = getDisciplineCitySeoGuideLinks(disciplineSlug, citySlug, locale);

  const seoCity = getCityBySlug(citySlug)!;
  const seoSubject = getSubjectBySlug(disciplineSlug)!;
  const courseSeo = buildCourseCitySeoContent({
    locale,
    subject: seoSubject,
    city: seoCity,
    disciplineSlug,
    disciplineName: discipline.name,
  });
  const faqs = buildCourseCityFaqs({
    locale,
    city: seoCity,
    subject: seoSubject,
    disciplineName: discipline.name,
    disciplineSlug,
  });

  const hub = PRIORITY_CITY_HUBS[citySlug];
  const geoNearby = getNearbyCities(citySlug, 8).filter((c) => c.slug !== citySlug);
  const hubNearbySlugs = hub?.nearbySlugs ?? [];
  const mergedNearby = new Map<string, (typeof geoNearby)[0]>();
  for (const c of geoNearby) mergedNearby.set(c.slug, c);
  for (const slug of hubNearbySlugs) {
    if (!mergedNearby.has(slug) && slug !== citySlug) {
      const c = getCityBySlug(slug);
      if (c) mergedNearby.set(slug, c);
    }
  }
  const nearbyForSubject = Array.from(mergedNearby.values()).slice(0, 8);
  const relatedSubjects = getRelatedSubjects(disciplineSlug, 6);

  const coursePath = `/cours/${disciplineSlug}/${citySlug}`;
  const serviceJsonLd = buildServiceJsonLd({
    name: tFormat(locale, "seoLandingServiceCourseName", {
      discipline: discipline.name,
      city: city.name,
    }),
    description: tFormat(locale, "seoLandingServiceCourseDescription", {
      teacherNoun: seoSubject.teacherNoun,
      city: city.name,
    }),
    cityName: city.name,
    serviceType: discipline.name,
    canonicalPath: coursePath,
  });
  const countLabel = seoCourseTeacherCountLabel(locale, teachers.length);
  const homeLabel = t(locale, "navHome");
  const coursesLabel = t(locale, "seoLandingBreadcrumbCourses");
  const findTeacherLabel = t(locale, "findTeacher");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <BreadcrumbSchema
        items={[
          { name: homeLabel, href: withLocale("/", locale) },
          { name: coursesLabel, href: withLocale("/trouver-un-prof", locale) },
          { name: discipline.name, href: withLocale(`/cours/${disciplineSlug}/${citySlug}`, locale) },
          { name: city.name, href: withLocale(`/tuteurs-prive/${citySlug}`, locale) },
        ]}
      />
      <FAQSchema items={faqs} />

      <MarketingPublicLayout className="bg-[#FAFCFB]">

        <SeoBreadcrumbBar
          locale={locale}
          items={[
            { label: homeLabel, href: withLocale("/", locale) },
            { label: coursesLabel, href: withLocale("/trouver-un-prof", locale) },
            { label: discipline.name, href: withLocale(`/cours/${disciplineSlug}/${citySlug}`, locale) },
            { label: city.name, href: withLocale(`/cours/${disciplineSlug}/${citySlug}`, locale) },
          ]}
        />

        <SeoHeroShell
          locale={locale}
          regionLabel={tFormat(locale, "seoLandingRegionLabel", {
            region: city.region,
            province: seoCity.province,
          })}
          title={tFormat(locale, "seoLandingCourseHeroTitle", {
            discipline: discipline.name,
            city: city.name,
          })}
          intro={courseSeo.intro}
          trustChips={[
            t(locale, "seoLandingChipClearProfiles"),
            t(locale, "seoLandingChipSimpleBooking"),
            t(locale, "seoLandingChipSecurePayment"),
            tFormat(locale, "seoLandingChipLocalTeachersInCity", { city: city.name }),
          ]}
          primaryCta={{
            href: withLocaleHref("/trouver-un-prof", locale),
            label: t(locale, "seoLandingPrimaryCtaSeeTeachers"),
          }}
          secondaryCta={{
            href: withLocaleHref("/become-teacher", locale),
            label: t(locale, "becomeTeacher"),
          }}
        />

        {/* ── TEACHER LIST ───────────────────────────────────────────────── */}
        <section className="flex-1 bg-[#F1EFE8] py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">
                {countLabel}
              </p>
              {isNearby && teachers.length > 0 && (
                <span className="rounded-full bg-[#FFF7E6] border border-[#F6C96E] px-2 py-0.5 text-[10px] font-semibold text-[#92600A]">
                  {tFormat(locale, "seoLandingNearbyBadge", { city: city.name })}
                </span>
              )}
            </div>

            {teachers.length === 0 ? (
              <SeoCourseCityEmptyState
                locale={locale}
                cityName={city.name}
                subjectLabel={seoSubject.label}
                disciplineName={discipline.name}
                disciplineSlug={disciplineSlug}
                citySlug={citySlug}
                nearbyCities={nearbyForSubject.map((c) => ({ slug: c.slug, name: c.name }))}
                relatedSubjects={relatedSubjects.map((s) => ({
                  slug: s.slug,
                  label: s.label,
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
                          <div className="h-11 w-11 shrink-0 rounded-full bg-teal-500/15 text-teal-800 flex items-center justify-center text-sm font-bold overflow-hidden">
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
                            <p className="truncate font-semibold text-sm text-[#2C2C2A]">{teacher.name}</p>
                            <p className="truncate text-xs text-[#6B6760]">{teacher.discipline}</p>
                          </div>
                        </div>
                        <SeoTeacherRatingBadge
                          locale={locale}
                          rating={teacher.rating}
                          reviews={teacher.reviews}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#E8E6DF] pt-3 text-xs text-[#6B6760]">
                        <span>{seoTeachingModeLabel(locale, teacher.teachingMode)}</span>
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
                    {t(locale, "seoLandingPrimaryCtaSeeTeachers")}
                  </Link>
                  <p className="mt-2 text-xs text-[#6B6760]">
                    {t(locale, "seoLandingFreeSignupNoCommitment")}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <SeoHowPratiqoWorks locale={locale} />
        <SeoTransparencyBlock locale={locale} />

        <section className="bg-white border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-4 text-sm text-[#2C2C2A] leading-relaxed">
            {courseSeo.bodyParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <p className="text-[#6B6760]">
              Recherche fréquente : cours de {seoSubject.label} à {city.name}, {seoSubject.teacherNoun} à {city.name}, prof{" "}
              {seoSubject.label} {city.name}.
            </p>
          </div>
        </section>

        <SeoDiscoveryGrid
          id="seo-discovery"
          columns={[
            {
              title: t(locale, "seoLandingSameSubjectOtherCities"),
              links: nearbyForSubject.map((c) => ({
                href: withLocale(getCoursePagePath(disciplineSlug, c.slug), locale),
                label: seoCourseLinkLabel(locale, discipline.name.toLowerCase(), c.name),
              })),
            },
            {
              title: tFormat(locale, "seoLandingOtherCoursesInCity", { city: city.name }),
              links: relatedSubjects.map((s) => ({
                href: withLocale(getCoursePagePath(s.slug, citySlug), locale),
                label: seoCourseLinkLabel(locale, s.label, city.name),
              })),
            },
            {
              title: t(locale, "seoLandingUsefulPages"),
              links: [
                {
                  href: withLocale("/trouver-un-prof", locale),
                  label: findTeacherLabel,
                },
                {
                  href: withLocaleHref("/become-teacher", locale),
                  label: t(locale, "seoLandingBecomeTeacherNav"),
                },
                {
                  href: withLocale("/tarifs", locale),
                  label: t(locale, "navPricing"),
                },
                {
                  href: withLocale("/blog", locale),
                  label: t(locale, "seoLandingBlogLabel"),
                },
                {
                  href: withLocale(getTutorCityPagePath(citySlug), locale),
                  label: seoPrivateTutorsLinkLabel(locale, city.name),
                },
              ],
            },
          ]}
        />

        <section className="bg-white border-t border-[#E8E6DF] py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <MarketingResourceBlock
              id="discipline-city-seo-guides"
              title={dict.seoLocalGuidesTitle}
              links={disciplineGuideLinks}
              className="border-[#E8E6DF] bg-[#FAFAF8]"
            />
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section className="bg-[#FAFAF8] border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-lg font-bold text-[#2C2C2A] mb-6">
              {tFormat(locale, "seoLandingCourseFaqTitle", {
                discipline: discipline.name.toLowerCase(),
                city: city.name,
              })}
            </h2>
            <div className="space-y-3">
              {faqs.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-[#E8E6DF] bg-white p-0 open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-sm text-[#2C2C2A] marker:content-none flex items-center justify-between gap-2">
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

        {/* ── CITY LINKS ─────────────────────────────────────────────────── */}
        <CityLinksFooter currentSlug={citySlug} />

      </MarketingPublicLayout>
    </>
  );
}
