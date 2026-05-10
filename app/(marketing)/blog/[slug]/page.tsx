import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, User, ArrowLeft, Clock } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { RelatedTeachersWidget } from "@/components/blog/RelatedTeachersWidget";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { getRelatedPosts, getBlogPostMeta } from "@/lib/seo/blogPosts";
import { getBlogLocaleBundle, getKeyTakeawaysForArticle } from "@/lib/seo/blogLocaleOverrides";
import { resolveBlogArticleMarkdown, resolveArticleFaqItems } from "@/lib/seo/blogArticleResolve";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";
import type { BlogPostMeta } from "@/lib/seo/types";
import { BlogPublicHeader } from "@/components/blog/BlogPublicHeader";
import { BlogKeyTakeawaysBox } from "@/components/blog/BlogKeyTakeawaysBox";
import { BlogFormatDecisionCards } from "@/components/blog/BlogFormatDecisionCards";
import { BlogFaqAccordion } from "@/components/blog/BlogFaqAccordion";
import { BlogRelatedArticles } from "@/components/blog/BlogRelatedArticles";
import { BlogArticleHeroChips } from "@/components/blog/BlogArticleHeroChips";
import { BlogArticleClosingCta } from "@/components/blog/BlogArticleClosingCta";
import { BlogArticleMarkdownBody } from "@/components/blog/BlogArticleMarkdownBody";
import { MarketingResourceBlock } from "@/components/seo/MarketingResourceBlock";
import { getBlogContinuationLinks } from "@/lib/seo/internalLinks";
import type { TranslationKey } from "@/lib/i18n/types";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = "https://pratiqo.ca";

type BlogPostFull = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  language: string;
  published_at: string;
  author_name: string;
};

export async function generateStaticParams() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString());
    return (data ?? []).map((row: { slug: string }) => ({ slug: row.slug }));
  } catch {
    return [];
  }
}

async function fetchPost(slug: string): Promise<BlogPostFull | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, content, excerpt, cover_image_url, category, language, published_at, author_name")
      .eq("slug", slug)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;
    return data as BlogPostFull;
  } catch {
    return null;
  }
}

