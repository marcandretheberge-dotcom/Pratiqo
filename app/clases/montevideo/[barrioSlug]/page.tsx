import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Star, MapPin } from "lucide-react";
import { MV_BARRIOS } from "../../../../lib/constants/cities";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { haversineDistance } from "../../../../lib/geo";
import { teacherRowToTeacher, type TeacherRow } from "../../../../lib/teacherMapper";
import { buildJobTitle, getTeacherTerm } from "../../../../lib/constants/vocabulary";
import type { Teacher } from "../../../../types";
import { CityMapSection } from "../../../../components/CityMapSection";
import { CityLinksFooter } from "../../../../components/CityLinksFooter";

const BASE_URL = "https://pratiqo.ca";

// ── Teacher columns needed for the mapper ─────────────────────────────────────

const TEACHER_SELECT =
  "id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels, verification_level, identity_verified, diploma_verified, phone_verified, country_code, timezone, currency, city, region";

// ── Cached teacher fetch (shared across all barrio pages at build time) ───────

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
  ["barrio-page-teachers-v1"],
  { revalidate: 3600 },
);

// ── Proximity filter (barrio radius is tighter than city: ≤5 km primary) ─────

type TeachersResult = { teachers: Teacher[]; isNearby: boolean };

async function findTeachersForBarrio(lat: number, lng: number): Promise<TeachersResult> {
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

  // Primary: within 5 km of the barrio centre (neighbourhood-tight)
  const primary = withDist.filter((x) => x.distKm <= 5).map((x) => x.teacher);
  if (primary.length >= 2) return { teachers: primary.slice(0, 9), isNearby: false };

  // Fallback: within 30 km (whole city / metro)
  const expanded = withDist.filter((x) => x.distKm <= 30).map((x) => x.teacher);
  if (expanded.length >= 1) return { teachers: expanded.slice(0, 9), isNearby: true };

  // Final fallback: closest available teachers regardless of distance
  return { teachers: withDist.slice(0, 9).map((x) => x.teacher), isNearby: true };
}

// ── generateStaticParams ──────────────────────────────────────────────────────

