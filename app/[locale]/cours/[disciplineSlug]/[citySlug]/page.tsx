import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Star, MapPin, BookOpen } from "lucide-react";
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
import { getDictionary } from "@/lib/i18n/server";
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

  if (!discipline || !city) return { title: "Cours particuliers | Pratiqo" };

  const seoCity = getCityBySlug(citySlug);
  const seoSubject = getSubjectBySlug(disciplineSlug);
  if (!seoCity || !seoSubject) return { title: "Cours particuliers | Pratiqo" };

  const path = `/cours/${disciplineSlug}/${citySlug}`;
  const localizedPaths = { en: path, fr: path, es: path };

  const title = `Cours de ${discipline.name} à ${city.name} | Pratiqo`;
  const description = `Trouvez un ${seoSubject.teacherNoun} à ${city.name}. Comparez les profils, réservez simplement et apprenez avec un professeur local sur Pratiqo.`;

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

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function teachingModeLabel(mode: string): string {
  if (mode === "online") return "En ligne";
  if (mode === "person") return "En présentiel";
  return "En ligne & présentiel";
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
    name: `Cours de ${discipline.name} à ${city.name}`,
    description: `Trouvez un ${seoSubject.teacherNoun} à ${city.name} sur Pratiqo.`,
    cityName: city.name,
    serviceType: discipline.name,
    canonicalPath: coursePath,
  });
  const countLabel =
    teachers.length === 0
      ? "Aucun professeur"
      : teachers.length === 1
      ? "1 professeur trouvé"
      : `${teachers.length} professeurs trouvés`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: withLocale("/", locale) },
          { name: "Cours", href: withLocale("/trouver-un-prof", locale) },
          { name: discipline.name, href: withLocale(`/cours/${disciplineSlug}/${citySlug}`, locale) },
          { name: city.name, href: withLocale(`/tuteurs-prive/${citySlug}`, locale) },
        ]}
      />
      <FAQSchema items={faqs} />

      <MarketingPublicLayout className="bg-[#FAFCFB]">

        {/* ── BREADCRUMB ─────────────────────────────────────────────────── */}
        <nav aria-label="Fil d'Ariane" className="bg-white border-b border-[#E8E6DF] px-4 sm:px-6 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B6760] max-w-5xl mx-auto">
            <li><Link href={withLocale("/", locale)} className="hover:text-teal-700">Accueil</Link></li>
            <li aria-hidden className="text-[#D3D1C7]">/</li>
            <li><Link href={withLocale("/trouver-un-prof", locale)} className="hover:text-teal-700">Cours</Link></li>
            <li aria-hidden className="text-[#D3D1C7]">/</li>
            <li><Link href={withLocale(`/cours/${disciplineSlug}/${citySlug}`, locale)} className="hover:text-teal-700">{discipline.name}</Link></li>
            <li aria-hidden className="text-[#D3D1C7]">/</li>
            <li className="font-semibold text-[#2C2C2A]">{city.name}</li>
          </ol>
        </nav>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-4">
              <MapPin size={12} aria-hidden />
              {city.region}, {seoCity.province}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Cours de {discipline.name} à {city.name}
            </h1>
            <p className="mt-3 text-base text-white/85 max-w-2xl mx-auto leading-relaxed">
              {courseSeo.intro}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <span aria-hidden>✅</span> Profils vérifiés
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <span aria-hidden>💳</span> Paiements sécurisés
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <span aria-hidden>📍</span> Profs locaux à {city.name}
              </span>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={withLocaleHref("/trouver-un-prof", locale)}
                className="inline-flex h-11 items-center rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:brightness-95 shadow"
              >
                Voir les professeurs disponibles
              </Link>
              <Link
                href={withLocaleHref("/become-teacher", locale)}
                className="inline-flex h-11 items-center rounded-2xl border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
                Devenir professeur
              </Link>
            </div>
          </div>
        </section>

        {/* ── TEACHER LIST ───────────────────────────────────────────────── */}
        <section className="flex-1 bg-[#F1EFE8] py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">
                {countLabel}
              </p>
              {isNearby && teachers.length > 0 && (
                <span className="rounded-full bg-[#FFF7E6] border border-[#F6C96E] px-2 py-0.5 text-[10px] font-semibold text-[#92600A]">
                  proches de {city.name}
                </span>
              )}
            </div>

            {teachers.length === 0 ? (
              <div className="rounded-2xl bg-white border border-[#E8E6DF] p-10 text-center">
                <BookOpen size={36} className="mx-auto text-[#D3D1C7] mb-3" />
                <p className="text-base font-semibold text-[#2C2C2A]">
                  Aucun professeur n&apos;est encore disponible pour {discipline.name.toLowerCase()} à {city.name}. Vous enseignez cette matière? Soyez le premier prof sur Pratiqo.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={withLocaleHref("/become-teacher", locale)}
                    className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
                  >
                    Devenir professeur
                  </Link>
                  <Link
                    href={withLocaleHref("/trouver-un-prof", locale)}
                    className="inline-flex items-center justify-center rounded-xl border border-[#D3D1C7] px-5 py-2.5 text-sm font-semibold text-[#2C2C2A] hover:border-teal-500"
                  >
                    Explorer Pratiqo
                  </Link>
                </div>
              </div>
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
                        <span className="shrink-0 flex items-center gap-0.5 rounded-lg border border-[#E8E6DF] bg-white px-2 py-1 text-[11px] font-bold text-[#2C2C2A]">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          {teacher.rating.toFixed(1)}
                        </span>
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
                    className="inline-flex h-11 items-center rounded-2xl bg-teal-700 px-7 text-sm font-bold text-white hover:brightness-105 shadow-sm"
                  >
                    Voir les professeurs disponibles
                  </Link>
                  <p className="mt-2 text-xs text-[#6B6760]">Inscription gratuite · Aucun engagement</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
        <section className="bg-white border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#6B6760] mb-8">
              Comment ça marche
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  n: "1",
                  title: "Comparez les profils",
                  desc: `Parcourez les profils de professeurs pour ${discipline.name.toLowerCase()} à ${city.name} : expérience, avis, vérifications et tarifs affichés clairement.`,
                },
                {
                  n: "2",
                  title: "Réservez en ligne",
                  desc: "Choisissez un créneau et confirmez le format du cours. Paiement sécurisé via Stripe.",
                },
                {
                  n: "3",
                  title: "Apprenez à votre rythme",
                  desc: "En ligne ou en présentiel, avec des objectifs ajustés à votre niveau et à votre emploi du temps.",
                },
              ].map((step) => (
                <div key={step.n} className="rounded-2xl border border-[#E8E6DF] bg-[#FAFCFB] p-5">
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-700">
                    {step.n}
                  </div>
                  <p className="font-bold text-sm text-[#2C2C2A]">{step.title}</p>
                  <p className="mt-1 text-xs text-[#6B6760] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

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

        <section className="bg-[#FAFAF8] border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl grid gap-10 lg:grid-cols-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B6760] mb-3">
                Autres villes pour {discipline.name.toLowerCase()}
              </h2>
              <ul className="space-y-2 text-sm">
                {nearbyForSubject.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={withLocale(getCoursePagePath(disciplineSlug, c.slug), locale)}
                      className="text-teal-700 font-semibold hover:underline"
                    >
                      {discipline.name} à {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B6760] mb-3">
                Autres cours à {city.name}
              </h2>
              <ul className="space-y-2 text-sm">
                {relatedSubjects.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={withLocale(getCoursePagePath(s.slug, citySlug), locale)}
                      className="text-teal-700 font-semibold hover:underline"
                    >
                      {s.label.charAt(0).toUpperCase() + s.label.slice(1)} à {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B6760] mb-3">Pages utiles</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={withLocale("/trouver-un-prof", locale)} className="text-teal-700 font-semibold hover:underline">
                    Trouver un prof
                  </Link>
                </li>
                <li>
                  <Link href={withLocaleHref("/become-teacher", locale)} className="text-teal-700 font-semibold hover:underline">
                    Devenir enseignant
                  </Link>
                </li>
                <li>
                  <Link href={withLocale("/tarifs", locale)} className="text-teal-700 font-semibold hover:underline">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href={withLocale("/blog", locale)} className="text-teal-700 font-semibold hover:underline">
                    Blogue Pratiqo
                  </Link>
                </li>
                <li>
                  <Link
                    href={withLocale(getTutorCityPagePath(citySlug), locale)}
                    className="text-teal-700 font-semibold hover:underline"
                  >
                    Tuteurs privés à {city.name}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>

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
              Questions fréquentes — cours de {discipline.name.toLowerCase()} à {city.name}
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
