"use client";

import { BadgeCheck, BookOpenCheck, LocateFixed, PiggyBank } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";

export function TrustSafetySection({ className }: { className?: string }) {
  const { t } = useLocale();
  const items: { icon: typeof BadgeCheck; title: TranslationKey; desc: TranslationKey }[] = [
    { icon: BadgeCheck, title: "trustVerifiedTitle", desc: "trustVerifiedDesc" },
    { icon: LocateFixed, title: "trustProximityTitle", desc: "trustProximityDesc" },
    { icon: BookOpenCheck, title: "trustBookingTitle", desc: "trustBookingDesc" },
    { icon: PiggyBank, title: "trustPaymentsTitle", desc: "trustPaymentsDesc" },
  ];

  return (
    <section className={className}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#2C2C2A] sm:text-3xl">{t("trustSectionTitle")}</h2>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="rounded-3xl border border-[#E8E6DF] bg-white p-5 shadow-[0_8px_28px_rgba(44,44,42,0.05)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1EFE8] text-[#00694c]" aria-hidden>
                <Icon size={20} strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-[#2C2C2A]">{t(title)}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#526056]">{t(desc)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
