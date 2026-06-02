import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title: "Accessibilité | Accessibility | Pratiqo",
  description:
    "Déclaration d'accessibilité de Pratiqo, avec un contact pour signaler les obstacles d'accessibilité.",
  alternates: {
    canonical: "/legal/accessibilite",
  },
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "objectif", label: "1. Objectif" },
    { id: "amelioration", label: "2. Amélioration progressive" },
    { id: "signaler", label: "3. Signaler un obstacle" },
    { id: "reponse", label: "4. Réponse" },
    { id: "contact", label: "5. Contact" },
  ],
  en: [
    { id: "objective", label: "1. Objective" },
    { id: "improvement", label: "2. Progressive improvement" },
    { id: "reporting", label: "3. Reporting a barrier" },
    { id: "response", label: "4. Response" },
    { id: "contact", label: "5. Contact" },
  ],
  es: [
    { id: "objetivo", label: "1. Objetivo" },
    { id: "mejora", label: "2. Mejora progresiva" },
    { id: "reportar", label: "3. Reportar una barrera" },
    { id: "respuesta", label: "4. Respuesta" },
    { id: "contacto", label: "5. Contacto" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Déclaration d'accessibilité",
  en: "Accessibility Statement",
  es: "Declaración de accesibilidad",
};

export default async function AccessibilityStatementPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(process.cwd(), "content", "legal", `accessibilite.${lang}.md`);
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    const fallback = path.join(process.cwd(), "content", "legal", "accessibilite.fr.md");
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="juin 2026"
      toc={TOC[lang]}
      currentPath="/legal/accessibilite"
    >
      <LegalMarkdownBody content={mdContent} />
    </LegalLayout>
  );
}
