import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import BlogIndexContent from "./BlogIndexContent";
import { SITE_URL } from "@/lib/seo/site";
import { buildAlternates } from "@/lib/seo/alternates";

export const revalidate = 3600; // ISR — revalidate every hour

const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Blog Pratiqo — Conseils, guides et ressources pour apprendre mieux",
  description:
    "Découvrez nos articles sur l'apprentissage de la musique, des langues et des matières scolaires. " +
    "Conseils de professeurs vérifiés, guides pratiques et ressources pour étudiants et parents.",
  keywords: [
    "blog tutorat québec",
    "conseils apprentissage musique",
    "guide cours particuliers",
    "astuces révision examens",
    "apprendre piano adulte",
    "cours de français montréal",
    "tutor blog canada",
    "blog clases particulares uruguay",
  ],
  openGraph: {
    title: "Blog Pratiqo — Apprendre mieux avec les meilleurs professeurs",
    description:
      "Guides, conseils et ressources pour progresser en musique, langues et matières scolaires.",
    url: `${BASE_URL}/blog`,
    siteName: "Pratiqo",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog Pratiqo — Guides et ressources",
    description:
      "Articles pour progresser en musique, langues et matières scolaires avec des professeurs vérifiés.",
    images: ["/og-image.png"],
  },
  ...buildAlternates({ routeKey: "blog" }),
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  language: string;
  published_at: string;
  author_name: string;
};

async function fetchPublishedPosts(): Promise<BlogPost[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_image_url, category, language, published_at, author_name")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    if (error || !data) return [];
    return data as BlogPost[];
  } catch {
    return [];
  }
}

export default async function BlogIndexPage() {
  const posts = await fetchPublishedPosts();

  return <BlogIndexContent posts={posts} />;
}
