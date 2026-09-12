import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  TEACHERS_LIST_SELECT,
  TEACHERS_LIST_SELECT_LEGACY_PUBLIC,
  TEACHERS_PUBLIC_TABLE,
} from "@/lib/supabase/queries";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { attachPublicTeachingZones } from "@/lib/teacherTeachingZones";
import TeacherProfileClient from "@/app/teacher/profile/[id]/TeacherProfileClient";
import { TeacherProfileSeoLinks } from "@/components/seo/TeacherProfileSeoLinks";
import { getLocale } from "@/lib/i18n/server";
import {
  buildTeacherPublicProfileCanonicalUrl,
  buildTeacherPublicProfileDescription,
  buildTeacherPublicProfileH1,
  buildTeacherPublicProfileJsonLd,
  buildTeacherPublicProfileTitle,
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
  publicTeacherFirstName,
  resolveTeacherSeoCityLabel,
  teacherPublicProfileRobots,
} from "@/lib/seo/teacherPublicProfile";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import { fetchTeacherPublicSeoRowBySlug } from "@/lib/seo/teacherPublicProfileData";
import { cacheSeoData, SEO_TEACHER_PROFILE_REVALIDATE_SECONDS } from "@/lib/seo/cache";

function isColumnMismatchError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message ?? "") : "";
  return /column|does not exist|Could not find/i.test(message);
}

async function selectPublicTeacherRowById(teacherId: string): Promise<TeacherRow | null> {
  const supabase = getSupabaseAdmin();
  const parse = (data: unknown): TeacherRow | null =>
    data && typeof data === "object" && "id" in data ? (data as TeacherRow) : null;

  const full = await supabase
    .from(TEACHERS_PUBLIC_TABLE)
    .select(TEACHERS_LIST_SELECT)
    .eq("id", teacherId)
    .maybeSingle();
  if (!full.error) return parse(full.data);
  if (!isColumnMismatchError(full.error)) return null;

  const legacy = await supabase
    .from(TEACHERS_PUBLIC_TABLE)
    .select(TEACHERS_LIST_SELECT_LEGACY_PUBLIC)
    .eq("id", teacherId)
    .maybeSingle();
  if (!legacy.error) return parse(legacy.data);
  if (!isColumnMismatchError(legacy.error)) return null;

  const wide = await supabase.from(TEACHERS_PUBLIC_TABLE).select("*").eq("id", teacherId).maybeSingle();
  if (!wide.error) return parse(wide.data);
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
  const photoUrl =
    typeof profile.photo_url === "string" && profile.photo_url.trim() ? profile.photo_url.trim() : null;
  const { resolveTeacherPublicPhoto } = await import("@/lib/teacherPhoto");
  return { ...row, image_url: resolveTeacherPublicPhoto(photoUrl, row.image_url) };
}

const getTeacherPublicProfileBundle = cacheSeoData(async (slug: string) => {
  const seoRow = await fetchTeacherPublicSeoRowBySlug(slug);
  if (!seoRow || !isTeacherPublicProfilePageVisible(seoRow)) {
    return null;
  }

  const row = await selectPublicTeacherRowById(seoRow.id);
  if (!row) return null;
  const withPhoto = await withSafeProfilePhoto(row);
  if (!withPhoto) return null;

  let teacher = teacherRowToTeacher(withPhoto);
  try {
    const discMap = await fetchTeacherDisciplinesMap(getSupabaseAdmin(), [teacher.id]);
    const merged = mergeTeachersWithDisciplines([teacher], discMap);
    teacher = (await attachPublicTeachingZones(getSupabaseAdmin(), merged))[0] ?? merged[0] ?? teacher;
  } catch {
    // keep base teacher
  }

  const subjects = [
    teacher.discipline,
    ...(teacher.additionalDisciplines?.map((d) => d.specialite || d.disciplineId) ?? []),
    teacher.category ?? "",
  ].filter(Boolean);

  return {
    seoRow,
    teacher,
    subjects: [...new Set(subjects)],
    indexable: isTeacherPublicProfileIndexable(seoRow),
    canonical: buildTeacherPublicProfileCanonicalUrl(slug),
    slug,
  };
}, ["teacher-public-profile-bundle-v1"], { revalidate: SEO_TEACHER_PROFILE_REVALIDATE_SECONDS });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const bundle = await getTeacherPublicProfileBundle(slug);
  const canonical = buildTeacherPublicProfileCanonicalUrl(slug);

  if (!bundle) {
    return {
      title: "Professeur | Pratiqo",
      robots: teacherPublicProfileRobots(false),
      alternates: { canonical },
    };
  }

  const subject = bundle.teacher.discipline?.trim() || bundle.subjects[0] || "";
  const firstName = publicTeacherFirstName(bundle.teacher.name);
  const cityLabel = resolveTeacherSeoCityLabel(locale, {
    city: bundle.teacher.city,
    region: bundle.teacher.region,
    neighborhood: bundle.teacher.location?.neighborhood,
    teachingMode: bundle.teacher.teachingMode,
  });

  const indexable = bundle.indexable && Boolean(subject) && Boolean(cityLabel);
  const title =
    buildTeacherPublicProfileTitle({ locale, subject, firstName, cityLabel }) ??
    "Professeur | Pratiqo";
  const description =
    buildTeacherPublicProfileDescription({ locale, subject, firstName, cityLabel }) ??
    "Profil professeur sur Pratiqo.";

  return {
    title,
    description,
    alternates: { canonical },
    robots: teacherPublicProfileRobots(indexable),
    openGraph: {
      title,
      description,
      url: canonical,
      images: bundle.teacher.imageUrl
        ? [{ url: bundle.teacher.imageUrl, width: 400, height: 400 }]
        : [{ url: "/og-image.png", width: 1200, height: 630 }],
      type: "profile",
      siteName: "Pratiqo",
      locale: locale === "fr" ? "fr_CA" : locale === "es" ? "es_UY" : "en_CA",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: bundle.teacher.imageUrl ? [bundle.teacher.imageUrl] : ["/og-image.png"],
    },
  };
}

export default async function ProfesseurPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const bundle = await getTeacherPublicProfileBundle(slug);
  if (!bundle) notFound();

  const subject = bundle.teacher.discipline?.trim() || bundle.subjects[0] || "";
  const firstName = publicTeacherFirstName(bundle.teacher.name);
  const cityLabel = resolveTeacherSeoCityLabel(locale, {
    city: bundle.teacher.city,
    region: bundle.teacher.region,
    neighborhood: bundle.teacher.location?.neighborhood,
    teachingMode: bundle.teacher.teachingMode,
  });
  const h1 =
    buildTeacherPublicProfileH1({ locale, subject, firstName, cityLabel }) ??
    `Profil de ${firstName}`;

  const showStructuredData = bundle.indexable && Boolean(subject) && Boolean(cityLabel);
  const jsonLd = showStructuredData
    ? buildTeacherPublicProfileJsonLd({
        teacher: bundle.teacher,
        canonicalUrl: bundle.canonical,
        subjects: bundle.subjects,
        locale,
        slug: bundle.slug,
      })
    : null;

  return (
    <>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      ) : null}
      <TeacherProfileSeoLinks
        locale={locale}
        discipline={bundle.teacher.discipline}
        city={bundle.teacher.city}
        region={bundle.teacher.region}
      />
      <TeacherProfileClient
        id={bundle.teacher.id}
        initialTeacher={bundle.teacher}
        pageHeadline={h1}
      />
    </>
  );
}
