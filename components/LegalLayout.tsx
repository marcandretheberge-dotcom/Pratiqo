"use client";

import React from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { useLocale } from "@/lib/locale-context";
import { LegalMarkdownBody } from "./LegalMarkdownBody";
import { PratiqoLogo } from "./PratiqoLogo";

export type LegalTocItem = { id: string; label: string };

export type LegalPath =
  | "/legal/cgu"
  | "/legal/confidentialite"
  | "/legal/annulation"
  | "/legal/code-de-conduite"
  | "/legal/conditions-professeurs"
  | "/legal/membre-pro"
  | "/legal/paiements-remboursements"
  | "/legal/yo-remboursement"
  | "/legal/accessibilite";

const UI_COPY = {
  fr: {
    eyebrow: "Documents légaux",
    status: "Document de référence",
    summary: "Sommaire",
    lastUpdated: "Dernière mise à jour",
    intro:
      "Retrouvez ici les règles applicables à l'utilisation de Pratiqo, de ses services de marketplace et de ses produits d'apprentissage autonomes.",
    noticeTitle: "À lire",
    noticeBody:
      "Ces documents sont rédigés pour être clairs et opérationnels. Certaines sections liées à de nouveaux produits ou marchés peuvent demeurer sujettes à validation juridique avant activation commerciale.",
    otherDocs: "Autres documents légaux",
    teacherTerms: "Conditions professeurs",
    payments: "Paiements et remboursements",
    proMember: "Membre Pro",
    yoRefund: "YoPratiqo - Remboursement",
    accessibility: "Accessibilité",
  },
  en: {
    eyebrow: "Legal documents",
    status: "Reference document",
    summary: "Contents",
    lastUpdated: "Last updated",
    intro:
      "Find the rules that apply to Pratiqo, its marketplace services, and its self-paced learning products.",
    noticeTitle: "Please note",
    noticeBody:
      "These documents are written to be clear and operational. Some sections related to new products or markets may remain subject to legal review before commercial activation.",
    otherDocs: "Other legal documents",
    teacherTerms: "Teacher Terms",
    payments: "Payments & Refunds",
    proMember: "Pro Member",
    yoRefund: "YoPratiqo - Refunds",
    accessibility: "Accessibility",
  },
  es: {
    eyebrow: "Documentos legales",
    status: "Documento de referencia",
    summary: "Contenido",
    lastUpdated: "Última actualización",
    intro:
      "Consulta las reglas aplicables a Pratiqo, sus servicios de marketplace y sus productos de aprendizaje autónomo.",
    noticeTitle: "Nota",
    noticeBody:
      "Estos documentos están redactados para ser claros y operativos. Algunas secciones relacionadas con nuevos productos o mercados pueden seguir sujetas a revisión legal antes de su activación comercial.",
    otherDocs: "Otros documentos legales",
    teacherTerms: "Condiciones profesores",
    payments: "Pagos y reembolsos",
    proMember: "Miembro Pro",
    yoRefund: "YoPratiqo - Reembolsos",
    accessibility: "Accesibilidad",
  },
} as const;

export function LegalLayout({
  title,
  lastUpdated,
  toc,
  currentPath,
  children,
}: {
  title: string;
  lastUpdated: string;
  toc: LegalTocItem[];
  currentPath: LegalPath;
  children: React.ReactNode;
}) {
  const { locale, t } = useLocale();
  const copy = UI_COPY[locale];

  const LEGAL_LINKS = [
    { href: "/legal/cgu", label: t("footerTerms") },
    { href: "/legal/confidentialite", label: t("footerPrivacy") },
    { href: "/legal/annulation", label: t("footerCancellation") },
    { href: "/legal/code-de-conduite", label: t("footerCodeOfConduct") },
    { href: "/legal/conditions-professeurs", label: copy.teacherTerms },
    { href: "/legal/membre-pro", label: copy.proMember },
    { href: "/legal/paiements-remboursements", label: copy.payments },
    { href: "/legal/yo-remboursement", label: copy.yoRefund },
    { href: "/legal/accessibilite", label: copy.accessibility },
  ] as const;

  const content = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === LegalMarkdownBody) {
      const markdownChild = child as React.ReactElement<React.ComponentProps<typeof LegalMarkdownBody>>;
      return React.cloneElement(markdownChild, {
        headingIds: toc.map((item) => item.id),
      });
    }
    return child;
  });

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#F3FAF6] via-white to-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <header className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_24px_80px_rgba(15,110,86,0.10)]">
          <div className="border-b border-emerald-50 bg-gradient-to-br from-white via-[#F7FCF9] to-[#E8F7F2] px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <Link
                href="/"
                className="inline-flex w-fit items-center rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-4"
              >
                <PratiqoLogo size="sm" priority={false} loading="lazy" />
              </Link>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#0F6E56] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#1D9E75]" aria-hidden="true" />
                {copy.status}
              </div>
            </div>

            <div className="mt-8 max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0F6E56]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight text-[#163D35] sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                {copy.intro}
              </p>
              <p className="mt-5 inline-flex rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                {copy.lastUpdated}: {lastUpdated}
              </p>
            </div>
          </div>

          <div className="border-t border-amber-100 bg-[#FFF8E6] px-5 py-4 sm:px-8" role="note">
            <p className="text-sm font-semibold text-amber-950">{copy.noticeTitle}</p>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-amber-950/85">{copy.noticeBody}</p>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          {toc.length > 0 && (
            <aside className="lg:sticky lg:top-24">
              <nav
                aria-label={copy.summary}
                className="rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-sm sm:p-5"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F6E56]">
                  {copy.summary}
                </p>
                <ol className="mt-4 max-h-[55dvh] space-y-1 overflow-auto pr-1 text-sm lg:max-h-[calc(100dvh-220px)]">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-xl px-3 py-2 font-medium leading-5 text-slate-700 transition hover:bg-emerald-50 hover:text-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}

          <main className={cn("min-w-0", toc.length === 0 && "lg:col-start-1 lg:col-end-3")}>
            <article className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-9 lg:px-10">
              {content}
            </article>

            <footer className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {copy.otherDocs}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {LEGAL_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-full border px-3 py-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-[#1D9E75]",
                      l.href === currentPath
                        ? "border-[#1D9E75] bg-[#E8F7F2] text-[#0F6E56]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#0F6E56]",
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 border-l-4 border-[#1D9E75] pl-4 text-xl font-semibold text-[#163D35]">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-7 text-slate-700 [&_strong]:text-slate-950">{children}</div>
    </section>
  );
}

export function LegalNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-[#FFF8E6] px-4 py-3 text-[14px] leading-6 text-amber-950">
      {children}
    </div>
  );
}
