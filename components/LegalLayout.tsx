"use client";

import React from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { useLocale } from "@/lib/locale-context";

export type LegalTocItem = { id: string; label: string };

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
  currentPath:
    | "/legal/cgu"
    | "/legal/confidentialite"
    | "/legal/annulation"
    | "/legal/code-de-conduite"
    | "/legal/conditions-professeurs";
  children: React.ReactNode;
}) {
  const { locale, t } = useLocale();

  const teacherTermsLabel =
    locale === "en"
      ? "Teacher Terms"
      : locale === "es"
        ? "Condiciones profesores"
        : "Conditions professeurs";

  const LEGAL_LINKS = [
    { href: "/legal/cgu", label: t("footerTerms") },
    { href: "/legal/confidentialite", label: t("footerPrivacy") },
    { href: "/legal/annulation", label: t("footerCancellation") },
    { href: "/legal/code-de-conduite", label: t("footerCodeOfConduct") },
    { href: "/legal/conditions-professeurs", label: teacherTermsLabel },
  ] as const;

  return (
    <div className="max-w-[720px] mx-auto pb-16">
      <div
        className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950 mb-8"
        role="note"
      >
        Ce document est un modèle préliminaire. Faites-le réviser par un avocat avant le lancement.
      </div>

      <header className="mb-10">
        <p className="ds-label text-[var(--p-text-subtle)] mb-2">Pratiqo</p>
        <h1 className="text-[28px] sm:text-[34px] font-semibold text-[var(--p-text)] leading-tight border-l-4 border-teal-500 pl-4">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--p-text-muted)]">Dernière mise à jour : {lastUpdated}</p>
      </header>

      {toc.length > 0 && (
        <nav
          aria-label="Sommaire"
          className="mb-10 rounded-2xl border border-[var(--p-border-light)] bg-white p-5 shadow-sm"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">
            Sommaire
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

      <article className="space-y-10 text-[15px] leading-relaxed text-[var(--p-text)]">{children}</article>

      <footer className="mt-14 pt-8 border-t border-[var(--p-border-light)]">
        <p className="text-[12px] text-[var(--p-text-muted)] mb-2">{t("footerOtherDocs")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "hover:text-teal-700 hover:underline",
                l.href === currentPath ? "text-teal-700 font-medium" : "text-[var(--p-text-muted)]",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-[var(--p-text)] border-l-4 border-teal-500 pl-4 mb-4">
        {title}
      </h2>
      <div className="pl-1 space-y-3 text-[var(--p-text-muted)] [&_strong]:text-[var(--p-text)]">{children}</div>
    </section>
  );
}

export function LegalNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-100 border border-slate-200/80 px-4 py-3 text-[14px] text-slate-700">
      {children}
    </div>
  );
}
