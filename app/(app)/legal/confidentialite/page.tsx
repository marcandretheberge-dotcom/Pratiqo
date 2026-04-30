import type { Metadata } from "next";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalLayout } from "../../../../components/LegalLayout";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Privacy Policy | Pratiqo",
  description: "Politique de confidentialité de Pratiqo — Privacy Policy.",
};

const TOC: Record<"fr" | "en" | "es", { id: string; label: string }[]> = {
  fr: [
    { id: "introduction",       label: "1. Introduction" },
    { id: "donnees-collectees", label: "2. Données collectées" },
    { id: "utilisation",        label: "3. Utilisation des données" },
    { id: "partage",            label: "4. Partage des données" },
    { id: "geolocalisation",    label: "5. Géolocalisation" },
    { id: "cookies",            label: "6. Cookies" },
    { id: "conservation",       label: "7. Conservation des données" },
    { id: "droits",             label: "8. Vos droits (Loi 25)" },
    { id: "securite",           label: "9. Sécurité" },
    { id: "mineurs",            label: "10. Mineurs" },
    { id: "modifications",      label: "11. Modifications" },
    { id: "contact",            label: "12. Contact" },
  ],
  en: [
    { id: "introduction",       label: "1. Introduction" },
    { id: "data-collected",     label: "2. Data Collected" },
    { id: "use-of-data",        label: "3. Use of Data" },
    { id: "data-sharing",       label: "4. Data Sharing" },
    { id: "geolocation",        label: "5. Geolocation" },
    { id: "cookies",            label: "6. Cookies" },
    { id: "data-retention",     label: "7. Data Retention" },
    { id: "your-rights",        label: "8. Your Rights" },
    { id: "security",           label: "9. Security" },
    { id: "minors",             label: "10. Minors" },
    { id: "modifications",      label: "11. Modifications" },
    { id: "contact",            label: "12. Contact" },
  ],
  es: [
    { id: "introduccion",       label: "1. Introducción" },
    { id: "datos-recopilados",  label: "2. Datos recopilados" },
    { id: "uso-de-datos",       label: "3. Uso de los datos" },
    { id: "compartir-datos",    label: "4. Compartir datos" },
    { id: "geolocalizacion",    label: "5. Geolocalización" },
    { id: "cookies",            label: "6. Cookies" },
    { id: "retencion-datos",    label: "7. Retención de datos" },
    { id: "tus-derechos",       label: "8. Tus derechos" },
    { id: "seguridad",          label: "9. Seguridad" },
    { id: "menores",            label: "10. Menores" },
    { id: "modificaciones",     label: "11. Modificaciones" },
    { id: "contacto",           label: "12. Contacto" },
  ],
};

const TITLES: Record<"fr" | "en" | "es", string> = {
  fr: "Politique de confidentialité — Pratiqo",
  en: "Privacy Policy — Pratiqo",
  es: "Política de Privacidad — Pratiqo",
};

export default async function ConfidentialitePage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pratiqo-locale")?.value;
  const lang = normalizeLocale(localeCookie);

  const mdPath = path.join(process.cwd(), "content", "legal", `privacy.${lang}.md`);
  let mdContent: string;
  try {
    mdContent = fs.readFileSync(mdPath, "utf8");
  } catch {
    const fallback = path.join(process.cwd(), "content", "legal", "privacy.fr.md");
    mdContent = fs.readFileSync(fallback, "utf8");
  }

  return (
    <LegalLayout
      title={TITLES[lang]}
      lastUpdated="avril 2026"
      toc={TOC[lang]}
      currentPath="/legal/confidentialite"
    >
      <LegalMarkdownBody content={mdContent} />
    </LegalLayout>
  );
}
