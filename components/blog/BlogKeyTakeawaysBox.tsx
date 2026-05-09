"use client";

import { useLocale } from "@/lib/locale-context";
import { Sparkles } from "lucide-react";

export function BlogKeyTakeawaysBox({ items }: { items: string[] }) {
  const { t } = useLocale();
  if (!items.length) return null;
  return (
    <aside className="my-10 rounded-3xl border border-[#C5E7DB]/80 bg-gradient-to-br from-[#EFF8F4] to-white px-6 py-7 shadow-sm sm:px-8">
      <div className="flex items-center gap-2 text-sm font-bold text-[#0F6E56]">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        {t("blogKeyTakeaways")}
      </div>
      <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-[#3D3D3A]">
        {items.map((line) => (
          <li key={line} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F6E56]" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
