import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title: "Conditions Teacher Pro | Teacher Pro Terms | Pratiqo",
  description:
    "Conditions de l'abonnement Teacher Pro sur Pratiqo — facturation, renouvellement, annulation, remboursements, fonctionnalités, classement et droits impératifs.",
  alternates: {
    canonical: "/legal/teacher-pro",
  },
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "exploitant", label: "1. Identification de l'exploitant" },
    { id: "portee", label: "2. Portée des présentes conditions Teacher Pro" },
    { id: "nature", label: "3. Nature de Teacher Pro" },
    { id: "facturation", label: "4. Cycle de facturation" },
    { id: "renouvellement", label: "5. Renouvellement automatique" },
    { id: "annulation", label: "6. Annulation par le professeur" },
    { id: "remboursements", label: "7. Remboursements" },
    { id: "echec-paiement", label: "8. Échec de paiement et rétrogradation" },
    { id: "taxes", label: "9. Taxes" },
    { id: "modifications", label: "10. Modifications des fonctionnalités" },
    { id: "visibilite", label: "11. Visibilité, classement, badges et recherche" },
    { id: "aucune-garantie", label: "12. Aucune garantie d'élèves, réservations, revenus ou résultats" },
    { id: "promotions", label: "13. Offres promotionnelles, bêta et fondateurs" },
    { id: "admissibilite", label: "14. État du compte et admissibilité" },
    { id: "versements", label: "15. Relation avec les versements et frais de marketplace" },
    { id: "litiges", label: "16. Litiges de paiement et rétrofacturations" },
    { id: "resiliation", label: "17. Résiliation par Pratiqo" },
    { id: "donnees", label: "18. Données et confidentialité" },
    { id: "contact", label: "19. Soutien et avis formels" },
    { id: "droits-imperatifs", label: "20. Aucune renonciation aux droits impératifs" },
  ],
  en: [
    { id: "operator", label: "1. Identification of the operator" },
    { id: "scope", label: "2. Scope of these Teacher Pro Terms" },
    { id: "nature", label: "3. Nature of Teacher Pro" },
    { id: "billing", label: "4. Subscription billing cycle" },
    { id: "renewal", label: "5. Automatic renewal" },
    { id: "cancellation", label: "6. Cancellation by the teacher" },
    { id: "refunds", label: "7. Refunds" },
    { id: "failed-payments", label: "8. Failed payments and downgrade" },
    { id: "taxes", label: "9. Taxes" },
    { id: "feature-changes", label: "10. Feature changes" },
    { id: "visibility", label: "11. Visibility, ranking, badges, and search" },
    { id: "no-guarantee", label: "12. No guarantee of students, bookings, revenue, or results" },
    { id: "promotions", label: "13. Promotional, beta, and founder offers" },
    { id: "eligibility", label: "14. Account standing and eligibility" },
    { id: "payouts", label: "15. Relationship with payouts and marketplace fees" },
    { id: "disputes", label: "16. Payment disputes and chargebacks" },
    { id: "termination", label: "17. Termination by Pratiqo" },
    { id: "data", label: "18. Data and privacy" },
    { id: "contact", label: "19. Support and formal notices" },
    { id: "mandatory-rights", label: "20. No waiver of mandatory rights" },
  ],
  es: [
    { id: "operador", label: "1. Identificación del operador" },
    { id: "alcance", label: "2. Alcance de estas condiciones de Teacher Pro" },
    { id: "naturaleza", label: "3. Naturaleza de Teacher Pro" },
    { id: "facturacion", label: "4. Ciclo de facturación" },
    { id: "renovacion", label: "5. Renovación automática" },
    { id: "cancelacion", label: "6. Cancelación por parte del profesor" },
    { id: "reembolsos", label: "7. Reembolsos" },
    { id: "falla-pago", label: "8. Falla de pago y degradación" },
    { id: "impuestos", label: "9. Impuestos" },
    { id: "cambios", label: "10. Cambios en las funcionalidades" },
    { id: "visibilidad", label: "11. Visibilidad, clasificación, insignias y búsqueda" },
    { id: "sin-garantia", label: "12. Sin garantía de estudiantes, reservas, ingresos o resultados" },
    { id: "promociones", label: "13. Ofertas promocionales, beta y de fundadores" },
    { id: "elegibilidad", label: "14. Estado de la cuenta y elegibilidad" },
    { id: "pagos", label: "15. Relación con los pagos y las tarifas de la marketplace" },
    { id: "disputas", label: "16. Disputas de pago y contracargos" },
    { id: "terminacion", label: "17. Terminación por parte de Pratiqo" },
    { id: "datos", label: "18. Datos y privacidad" },
    { id: "contacto", label: "19. Soporte y avisos formales" },
    { id: "derechos-imperativos", label: "20. Sin renuncia a derechos imperativos" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Conditions Teacher Pro",
  en: "Teacher Pro Terms",
  es: "Condiciones de Teacher Pro",
};

export default async function TeacherProTermsPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(process.cwd(), "content", "legal", `teacher-pro.${lang}.md`);
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    const fallback = path.join(process.cwd(), "content", "legal", "teacher-pro.fr.md");
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="mai 2026"
      toc={TOC[lang]}
      currentPath="/legal/teacher-pro"
    >
      <LegalMarkdownBody content={mdContent} />
    </LegalLayout>
  );
}
