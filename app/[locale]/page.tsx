import type { Metadata } from "next";
import { normalizeLocale, type Locale } from "@/lib/i18n/types";
import { LandingOrgJsonLd } from "@/components/marketing/LandingOrgJsonLd";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingSkipLink } from "@/components/marketing/LandingSkipLink";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { LandingHeroStatic } from "@/components/marketing/LandingHeroStatic";
import { LandingAuthGate } from "@/components/marketing/LandingAuthGate";
import { LandingQuebecSeoLinks } from "@/components/marketing/LandingQuebecSeoLinks";
import { LandingPageClient } from "../LandingPageClient";
import { SITE_URL } from "@/lib/seo/site";
import { buildAlternates } from "@/lib/seo/alternates";
import { withLocale } from "@/lib/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const locale = normalizeLocale(loc);
  const base = buildAlternates({ routeKey: "home" });
  const ogUrl = `${SITE_URL}${withLocale("/", locale)}`;

  if (locale === "fr") {
    const description =
      "Trouvez un professeur local pour des cours de musique, langues, tutorat, francisation et aide aux devoirs au Québec. " +
      "Profils vérifiés, réservation simple et paiements sécurisés.";
    return {
      title: { absolute: "Pratiqo | Trouvez un prof près de chez vous au Québec" },
      description,
      ...base,
      openGraph: {
        title: "Pratiqo | Trouvez un prof près de chez vous au Québec",
        description,
        url: ogUrl,
        siteName: "Pratiqo",
        locale: "fr_CA",
        type: "website",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Pratiqo | Trouvez un prof près de chez vous au Québec",
        description,
        images: ["/og-image.png"],
      },
    };
  }

  if (locale === "en") {
    const description =
      "Find a local teacher for music, languages, tutoring, francisation, and homework help in Québec. " +
      "Verified profiles, simple booking, and secure payments.";
    return {
      title: { absolute: "Pratiqo | Find a teacher near you in Québec" },
      description,
      ...base,
      openGraph: {
        title: "Pratiqo | Find a teacher near you in Québec",
        description,
        url: ogUrl,
        siteName: "Pratiqo",
        locale: "en_CA",
        type: "website",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Pratiqo | Find a teacher near you in Québec",
        description,
        images: ["/og-image.png"],
      },
    };
  }

  const description =
    "Encuentra un profesor local para música, idiomas, tutorías y tareas en Québec. Perfiles verificados y pagos seguros.";
  return {
    title: { absolute: "Pratiqo | Encuentra un profesor cerca de ti en Québec" },
    description,
    ...base,
    openGraph: {
      title: "Pratiqo | Encuentra un profesor cerca de ti en Québec",
      description,
      url: ogUrl,
      siteName: "Pratiqo",
      locale: "es_UY",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Pratiqo | Encuentra un profesor cerca de ti en Québec",
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale: Locale = normalizeLocale(loc);
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
        <LandingQuebecSeoLinks locale={locale} />
        <LandingFooter />
      </div>
    </LandingAuthGate>
  );
}
