import type { Metadata } from "next";
import React from "react";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Cours de groupe — Réserve ta place",
  description:
    "Découvre les séances collectives ouvertes sur Pratiqo : musique, langues, matières et plus. Places limitées, profils vérifiés — voir les dates et réserver quand tu es prêt.",
  alternates: {
    canonical: `${SITE_URL}/group-sessions`,
  },
  openGraph: {
    title: "Cours de groupe | Pratiqo",
    description:
      "Parcourez les séances de groupe à venir et réservez votre place avec des professeurs vérifiés.",
    url: `${SITE_URL}/group-sessions`,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cours de groupe | Pratiqo",
    description: "Séances collectives avec profs vérifiés — places et tarifs affichés clairement.",
    images: ["/og-image.png"],
  },
};

export default function GroupSessionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#FAFCFB]">
      <LandingHeader />
      <main id="main-content" className="flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