function formatDate(iso: string, locale: Locale): string {
  const bcp = locale === "fr" ? "fr-CA" : locale === "es" ? "es-UY" : "en-CA";
  try {
    return new Date(iso).toLocaleDateString(bcp, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function estimateReadTime(content: string): number {
  return Math.max(2, Math.ceil(content.split(" ").length / 200));
}

const AUDIENCE_DICT: Record<NonNullable<BlogPostMeta["audience"]>[number], TranslationKey> = {
  parent: "blogAudienceParent",
  student: "blogAudienceStudent",
  teacher: "blogAudienceTeacher",
  business: "blogAudienceBusiness",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) {
    return { title: "Article introuvable | Pratiqo Blog" };
  }
  const locale = await getLocale();
  const bundle = getBlogLocaleBundle(slug, locale);
  const title = bundle?.title ?? post.title;
  const description = bundle?.excerpt ?? post.excerpt;

  const ogImage = post.cover_image_url ?? "/og-image.png";

  return {
    title: `${title} | Pratiqo Blog`,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/blog/${post.slug}`,
      siteName: "Pratiqo",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: "article",
      publishedTime: post.published_at,
      authors: [post.author_name],
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

function buildArticleJsonLd(post: BlogPostFull, displayTitle: string, displayDesc: string, locale: Locale) {
  const lang =
    locale === "fr" ? "fr-CA" : locale === "es" ? "es-UY" : "en-CA";
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: displayTitle,
    description: displayDesc,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      "@type": "Person",
      name: post.author_name,
    },
    publisher: {
      "@type": "Organization",
      name: "Pratiqo",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo-email.png` },
    },
    image: post.cover_image_url ?? `${BASE_URL}/og-image.png`,
    url: `${BASE_URL}/blog/${post.slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${post.slug}` },
    articleSection: post.category,
    inLanguage: lang,
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const bundle = getBlogLocaleBundle(slug, locale);

  const title = bundle?.title ?? post.title;
  const excerpt = bundle?.excerpt ?? post.excerpt;
  const markdownBody = resolveBlogArticleMarkdown(slug, locale, post.content);
  const faqItems = resolveArticleFaqItems(slug, locale);
  const meta = getBlogPostMeta(slug);
  const takeaways = getKeyTakeawaysForArticle(slug, locale);
  const relatedMeta = getRelatedPosts(slug, post.category);
  const showDecisionCards = slug === "tuteur-en-ligne-ou-a-domicile";
  const teacherFacing = meta?.audience?.includes("teacher") ?? false;
  const showTeacherChip =
    Boolean(meta?.audience?.includes("teacher")) || Boolean(meta?.audience?.includes("parent"));

  const primaryAudience = meta?.audience?.[0];
  const audienceBadge =
    primaryAudience && AUDIENCE_DICT[primaryAudience]
      ? dict[AUDIENCE_DICT[primaryAudience]]
      : post.category;

  const showTranslationNote = Boolean(!bundle && locale !== "fr" && post.language === "fr");

  const readTime = estimateReadTime(bundle?.contentMarkdown ?? post.content);

  const jsonLd = buildArticleJsonLd(post, title, excerpt, locale);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbSchema
        items={[
          { name: dict.navHome, href: "/" },
          { name: dict.blogBreadcrumbBlog, href: "/blog" },
          { name: title.slice(0, 72), href: `/blog/${post.slug}` },
        ]}
      />
      {faqItems.length > 0 ? <FAQSchema items={faqItems} /> : null}

      <BlogPublicHeader />

      <div className="min-h-[100dvh] bg-[#FAFAF8]">
        <div className="bg-[#2C2C2A] text-white">
          <div className="mx-auto max-w-[820px] px-4 py-10 sm:px-6 sm:py-14">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/55 transition-colors hover:text-white/90 mb-6"
            >
              <ArrowLeft size={13} />
              {dict.blogBackToBlog}
            </Link>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-600/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#7FE0C3]">
                {audienceBadge}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/75">
                {post.category}
              </span>
            </div>

            <h1 className="text-balance text-2xl font-extrabold tracking-tight leading-[1.15] sm:text-3xl lg:text-[2.1rem]">
              {title}
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/75 sm:text-base">{excerpt}</p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <User size={12} aria-hidden />
                {dict.blogWrittenBy} {post.author_name}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12} aria-hidden />
                {dict.blogPublishedOn} {formatDate(post.published_at, locale)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} aria-hidden />
                {readTime} {dict.blogMinRead}
              </span>
            </div>

            <BlogArticleHeroChips showTeacherChip={showTeacherChip} />
          </div>
        </div>

        {showTranslationNote ? (
          <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
            {dict.blogTranslationNote}
          </div>
        ) : null}

        {post.cover_image_url ? (
          <div className="mx-auto max-w-[820px] px-4 sm:px-6">
            <div className="relative -mt-2 h-56 w-full overflow-hidden rounded-3xl shadow-lg sm:h-80">
              <Image
                src={post.cover_image_url}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 820px) 100vw, 820px"
                priority
              />
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-[820px] px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
          <BlogKeyTakeawaysBox items={takeaways} />

          {showDecisionCards ? <BlogFormatDecisionCards /> : null}

          <article className="max-w-none pb-4 pt-2">
            <BlogArticleMarkdownBody markdown={markdownBody} />
          </article>

          <BlogFaqAccordion items={faqItems} />

          <MarketingResourceBlock
            id="blog-continue-reading"
            className="mt-8"
            title={dict.seoContinueReadingTitle}
            links={getBlogContinuationLinks(slug, locale)}
          />
        </div>

        <BlogRelatedArticles
          posts={relatedMeta}
          locale={locale}
          title={dict.blogRelatedArticles}
          readLabel={dict.blogReadArticle}
        />

        <section className="border-t border-[#E8E6DF] bg-white">
          <div className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-xl font-bold text-[#2C2C2A] sm:text-2xl">{dict.blogRecommendedTeachers}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6B6760]">{dict.blogRecommendedTeachersSubtitle}</p>
            <div className="mt-8">
              <RelatedTeachersWidget category={post.category} />
            </div>
          </div>
        </section>

        <BlogArticleClosingCta teacherFacing={teacherFacing} />

        <div className="border-t border-[#E8E6DF] bg-[#FAFAF8]">
          <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B6760] transition-colors hover:text-[#2C2C2A]"
            >
              <ArrowLeft size={14} aria-hidden />
              {dict.blogBackToBlog}
            </Link>
            <Link
              href="/student/search"
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#0F6E56] px-6 text-xs font-bold text-white transition-colors hover:bg-[#0c5a46]"
            >
              {dict.blogSeeAllTeachers}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
