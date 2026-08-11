import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Professeurs et tuteurs — Annuaire des profils",
  description:
    "Parcourez les profils publics des professeurs et tuteurs sur Pratiqo : disciplines, tarifs indicatifs et choisissez qui vous accompagne.",
  alternates: {
    canonical: `${SITE_URL}/teacher/profile`,
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Professeurs et tuteurs | Pratiqo",
    description:
      "Liste des profils publics : musique, langues, soutien scolaire et plus. Réservez quand vous êtes prêt.",
    url: `${SITE_URL}/teacher/profile`,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Professeurs et tuteurs | Pratiqo",
    description:
      "Annuaire des profils publics Pratiqo — trouvez un prof ou un tuteur vérifié pour votre apprentissage.",
    images: ["/og-image.png"],
  },
};

export default function TeacherProfileSegmentLayout({ children }: { children: ReactNode }) {
  return children;
}
