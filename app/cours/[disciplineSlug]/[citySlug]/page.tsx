import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DISCIPLINE_CITY_PAIRS } from "@/lib/seo/disciplines";
import { getLocale } from "@/lib/i18n/server";
import { LocalTeacherDiscoveryView } from "@/components/seo/LocalTeacherDiscoveryView";
import {
  buildLocalDiscoveryCollectionJsonLd,
  resolveSubjectCityDiscoveryPage,
} from "@/lib/seo/localTeacherDiscoveryPages";
import { serializeJsonLd } from "@/lib/seo/jsonLd";

export function generateStaticParams() {
  return DISCIPLINE_CITY_PAIRS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ disciplineSlug: string; citySlug: string }>;
}): Promise<Metadata> {
  const { disciplineSlug, citySlug } = await params;
  const bundle = await resolveSubjectCityDiscoveryPage(disciplineSlug, citySlug);
  if (!bundle) {
    return { title: "Cours particuliers | Pratiqo", robots: { index: false, follow: true } };
  }

  return {
    title: { absolute: bundle.title },
    description: bundle.description,
    robots: { index: bundle.indexable, follow: true },
    keywords: [
      `cours ${bundle.discipline!.name.toLowerCase()} ${bundle.city.name}`,
      `professeur ${bundle.discipline!.name.toLowerCase()} ${bundle.city.name}`,
      `professeur ${bundle.discipline!.name.toLowerCase()} ${bundle.city.region}`,
    ],
    openGraph: {
      title: bundle.title,
      description: bundle.description,
      url: bundle.canonicalUrl,
      siteName: "Pratiqo",
      locale: "fr_CA",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: bundle.title,
      description: bundle.description,
      images: ["/og-image.png"],
    },
    alternates: { canonical: bundle.canonicalUrl },
  };
}

export default async function DisciplineCityPage({
  params,
}: {
  params: Promise<{ disciplineSlug: string; citySlug: string }>;
}) {
  const { disciplineSlug, citySlug } = await params;
  const bundle = await resolveSubjectCityDiscoveryPage(disciplineSlug, citySlug);
  if (!bundle) notFound();

  const locale = await getLocale();
  const jsonLd = buildLocalDiscoveryCollectionJsonLd(bundle);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <LocalTeacherDiscoveryView bundle={bundle} locale={locale} />
    </>
  );
}
