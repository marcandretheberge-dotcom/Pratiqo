import type { Metadata } from "next";

import { DEFAULT_OG_IMAGE, SITE_NAME, type SeoLocale } from "@/lib/seo/config";
import { getCanonicalUrl } from "@/lib/seo/urls";
import { INDEX_FOLLOW, NOINDEX_NOFOLLOW } from "@/lib/seo/robots";

function toOpenGraphLocale(locale: SeoLocale = "fr"): string {
  if (locale === "en") return "en_CA";
  if (locale === "es") return "es_UY";
  return "fr_CA";
}

export function buildOpenGraphMetadata(input: {
  title: string;
  description: string;
  pathname: string;
  locale?: SeoLocale;
  image?: string;
  type?: "website" | "profile" | "article";
}): Metadata["openGraph"] {
  const image = input.image ?? DEFAULT_OG_IMAGE;
  return {
    title: input.title,
    description: input.description,
    url: getCanonicalUrl(input.pathname),
    siteName: SITE_NAME,
    locale: toOpenGraphLocale(input.locale),
    type: input.type ?? "website",
    images: [{ url: image, width: image === DEFAULT_OG_IMAGE ? 1200 : 400, height: image === DEFAULT_OG_IMAGE ? 630 : 400 }],
  };
}

export function buildLocalizedAlternates(input: {
  canonicalPathname: string;
  languages?: Partial<Record<SeoLocale | "x-default", string>>;
}): NonNullable<Metadata["alternates"]> {
  const languages = input.languages
    ? Object.fromEntries(
        Object.entries(input.languages).map(([locale, path]) => [locale, getCanonicalUrl(path)]),
      )
    : undefined;

  return {
    canonical: getCanonicalUrl(input.canonicalPathname),
    ...(languages ? { languages } : {}),
  };
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  pathname: string;
  locale?: SeoLocale;
  robots?: Metadata["robots"];
  image?: string;
  type?: "website" | "profile" | "article";
}): Metadata {
  const image = input.image ?? DEFAULT_OG_IMAGE;
  return {
    title: input.title,
    description: input.description,
    alternates: buildLocalizedAlternates({ canonicalPathname: input.pathname }),
    robots: input.robots ?? INDEX_FOLLOW,
    openGraph: buildOpenGraphMetadata({
      title: input.title,
      description: input.description,
      pathname: input.pathname,
      locale: input.locale,
      image,
      type: input.type,
    }),
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

export function buildNoIndexMetadata(title = "Pratiqo"): Metadata {
  return {
    title,
    robots: NOINDEX_NOFOLLOW,
  };
}

export function buildTeacherProfileMetadata(input: {
  teacherName: string;
  mainDiscipline: string;
  slug: string;
  description: string;
  locale?: SeoLocale;
  image?: string | null;
  indexable: boolean;
}): Metadata {
  const title = `${input.teacherName} | Cours de ${input.mainDiscipline} | Pratiqo`;
  return buildPageMetadata({
    title,
    description: input.description,
    pathname: `/professeurs/${input.slug}`,
    locale: input.locale,
    image: input.image ?? undefined,
    type: "profile",
    robots: input.indexable ? INDEX_FOLLOW : NOINDEX_NOFOLLOW,
  });
}

export function buildDisciplineMetadata(input: {
  discipline: string;
  slug: string;
  description?: string;
  locale?: SeoLocale;
  indexable?: boolean;
}): Metadata {
  return buildPageMetadata({
    title: `Cours de ${input.discipline} | Professeurs privés au Québec et en ligne | Pratiqo`,
    description:
      input.description ??
      `Trouvez un professeur de ${input.discipline} avec Pratiqo. Comparez les profils disponibles au Québec ou en ligne.`,
    pathname: `/cours/${input.slug}`,
    locale: input.locale,
    robots: input.indexable === false ? NOINDEX_NOFOLLOW : INDEX_FOLLOW,
  });
}

export function buildCityDisciplineMetadata(input: {
  discipline: string;
  disciplineSlug: string;
  city: string;
  citySlug: string;
  description?: string;
  locale?: SeoLocale;
  indexable?: boolean;
}): Metadata {
  return buildPageMetadata({
    title: `Cours de ${input.discipline} à ${input.city} | Professeurs locaux et en ligne | Pratiqo`,
    description:
      input.description ??
      `Trouvez un professeur de ${input.discipline} à ${input.city} avec Pratiqo. Comparez les profils locaux et en ligne.`,
    pathname: `/cours/${input.disciplineSlug}/${input.citySlug}`,
    locale: input.locale,
    robots: input.indexable === false ? NOINDEX_NOFOLLOW : INDEX_FOLLOW,
  });
}
