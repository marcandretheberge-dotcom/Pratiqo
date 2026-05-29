import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { SITE_URL } from "@/lib/seo/site";
import { LandingOrgJsonLd } from "@/components/marketing/LandingOrgJsonLd";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingSkipLink } from "@/components/marketing/LandingSkipLink";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { LandingHeroStatic } from "@/components/marketing/LandingHeroStatic";
import { LandingAuthGate } from "@/components/marketing/LandingAuthGate";
import { LandingPageClient } from "./LandingPageClient";

// Homepage metadata. Lives here (not on the root layout) so child routes do
// not silently inherit `alternates.canonical: SITE_URL` and end up
// canonicalising auth-only or public pages back to the homepage. See
// app/layout.tsx for the rationale and the per-page canonical convention.
export const metadata: Metadata = {
  title: "Pratiqo — Trouve un professeur ou un tuteur près de chez toi",
  description:
    "Pratiqo est la marketplace québécoise et canadienne pour trouver un professeur de musique, de langues ou un tuteur scolaire local. Profs vérifiés, paiements sécurisés, cours en ligne ou en présentiel.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Pratiqo — Trouve ton prof idéal au Québec et au Canada",
    description:
      "Marketplace de cours particuliers — musique, langues, tutorat scolaire — avec des professeurs locaux vérifiés près de chez toi.",
    url: SITE_URL,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pratiqo — Cours particuliers près de chez toi",
    description:
      "Trouve un professeur ou un tuteur local au Québec et au Canada. Musique, langues, tutorat scolaire.",
    images: ["/og-image.png"],
  },
};

export default async function LandingPage() {
  const locale = await getLocale();
  return (
    <LandingAuthGate>
      <div className="relative flex min-h-[100dvh] flex-col bg-[#FAFCFB]">
        <LandingOrgJsonLd />
        <LandingHeader />
        <LandingSkipLink locale={locale} />
        <main id="main-content">
          <LandingPageClient>
            <LandingHeroStatic locale={locale} />
          </LandingPageClient>
        </main>
        <LandingFooter />
      </div>
    </LandingAuthGate>
  );
}
