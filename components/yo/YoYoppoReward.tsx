"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";

type YoYoppoRewardVariant = "step" | "intro-complete";

const COPY: Record<
  YoLocale,
  Record<YoYoppoRewardVariant, { label: string; skip: string }>
> = {
  fr: {
    step: { label: "Bien joue. Yoppo suit ta progression.", skip: "Passer" },
    "intro-complete": {
      label: "Intro terminee. Yoppo est pret pour la suite.",
      skip: "Passer",
    },
  },
  en: {
    step: { label: "Nice work. Yoppo is tracking your progress.", skip: "Skip" },
    "intro-complete": {
      label: "Intro complete. Yoppo is ready for what comes next.",
      skip: "Skip",
    },
  },
  es: {
    step: { label: "Muy bien. Yoppo sigue tu progreso.", skip: "Saltar" },
    "intro-complete": {
      label: "Intro terminada. Yoppo esta listo para seguir.",
      skip: "Saltar",
    },
  },
};

export interface YoYoppoRewardProps {
  show: boolean;
  locale: YoLocale;
  variant?: YoYoppoRewardVariant;
  className?: string;
}

export function YoYoppoReward({
  show,
  locale,
  variant = "step",
  className,
}: YoYoppoRewardProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (show) {
      setDismissed(false);
    }
  }, [show]);

  useEffect(() => {
    if (!show || dismissed) return;
    const timer = window.setTimeout(
      () => setDismissed(true),
      variant === "intro-complete" ? 1400 : 900,
    );
    return () => window.clearTimeout(timer);
  }, [dismissed, show, variant]);

  if (!show || dismissed) return null;

  const copy = COPY[locale][variant];
  const isLarge = variant === "intro-complete";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-3xl border border-[#F4B400]/45 bg-[#FFF4D6] p-3 shadow-[0_18px_44px_rgba(23,38,66,0.14)]",
        isLarge ? "flex items-center gap-4 p-4" : "inline-flex items-center gap-3",
        className,
      )}
    >
      <CompanionAvatar
        visualId="travel"
        state="celebrating"
        locale={locale}
        size={isLarge ? "md" : "sm"}
        className="shrink-0"
      />
      <p className="pr-6 text-sm font-bold leading-snug text-[#5a3f0f]">
        {copy.label}
      </p>
      <button
        type="button"
        aria-label={copy.skip}
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-white/70 text-[#5a3f0f] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
