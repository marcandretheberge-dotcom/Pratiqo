import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";
import { yopratiqoPrivacyAddendum } from "@/lib/legal/yopratiqoPrivacyAddendum";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Privacy Policy | Pratiqo",
  description:
    "Explique comment Pratiqo recueille, utilise, communique, conserve, protège et détruit les renseignements personnels. Explains how Pratiqo collects, uses, discloses, retains, protects, and destroys personal information.",
  alternates: {
    canonical: "/legal/confidentialite",
  },
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "portee", label: "1. Objet et portée" },
    { id: "responsable", label: "2. Personne responsable de la protection des renseignements personnels" },
    { id: "categories", label: "3. Catégories de renseignements personnels recueillis" },
    { id: "finalites", label: "4. Finalités de la collecte et de l'utilisation" },
    { id: "consentement", label: "5. Consentement et fondement légal" },
    { id: "mineurs", label: "6. Renseignements concernant les mineurs" },
    { id: "cookies", label: "7. Témoins, analytique et technologies similaires" },
    { id: "fournisseurs", label: "8. Prestataires tiers" },
    { id: "communication", label: "9. Communication et divulgation des renseignements personnels" },
    { id: "profils-publics", label: "10. Profils publics et avis" },
    { id: "localisation", label: "11. Localisation et confidentialité des cours en personne" },
    { id: "conservation", label: "12. Conservation et destruction" },
    { id: "securite", label: "13. Mesures de sécurité" },
    { id: "incidents", label: "14. Incidents de confidentialité" },
    { id: "evaluations", label: "15. Évaluation des facteurs relatifs à la vie privée et gouvernance" },
    { id: "droits", label: "16. Vos droits" },
    { id: "transferts", label: "17. Transferts hors Québec ou hors Canada" },
    { id: "decisions-automatisees", label: "18. Décisions automatisées, mise en correspondance, recommandations et IA" },
    { id: "marketing", label: "19. Communications marketing" },
    { id: "mineurs-securite", label: "20. Mineurs, signalements de sécurité et divulgations légales" },
    { id: "modifications", label: "21. Modifications de la politique" },
    { id: "contact", label: "22. Contact" },
  ],
  en: [
    { id: "scope", label: "1. Purpose and scope" },
    { id: "responsible", label: "2. Person responsible for the protection of personal information" },
    { id: "categories", label: "3. Categories of personal information collected" },
    { id: "purposes", label: "4. Purposes of collection and use" },
    { id: "consent", label: "5. Consent and legal basis" },
    { id: "minors", label: "6. Information about minors" },
    { id: "cookies", label: "7. Cookies, analytics, and similar technologies" },
    { id: "providers", label: "8. Third-party service providers" },
    { id: "disclosure", label: "9. Disclosure of personal information" },
    { id: "public-profiles", label: "10. Public profiles and reviews" },
    { id: "location", label: "11. Location and in-person lesson privacy" },
    { id: "retention", label: "12. Retention and destruction" },
    { id: "security", label: "13. Security safeguards" },
    { id: "incidents", label: "14. Confidentiality incidents" },
    { id: "assessments", label: "15. Privacy impact assessments and governance" },
    { id: "rights", label: "16. Your rights" },
    { id: "transfers", label: "17. Transfers outside Quebec or Canada" },
    { id: "automated-decisions", label: "18. Automated decisions, matching, recommendations, and AI" },
    { id: "marketing", label: "19. Marketing communications" },
    { id: "minors-safety", label: "20. Minors, safety reports, and legal disclosures" },
    { id: "changes", label: "21. Changes to the policy" },
    { id: "contact", label: "22. Contact" },
  ],
  es: [
    { id: "alcance", label: "1. Objeto y alcance" },
    { id: "responsable", label: "2. Persona responsable de la protección de la información personal" },
    { id: "categorias", label: "3. Categorías de información personal recopilada" },
    { id: "finalidades", label: "4. Finalidades de la recopilación y uso" },
    { id: "consentimiento", label: "5. Consentimiento y fundamento legal" },
    { id: "menores", label: "6. Información sobre menores" },
    { id: "cookies", label: "7. Cookies, analítica y tecnologías similares" },
    { id: "proveedores", label: "8. Proveedores externos" },
    { id: "divulgacion", label: "9. Comunicación y divulgación de la información personal" },
    { id: "perfiles-publicos", label: "10. Perfiles públicos y reseñas" },
    { id: "ubicacion", label: "11. Ubicación y privacidad de las clases presenciales" },
    { id: "conservacion", label: "12. Conservación y eliminación" },
    { id: "seguridad", label: "13. Medidas de seguridad" },
    { id: "incidentes", label: "14. Incidentes de confidencialidad" },
    { id: "evaluaciones", label: "15. Evaluaciones de impacto sobre la privacidad y gobernanza" },
    { id: "derechos", label: "16. Tus derechos" },
    { id: "transferencias", label: "17. Transferencias fuera de Quebec o Canadá" },
    { id: "decisiones-automatizadas", label: "18. Decisiones automatizadas, vinculación, recomendaciones e IA" },
    { id: "marketing", label: "19. Comunicaciones de marketing" },
    { id: "menores-seguridad", label: "20. Menores, reportes de seguridad y divulgaciones legales" },
    { id: "modificaciones", label: "21. Modificaciones de la política" },
    { id: "contacto", label: "22. Contacto" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Politique de confidentialité",
  en: "Privacy Policy",
  es: "Política de privacidad",
};

export default async function ConfidentialitePage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(process.cwd(), "content", "legal", `confidentialite.${lang}.md`);
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    const fallback = path.join(process.cwd(), "content", "legal", "confidentialite.fr.md");
    mdContent = fs.readFileSync(fallback, "utf8");
  }
  const addendum = yopratiqoPrivacyAddendum[lang];

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated={addendum.lastUpdated}
      toc={[...TOC[lang], { id: addendum.id, label: addendum.label }]}
      currentPath="/legal/confidentialite"
    >
      <LegalMarkdownBody content={`${mdContent}\n\n---\n\n${addendum.content}`} />
    </LegalLayout>
  );
}
