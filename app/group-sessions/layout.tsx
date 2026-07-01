import type { Metadata } from "next";
import React from "react";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { SITE_URL } from "@/lib/seo/site";
import { isGroupSessionsMarketplaceIndexable } from "@/lib/groupSessionsLaunch";

const checkoutLive = isGroupSessionsMarketplaceIndexable();

export const metadata: Metadata = {
  title: checkoutLive ? "Cours de groupe — Réserve ta place" : "Cours de groupe — Bientôt disponible",
  description: checkoutLive
    ? "Découvre les séances collectives ouvertes sur Pratiqo : musique, langues, matières et plus. Places limitées, profils vérifiés — voir les dates et réserver quand tu es prêt."
    : "Les cours de groupe arrivent bientôt sur Pratiqo. Cette page n'est pas encore indexée : la réservation en ligne n'est pas disponible pour le lancement.",
  alternates: {
    canonical: `${SITE_URL}/group-sessions`,
  },
  ...(checkoutLive
    ? {}
    : {
        robots: { index: false, follow: false },
      }),
  openGraph: {
    title: checkoutLive ? "Cours de groupe | Pratiqo" : "Cours de groupe — Bientôt | Pratiqo",
    description: checkoutLive
      ? "Parcourez les séances de groupe à venir et réservez votre place avec des professeurs vérifiés."
      : "Les séances collectives avec professeurs vérifiés arrivent bientôt sur Pratiqo.",
    url: `${SITE_URL}/group-sessions`,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: checkoutLive ? "Cours de groupe | Pratiqo" : "Cours de groupe — Bientôt | Pratiqo",
    description: checkoutLive
      ? "Séances collectives avec profs vérifiés — places et tarifs affichés clairement."
      : "Réservation en ligne bientôt disponible — page non indexée pour le lancement.",
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
