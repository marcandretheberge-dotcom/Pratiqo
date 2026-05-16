import type { Metadata } from "next";
import DevenirEnseignantContent from "./DevenirEnseignantContent";

import { SITE_URL } from "@/lib/seo/site";
import { buildAlternates } from "@/lib/seo/alternates";
import { ROUTING_DEFAULT_LOCALE, withLocale } from "@/lib/i18n/routing";

const BASE_URL = SITE_URL;

// ── Metadata ──────────────────────────────────────────────────────────────────
//
// Primary title in French (default locale). EN/ES equivalents appear in
// keywords and the JSON-LD so Google can serve all three audiences.

export const metadata: Metadata = {
  title: "Devenez Enseignant ou Tuteur — Partagez votre passion",
  description:
    "Rejoignez Pratiqo et enseignez la musique, les langues ou les matières scolaires. " +
    "Fixez vos propres tarifs, gérez votre horaire et touchez des élèves partout au Québec et au-delà.",
  keywords: [
    // FR
    "devenir enseignant Pratiqo",
    "devenir tuteur en ligne",
    "enseigner musique Québec",
    "offrir cours particuliers",
    // EN
    "become a teacher Canada",
    "become a tutor online",
    "teach music lessons Quebec",
    "freelance tutor platform",
    // ES (UY/MX)
    "ser maestro particular",
    "enseñar música Uruguay",
    "convertirse en profesor particular",
    "plataforma para profesores",
  ],
  openGraph: {
    title: "Devenez Enseignant ou Tuteur | Pratiqo",
    description:
      "Fixez vos tarifs, gérez votre horaire, enseignez ce que vous aimez. " +
      "Pratiqo gère les paiements et la visibilité.",
    url: `${BASE_URL}${withLocale("/devenir-enseignant", ROUTING_DEFAULT_LOCALE)}`,
    siteName: "Pratiqo",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Devenez enseignant ou tuteur | Pratiqo",
    description:
      "Enseignez musique, langues ou matières scolaires — tarifs et horaires à votre façon.",
    images: ["/og-image.png"],
  },
  ...buildAlternates({ routeKey: "become-teacher" }),
};

// ── JSON-LD: JobPosting ───────────────────────────────────────────────────────
//
// Tells Google this page targets people looking for a teaching/tutoring
// opportunity. `FREELANCE` employment type accurately reflects Pratiqo's
// autonomous-worker model.

const jobPostingJsonLd = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Enseignant / Tuteur particulier (Freelance)",
  description:
    "Rejoignez Pratiqo pour enseigner la musique, les langues ou les matières académiques. " +
    "Fixez vos propres tarifs et horaires. Paiements automatiques via Stripe.",
  datePosted: new Date().toISOString().split("T")[0],
  validThrough: "2027-12-31",
  employmentType: "FREELANCE",
  hiringOrganization: {
    "@type": "Organization",
    name: "Pratiqo",
    sameAs: BASE_URL,
    logo: `${BASE_URL}/logo-email.png`,
  },
  jobLocation: [
    {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressRegion: "QC",
        addressCountry: "CA",
      },
    },
    {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "UY",
      },
    },
  ],
  jobLocationType: "TELECOMMUTE",
  applicantLocationRequirements: [
    { "@type": "Country", name: "Canada" },
    { "@type": "Country", name: "Uruguay" },
  ],
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "CAD",
    value: {
      "@type": "QuantitativeValue",
      minValue: 25,
      maxValue: 150,
      unitText: "HOUR",
    },
  },
  skills: ["Musique", "Langues", "Mathématiques", "Piano", "Guitare", "Français", "Anglais"],
  responsibilities:
    "Créer et publier un profil, définir ses disponibilités et tarifs, enseigner à des élèves via Pratiqo.",
  qualifications: "Passion pour l'enseignement. Expérience dans la discipline enseignée.",
  industry: "Education",
  directApply: true,
  url: `${BASE_URL}${withLocale("/devenir-enseignant", ROUTING_DEFAULT_LOCALE)}`,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevenirEnseignantPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
      />
      <DevenirEnseignantContent />
    </>
  );
}
