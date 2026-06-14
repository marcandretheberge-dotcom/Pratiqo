import Link from "next/link";

import { YoPrintButton } from "@/components/yo/YoPrintButton";
import type { YoLocale } from "@/lib/yo/types";

const PRINT_LABEL = {
  fr: "Imprimer",
  en: "Print",
  es: "Imprimir",
} as const;

export function YoPrintPageShell({
  locale,
  title,
  description,
  moduleLabel,
  lessonLabel,
  backHref,
  backLabel,
  children,
}: {
  locale: YoLocale;
  title: string;
  description: string;
  moduleLabel: string;
  lessonLabel?: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <main
      data-yo-print-page-shell="true"
      className="min-h-[100dvh] bg-[#F7F3EA] px-4 py-6 text-[#12372f] print:bg-white print:px-0 print:py-0"
    >
      <style>{`
        @media print {
          @page { margin: 14mm; }
          .yo-print-hidden { display: none !important; }
          body { background: #fff !important; }
          article, section { box-shadow: none !important; }
          h1, h2, h3, p, li, span { color: #12372f !important; }
          [data-yo-print-card] { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl">
        <nav className="yo-print-hidden mb-4 flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="rounded-full border border-[#D8ECE6] bg-white px-4 py-2 text-sm font-bold text-[#0F6E56]"
          >
            {backLabel}
          </Link>
          <YoPrintButton label={PRINT_LABEL[locale]} />
        </nav>

        <article className="rounded-[28px] border border-[#D8ECE6] bg-white p-6 shadow-[0_18px_48px_rgba(15,58,52,0.10)] print:rounded-none print:border-0 print:p-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
            {moduleLabel}
          </p>
          {lessonLabel ? (
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#0F6E56]/60">
              {lessonLabel}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#0F6E56]">
            {title}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#0F6E56]/75">
            {description}
          </p>

          <div className="mt-6 grid gap-5">{children}</div>
        </article>
      </div>
    </main>
  );
}

export function YoPrintCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-yo-print-card="true"
      className="break-inside-avoid rounded-3xl border border-[#D8ECE6] bg-[#F8FCFB] p-4 print:border-[#B8CFC6] print:bg-white"
    >
      <h2 className="text-lg font-black text-[#0F6E56]">{title}</h2>
      <div className="mt-3 text-sm font-semibold leading-relaxed text-[#0F6E56]/82">
        {children}
      </div>
    </section>
  );
}
