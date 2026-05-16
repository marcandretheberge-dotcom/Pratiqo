import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPostMeta } from "@/lib/seo/types";
import type { Locale } from "@/lib/i18n/types";
import { getBlogLocaleBundle } from "@/lib/seo/blogLocaleOverrides";
import { withLocale } from "@/lib/i18n/routing";

function audienceLabel(locale: Locale, audience: BlogPostMeta["audience"][number]): string {
  const map: Record<string, Record<Locale, string>> = {
    parent: { fr: "Parents", en: "Parents", es: "Padres y madres" },
    student: { fr: "Élèves", en: "Students", es: "Estudiantes" },
    teacher: { fr: "Professeurs", en: "Teachers", es: "Profesores" },
    business: { fr: "Organisations", en: "Organizations", es: "Organizaciones" },
  };
  return map[audience]?.[locale] ?? audience;
}

export function BlogRelatedArticles({
  posts,
  locale,
  title,
  readLabel,
}: {
  posts: BlogPostMeta[];
  locale: Locale;
  title: string;
  readLabel: string;
}) {
  if (!posts.length) return null;

  return (
    <section className="border-t border-[#E8E6DF] bg-[#FAFAF8] py-12 sm:py-16" aria-labelledby="related-articles-heading">
      <div className="mx-auto max-w-[820px] px-4 sm:px-6">
        <h2 id="related-articles-heading" className="text-xl font-bold tracking-tight text-[#2C2C2A] sm:text-2xl">
          {title}
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {posts.map((p) => {
            const bundle = getBlogLocaleBundle(p.slug, locale);
            const displayTitle = bundle?.title ?? p.title;
            const desc = bundle?.excerpt ?? p.description;
            const primaryAudience = p.audience[0] ?? "student";
            return (
              <li key={p.slug}>
                <Link
                  href={withLocale(`/blog/${p.slug}`, locale)}
                  className="group flex h-full flex-col rounded-3xl border border-[#E8E6DE] bg-white p-6 shadow-sm transition-all hover:border-[#C5E7DB] hover:shadow-md"
                >
                  <span className="inline-flex w-fit rounded-full bg-[#EFF8F4] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0F6E56]">
                    {audienceLabel(locale, primaryAudience)}
                  </span>
                  <p className="mt-4 text-base font-bold leading-snug text-[#2C2C2A] group-hover:text-[#0F6E56]">{displayTitle}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B6760] line-clamp-3">{desc}</p>
                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-[#0F6E56]">
                    {readLabel}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
