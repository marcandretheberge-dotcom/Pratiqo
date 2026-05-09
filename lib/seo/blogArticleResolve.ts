import type { Locale } from "@/lib/i18n/types";
import { getBlogPostFaq } from "@/lib/seo/blogPosts";
import { getBlogLocaleBundle } from "@/lib/seo/blogLocaleOverrides";
import { stripEmbeddedFaqMarkdown, stripTutorFormatComparisonFromFr } from "@/lib/seo/blogMarkdownPrep";
import type { FAQItem } from "@/lib/seo/types";

export function resolveBlogArticleMarkdown(slug: string, locale: Locale, dbContent: string): string {
  const bundle = getBlogLocaleBundle(slug, locale);
  if (bundle) {
    return bundle.contentMarkdown;
  }

  let md = dbContent;
  const faqFromRegistry = getBlogPostFaq(slug);
  if (slug === "tuteur-en-ligne-ou-a-domicile" && locale === "fr") {
    md = stripTutorFormatComparisonFromFr(md);
  }
  if (faqFromRegistry?.length) {
    md = stripEmbeddedFaqMarkdown(md);
  }
  return md;
}

export function resolveArticleFaqItems(slug: string, locale: Locale): FAQItem[] {
  const bundle = getBlogLocaleBundle(slug, locale);
  if (bundle?.faq?.length) return bundle.faq;
  return getBlogPostFaq(slug) ?? [];
}
