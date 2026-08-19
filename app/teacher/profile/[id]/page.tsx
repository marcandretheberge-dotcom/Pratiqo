import type { Metadata } from "next";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
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
} from "@/lib/constants/vocabulary";
import { usdToUyu } from "@/lib/geoLocale";
import { resolveTeacherPublicPhoto } from "@/lib/teacherPhoto";
import { sanitizePublicTeacherBio } from "@/lib/teacherProfile/sanitizePublicBio";
import { formatPublicTeacherDisplayName } from "@/lib/identity/displayName";
import TeacherProfileClient from "./TeacherProfileClient";

import { SITE_URL } from "@/lib/seo/site";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import { isUuidString } from "@/lib/uuid";
import { fetchTeacherPublicSeoRowById } from "@/lib/seo/teacherPublicProfileData";
import {
  buildTeacherPublicProfileCanonicalUrl,
  isTeacherPublicProfileIndexable,
  teacherPublicProfileRobots,
} from "@/lib/seo/teacherPublicProfile";

const BASE_URL = SITE_URL;

type PublicTeacherLookupColumn = "id" | "user_id";

function isColumnMismatchError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message ?? "") : "";
  return /column|does not exist|Could not find/i.test(message);
}

/** Read one row from teachers_public with select fallbacks (full → legacy → *). */
async function selectPublicTeacherRow(
  column: PublicTeacherLookupColumn,
  value: string,
): Promise<TeacherRow | null> {
  const supabase = getSupabaseAdmin();

  const parse = (data: unknown): TeacherRow | null =>
    data && typeof data === "object" && "id" in data ? (data as TeacherRow) : null;

  const full = await supabase
    .from(TEACHERS_PUBLIC_TABLE)
    .select(TEACHERS_LIST_SELECT)
    .eq(column, value)
    .maybeSingle();
  if (!full.error) {
    return parse(full.data);
  }
  if (!isColumnMismatchError(full.error)) {
    return null;
  }

  const legacy = await supabase
    .from(TEACHERS_PUBLIC_TABLE)
    .select(TEACHERS_LIST_SELECT_LEGACY_PUBLIC)
    .eq(column, value)
    .maybeSingle();
  if (!legacy.error) {
    return parse(legacy.data);
  }
  if (!isColumnMismatchError(legacy.error)) {
    return null;
  }

  const wide = await supabase.from(TEACHERS_PUBLIC_TABLE).select("*").eq(column, value).maybeSingle();
  if (!wide.error) {
    return parse(wide.data);
  }
  return null;
}

async function withSafeProfilePhoto(row: TeacherRow): Promise<TeacherRow | null> {
  if (!row.user_id) return null;
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("photo_url, is_active, deactivated_at, deleted_at, anonymized_at")
    .eq("id", row.user_id)
    .maybeSingle();
  const profile = data as {
    photo_url?: string | null;
    is_active?: boolean | null;
    deactivated_at?: string | null;
    deleted_at?: string | null;
    anonymized_at?: string | null;
  } | null;
  if (
    !profile ||
    profile.is_active === false ||
    profile.deactivated_at ||
    profile.deleted_at ||
    profile.anonymized_at
  ) {
    return null;
  }
  const photoUrl = typeof profile.photo_url === "string" && profile.photo_url.trim() ? profile.photo_url.trim() : null;
  return { ...row, image_url: resolveTeacherPublicPhoto(photoUrl, row.image_url) };
}

/** Lookup by teachers.id, then teachers.user_id when route param is a UUID. */
const lookupPublicTeacherRowByRouteId = cache(async (routeId: string): Promise<TeacherRow | null> => {
  const trimmed = routeId.trim();
  if (!trimmed) return null;

  const byId = await selectPublicTeacherRow("id", trimmed);
  if (byId) return withSafeProfilePhoto(byId);

  if (isUuidString(trimmed)) {
    const byUserId = await selectPublicTeacherRow("user_id", trimmed);
    return byUserId ? withSafeProfilePhoto(byUserId) : null;
  }
  return null;
});

function rowToTeacherForProfile(row: TeacherRow): Teacher {
  return teacherRowToTeacher(row);
}

