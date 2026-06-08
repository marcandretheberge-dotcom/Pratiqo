/**
 * /legal/yo-remboursement - YoPratiqo refund + 12-month access + EU 14d + minors policy.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale, type Locale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Politique de remboursement | Refund Policy | Pratiqo",
  description:
    "YoPratiqo — accès 12 mois, garantie satisfaction 30 jours, droit de rétractation UE et règles applicables aux mineurs.",
  alternates: {
    canonical: "/legal/yo-remboursement",
  },
};

const SECTION_IDS = [
  "what-you-buy",
  "access",
  "guarantee",
  "eu-withdrawal",
  "minors",
  "exclusions",
  "privacy",
  "statutory",
  "contact",
] as const;

const TOC: Record<Locale, { id: string; label: string }[]> = {
  fr: [
    { id: "what-you-buy", label: "1. Ce que vous achetez" },
    { id: "access", label: "2. Accès 12 mois — définition" },
    { id: "guarantee", label: "3. Garantie satisfaction 30 jours" },
    { id: "eu-withdrawal", label: "4. Droit de rétractation UE" },
    { id: "minors", label: "5. Mineurs" },
    { id: "exclusions", label: "6. Exclusions" },
    { id: "privacy", label: "7. Données de progression et vie privée" },
    { id: "statutory", label: "8. Garanties légales préservées" },
    { id: "contact", label: "9. Contact" },
  ],
  en: [
    { id: "what-you-buy", label: "1. What you are buying" },
    { id: "access", label: "2. 12-month access — defined" },
    { id: "guarantee", label: "3. 30-day satisfaction guarantee" },
    { id: "eu-withdrawal", label: "4. EU right of withdrawal" },
    { id: "minors", label: "5. Minors" },
    { id: "exclusions", label: "6. Exclusions" },
    { id: "privacy", label: "7. Progress data and privacy" },
    { id: "statutory", label: "8. Statutory warranties preserved" },
    { id: "contact", label: "9. Contact" },
  ],
  es: [
    { id: "what-you-buy", label: "1. Qué estás comprando" },
    { id: "access", label: "2. Acceso de 12 meses — definición" },
    { id: "guarantee", label: "3. Garantía de satisfacción de 30 días" },
    { id: "eu-withdrawal", label: "4. Derecho de desistimiento UE" },
    { id: "minors", label: "5. Personas menores de edad" },
    { id: "exclusions", label: "6. Exclusiones" },
    { id: "privacy", label: "7. Datos de progreso y privacidad" },
    { id: "statutory", label: "8. Garantías legales preservadas" },
    { id: "contact", label: "9. Contacto" },
  ],
};

const TITLES: Record<Locale, string> = {
  fr: "YoPratiqo — Remboursement et accès 12 mois",
  en: "YoPratiqo — Refund and 12-Month Access",
  es: "YoPratiqo — Reembolso y acceso de 12 meses",
};

export default async function YoRemboursementPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(process.cwd(), "content", "legal", `yo-refund.${lang}.md`);
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    const fallback = path.join(process.cwd(), "content", "legal", "yo-refund.fr.md");
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="juin 2026"
      toc={TOC[lang]}
      currentPath="/legal/yo-remboursement"
    >
      <LegalMarkdownBody content={mdContent} headingIds={SECTION_IDS} />
    </LegalLayout>
  );
}
