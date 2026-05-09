/** LocalBusiness JSON-LD for landing SEO — server-only, no client JS. */
export function LandingOrgJsonLd() {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "EducationalOrganization"],
    name: "Pratiqo",
    url: "https://pratiqo.ca",
    logo: {
      "@type": "ImageObject",
      url: "https://pratiqo.ca/logo-email.png",
    },
    image: "https://pratiqo.ca/og-image.png",
    description:
      "La marketplace québécoise pour trouver un professeur de musique, de langue ou un tuteur. Profs vérifiés, paiements sécurisés, cours en ligne ou en présentiel.",
    priceRange: "$$",
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
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Cours particuliers — Québec, Canada & Uruguay",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Course", name: "Cours de Musique" } },
        { "@type": "Offer", itemOffered: { "@type": "Course", name: "Cours de Langue" } },
        { "@type": "Offer", itemOffered: { "@type": "Course", name: "Cours d'Arts Martiaux" } },
        { "@type": "Offer", itemOffered: { "@type": "Course", name: "Cours de Danse" } },
        { "@type": "Offer", itemOffered: { "@type": "Course", name: "Cours de Sport" } },
        { "@type": "Offer", itemOffered: { "@type": "Course", name: "Soutien Scolaire" } },
      ],
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />;
}
