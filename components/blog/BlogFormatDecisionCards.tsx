"use client";

import { useLocale } from "@/lib/locale-context";
import { Laptop, Home, Scale } from "lucide-react";

function BulletBlock({ label, body }: { label: string; body: string }) {
  const lines = body
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#6B6760]">{label}</p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#3D3D3A]">
        {lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#0F6E56]" aria-hidden />
            <span>{line.replace(/^[-•]\s*/, "")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Visual comparison for “online vs at-home tutor” articles — copy lives in i18n. */
export function BlogFormatDecisionCards() {
  const { t } = useLocale();
  return (
    <section className="my-12 grid gap-5 lg:grid-cols-3" aria-labelledby="format-decision-heading">
      <h2 id="format-decision-heading" className="sr-only">
        {t("blogCompareSectionTitle")}
      </h2>
      <article className="rounded-3xl border border-[#E8E6DE] bg-white p-6 shadow-[0_10px_36px_rgba(44,44,42,0.06)]">
        <div className="flex items-center gap-2 text-[#0F6E56]">
          <Laptop className="h-5 w-5 shrink-0" aria-hidden />
          <h3 className="text-lg font-bold text-[#2C2C2A]">{t("blogCompareOnlineTitle")}</h3>
        </div>
        <p className="mt-2 text-sm font-medium text-[#5C5C5C]">{t("blogCompareOnlineSubtitle")}</p>
        <div className="mt-6 space-y-6">
          <BulletBlock label={t("blogCompareProsLabel")} body={t("blogCompareOnlinePros")} />
          <BulletBlock label={t("blogCompareConsLabel")} body={t("blogCompareOnlineCons")} />
        </div>
      </article>
      <article className="rounded-3xl border border-[#E8E6DE] bg-white p-6 shadow-[0_10px_36px_rgba(44,44,42,0.06)]">
        <div className="flex items-center gap-2 text-[#0F6E56]">
          <Home className="h-5 w-5 shrink-0" aria-hidden />
          <h3 className="text-lg font-bold text-[#2C2C2A]">{t("blogCompareHomeTitle")}</h3>
        </div>
        <p className="mt-2 text-sm font-medium text-[#5C5C5C]">{t("blogCompareHomeSubtitle")}</p>
        <div className="mt-6 space-y-6">
          <BulletBlock label={t("blogCompareProsLabel")} body={t("blogCompareHomePros")} />
          <BulletBlock label={t("blogCompareConsLabel")} body={t("blogCompareHomeCons")} />
        </div>
      </article>
      <article className="rounded-3xl border border-[#C5E7DB] bg-gradient-to-br from-[#FAFFFC] to-white p-6 shadow-[0_10px_36px_rgba(15,110,86,0.08)] lg:col-span-1">
        <div className="flex items-center gap-2 text-[#0F6E56]">
          <Scale className="h-5 w-5 shrink-0" aria-hidden />
          <h3 className="text-lg font-bold text-[#2C2C2A]">{t("blogCompareVerdictTitle")}</h3>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#3D3D3A]">{t("blogCompareVerdictBody")}</p>
      </article>
    </section>
  );
}
