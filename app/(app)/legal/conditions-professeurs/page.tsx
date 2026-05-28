import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title: "Conditions applicables aux professeurs | Teacher Terms | Pratiqo",
  description:
    "Conditions applicables aux professeurs Pratiqo — independent teacher status, profile accuracy, conduct, payouts, safety, and marketplace rules.",
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "exploitant", label: "1. Identification de l'exploitant" },
    { id: "portee", label: "2. Portée des présentes conditions" },
    { id: "independant", label: "3. Statut de travailleur autonome" },
    { id: "aucune-garantie", label: "4. Aucune garantie" },
    { id: "profil", label: "5. Exactitude du profil" },
    { id: "verifications", label: "6. Vérifications et signaux" },
    { id: "obligations", label: "7. Obligations du professeur" },
    { id: "mineurs", label: "8. Mineurs et cours à domicile" },
    { id: "hors-plateforme", label: "9. Communication hors plateforme" },
    { id: "annulations", label: "10. Annulations et remboursements" },
    { id: "versements", label: "11. Versements et rétrofacturations" },
    { id: "taxes", label: "12. Taxes et conformité" },
    { id: "propriete", label: "13. Propriété intellectuelle" },
    { id: "confidentialite", label: "14. Confidentialité" },
    { id: "classement", label: "15. Avis, badges et classement" },
    { id: "application", label: "16. Suspension et application" },
    { id: "teacher-pro", label: "17. Relation avec Teacher Pro" },
    { id: "contact", label: "18. Contact" },
  ],
  en: [
    { id: "operator", label: "1. Identification of the operator" },
    { id: "scope", label: "2. Scope of these Teacher Terms" },
    { id: "independent", label: "3. Independent contractor status" },
    { id: "no-guarantee", label: "4. No guarantee" },
    { id: "profile", label: "5. Teacher profile accuracy" },
    { id: "verification", label: "6. Verification and trust signals" },
    { id: "obligations", label: "7. Teacher obligations" },
    { id: "minors", label: "8. Minors and home lessons" },
    { id: "off-platform", label: "9. Off-platform conduct" },
    { id: "cancellations", label: "10. Cancellations and refunds" },
    { id: "payouts", label: "11. Payouts and chargebacks" },
    { id: "taxes", label: "12. Taxes and compliance" },
    { id: "ip", label: "13. Intellectual property" },
    { id: "privacy", label: "14. Confidentiality and privacy" },
    { id: "ranking", label: "15. Reviews, badges, and ranking" },
    { id: "enforcement", label: "16. Suspension and enforcement" },
    { id: "teacher-pro", label: "17. Relationship with Teacher Pro" },
    { id: "contact", label: "18. Contact" },
  ],
  es: [
    { id: "operador", label: "1. Identificación del operador" },
    { id: "alcance", label: "2. Alcance de estas condiciones" },
    { id: "independiente", label: "3. Estado de trabajador independiente" },
    { id: "sin-garantia", label: "4. Sin garantía" },
    { id: "perfil", label: "5. Exactitud del perfil" },
    { id: "verificacion", label: "6. Verificaciones y señales" },
    { id: "obligaciones", label: "7. Obligaciones del profesor" },
    { id: "menores", label: "8. Personas menores y clases a domicilio" },
    { id: "fuera-plataforma", label: "9. Conducta fuera de la plataforma" },
    { id: "cancelaciones", label: "10. Cancelaciones y reembolsos" },
    { id: "pagos", label: "11. Pagos y contracargos" },
    { id: "impuestos", label: "12. Impuestos y cumplimiento" },
    { id: "propiedad", label: "13. Propiedad intelectual" },
    { id: "privacidad", label: "14. Confidencialidad y privacidad" },
    { id: "clasificacion", label: "15. Reseñas, insignias y clasificación" },
    { id: "aplicacion", label: "16. Suspensión y aplicación" },
    { id: "teacher-pro", label: "17. Relación con Teacher Pro" },
    { id: "contacto", label: "18. Contacto" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Conditions applicables aux professeurs",
  en: "Teacher Terms",
  es: "Condiciones aplicables a los profesores",
};

export default async function ConditionsProfesseursPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(process.cwd(), "content", "legal", `conditions-professeurs.${lang}.md`);
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    const fallback = path.join(process.cwd(), "content", "legal", "conditions-professeurs.fr.md");
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="mai 2026"
      toc={TOC[lang]}
      currentPath="/legal/conditions-professeurs"
    >
      <LegalMarkdownBody content={mdContent} />
    </LegalLayout>
  );
}
