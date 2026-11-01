"use client";

import { ClipboardList, MessageSquare, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

export function LandingHowItWorks({ className }: { className?: string }) {
  const { t } = useLocale();
  const steps = [
    { icon: Sparkles, title: "landingHowStep1Title", body: "landingHowStep1Body" },
    { icon: ClipboardList, title: "landingHowStep2Title", body: "landingHowStep2Body" },
    { icon: MessageSquare, title: "landingHowStep3Title", body: "landingHowStep3Body" },
  ] as const;

  return (
    <section className={className}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#1a1f1d] sm:text-3xl">{t("landingHowTitle")}</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="min-w-0 border-t border-[#E8E6DF] pt-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E9F6F1] text-teal-700">
                <Icon size={22} strokeWidth={2} aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#2C2C2A]">{t(title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{t(body)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
