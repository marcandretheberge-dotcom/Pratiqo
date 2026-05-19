import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { TEACHERS_PUBLIC_TABLE, TEACHERS_LIST_SELECT } from "@/lib/supabase/queries";
import {
  buildTeacherSeoTitle,
  buildTeacherSeoDescription,
  buildJobTitle,
  getSchemaEntityType,
} from "@/lib/constants/vocabulary";
import { usdToUyu } from "@/lib/geoLocale";
import TeacherProfileClient from "./TeacherProfileClient";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import type { Teacher } from "@/types";

import { SITE_URL } from "@/lib/seo/site";
import { isUuidString } from "@/lib/uuid";

const BASE_URL = SITE_URL;

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
    addressCountry?: string;
  } | null;
  city: string | null;
  region: string | null;
};

function rowToMeta(row: TeacherRow): TeacherMetaRow {
  return {
    name: row.name,
    discipline: row.discipline,
    category: row.category,
    bio: row.bio,
    image_url: row.image_url ?? "",
    rating: row.rating,
    reviews: row.reviews,
    price_per_lesson: row.price_per_lesson,
    location: row.location as TeacherMetaRow["location"],
    city: row.city ?? null,
    region: row.region ?? null,
  };
}

/** Resolve by teachers.id first, then teachers.user_id for legacy / mistaken links. */
const getTeacherRowByRouteId = cache(async (routeId: string): Promise<TeacherRow | null> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: byId, error: byIdError } = await supabase
      .from(TEACHERS_PUBLIC_TABLE)
      .select(TEACHERS_LIST_SELECT)
      .eq("id", routeId)
      .maybeSingle();
    if (!byIdError && byId) return byId as TeacherRow;

    if (isUuidString(routeId)) {
      const { data: byUserId, error: byUserError } = await supabase
        .from(TEACHERS_PUBLIC_TABLE)
        .select(TEACHERS_LIST_SELECT)
        .eq("user_id", routeId)
        .maybeSingle();
      if (!byUserError && byUserId) return byUserId as TeacherRow;
    }
    return null;
  } catch {
    return null;
  }
});

const getTeacherMeta = cache(async (routeId: string): Promise<TeacherMetaRow | null> => {
  const row = await getTeacherRowByRouteId(routeId);
  return row ? rowToMeta(row) : null;
});

const getTeacherForProfilePage = cache(async (routeId: string): Promise<Teacher | null> => {
  const row = await getTeacherRowByRouteId(routeId);
  if (!row) return null;
  const supabase = getSupabaseAdmin();
  const discMap = await fetchTeacherDisciplinesMap(supabase, [row.id]);
  const [teacher] = mergeTeachersWithDisciplines([teacherRowToTeacher(row)], discMap);
  return teacher ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonical = `${BASE_URL}/teacher/profile/${encodeURIComponent(id)}`;

  if (!isUuidString(id)) {
    return {
      title: "Professeur | Pratiqo",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const teacher = await getTeacherMeta(id);

  if (!teacher) {
    return {
      title: "Professeur | Pratiqo",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const countryCode = teacher.location?.addressCountry ?? undefined;
  const isUruguay = countryCode === "UY";

  const title = buildTeacherSeoTitle(
    teacher.name,
    teacher.discipline,
    teacher.category ?? "",
    isUruguay ? "es" : "fr",
    teacher.location?.addressLocality ?? teacher.city ?? undefined,
    countryCode,
  );

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
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: routeId } = await params;
  if (!isUuidString(routeId)) notFound();

  const initialTeacher = await getTeacherForProfilePage(routeId);
  if (!initialTeacher) notFound();

  const teacher = await getTeacherMeta(routeId);
  if (!teacher) notFound(); // same row as initialTeacher; defensive only

  const locality =
    (teacher.location as { neighborhood?: string; addressLocality?: string } | null)?.neighborhood ??
    (teacher.location as { addressLocality?: string } | null)?.addressLocality ??
    teacher.city ??
    teacher.region ??
    "Québec";

  const entityType = getSchemaEntityType(teacher.category ?? "");

  const profileUrl = `${BASE_URL}/teacher/profile/${encodeURIComponent(initialTeacher.id)}`;

  const jsonLd = {
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
    url: profileUrl,
    address: {
      "@type": "PostalAddress",
      addressLocality: locality,
      addressRegion: teacher.region ?? "QC",
      addressCountry: teacher.location?.addressCountry ?? "CA",
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TeacherProfileClient id={initialTeacher.id} initialTeacher={initialTeacher} />
    </>
  );
}
