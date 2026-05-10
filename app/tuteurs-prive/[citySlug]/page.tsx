import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Star, MapPin } from "lucide-react";
import { QC_CITIES, findCityBySlug } from "../../../lib/constants/cities";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { haversineDistance } from "../../../lib/geo";
import { teacherRowToTeacher, type TeacherRow } from "../../../lib/teacherMapper";
import { buildJobTitle } from "../../../lib/constants/vocabulary";
import { LegalFooterLinks } from "../../../components/LegalFooterLinks";
import type { Teacher } from "../../../types";
import { CityMapSection } from "../../../components/CityMapSection";
import { CityLinksFooter } from "../../../components/CityLinksFooter";
import { FAQSchema } from "../../../components/seo/FAQSchema";
import { BreadcrumbSchema } from "../../../components/seo/BreadcrumbSchema";
import { MarketingResourceBlock } from "../../../components/seo/MarketingResourceBlock";
import { getLocale, getDictionary } from "../../../lib/i18n/server";
import { getCitySeoGuideLinks } from "../../../lib/seo/internalLinks";

const BASE_URL = "https://pratiqo.ca";

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
  return QC_CITIES.map((city) => ({ citySlug: city.slug }));
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}): Promise<Metadata> {
  const { citySlug } = await params;
  const city = findCityBySlug(citySlug);
  if (!city) return { title: "Tuteurs privés | Pratiqo" };

  const title = `Meilleurs professeurs et tuteurs à ${city.name}, ${city.region} | Pratiqo`;
  const description =
    `Trouvez un professeur de musique, de langues ou un tuteur scolaire à ${city.name}. ` +
    `Cours particuliers avec des experts vérifiés. Réservez votre premier cours sur Pratiqo.`;

  return {
    title,
    description,
    keywords: [
      `professeur ${city.name}`,
      `tuteur ${city.name}`,
      `cours de musique ${city.name}`,
      `cours de langue ${city.name}`,
      `cours particuliers ${city.name}`,
      `professeur particulier ${city.region}`,
    ],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/tuteurs-prive/${citySlug}`,
      siteName: "Pratiqo",
      locale: "fr_CA",
      type: "website",
    },
    alternates: {
      canonical: `${BASE_URL}/tuteurs-prive/${citySlug}`,
    },
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
  params: Promise<{ citySlug: string }>;
}) {
  const { citySlug } = await params;
  const city = findCityBySlug(citySlug);
  if (!city) notFound();

  const { teachers, isNearby } = await findTeachersForCity(city.lat, city.lng);

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const cityGuideLinks = getCitySeoGuideLinks(citySlug, locale);

  const cityFaq = [
    {
      question: `Comment trouver un tuteur privé à ${city.name}?`,
      answer: `Recherchez un tuteur sur Pratiqo en filtrant par matière, disponibilité et mode d'enseignement. Vous verrez les profils des tuteurs disponibles à ${city.name} et à proximité, avec leurs tarifs et leurs avis.`,
    },
    {
      question: `Les cours particuliers sont-ils disponibles en ligne à ${city.name}?`,
      answer: `Oui. La majorité des professeurs sur Pratiqo proposent des cours en ligne via vidéoconférence, en plus des cours à domicile ou en présentiel à ${city.name}.`,
    },
    {
      question: `Quel est le tarif moyen d'un tuteur à ${city.name}?`,
      answer: `Les tarifs varient entre 25 $ et 75 $/heure selon la matière, le niveau scolaire et l'expérience du tuteur. Chaque profil Pratiqo affiche clairement le prix par cours.`,
    },
    {
      question: `Les tuteurs sur Pratiqo sont-ils vérifiés?`,
      answer: `Oui. Chaque tuteur vérifie son identité avant de pouvoir enseigner. Certains ont aussi fait valider leurs diplômes et sont identifiés par un badge sur leur profil.`,
    },
  ];

  // ── JSON-LD: ItemList of tutors ────────────────────────────────────────────

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Meilleurs professeurs et tuteurs à ${city.name}, ${city.region}`,
    description: `Professeurs de musique, de langues et tuteurs scolaires à ${city.name}. Cours particuliers vérifiés sur Pratiqo.`,
    url: `${BASE_URL}/tuteurs-prive/${citySlug}`,
    itemListElement: teachers.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: t.name,
        jobTitle: buildJobTitle(t.discipline ?? "", t.category ?? ""),
        knowsAbout: [t.discipline, t.category].filter(Boolean),
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
      ? "Aucun tuteur"
      : teachers.length === 1
      ? "1 tuteur trouvé"
      : `${teachers.length} tuteurs trouvés`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: "/" },
          { name: "Tuteurs privés", href: "/student/search" },
          { name: city.name, href: `/tuteurs-prive/${citySlug}` },
        ]}
      />
      <FAQSchema items={cityFaq} />

      <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">

        {/* ── HEADER ────────────────────────────────────────────────────── */}
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

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-4">
              <MapPin size={12} aria-hidden />
              {city.region}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Tuteurs et profs privés à {city.name}
            </h1>
            <p className="mt-3 text-base text-white/80 max-w-xl mx-auto">
              Trouvez le professeur idéal près de chez vous — musique, langues,
              mathématiques, arts martiaux et plus. Cours en ligne ou en
              présentiel, à votre rythme.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:brightness-95 shadow"
              >
                Je cherche un tuteur →
              </Link>
              <Link
                href="/become-teacher"
                className="inline-flex h-11 items-center rounded-2xl border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
                Enseigner sur Pratiqo
              </Link>
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
              /* ── Empty state ─────────────────────────────────────────── */
              <div className="rounded-2xl bg-white border border-[#E8E6DF] p-10 text-center">
                <p className="text-base font-semibold text-[#2C2C2A]">
                  Aucun tuteur à {city.name} pour l&apos;instant&nbsp;?
                </p>
                <p className="mt-2 text-sm text-[#6B6760]">
                  Voici les professeurs disponibles à proximité ou en ligne.
                </p>
                <Link
                  href="/login"
                  className="mt-5 inline-flex items-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
                >
                  Voir tous les tuteurs →
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
                    Voir tous les tuteurs disponibles →
                  </Link>
                  <p className="mt-2 text-xs text-[#6B6760]">
                    Inscription gratuite · Aucun engagement
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="bg-white border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#6B6760] mb-8">
              Comment ça marche
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  n: "1",
                  title: "Cherchez votre tuteur",
                  desc: `Parcourez les profils de tuteurs à ${city.name} et filtrez par matière, prix ou disponibilité.`,
                },
                {
                  n: "2",
                  title: "Réservez un cours",
                  desc: "Réservez directement en ligne. Paiement sécurisé via Stripe.",
                },
                {
                  n: "3",
                  title: "Apprenez à votre rythme",
                  desc: "Cours en ligne ou en présentiel, adapté à votre niveau et vos objectifs.",
                },
              ].map((step) => (
                <div
                  key={step.n}
                  className="rounded-2xl border border-[#E8E6DF] bg-[#FAFCFB] p-5"
                >
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
              id="city-seo-guides"
              title={dict.seoLocalGuidesTitle}
              links={cityGuideLinks}
              className="border-[#E8E6DF] bg-[#FAFAF8]"
            />
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="bg-[#FAFAF8] border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-lg font-bold text-[#2C2C2A] mb-6">
              Questions fréquentes — cours particuliers à {city.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {cityFaq.map((item, i) => (
                <div key={i} className="rounded-xl border border-[#E8E6DF] bg-white p-5">
                  <p className="font-semibold text-sm text-[#2C2C2A] mb-2">{item.question}</p>
                  <p className="text-sm text-[#6B6760] leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CITY LINKS (internal linking) ─────────────────────────────── */}
        <CityLinksFooter currentSlug={citySlug} />

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B6760]">
            <LegalFooterLinks />
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/" className="font-semibold text-teal-700 hover:underline">
              Pratiqo
            </Link>
            <span className="text-[#D3D1C7]">·</span>
            <span>© 2026 Pratiqo inc.</span>
          </div>
        </footer>

      </div>
    </>
  );
}
