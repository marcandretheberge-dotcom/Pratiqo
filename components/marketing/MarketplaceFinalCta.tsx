"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export function MarketplaceFinalCta({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <section className={cn("border-t border-[#E8E6DF] bg-[#FAFCFB]", className)}>
      <div className="mx-auto max-w-[1280px] px-4 py-12 text-center sm:px-6 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight text-[#2C2C2A] sm:text-3xl">{t("finalCtaTitle")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[#526056]">{t("finalCtaSubtitle")}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/login?next=/student/search"
            className="inline-flex h-12 min-h-[48px] items-center justify-center rounded-2xl bg-[#0F6E56] px-8 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0c5c48] hover:shadow-md"
          >
            {t("marketplaceFindTeacherCta")}
          </Link>
          <Link
            href="/become-teacher"
            className="inline-flex h-12 min-h-[48px] items-center justify-center rounded-2xl border-2 border-[#2C2C2A]/15 bg-white px-8 text-sm font-bold text-[#2C2C2A] transition-colors hover:border-[#0F6E56]/30 hover:bg-[#F9F8F5]"
          >
            {t("homeCtaTeacher")}
          </Link>
        </div>
      </div>
    </section>
  );
}
