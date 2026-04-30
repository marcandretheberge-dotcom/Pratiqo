import type { Metadata } from "next";
import { cache } from "react";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  buildTeacherSeoTitle,
  buildTeacherSeoDescription,
  buildJobTitle,
  getSchemaEntityType,
} from "../../../../../lib/constants/vocabulary";
import { usdToUyu } from "../../../../../lib/geoLocale";
import TeacherProfileClient from "./TeacherProfileClient";

const BASE_URL = "https://pratiqo.ca";

// Minimal row shape — server-only, never imported on the client.
type TeacherMetaRow = {
  name: string;
  discipline: string;
  category: string;
  bio: string;
  image_url: string;
  rating: number;
  reviews: number;
  price_per_lesson: number;
  location: {
    neighborhood?: string;
    addressLocality?: string;
    /** ISO 3166-1 alpha-2 country code stored with the teacher's location. */
    addressCountry?: string;
  } | null;
};

// `cache` deduplicates the DB call within a single request so
// generateMetadata and the page function share one round-trip.
const getTeacherMeta = cache(async (id: string): Promise<TeacherMetaRow | null> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("teachers")
      .select("name, discipline, category, bio, image_url, rating, reviews, price_per_lesson, location")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as TeacherMetaRow;
  } catch {
    return null;
  }
});

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const teacher = await getTeacherMeta(id);

  if (!teacher) return { title: "Professeur | Pratiqo" };

  const countryCode = teacher.location?.addressCountry ?? undefined;
  const isUruguay = countryCode === "UY";

  const title = buildTeacherSeoTitle(
    teacher.name,
    teacher.discipline,
    teacher.category ?? "",
    isUruguay ? "es" : "fr",
    teacher.location?.addressLocality,
    countryCode,
  );

  // For UY teachers: append peso price so local parents see it in the SERP snippet.
  let description = buildTeacherSeoDescription(
    teacher.name,
    teacher.discipline,
    teacher.category ?? "",
    teacher.bio,
    isUruguay ? "es" : "fr",
    countryCode,
  );

  if (isUruguay && teacher.price_per_lesson) {
    const priceUSD = Math.round(Number(teacher.price_per_lesson));
    const priceUYU = usdToUyu(priceUSD);
    const priceSuffix = ` — Desde $U ${priceUYU.toLocaleString("es-UY")} / hora (US$ ${priceUSD}).`;
    if (description.length + priceSuffix.length <= 160) {
      description = description.trimEnd().replace(/\.$/, "") + priceSuffix;
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/teacher/profile/${encodeURIComponent(id)}`,
      images: teacher.image_url ? [{ url: teacher.image_url, width: 400, height: 400 }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: teacher.image_url ? [teacher.image_url] : [],
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await getTeacherMeta(id);

  const locality =
    (teacher?.location as { neighborhood?: string } | null)?.neighborhood ?? "Saint-Georges";

  // ── JSON-LD: Person + AggregateRating + Offer ────────────────────────────
  const entityType = teacher ? getSchemaEntityType(teacher.category ?? "") : null;

  const jsonLd = teacher
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: teacher.name,
        jobTitle: buildJobTitle(teacher.discipline, teacher.category ?? ""),
        knowsAbout: [teacher.discipline, teacher.category].filter(Boolean),
        hasOccupation: {
          "@type": "Occupation",
          name: buildJobTitle(teacher.discipline, teacher.category ?? ""),
          occupationLocation: {
            "@type": "City",
            name: locality,
          },
        },
        worksFor: {
          "@type": entityType ?? "EducationalOrganization",
          name: "Pratiqo",
          url: BASE_URL,
        },
        ...(teacher.bio ? { description: teacher.bio.slice(0, 500) } : {}),
        ...(teacher.image_url ? { image: teacher.image_url } : {}),
        url: `${BASE_URL}/teacher/profile/${encodeURIComponent(id)}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: locality,
          addressRegion: "QC",
          addressCountry: "CA",
        },
        ...(teacher.price_per_lesson
          ? {
              makesOffer: {
                "@type": "Offer",
                description: `Cours de ${teacher.discipline}`,
                price: String(Math.round(Number(teacher.price_per_lesson))),
                priceCurrency: "CAD",
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
        ...(teacher.reviews > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: String(teacher.rating),
                reviewCount: String(teacher.reviews),
                bestRating: "5",
                worstRating: "1",
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // JSON.stringify produces valid JSON; no additional escaping needed.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <TeacherProfileClient id={id} />
    </>
  );
}
