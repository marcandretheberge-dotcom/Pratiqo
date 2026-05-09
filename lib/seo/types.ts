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
