import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MarketingPublicLayout } from "@/components/marketing/MarketingPublicLayout";
import { SITE_URL } from "@/lib/seo/site";
import { withLocale } from "@/lib/i18n/routing";
import { buildAlternates } from "@/lib/seo/alternates";
import { normalizeLocale } from "@/lib/i18n/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const locale = normalizeLocale(loc);
  return {
    title: "Tarifs Pratiqo | Prix simples pour élèves et professeurs",
    description:
      "Découvrez les tarifs Pratiqo : aucun abonnement obligatoire pour les élèves, plan gratuit pour les professeurs, Plan Pro à 29,99 $ CAD/mois et commission dégressive.",
    ...buildAlternates({ routeKey: "tarifs" }),
    openGraph: {
      title: "Tarifs Pratiqo | Prix pour élèves et professeurs",
      description:
        "Transparent : pas d'abonnement élève obligatoire, plan gratuit profs, Plan Pro optionnel — commissions expliquées.",
      url: `${SITE_URL}${withLocale("/tarifs", locale)}`,
      siteName: "Pratiqo",
      locale: "fr_CA",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Tarifs Pratiqo",
      description:
        "Tarifs clairs pour élèves et professeurs — commission et Plan Pro expliqués sur une seule page.",
      images: ["/og-image.png"],
    },
  };
}

export default function TarifsLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingPublicLayout className="min-h-screen bg-[#FAFAF8] text-[#2C2C2C] antialiased">
      {children}
    </MarketingPublicLayout>
  );
}
