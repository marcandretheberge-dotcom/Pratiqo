import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogArticleMarkdownBody } from "@/components/blog/BlogArticleMarkdownBody";
import { BlogFaqAccordion } from "@/components/blog/BlogFaqAccordion";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { MarketingResourceBlock } from "@/components/seo/MarketingResourceBlock";
import { loadResourceArticleMarkdown } from "@/lib/seo/resourceArticleContent";
import {
  getPublishedResourceArticles,
  getResourceArticleBySlug,
  getResourceArticleCanonical,
} from "@/lib/seo/resourceArticles";
import { SITE_URL } from "@/lib/seo/site";

export const revalidate = 3600;
export const dynamicParams = false;

const BASE_URL = SITE_URL;

export function generateStaticParams() {
  return getPublishedResourceArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticleBySlug(slug);
  if (!article) {
    return {
      title: "Guide introuvable | Pratiqo",
      robots: { index: false, follow: false },
      alternates: { canonical: `${BASE_URL}/ressources` },
    };
  }

  const canonical = getResourceArticleCanonical(slug);
  return {
    title: `${article.title} | Pratiqo`,
    description: article.description,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonical,
      siteName: "Pratiqo",
      type: "article",
      publishedTime: article.publishedAt,
      locale: "fr_CA",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: ["/og-image.png"],
    },
  };
}

function buildArticleJsonLd(article: NonNullable<ReturnType<typeof getResourceArticleBySlug>>) {
  const url = getResourceArticleCanonical(article.slug);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        inLanguage: "fr-CA",
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        publisher: {
          "@type": "Organization",
          name: "Pratiqo",
          url: BASE_URL,
          logo: { "@type": "ImageObject", url: `${BASE_URL}/logo-email.png` },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${BASE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Ressources", item: `${BASE_URL}/ressources` },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
}

export default async function ResourceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getResourceArticleBySlug(slug);
  if (!article) notFound();

  const markdown = loadResourceArticleMarkdown(article.markdownFile);
  const relatedLinks = article.relatedPaths.map((href) => ({
    href,
    label:
      href === "/trouver-un-prof"
        ? "Voir les professeurs disponibles"
        : href === "/devenir-professeur"
          ? "Devenir professeur sur Pratiqo"
          : href.startsWith("/cours/")
            ? `Page ${href.replace("/cours/", "").replace(/\//g, " · ")}`
            : href.replace(/^\//, ""),
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(article)) }} />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: "/" },
          { name: "Ressources", href: "/ressources" },
          { name: article.title, href: `/ressources/${article.slug}` },
        ]}
      />
      {article.faq.length > 0 ? <FAQSchema items={article.faq} /> : null}

      <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
        <LandingHeader />
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
          <Link href="/ressources" className="text-sm font-semibold text-teal-700 hover:underline">
            ← Tous les guides
          </Link>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">{article.category}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#2C2C2A] text-balance">{article.title}</h1>
          <p className="mt-4 text-base text-[#6B6A65] leading-relaxed">{article.description}</p>

          <div className="mt-10 prose prose-neutral max-w-none">
            <BlogArticleMarkdownBody markdown={markdown} />
          </div>

          {article.faq.length > 0 ? (
            <section className="mt-14">
              <h2 className="text-2xl font-bold text-[#2C2C2A] mb-4">Foire aux questions</h2>
              <BlogFaqAccordion items={article.faq} />
            </section>
          ) : null}

          <section className="mt-12">
            <MarketingResourceBlock
              id={`resource-${article.slug}-related`}
              title="Continuer sur Pratiqo"
              links={relatedLinks}
              className="border-[#E8E6DF] bg-white"
            />
          </section>
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
