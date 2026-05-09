"use client";

import { useLocale } from "@/lib/locale-context";
import type { FAQItem } from "@/lib/seo/types";
import { ChevronDown } from "lucide-react";
import { useId } from "react";

export function BlogFaqAccordion({ items }: { items: FAQItem[] }) {
  const { t } = useLocale();
  const baseId = useId();
  if (!items.length) return null;

  return (
    <section className="my-14 border-t border-[#E8E6DF] pt-12" aria-labelledby={`${baseId}-faq-label`}>
      <h2 id={`${baseId}-faq-label`} className="text-2xl font-bold tracking-tight text-[#2C2C2A]">
        {t("blogFaqHeading")}
      </h2>
      <div className="mt-8 space-y-3">
        {items.map((item, i) => (
          <details
            key={`${item.question}-${i}`}
            className="group rounded-2xl border border-[#E8E6DF] bg-white px-5 py-2 shadow-sm open:border-[#C5E7DB] open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-semibold text-[#2C2C2A] [&::-webkit-details-marker]:hidden">
              <span className="text-[15px] leading-snug">{item.question}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-[#0F6E56] transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-[#F5F4EF] pb-4 pt-3 text-sm leading-relaxed text-[#4A4845]">{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
