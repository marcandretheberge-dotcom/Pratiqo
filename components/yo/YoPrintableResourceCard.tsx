import Link from "next/link";
import { FileText, Printer } from "lucide-react";

import { t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import type { YoPrintableResource } from "@/lib/yo/printableResources";

const OPEN_PRINTABLE_LABEL = {
  fr: "Ouvrir le document imprimable",
  en: "Open printable document",
  es: "Abrir documento imprimible",
} as const;

const OPEN_PDF_LABEL = {
  fr: "Ouvrir le PDF",
  en: "Open PDF",
  es: "Abrir PDF",
} as const;

export function YoPrintableResourceCard({
  resource,
  locale,
  body,
  className = "",
}: {
  resource: YoPrintableResource;
  locale: YoLocale;
  body?: string;
  className?: string;
}) {
  const isPdf = resource.type === "pdf";
  const label = isPdf ? OPEN_PDF_LABEL[locale] : OPEN_PRINTABLE_LABEL[locale];
  return (
    <article
      data-yo-printable-resource-card="true"
      data-yo-printable-resource-id={resource.id}
      className={`min-w-0 max-w-full overflow-x-hidden rounded-[28px] border border-[#F4B400]/45 bg-[#FFF4D6] p-4 text-[#5a3f0f] shadow-[0_18px_45px_rgba(15,58,52,0.08)] sm:p-5 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/75 text-[#0F6E56]">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-black leading-tight">{t(resource.title, locale)}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#5a3f0f]/80">
            {body ?? t(resource.description, locale)}
          </p>
        </div>
      </div>
      <Link
        href={resource.href}
        className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-4 text-sm font-extrabold text-white transition hover:bg-[#0b5b47]"
      >
        <Printer className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </Link>
    </article>
  );
}
