import type { Metadata } from "next";
import { getPublishedResourceArticles } from "@/lib/seo/resourceArticles";
import { SITE_URL } from "@/lib/seo/site";
import RessourcesIndexContent from "./RessourcesIndexContent";

export const revalidate = 3600;

const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Ressources Pratiqo — Guides pour choisir un professeur privé",
  description:
    "Guides pratiques en français pour choisir un professeur privé au Québec : critères, format en ligne ou local, et liens vers les profils réels sur Pratiqo.",
  alternates: { canonical: `${BASE_URL}/ressources` },
  openGraph: {
    title: "Ressources Pratiqo — Guides professeurs privés",
    description: "Guides utiles pour parents et élèves qui cherchent un professeur local ou en ligne.",
    url: `${BASE_URL}/ressources`,
    siteName: "Pratiqo",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RessourcesIndexPage() {
  const articles = getPublishedResourceArticles();
  return <RessourcesIndexContent articles={articles} />;
}