export function generateStaticParams() {
  return MV_BARRIOS.map((b) => ({ barrioSlug: b.slug }));
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ barrioSlug: string }>;
}): Promise<Metadata> {
  const { barrioSlug } = await params;
  const barrio = MV_BARRIOS.find((b) => b.slug === barrioSlug);
  if (!barrio) return { title: "Clases particulares | Pratiqo" };

  const title = `Maestros y profesores particulares en ${barrio.name}, Montevideo | Pratiqo`;
  const description =
    `Encontrá un maestro de música, idiomas o refuerzo escolar en ${barrio.name}. ` +
    `Profesores verificados en Montevideo. Reservá tu primera clase en Pratiqo.`;

  return {
    title,
    description,
    keywords: [
      `maestro ${barrio.name}`,
      `profesor particular ${barrio.name}`,
      `clases de música ${barrio.name}`,
      `clases de idiomas ${barrio.name}`,
      `clases particulares Montevideo`,
      `profesor particular Montevideo`,
    ],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/clases/montevideo/${barrioSlug}`,
      siteName: "Pratiqo",
      locale: "es_UY",
      type: "website",
    },
    alternates: {
      canonical: `${BASE_URL}/clases/montevideo/${barrioSlug}`,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function teachingModeLabel(mode: string): string {
  if (mode === "online") return "En línea";
  if (mode === "person") return "Presencial";
  return "En línea y presencial";
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BarrioPage({
  params,
}: {
  params: Promise<{ barrioSlug: string }>;
}) {
  const { barrioSlug } = await params;
  const barrio = MV_BARRIOS.find((b) => b.slug === barrioSlug);
  if (!barrio) notFound();

  const { teachers, isNearby } = await findTeachersForBarrio(barrio.lat, barrio.lng);
  const zoom = barrio.defaultZoom ?? 15;

  // ── JSON-LD: BreadcrumbList ────────────────────────────────────────────────

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Pratiqo",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Uruguay",
        item: `${BASE_URL}/clases`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Montevideo",
        item: `${BASE_URL}/clases/montevideo`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: barrio.name,
        item: `${BASE_URL}/clases/montevideo/${barrioSlug}`,
      },
    ],
  };

  // ── JSON-LD: ItemList of teachers ─────────────────────────────────────────

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Maestros y profesores en ${barrio.name}, Montevideo`,
    description: `Profesores de música, idiomas y refuerzo escolar en ${barrio.name}. Clases particulares verificadas en Pratiqo.`,
    url: `${BASE_URL}/clases/montevideo/${barrioSlug}`,
    itemListElement: teachers.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: t.name,
        jobTitle: buildJobTitle(t.discipline ?? "", t.category ?? "", "es", "UY"),
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
      ? "Ningún profesor"
      : teachers.length === 1
      ? "1 profesor encontrado"
      : `${teachers.length} profesores encontrados`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 h-14 flex items-center justify-between bg-white border-b border-[#D3D1C7] px-4 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight text-[#0F6E56]">
            Pratiqo
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#0F6E56] hover:underline">
              Ingresar
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white hover:brightness-105"
            >
              Crear cuenta
            </Link>
          </div>
        </header>

        {/* ── BREADCRUMB ────────────────────────────────────────────────── */}
        <nav
          aria-label="Breadcrumb"
          className="bg-white border-b border-[#E8E6DF] px-4 sm:px-6 py-2"
        >
          <ol className="mx-auto max-w-5xl flex items-center gap-1.5 text-xs text-[#6B6760]">
            <li>
              <Link href="/" className="hover:text-[#0F6E56] hover:underline">Pratiqo</Link>
            </li>
            <li aria-hidden="true" className="text-[#C5C2B8]">/</li>
            <li>
              <Link href="/clases" className="hover:text-[#0F6E56] hover:underline">Uruguay</Link>
            </li>
            <li aria-hidden="true" className="text-[#C5C2B8]">/</li>
            <li>
              <Link href="/clases/montevideo" className="hover:text-[#0F6E56] hover:underline">Montevideo</Link>
            </li>
            <li aria-hidden="true" className="text-[#C5C2B8]">/</li>
            <li aria-current="page" className="font-semibold text-[#2C2C2A]">{barrio.name}</li>
          </ol>
        </nav>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-[#F1EFE8] px-4 sm:px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-[#1D9E75]" />
              <span className="text-sm font-medium text-[#1D9E75]">
                {barrio.name} · Montevideo, Uruguay
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#2C2C2A] leading-tight">
              Maestros y profesores<br />
              en {barrio.name}
            </h1>
            <p className="mt-3 text-base text-[#6B6760] max-w-xl">
              {isNearby
                ? `No encontramos profesores exactamente en ${barrio.name}. Aquí los más cercanos disponibles en Montevideo.`
                : `Encontrá tu profesor particular de música, idiomas o materias académicas en ${barrio.name}.`}
            </p>
            <p className="mt-2 text-sm font-medium text-[#0F6E56]">{countLabel}</p>
          </div>
        </section>

        {/* ── MAP ───────────────────────────────────────────────────────── */}
        {teachers.length > 0 ? (
          <section className="bg-[#F1EFE8] px-4 sm:px-6 pt-4 pb-6">
            <div className="mx-auto max-w-5xl">
              <CityMapSection
                teachers={teachers}
                cityLat={barrio.lat}
                cityLng={barrio.lng}
                cityName={barrio.name}
                initialZoom={zoom}
              />
            </div>
          </section>
        ) : null}

        {/* ── TEACHER LIST ──────────────────────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="mx-auto max-w-5xl">
            {teachers.length === 0 ? (
              <div className="rounded-2xl bg-white border border-[#E8E6DF] p-10 text-center">
                <p className="text-base font-semibold text-[#2C2C2A]">
                  ¿Ningún profesor en {barrio.name} por ahora?
                </p>
                <p className="mt-2 text-sm text-[#6B6760]">
                  Aquí los profesores disponibles cerca o en línea.
                </p>
                <Link
                  href="/student/search"
                  className="mt-4 inline-block rounded-xl bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
                >
                  Ver todos los profesores
                </Link>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teachers.map((teacher) => (
                  <li key={teacher.id}>
                    <Link
                      href={`/teacher/profile/${encodeURIComponent(teacher.id)}`}
                      className="group flex flex-col gap-3 rounded-2xl border border-[#E8E6DF] bg-white p-4 shadow-sm hover:shadow-md hover:border-[#1D9E75] transition-all"
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3">
                        {teacher.imageUrl ? (
                          <img
                            src={teacher.imageUrl}
                            alt={teacher.name}
                            width={48}
                            height={48}
                            loading="lazy"
                            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-[#D6F5EC] flex items-center justify-center text-sm font-bold text-[#0F6E56] flex-shrink-0">
                            {initials(teacher.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[#2C2C2A] truncate">{teacher.name}</p>
                          <p className="text-xs text-[#6B6760] truncate">
                            {getTeacherTerm(teacher.category ?? "", "es", "UY")} de {teacher.discipline}
                          </p>
                        </div>
                      </div>

                      {/* Rating */}
                      {teacher.reviews > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star size={13} className="fill-amber-400 text-amber-400" />
                          <span className="text-xs font-semibold text-[#2C2C2A]">
                            {Number(teacher.rating).toFixed(1)}
                          </span>
                          <span className="text-xs text-[#6B6760]">({teacher.reviews})</span>
                        </div>
                      ) : null}

                      {/* Location + mode */}
                      <div className="flex items-center gap-1.5 text-xs text-[#6B6760]">
                        <MapPin size={12} />
                        <span>
                          {teacher.location?.neighborhood ?? barrio.name}
                          {" · "}
                          {teachingModeLabel(teacher.teachingMode ?? "")}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mt-auto pt-3 border-t border-[#F0EEE8] flex items-center justify-between">
                        <span className="text-xs text-[#6B6760]">Tarifa / hora</span>
                        <span className="text-sm font-bold text-[#1D9E75]">
                          US$ {Math.round(Number(teacher.pricePerLesson))}
                          <span className="text-xs font-normal text-[#6B6760] ml-1">/h</span>
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* ── CITY LINKS FOOTER ─────────────────────────────────────────── */}
        <CityLinksFooter currentSlug={barrioSlug} />

        {/* ── MAIN FOOTER ───────────────────────────────────────────────── */}
        <footer className="bg-[#2C2C2A] text-white px-4 sm:px-6 py-8">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-black text-lg tracking-tight">Pratiqo</p>
              <p className="text-xs text-white/60 mt-0.5">
                La plataforma de clases particulares para Quebec, Canadá y Uruguay.
              </p>
            </div>
            <div className="flex gap-4 text-xs text-white/60">
              <Link href="/legal/cgu" className="hover:text-white hover:underline">Términos</Link>
              <Link href="/legal/confidentialite" className="hover:text-white hover:underline">Privacidad</Link>
              <Link href="/become-teacher" className="hover:text-white hover:underline">Soy profesor</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
