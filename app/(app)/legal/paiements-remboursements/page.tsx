import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title: "Paiements, remboursements et versements | Payments, Refunds and Payouts | Pratiqo",
  description:
    "Politique des paiements, remboursements et versements de Pratiqo — prix, devises, frais, retenues, rétrofacturations, taxes et liens avec les autres documents juridiques.",
  alternates: {
    canonical: "/legal/paiements-remboursements",
  },
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "portee", label: "1. Objet et portée" },
    { id: "prix-devise", label: "2. Affichage des prix et devises" },
    { id: "paiements-eleves", label: "3. Paiements des élèves" },
    { id: "versements-professeurs", label: "4. Versements aux professeurs" },
    { id: "frais-commissions", label: "5. Frais de plateforme et commissions" },
    { id: "annulations-remboursements", label: "6. Annulations et remboursements" },
    { id: "absences-retards", label: "7. Absences et retards" },
    { id: "echec-paiement", label: "8. Échecs de paiement et erreurs de paiement" },
    { id: "litiges-retrofacturations", label: "9. Litiges et rétrofacturations" },
    { id: "retenues-versements", label: "10. Retenues, ajustements et inversions de versements" },
    { id: "fraude-hors-plateforme", label: "11. Fraude, abus et paiements hors plateforme" },
    { id: "taxes", label: "12. Taxes" },
    { id: "membre-pro", label: "13. Membre Pro et abonnements" },
    { id: "yopratiqo", label: "14. YoPratiqo et produits autonomes" },
    { id: "signalement-paiement", label: "15. Signalement d'un problème de paiement" },
    { id: "autres-politiques", label: "16. Liens avec les autres politiques" },
  ],
  en: [
    { id: "scope", label: "1. Purpose and scope" },
    { id: "prices-currency", label: "2. Price display and currency" },
    { id: "student-payments", label: "3. Student payments" },
    { id: "teacher-payouts", label: "4. Teacher payouts" },
    { id: "fees-commissions", label: "5. Platform fees and commissions" },
    { id: "cancellations-refunds", label: "6. Cancellations and refunds" },
    { id: "no-shows", label: "7. No-shows and late arrivals" },
    { id: "failed-payments", label: "8. Failed payments and payment errors" },
    { id: "disputes-chargebacks", label: "9. Disputes and chargebacks" },
    { id: "payout-holds", label: "10. Payout holds, adjustments, and reversals" },
    { id: "fraud-off-platform", label: "11. Fraud, abuse, and off-platform payments" },
    { id: "taxes", label: "12. Taxes" },
    { id: "membre-pro", label: "13. Pro Member and subscriptions" },
    { id: "yopratiqo", label: "14. YoPratiqo and self-paced products" },
    { id: "payment-reporting", label: "15. Reporting a payment issue" },
    { id: "other-policies", label: "16. Relationship with other policies" },
  ],
  es: [
    { id: "alcance", label: "1. Objeto y alcance" },
    { id: "precios-moneda", label: "2. Visualización de precios y monedas" },
    { id: "pagos-estudiantes", label: "3. Pagos de los estudiantes" },
    { id: "transferencias-profesores", label: "4. Transferencias a profesores" },
    { id: "tarifas-comisiones", label: "5. Tarifas de plataforma y comisiones" },
    { id: "cancelaciones-reembolsos", label: "6. Cancelaciones y reembolsos" },
    { id: "ausencias-tardanzas", label: "7. Ausencias y tardanzas" },
    { id: "falla-pago", label: "8. Fallas de pago y errores de pago" },
    { id: "disputas-contracargos", label: "9. Disputas y contracargos" },
    { id: "retenciones-transferencias", label: "10. Retenciones, ajustes y reversiones de transferencias" },
    { id: "fraude-fuera-plataforma", label: "11. Fraude, abuso y pagos fuera de la plataforma" },
    { id: "impuestos", label: "12. Impuestos" },
    { id: "membre-pro", label: "13. Miembro Pro y suscripciones" },
    { id: "yopratiqo", label: "14. YoPratiqo y productos autónomos" },
    { id: "reporte-pagos", label: "15. Reporte de problemas de pago" },
    { id: "otras-politicas", label: "16. Relación con otras políticas" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Paiements, remboursements et versements",
  en: "Payments, Refunds and Payouts",
  es: "Pagos, reembolsos y transferencias",
};

export default async function PaiementsRemboursementsPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(
    process.cwd(),
    "content",
    "legal",
    `paiements-remboursements.${lang}.md`,
  );
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    const fallback = path.join(
      process.cwd(),
      "content",
      "legal",
      "paiements-remboursements.fr.md",
    );
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="mai 2026"
      toc={TOC[lang]}
      currentPath="/legal/paiements-remboursements"
    >
      <LegalMarkdownBody content={mdContent} />
    </LegalLayout>
  );
}
