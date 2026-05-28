import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";

// ── Static metadata (canonical FR title for SEO) ──────────────────────────────
export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation | Terms of Service | Pratiqo",
  description: "Conditions générales d'utilisation de Pratiqo — Terms of Service.",
};

// ── Per-locale TOC labels ─────────────────────────────────────────────────────
const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "presentation",        label: "1. Présentation de Pratiqo" },
    { id: "definitions",         label: "2. Définitions" },
    { id: "inscription",         label: "3. Inscription et compte utilisateur" },
    { id: "services",            label: "4. Services offerts" },
    { id: "statut-prof",         label: "4bis. Statut des professeurs" },
    { id: "frais",               label: "5. Frais et commissions" },
    { id: "paiements",           label: "6. Paiements et remboursements" },
    { id: "yopratiqo",           label: "6bis. YoPratiqo — Cours autonomes" },
    { id: "domicile",            label: "7. Cours à domicile" },
    { id: "conduite",            label: "8. Conduite des utilisateurs" },
    { id: "limitation",          label: "10. Limitation de responsabilité" },
    { id: "droit",               label: "12. Droit applicable" },
    { id: "contact",             label: "14. Contact" },
  ],
  en: [
    { id: "about",               label: "1. About Pratiqo" },
    { id: "definitions",         label: "2. Definitions" },
    { id: "account",             label: "3. Account Registration" },
    { id: "services",            label: "4. Services Offered" },
    { id: "teacher-status",      label: "4a. Teacher Status" },
    { id: "fees",                label: "5. Fees and Commissions" },
    { id: "payments",            label: "6. Payments and Refunds" },
    { id: "yopratiqo",           label: "6a. YoPratiqo — Self-paced courses" },
    { id: "at-home",             label: "7. At-Home Lessons" },
    { id: "conduct",             label: "8. User Conduct" },
    { id: "liability",           label: "10. Limitation of Liability" },
    { id: "governing-law",       label: "12. Governing Law" },
    { id: "contact",             label: "14. Contact" },
  ],
  es: [
    { id: "sobre",               label: "1. Sobre Pratiqo" },
    { id: "definiciones",        label: "2. Definiciones" },
    { id: "cuenta",              label: "3. Registro de cuenta" },
    { id: "servicios",           label: "4. Servicios ofrecidos" },
    { id: "estado-profesor",     label: "4a. Estado del profesor" },
    { id: "tarifas",             label: "5. Tarifas y comisiones" },
    { id: "pagos",               label: "6. Pagos y reembolsos" },
    { id: "yopratiqo",           label: "6a. YoPratiqo — Cursos autónomos" },
    { id: "domicilio",           label: "7. Clases a domicilio" },
    { id: "conducta",            label: "8. Conducta de los usuarios" },
    { id: "responsabilidad",     label: "10. Limitación de responsabilidad" },
    { id: "ley-aplicable",       label: "12. Ley aplicable" },
    { id: "contacto",            label: "14. Contacto" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Conditions Générales d'Utilisation — Pratiqo",
  en: "Terms of Service — Pratiqo",
  es: "Términos de Servicio — Pratiqo",
};

// ── Server Component ─────────────────────────────────────────────────────────
export default async function CguPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(process.cwd(), "content", "legal", `terms.${lang}.md`);
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    // Fallback to French if file not found
    const fallback = path.join(process.cwd(), "content", "legal", "terms.fr.md");
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="avril 2026"
      toc={TOC[lang]}
      currentPath="/legal/cgu"
    >
      <LegalMarkdownBody content={mdContent} />
    </LegalLayout>
  );
}
