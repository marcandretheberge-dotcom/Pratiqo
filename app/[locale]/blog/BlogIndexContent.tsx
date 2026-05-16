"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, User, ArrowRight, BookOpen } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { localeToBcp47, type Locale, type TranslationKey } from "@/lib/i18n/types";
import type { BlogPost } from "./page";
import { useState } from "react";
import { getBlogLocaleBundle } from "@/lib/seo/blogLocaleOverrides";
import { BlogPublicHeader } from "@/components/blog/BlogPublicHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { postMatchesBlogCluster, type BlogIndexClusterId } from "@/lib/seo/internalLinks";

const CLUSTER_ORDER: BlogIndexClusterId[] = ["all", "parents", "teachers", "music", "languages", "pricing"];

const CLUSTER_LABEL_KEY: Record<BlogIndexClusterId, TranslationKey> = {
  all: "seoBlogClusterAll",
  parents: "seoBlogClusterParents",
  teachers: "seoBlogClusterTeachers",
  music: "seoBlogClusterMusic",
  languages: "seoBlogClusterLanguages",
  pricing: "seoBlogClusterPricing",
};

function estimateReadTime(excerpt: string): number {
  return Math.max(2, Math.ceil(excerpt.split(" ").length / 50));
}

function formatDate(iso: string, bcp47: string): string {
  try {
    return new Date(iso).toLocaleDateString(bcp47, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

// Soft pastel category pill colours
const CATEGORY_COLOURS: Record<string, string> = {
  Musique: "bg-purple-100 text-purple-700",
  Music: "bg-purple-100 text-purple-700",
  Música: "bg-purple-100 text-purple-700",
  Langues: "bg-blue-100 text-blue-700",
  Languages: "bg-blue-100 text-blue-700",
  Idiomas: "bg-blue-100 text-blue-700",
  Mathématiques: "bg-amber-100 text-amber-700",
  Mathematics: "bg-amber-100 text-amber-700",
  Matemáticas: "bg-amber-100 text-amber-700",
  Sciences: "bg-teal-100 text-teal-700",
  Français: "bg-rose-100 text-rose-700",
  Español: "bg-orange-100 text-orange-700",
  Piano: "bg-indigo-100 text-indigo-700",
  Guitare: "bg-green-100 text-green-700",
  default: "bg-teal-500/15 text-teal-700",
};

function categoryColour(cat: string): string {
  return CATEGORY_COLOURS[cat] ?? CATEGORY_COLOURS.default;
}

function displayArticle(locale: Locale, post: BlogPost) {
  const b = getBlogLocaleBundle(post.slug, locale);
  return {
    title: b?.title ?? post.title,
    excerpt: b?.excerpt ?? post.excerpt,
  };
}

export default function BlogIndexContent({ posts }: { posts: BlogPost[] }) {
  const { t, locale } = useLocale();
  const bcp47 = localeToBcp47(locale);

  const [activeCategory, setActiveCategory] = useState("all");
  const [activeCluster, setActiveCluster] = useState<BlogIndexClusterId>("all");

  const filtered = posts.filter((p) => {
    const catOk = activeCategory === "all" || p.category === activeCategory;
    const clusterOk = postMatchesBlogCluster(p.slug, activeCluster);
    return catOk && clusterOk;
  });

  const categories = Array.from(new Set(posts.map((p) => p.category)));

  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-[100dvh] bg-[#FAFAF8]">
      <BlogPublicHeader />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="bg-[#2C2C2A] text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-[#7FE0C3]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#7FE0C3]">Blog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl">
            {t("blogTitle")}
          </h1>
          <p className="mt-3 text-white/65 text-base max-w-xl leading-relaxed">
            {t("blogSubtitle")}
          </p>
        </div>
      </header>

      {/* ── CATEGORY + AUDIENCE FILTERS ─────────────────────────────────── */}
      {posts.length > 0 ? (
        <div className="sticky top-[5.75rem] z-30 border-b border-[#E8E6DF] bg-white sm:top-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {categories.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none border-b border-[#F0EFE8]">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                    activeCategory === "all"
                      ? "bg-teal-600 text-white"
                      : "bg-[#F1EFE8] text-[#6B6760] hover:bg-[#E8E6DF]"
                  }`}
                >
                  {t("blogAllCategories")}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                      activeCategory === cat
                        ? "bg-teal-600 text-white"
                        : "bg-[#F1EFE8] text-[#6B6760] hover:bg-[#E8E6DF]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
              {CLUSTER_ORDER.map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setActiveCluster(cid)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    activeCluster === cid
                      ? "bg-[#2D7B72] text-white"
                      : "bg-[#EFF8F4] text-[#2D7B72] hover:bg-[#D5EFE6]"
                  }`}
                >
                  {t(CLUSTER_LABEL_KEY[cid])}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">

        {filtered.length === 0 ? (
          /* ── EMPTY STATE ─────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <BookOpen size={40} className="text-[#D3D1C7]" />
            <p className="text-[#6B6760] text-sm max-w-xs">
              {posts.length > 0 ? t("seoBlogClusterEmpty") : t("blogNoArticles")}
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-2xl bg-teal-600 px-6 text-sm font-semibold text-white hover:brightness-105 transition-all"
            >
              Pratiqo
            </Link>
          </div>
        ) : (
          <>
            {/* ── FEATURED ARTICLE ───────────────────────────────────────── */}
            {featured && (() => {
              const fd = displayArticle(locale, featured);
              return (
              <Link
                href={`/blog/${featured.slug}`}
                className="group mb-10 block overflow-hidden rounded-3xl border border-[#E8E6DF] bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {featured.cover_image_url && (
                  <div className="relative h-56 sm:h-72 w-full overflow-hidden">
                    <Image
                      src={featured.cover_image_url}
                      alt={fd.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${categoryColour(featured.category)}`}>
                      {featured.category}
                    </span>
                    <span className="text-xs text-[#6B6760]">
                      {estimateReadTime(fd.excerpt)} {t("blogMinRead")}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#2C2C2A] group-hover:text-teal-700 transition-colors leading-snug">
                    {fd.title}
                  </h2>
                  <p className="mt-2 text-sm text-[#6B6760] leading-relaxed line-clamp-3">
                    {fd.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-[#6B6760]">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {featured.author_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(featured.published_at, bcp47)}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 group-hover:gap-2 transition-all">
                      {t("blogReadMore")} <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
              );
            })()}

            {/* ── ARTICLE GRID ───────────────────────────────────────────── */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((post) => {
                  const d = displayArticle(locale, post);
                  return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#E8E6DF] bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    {post.cover_image_url ? (
                      <div className="relative h-44 w-full overflow-hidden">
                        <Image
                          src={post.cover_image_url}
                          alt={d.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="h-2 w-full bg-gradient-to-r from-teal-500 to-teal-700" />
                    )}
                    <div className="flex flex-col flex-1 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryColour(post.category)}`}>
                          {post.category}
                        </span>
                        <span className="text-[11px] text-[#6B6760]">
                          {estimateReadTime(d.excerpt)} {t("blogMinRead")}
                        </span>
                      </div>
                      <h3 className="font-bold text-[#2C2C2A] group-hover:text-teal-700 transition-colors leading-snug line-clamp-2">
                        {d.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-[#6B6760] leading-relaxed line-clamp-3 flex-1">
                        {d.excerpt}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B6760]">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(post.published_at, bcp47)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-teal-700 group-hover:gap-1.5 transition-all">
                          {t("blogReadMore")} <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
