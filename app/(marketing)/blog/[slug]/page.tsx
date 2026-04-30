import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, User, ArrowLeft, Clock } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { RelatedTeachersWidget } from "@/components/blog/RelatedTeachersWidget";

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

// ── generateStaticParams ──────────────────────────────────────────────────────
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

// ── generateMetadata ──────────────────────────────────────────────────────────
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

  const ogImage = post.cover_image_url ?? "/og-image.png";

  return {
    title: `${post.title} | Pratiqo Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${BASE_URL}/blog/${post.slug}`,
      siteName: "Pratiqo",
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
      type: "article",
      publishedTime: post.published_at,
      authors: [post.author_name],
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

// ── Data fetching ─────────────────────────────────────────────────────────────
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr", {
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

// Per-language labels (server component — no useLocale)
const LABELS: Record<string, { backToBlog: string; publishedOn: string; writtenBy: string; minRead: string; findTutor: string; findTutorSub: string; bookNow: string }> = {
  fr: {
    backToBlog: "Retour au blog",
    publishedOn: "Publié le",
    writtenBy: "Par",
    minRead: "min de lecture",
    findTutor: "Trouvez un tuteur expert pour vous aider",
    findTutorSub: "Ces professeurs vérifiés peuvent vous aider à progresser rapidement.",
    bookNow: "Voir tous les profs",
  },
  en: {
    backToBlog: "Back to blog",
    publishedOn: "Published on",
    writtenBy: "By",
    minRead: "min read",
    findTutor: "Find an expert tutor to help you",
    findTutorSub: "These verified teachers can help you progress quickly.",
    bookNow: "See all teachers",
  },
  es: {
    backToBlog: "Volver al blog",
    publishedOn: "Publicado el",
    writtenBy: "Por",
    minRead: "min de lectura",
    findTutor: "Encontrá un tutor experto para ayudarte",
    findTutorSub: "Estos profesores verificados pueden ayudarte a progresar rápido.",
    bookNow: "Ver todos los profesores",
  },
};

// ── JSON-LD Article schema ─────────────────────────────────────────────────────
function buildArticleJsonLd(post: BlogPostFull) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
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
    articleSection: post.category,
    inLanguage: post.language === "fr" ? "fr" : post.language === "es" ? "es-UY" : "en",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) notFound();

  const labels = LABELS[post.language] ?? LABELS.fr;
  const readTime = estimateReadTime(post.content);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(post)) }}
      />

      <div className="min-h-[100dvh] bg-[#FAFAF8]">

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <div className="bg-[#2C2C2A] text-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/55 hover:text-white/90 transition-colors mb-6"
            >
              <ArrowLeft size={13} />
              {labels.backToBlog}
            </Link>

            {/* Category pill */}
            <div className="mb-4">
              <span className="rounded-full bg-[#1D9E75]/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#7FE0C3]">
                {post.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.15]">
              {post.title}
            </h1>

            {/* Meta row */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <User size={12} />
                {labels.writtenBy} {post.author_name}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {labels.publishedOn} {formatDate(post.published_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                {readTime} {labels.minRead}
              </span>
            </div>
          </div>
        </div>

        {/* ── COVER IMAGE ────────────────────────────────────────────────── */}
        {post.cover_image_url && (
          <div className="mx-auto max-w-3xl px-4 sm:px-6 -mt-1">
            <div className="relative h-56 sm:h-80 w-full overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        )}

        {/* ── ARTICLE BODY ───────────────────────────────────────────────── */}
        <article className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="prose prose-slate max-w-none
            prose-headings:font-bold prose-headings:text-[#2C2C2A]
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-[#4A4845] prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-[#1D9E75] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-strong:text-[#2C2C2A]
            prose-ul:my-4 prose-li:text-[#4A4845] prose-li:mb-1
            prose-ol:my-4
            prose-blockquote:border-l-4 prose-blockquote:border-[#1D9E75] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-[#6B6760]
            prose-code:text-[#0f6e56] prose-code:bg-[rgba(29,158,117,0.08)] prose-code:px-1 prose-code:rounded
            prose-hr:border-[#E8E6DF]
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>

        {/* ── RELATED TEACHERS WIDGET ─────────────────────────────────────── */}
        <section className="bg-white border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C2C2A] mb-2">
              {labels.findTutor}
            </h2>
            <p className="text-sm text-[#6B6760] mb-7">{labels.findTutorSub}</p>
            <RelatedTeachersWidget category={post.category} />
          </div>
        </section>

        {/* ── FOOTER BACK LINK ────────────────────────────────────────────── */}
        <div className="bg-[#FAFAF8] border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 flex items-center justify-between">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B6760] hover:text-[#2C2C2A] transition-colors"
            >
              <ArrowLeft size={14} />
              {labels.backToBlog}
            </Link>
            <Link
              href="/student/search"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#1D9E75] px-5 text-xs font-bold text-white hover:brightness-105 transition-all"
            >
              {labels.bookNow}
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
