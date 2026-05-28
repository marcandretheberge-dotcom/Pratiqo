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
    "Code de conduite Pratiqo — respect, communication sécuritaire, mineurs, harcèlement, paiements hors plateforme, signalement.",
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "respect",       label: "1. Respect et conduite appropriée" },
    { id: "communication", label: "2. Communication sécuritaire" },
    { id: "mineurs",       label: "3. Mineurs et cours à domicile" },
    { id: "harcelement",   label: "4. Pas de harcèlement ni de discrimination" },
    { id: "paiements",     label: "5. Aucune sollicitation de paiement hors plateforme" },
    { id: "signalement",   label: "6. Signalement et application" },
    { id: "contact",       label: "7. Contact" },
  ],
  en: [
    { id: "respect",       label: "1. Respect and appropriate conduct" },
    { id: "communication", label: "2. Safe communication" },
    { id: "minors",        label: "3. Minors and home lessons" },
    { id: "harassment",    label: "4. No harassment or discrimination" },
    { id: "payments",      label: "5. No off-platform payment solicitation" },
    { id: "reporting",     label: "6. Reporting and enforcement" },
    { id: "contact",       label: "7. Contact" },
  ],
  es: [
    { id: "respeto",       label: "1. Respeto y conducta apropiada" },
    { id: "comunicacion",  label: "2. Comunicación segura" },
    { id: "menores",       label: "3. Personas menores y clases a domicilio" },
    { id: "acoso",         label: "4. Sin acoso ni discriminación" },
    { id: "pagos",         label: "5. Sin solicitud de pago fuera de la plataforma" },
    { id: "reporte",       label: "6. Reporte y aplicación" },
    { id: "contacto",      label: "7. Contacto" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Code de conduite — Pratiqo",
  en: "Code of Conduct — Pratiqo",
  es: "Código de conducta — Pratiqo",
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
