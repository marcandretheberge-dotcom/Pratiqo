import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QC_CITIES } from "@/lib/constants/cities";
import { getLocale } from "@/lib/i18n/server";
import { LocalTeacherDiscoveryView } from "@/components/seo/LocalTeacherDiscoveryView";
import {
  buildLocalDiscoveryCollectionJsonLd,
  resolveCityHubDiscoveryPage,
} from "@/lib/seo/localTeacherDiscoveryPages";

export function generateStaticParams() {
  return QC_CITIES.map((city) => ({ citySlug: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}): Promise<Metadata> {
  const { citySlug } = await params;
  const bundle = await resolveCityHubDiscoveryPage(citySlug);
  if (!bundle || !bundle.indexable) {
    return { title: "Tuteurs | Pratiqo" };
  }

  return {
    title: bundle.title,
    description: bundle.description,
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

export default async function CityHubTutorsPage({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}) {
  const { citySlug } = await params;
  const bundle = await resolveCityHubDiscoveryPage(citySlug);
  if (!bundle) notFound();
  if (!bundle.indexable) notFound();

  const locale = await getLocale();
  const jsonLd = buildLocalDiscoveryCollectionJsonLd(bundle);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LocalTeacherDiscoveryView bundle={bundle} locale={locale} />
    </>
  );
}
