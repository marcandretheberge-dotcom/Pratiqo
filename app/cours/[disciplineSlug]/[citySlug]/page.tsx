import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Star, MapPin, BookOpen } from "lucide-react";
import { findCityBySlug } from "@/lib/constants/cities";
import { findDisciplineBySlug, DISCIPLINE_CITY_PAIRS } from "@/lib/seo/disciplines";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { haversineDistance } from "@/lib/geo";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { CityLinksFooter } from "@/components/CityLinksFooter";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { MarketingResourceBlock } from "@/components/seo/MarketingResourceBlock";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { getDisciplineCitySeoGuideLinks } from "@/lib/seo/internalLinks";
import type { Teacher } from "@/types";

import { SITE_URL } from "@/lib/seo/site";

const BASE_URL = SITE_URL;

// Read through teachers_public so this SEO page never ships private workflow
// fields (Stripe Connect/Identity, diploma_url, phone_verified, identity_status,
// stripe_identity_status, location_verification_*, cv_verification_status) in
// the rendered HTML payload. See migration 070.
const TEACHER_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, verification_level, identity_verified, diploma_verified, country_code, timezone, currency, city, region";

const getAllTeachers = unstable_cache(
  async (): Promise<Teacher[]> => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from(TEACHERS_PUBLIC_TABLE)
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
  dbCategory: string,
  dbDiscipline?: string,
): Promise<{ teachers: Teacher[]; isNearby: boolean }> {
  const all = await getAllTeachers();

  const filtered = all.filter((t) => {
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
  return DISCIPLINE_CITY_PAIRS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ disciplineSlug: string; citySlug: string }>;
}): Promise<Metadata> {
  const { disciplineSlug, citySlug } = await params;
  const discipline = findDisciplineBySlug(disciplineSlug);
  const city = findCityBySlug(citySlug);

  if (!discipline || !city) return { title: "Cours particuliers | Pratiqo" };

  return {
    title: discipline.metaTitle(city.name, city.region),
    description: discipline.metaDescription(city.name),
    keywords: [
      `cours ${discipline.name.toLowerCase()} ${city.name}`,
      `professeur ${discipline.name.toLowerCase()} ${city.name}`,
      `tuteur ${discipline.name.toLowerCase()} ${city.region}`,
      `cours particuliers ${city.name}`,
    ],
    openGraph: {
      title: discipline.metaTitle(city.name, city.region),
      description: discipline.metaDescription(city.name),
      url: `${BASE_URL}/cours/${disciplineSlug}/${citySlug}`,
      siteName: "Pratiqo",
      locale: "fr_CA",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: discipline.metaTitle(city.name, city.region),
      description: discipline.metaDescription(city.name),
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `${BASE_URL}/cours/${disciplineSlug}/${citySlug}`,
    },
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
  params: Promise<{ disciplineSlug: string; citySlug: string }>;
}) {
  const { disciplineSlug, citySlug } = await params;
  const discipline = findDisciplineBySlug(disciplineSlug);
  const city = findCityBySlug(citySlug);

  if (!discipline || !city) notFound();

  const { teachers, isNearby } = await findTeachersForDisciplineCity(
    city.lat,
    city.lng,
    discipline.dbCategory,
    discipline.dbDiscipline,
  );

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const disciplineGuideLinks = getDisciplineCitySeoGuideLinks(disciplineSlug, citySlug, locale);

  const faqWithCity = discipline.faq.map((item) => ({
    question: item.question.replace("{city}", city.name),
    answer: item.answer,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: discipline.heroTitle(city.name),
    description: discipline.heroDesc(city.name),
    url: `${BASE_URL}/cours/${disciplineSlug}/${citySlug}`,
    itemListElement: teachers.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: t.name,
        jobTitle: `Professeur de ${discipline.name}`,
        url: `${BASE_URL}/teacher/profile/${encodeURIComponent(t.id)}`,
        ...(t.reviews > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: String(t.rating),
                reviewCount: String(t.reviews),
                bestRating: "5",
                worstRating: "1",
              },
            }
          : {}),
      },
    })),
  };

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: "/" },
          { name: "Cours particuliers", href: "/student/search" },
          { name: discipline.name, href: `/cours/${disciplineSlug}/${citySlug}` },
          { name: city.name, href: `/cours/${disciplineSlug}/${citySlug}` },
        ]}
      />
      <FAQSchema items={faqWithCity} />

      <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 h-14 flex items-center justify-between bg-white border-b border-[#D3D1C7] px-4 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight text-teal-700">
            Pratiqo
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-teal-700 hover:underline">
              Connexion
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:brightness-105"
            >
              Créer un compte
            </Link>
          </div>
        </header>

        {/* ── BREADCRUMB ─────────────────────────────────────────────────── */}
        <nav aria-label="Fil d'Ariane" className="bg-white border-b border-[#E8E6DF] px-4 sm:px-6 py-2">
          <ol className="flex items-center gap-1.5 text-xs text-[#6B6760] max-w-5xl mx-auto">
            <li><Link href="/" className="hover:text-teal-700">Pratiqo</Link></li>
            <li aria-hidden>/</li>
            <li><Link href={`/tuteurs-prive/${citySlug}`} className="hover:text-teal-700">{city.name}</Link></li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-[#2C2C2A]">{discipline.name}</li>
          </ol>
        </nav>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-4">
              <MapPin size={12} aria-hidden />
              {city.region}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {discipline.heroTitle(city.name)}
            </h1>
            <p className="mt-3 text-base text-white/80 max-w-xl mx-auto">
              {discipline.heroDesc(city.name)}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:brightness-95 shadow"
              >
                Trouver mon professeur →
              </Link>
              <Link
                href="/become-teacher"
                className="inline-flex h-11 items-center rounded-2xl border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
                Enseigner {discipline.name}
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
                  Aucun professeur de {discipline.name} à {city.name} pour l&apos;instant.
                </p>
                <p className="mt-2 text-sm text-[#6B6760]">
                  Voici nos professeurs disponibles en ligne ou à proximité.
                </p>
                <Link
                  href="/login"
                  className="mt-5 inline-flex items-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
                >
                  Voir tous les professeurs →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={`/teacher/profile/${encodeURIComponent(teacher.id)}`}
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
                            <p className="truncate font-semibold text-sm text-[#2C2C2A]">{publicFirstNameWithInitial(teacher.name)}</p>
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
                    href="/login"
                    className="inline-flex h-11 items-center rounded-2xl bg-teal-700 px-7 text-sm font-bold text-white hover:brightness-105 shadow-sm"
                  >
                    Voir tous les professeurs disponibles →
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
                  title: "Cherchez votre professeur",
                  desc: `Parcourez les profils de professeurs de ${discipline.name} à ${city.name} et choisissez selon vos critères.`,
                },
                {
                  n: "2",
                  title: "Réservez un cours",
                  desc: "Réservez directement en ligne. Paiement sécurisé via Stripe.",
                },
                {
                  n: "3",
                  title: "Apprenez à votre rythme",
                  desc: "Cours en ligne ou en présentiel, adapté à votre niveau et à vos objectifs.",
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
              Questions fréquentes — cours de {discipline.name} à {city.name}
            </h2>
            <div className="space-y-4">
              {faqWithCity.map((item, i) => (
                <div key={i} className="rounded-xl border border-[#E8E6DF] bg-white p-5">
                  <p className="font-semibold text-sm text-[#2C2C2A] mb-2">{item.question}</p>
                  <p className="text-sm text-[#6B6760] leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CITY LINKS ─────────────────────────────────────────────────── */}
        <CityLinksFooter currentSlug={citySlug} />

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B6760]">
            <LegalFooterLinks />
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/" className="font-semibold text-teal-700 hover:underline">Pratiqo</Link>
            <span className="text-[#D3D1C7]">·</span>
            <span>© 2026 Pratiqo inc.</span>
          </div>
        </footer>

      </div>
    </>
  );
}
