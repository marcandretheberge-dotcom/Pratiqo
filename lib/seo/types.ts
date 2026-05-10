export interface FAQItem {
  question: string;
  answer: string;
}

export interface RelatedLink {
  href: string;
  label: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
  audience: Array<"student" | "parent" | "teacher" | "business">;
  discipline?: string;
  keywords?: string[];
  faq?: FAQItem[];
  relatedLinks?: RelatedLink[];
}

/** In-registry blog translations (FR source typically lives in Supabase). */
export interface BlogLocaleBundle {
  title: string;
  excerpt: string;
  /** Full markdown body (avoid duplicating FAQ — rendered from `faq` when present). */
  contentMarkdown: string;
  keyTakeaways: string[];
  faq: FAQItem[];
}

export interface DisciplineConfig {
  slug: string;
  name: string;
  dbCategory: string;
  dbDiscipline?: string;
  metaTitle: (cityName: string, region: string) => string;
  metaDescription: (cityName: string) => string;
  heroTitle: (cityName: string) => string;
  heroDesc: (cityName: string) => string;
  faq: FAQItem[];
}
