import Link from "next/link";
import { Trophy } from "lucide-react";
import { rankingCopy } from "@/lib/yo/rankings/copy";
import type { YoLocale } from "@/lib/yo/types";

/** Real product destination; no authentication or profile request is made by navigation. */
export function RankingNavLink({ locale, compact = false, className = "" }: { locale: YoLocale; compact?: boolean; className?: string }) {
  const label = rankingCopy[locale].rankings;
  return <Link href={`/yo/classement${locale === "fr" ? "" : `?lang=${locale}`}`} prefetch={false} aria-label={label} title={label}
    data-testid="yo-ranking-link" className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#DEDCC8] bg-[#FAF6E7] px-2.5 py-2 text-xs font-bold text-[#766027] transition-colors hover:bg-[#F4ECCA] focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}>
    <Trophy size={16} aria-hidden /><span className={compact ? "hidden lg:inline" : ""}>{label}</span>
  </Link>;
}
