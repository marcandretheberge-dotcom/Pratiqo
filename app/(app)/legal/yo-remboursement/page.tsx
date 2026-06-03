/**
 * /legal/yo-remboursement — YoPratiqo refund + 12-month access + EU 14d + minors policy.
 *
 * Mirrors the structure of /legal/cgu/page.tsx (cookie-based locale, fs.readFileSync,
 * markdown body via LegalMarkdownBody), with the layout JSX inlined locally.
 *
 * The layout is inlined rather than reusing <LegalLayout> because LegalLayout's
 * `currentPath` prop is typed as a strict union of the three core legal docs
 * (cgu / confidentialite / annulation). Widening that type is out of scope for
 * this prompt, and faking it via a cast would either highlight the wrong link
 * in the footer or hide the YoPratiqo policy entirely. Inlining the small
 * layout keeps this page self-contained without modifying any unrelated file.
 *
 * Anchor IDs declared in TOC are passed into LegalMarkdownBody so links and
 * rendered heading ids remain stable across locales.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { LegalMarkdownBody } from "../../../../components/LegalMarkdownBody";
import { normalizeLocale, type Locale } from "../../../../lib/i18n/types";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Politique de remboursement | Refund Policy | Pratiqo",
  description:
    "YoPratiqo — accès 12 mois, garantie satisfaction 30 jours, droit de rétractation UE et règles applicables aux mineurs.",
};

// Same id list across locales — the shared anchor scheme matches cgu/page.tsx
// (id is the link target; LegalMarkdownBody does not auto-slug headings).
const SECTION_IDS = [
  "what-you-buy",
  "access",
  "guarantee",
  "eu-withdrawal",
  "minors",
  "exclusions",
  "statutory",
  "contact",
] as const;

const TOC: Record<Locale, { id: string; label: string }[]> = {
  fr: [
    { id: "what-you-buy",   label: "1. Ce que tu achètes" },
    { id: "access",         label: "2. Accès 12 mois — défini" },
    { id: "guarantee",      label: "3. Garantie satisfaction 30 jours" },
    { id: "eu-withdrawal",  label: "4. Droit de rétractation (UE, 14 jours)" },
    { id: "minors",         label: "5. Mineurs" },
    { id: "exclusions",     label: "6. Exclusions" },
    { id: "statutory",      label: "7. Garanties légales préservées" },
    { id: "contact",        label: "8. Contact" },
  ],
  en: [
    { id: "what-you-buy",   label: "1. What you are buying" },
    { id: "access",         label: "2. 12-month access — defined" },
    { id: "guarantee",      label: "3. 30-day satisfaction guarantee" },
    { id: "eu-withdrawal",  label: "4. EU right of withdrawal (14 days)" },
    { id: "minors",         label: "5. Minors" },
    { id: "exclusions",     label: "6. Exclusions" },
    { id: "statutory",      label: "7. Statutory warranties preserved" },
    { id: "contact",        label: "8. Contact" },
  ],
  es: [
    { id: "what-you-buy",   label: "1. Qué estás comprando" },
    { id: "access",         label: "2. Acceso de 12 meses — definición" },
    { id: "guarantee",      label: "3. Garantía de satisfacción de 30 días" },
    { id: "eu-withdrawal",  label: "4. Derecho de desistimiento UE (14 días)" },
    { id: "minors",         label: "5. Personas menores de edad" },
    { id: "exclusions",     label: "6. Exclusiones" },
    { id: "statutory",      label: "7. Garantías legales preservadas" },
    { id: "contact",        label: "8. Contacto" },
  ],
};

const TITLES: Record<Locale, string> = {
  fr: "YoPratiqo — Remboursement et accès 12 mois",
  en: "YoPratiqo — Refund and 12-Month Access",
  es: "YoPratiqo — Reembolso y acceso de 12 meses",
};

const LAST_UPDATED_LABEL: Record<Locale, string> = {
  fr: "Dernière mise à jour",
  en: "Last updated",
  es: "Última actualización",
};

const SUMMARY_LABEL: Record<Locale, string> = {
  fr: "Sommaire",
  en: "Contents",
  es: "Contenido",
};

const FOOTER_OTHER: Record<Locale, string> = {
  fr: "Autres documents légaux",
  en: "Other legal documents",
  es: "Otros documentos legales",
};

const FOOTER_LINKS: Record<Locale, { href: string; label: string }[]> = {
  fr: [
    { href: "/legal/cgu",              label: "Conditions Générales d'Utilisation" },
    { href: "/legal/confidentialite",  label: "Politique de confidentialité" },
    { href: "/legal/annulation",       label: "Politique d'annulation" },
  ],
  en: [
    { href: "/legal/cgu",              label: "Terms of Service" },
    { href: "/legal/confidentialite",  label: "Privacy Policy" },
    { href: "/legal/annulation",       label: "Cancellation Policy" },
  ],
  es: [
    { href: "/legal/cgu",              label: "Términos de Servicio" },
    { href: "/legal/confidentialite",  label: "Política de Privacidad" },
    { href: "/legal/annulation",       label: "Política de Cancelación" },
  ],
};

const PRELIM_NOTICE: Record<Locale, string> = {
  fr: "Ce document est un modèle préliminaire. Faites-le réviser par un avocat avant le lancement.",
  en: "This document is a preliminary template. Have it reviewed by a lawyer before launch.",
  es: "Este documento es un modelo preliminar. Pídelo revisar por un abogado antes del lanzamiento.",
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

  const toc = TOC[lang];
  const title = TITLES[lang];
  const lastUpdated = "mai 2026";
  const links = FOOTER_LINKS[lang];

  return (
    <div className="max-w-[720px] mx-auto pb-16">
      <div
        className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950 mb-8"
        role="note"
      >
        {PRELIM_NOTICE[lang]}
      </div>

      <header className="mb-10">
        <p className="ds-label text-[var(--p-text-subtle)] mb-2">Pratiqo</p>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-[var(--p-text)] leading-tight border-l-4 border-teal-500 pl-4">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--p-text-muted)]">
          {LAST_UPDATED_LABEL[lang]} : {lastUpdated}
        </p>
      </header>

      {toc.length > 0 && (
        <nav
          aria-label={SUMMARY_LABEL[lang]}
          className="mb-10 rounded-2xl border border-[var(--p-border-light)] bg-white p-5 shadow-sm"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">
            {SUMMARY_LABEL[lang]}
          </p>
          <ol className="space-y-2 text-sm">
            {toc.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-teal-700 hover:underline font-medium"
                >
                  {i + 1}. {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <article className="space-y-10 text-[15px] leading-relaxed text-[var(--p-text)]">
        <LegalMarkdownBody content={mdContent} headingIds={SECTION_IDS} />
      </article>

      <footer className="mt-14 pt-8 border-t border-[var(--p-border-light)]">
        <p className="text-[12px] text-[var(--p-text-muted)] mb-2">
          {FOOTER_OTHER[lang]}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[var(--p-text-muted)] hover:text-teal-700 hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </footer>

      {/* SECTION_IDS is retained as a stable anchor list for this standalone layout. */}
      <div hidden aria-hidden data-section-ids={SECTION_IDS.join(",")} />
    </div>
  );
}
