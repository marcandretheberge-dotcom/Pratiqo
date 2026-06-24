import { SITE_URL } from "@/lib/seo/site";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Conservative homepage JSON-LD — Organization + WebSite only (no Course/Offer catalog). */
export function LandingOrgJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "Pratiqo",
        legalName: "Cours Pratiqo Inc.",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo-email.png`,
        },
        image: `${SITE_URL}/og-image.png`,
        description:
          "La marketplace québécoise pour trouver un professeur de musique, de langue ou un tuteur. Profs vérifiés, paiements sécurisés, cours en ligne ou en présentiel.",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Saint-Georges",
          addressRegion: "QC",
          addressCountry: "CA",
          postalCode: "G5Y",
        },
        areaServed: [
          {
            "@type": "AdministrativeArea",
            name: "Québec",
            containedInPlace: { "@type": "Country", name: "Canada" },
          },
          {
            "@type": "Country",
            name: "Uruguay",
            sameAs: "https://en.wikipedia.org/wiki/Uruguay",
          },
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          availableLanguage: ["French", "English", "Spanish"],
        },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: "Pratiqo",
        inLanguage: ["fr-CA", "en-CA", "es"],
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