async function attachDisciplines(teacher: Teacher): Promise<Teacher> {
  try {
    const discMap = await fetchTeacherDisciplinesMap(getSupabaseAdmin(), [teacher.id]);
    return mergeTeachersWithDisciplines([teacher], discMap)[0] ?? teacher;
  } catch {
    return teacher;
  }
}

/** Single source of truth for metadata + page — only null when teachers_public has no row. */
const getTeacherForProfilePage = cache(async (routeId: string): Promise<Teacher | null> => {
  const row = await lookupPublicTeacherRowByRouteId(routeId);
  if (!row) return null;

  const base = rowToTeacherForProfile(row);
  return attachDisciplines(base);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: routeId } = await params;
  const teacher = await getTeacherForProfilePage(routeId);
  const seoRow = teacher ? await fetchTeacherPublicSeoRowById(teacher.id) : null;
  const indexable = seoRow ? isTeacherPublicProfileIndexable(seoRow) : false;
  const canonicalSlug =
    indexable && seoRow?.public_profile_slug?.trim()
      ? buildTeacherPublicProfileCanonicalUrl(seoRow.public_profile_slug.trim())
      : null;
  const canonical =
    canonicalSlug ?? `${BASE_URL}/teacher/profile/${encodeURIComponent(teacher?.id ?? routeId)}`;

  if (!teacher) {
    return {
      title: "Professeur | Pratiqo",
      robots: teacherPublicProfileRobots(false),
      alternates: { canonical },
    };
  }

  const countryCode = teacher.countryCode ?? undefined;
  const isUruguay = countryCode === "UY";

  // Public display name (first + last initial). The stored teacher.name is
  // untouched — receipts, support, admin, and Stripe metadata continue to
  // see the full name elsewhere. Only the public SEO/OG/Twitter/JSON-LD
  // surfaces below get the masked variant.
  const publicTeacherName = formatPublicTeacherDisplayName(teacher.name);

  const title = buildTeacherSeoTitle(
    publicTeacherName,
    teacher.discipline,
    teacher.category ?? "",
    isUruguay ? "es" : "fr",
    teacher.location?.neighborhood ?? teacher.city ?? undefined,
    countryCode,
  );

  // Mask personal contact info before the bio reaches meta description,
  // OpenGraph, Twitter cards, or JSON-LD. The stored bio is unchanged.
  const sanitizedBioForMeta = sanitizePublicTeacherBio(
    teacher.bio,
    isUruguay ? "es" : "fr",
  ).content;

  let description = buildTeacherSeoDescription(
    publicTeacherName,
    teacher.discipline,
    teacher.category ?? "",
    sanitizedBioForMeta,
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
    robots: teacherPublicProfileRobots(indexable),
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
  const { id: routeId } = await params;
  const initialTeacher = await getTeacherForProfilePage(routeId);
  if (!initialTeacher) notFound();

  const seoRow = await fetchTeacherPublicSeoRowById(initialTeacher.id);
  if (seoRow && isTeacherPublicProfileIndexable(seoRow) && seoRow.public_profile_slug?.trim()) {
    redirect(`/professeurs/${encodeURIComponent(seoRow.public_profile_slug.trim())}`);
  }

  if (routeId !== initialTeacher.id) {
    redirect(`/teacher/profile/${encodeURIComponent(initialTeacher.id)}`);
  }

  const locality =
    initialTeacher.location.neighborhood ??
    initialTeacher.city ??
    initialTeacher.region ??
    "Québec";

  // JSON-LD must not leak raw contact info either
  // index this. Use the same sanitizer as meta description and the rendered
  // bio, picking the locale that matches the rest of this page's metadata.
  const sanitizedBioForJsonLd = sanitizePublicTeacherBio(
    initialTeacher.bio,
    initialTeacher.countryCode === "UY" ? "es" : "fr",
  ).content;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    // Public masked name. Full legal name is still available in receipts /
    // support tooling / Stripe metadata where appropriate.
    name: formatPublicTeacherDisplayName(initialTeacher.name),
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
    ...(sanitizedBioForJsonLd ? { description: sanitizedBioForJsonLd.slice(0, 500) } : {}),
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <TeacherProfileClient id={initialTeacher.id} initialTeacher={initialTeacher} />
    </>
  );
}
