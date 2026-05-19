import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  TEACHERS_LIST_SELECT,
  TEACHERS_LIST_SELECT_LEGACY_PUBLIC,
  TEACHERS_PUBLIC_TABLE,
} from "@/lib/supabase/queries";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import type { Teacher } from "@/types";
import {
  buildTeacherSeoTitle,
  buildTeacherSeoDescription,
  buildJobTitle,
  getSchemaEntityType,
} from "@/lib/constants/vocabulary";
import { usdToUyu } from "@/lib/geoLocale";
import TeacherProfileClient from "./TeacherProfileClient";

import { SITE_URL } from "@/lib/seo/site";
import { isUuidString } from "@/lib/uuid";

const BASE_URL = SITE_URL;

type PublicTeacherLookupColumn = "id" | "user_id";

async function selectPublicTeacherBy(
  column: PublicTeacherLookupColumn,
  value: string,
): Promise<TeacherRow | null> {
  const supabase = getSupabaseAdmin();

  let response = await supabase
    .from(TEACHERS_PUBLIC_TABLE)
    .select(TEACHERS_LIST_SELECT)
    .eq(column, value)
    .maybeSingle();

  if (response.error) {
    response = await supabase
      .from(TEACHERS_PUBLIC_TABLE)
      .select(TEACHERS_LIST_SELECT_LEGACY_PUBLIC)
      .eq(column, value)
      .maybeSingle();
  }

  if (response.error || !response.data) return null;
  return response.data as TeacherRow;
}

const getTeacherForProfilePage = cache(async (routeId: string): Promise<Teacher | null> => {
  const id = routeId.trim();
  if (!id) return null;

  try {
    const row = (await selectPublicTeacherBy("id", id)) ?? (isUuidString(id) ? await selectPublicTeacherBy("user_id", id) : null);
    if (!row) return null;

    const base = teacherRowToTeacher(row);
    const discMap = await fetchTeacherDisciplinesMap(getSupabaseAdmin(), [base.id]);
    return mergeTeachersWithDisciplines([base], discMap)[0] ?? base;
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const teacher = await getTeacherForProfilePage(id);
  const canonical = `${BASE_URL}/teacher/profile/${encodeURIComponent(teacher?.id ?? id)}`;

  if (!teacher) {
    return {
      title: "Professeur | Pratiqo",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const countryCode = teacher.countryCode ?? undefined;
  const isUruguay = countryCode === "UY";

  const title = buildTeacherSeoTitle(
    teacher.name,
    teacher.discipline,
    teacher.category ?? "",
    isUruguay ? "es" : "fr",
    teacher.location?.neighborhood ?? teacher.city ?? undefined,
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

  if (isUruguay && teacher.pricePerLesson) {
    const priceUSD = Math.round(Number(teacher.pricePerLesson));
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
      images: teacher.imageUrl ? [{ url: teacher.imageUrl, width: 400, height: 400 }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: teacher.imageUrl ? [teacher.imageUrl] : [],
    },
  };
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialTeacher = await getTeacherForProfilePage(id);
  if (!initialTeacher) notFound();

  const locality =
    initialTeacher.location.neighborhood ??
    initialTeacher.city ??
    initialTeacher.region ??
    "Québec";

  const entityType = getSchemaEntityType(initialTeacher.category ?? "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: initialTeacher.name,
    jobTitle: buildJobTitle(initialTeacher.discipline, initialTeacher.category ?? ""),
    knowsAbout: [initialTeacher.discipline, initialTeacher.category].filter(Boolean),
    hasOccupation: {
      "@type": "Occupation",
      name: buildJobTitle(initialTeacher.discipline, initialTeacher.category ?? ""),
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
    ...(initialTeacher.bio ? { description: initialTeacher.bio.slice(0, 500) } : {}),
    ...(initialTeacher.imageUrl ? { image: initialTeacher.imageUrl } : {}),
    url: `${BASE_URL}/teacher/profile/${encodeURIComponent(initialTeacher.id)}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: locality,
      addressRegion: initialTeacher.region ?? "QC",
      addressCountry: initialTeacher.countryCode ?? "CA",
    },
    ...(initialTeacher.pricePerLesson
      ? {
          makesOffer: {
            "@type": "Offer",
            description: `Cours de ${initialTeacher.discipline}`,
            price: String(Math.round(Number(initialTeacher.pricePerLesson))),
            priceCurrency: "CAD",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    ...(initialTeacher.reviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(initialTeacher.rating),
            reviewCount: String(initialTeacher.reviews),
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
