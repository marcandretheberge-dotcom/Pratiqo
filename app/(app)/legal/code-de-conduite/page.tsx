import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title: "Code de conduite | Code of Conduct | Pratiqo",
  description:
    "Code de conduite Pratiqo — portée, conduite respectueuse, limites professionnelles, mineurs, sécurité en ligne et en personne, intégrité académique, paiements, signalement, application, révision.",
  alternates: {
    canonical: "/legal/code-de-conduite",
  },
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "portee", label: "1. Objet et portée" },
    { id: "respect", label: "2. Conduite respectueuse" },
    { id: "professionnalisme", label: "3. Limites professionnelles" },
    { id: "mineurs", label: "4. Mineurs et personnes vulnérables" },
    { id: "cours-presentiels", label: "5. Cours en personne et à domicile sécuritaires" },
    { id: "en-ligne", label: "6. Sécurité en ligne" },
    { id: "integrite-academique", label: "7. Intégrité académique" },
    { id: "paiements", label: "8. Paiements et sollicitation hors plateforme" },
    { id: "avis-profils", label: "9. Avis, profils et contenus de la plateforme" },
    { id: "signalement", label: "10. Signalement" },
    { id: "application", label: "11. Application et mesures" },
    { id: "revision", label: "12. Demande de révision" },
    { id: "autres-politiques", label: "13. Liens avec les autres politiques" },
  ],
  en: [
    { id: "scope", label: "1. Purpose and scope" },
    { id: "respect", label: "2. Respectful conduct" },
    { id: "boundaries", label: "3. Professional boundaries" },
    { id: "minors", label: "4. Minors and vulnerable users" },
    { id: "in-person", label: "5. Safe in-person and home lessons" },
    { id: "online-safety", label: "6. Online safety" },
    { id: "academic-integrity", label: "7. Academic integrity" },
    { id: "payments", label: "8. Payments and off-platform solicitation" },
    { id: "reviews", label: "9. Reviews, profiles, and platform content" },
    { id: "reporting", label: "10. Reporting" },
    { id: "enforcement", label: "11. Enforcement" },
    { id: "appeals", label: "12. Appeals and review" },
    { id: "other-policies", label: "13. Relationship with other policies" },
  ],
  es: [
    { id: "alcance", label: "1. Objeto y alcance" },
    { id: "respeto", label: "2. Conducta respetuosa" },
    { id: "limites", label: "3. Límites profesionales" },
    { id: "menores", label: "4. Personas menores y usuarios vulnerables" },
    { id: "presenciales", label: "5. Clases presenciales y a domicilio seguras" },
    { id: "en-linea", label: "6. Seguridad en línea" },
    { id: "integridad-academica", label: "7. Integridad académica" },
    { id: "pagos", label: "8. Pagos y solicitudes fuera de la plataforma" },
    { id: "resenas", label: "9. Reseñas, perfiles y contenido de la plataforma" },
    { id: "reporte", label: "10. Reporte" },
    { id: "aplicacion", label: "11. Aplicación y medidas" },
    { id: "apelaciones", label: "12. Apelaciones y revisión" },
    { id: "otras-politicas", label: "13. Relación con otras políticas" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Code de conduite",
  en: "Code of Conduct",
  es: "Código de conducta",
};

export default async function CodeDeConduitePage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(
    process.cwd(),
    "content",
    "legal",
    `code-de-conduite.${lang}.md`,
  );
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    // Fallback to French if a per-locale file is missing — keeps the route
    // available even if a translation is added later than its peers.
    const fallback = path.join(
      process.cwd(),
      "content",
      "legal",
      "code-de-conduite.fr.md",
    );
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="mai 2026"
      toc={TOC[lang]}
      currentPath="/legal/code-de-conduite"
    >
      <LegalMarkdownBody content={mdContent} />
    </LegalLayout>
  );
}
