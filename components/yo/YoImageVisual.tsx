"use client";

import Image from "next/image";
import { useState } from "react";
import type { YoLocale, YoLocalizedString, YoVisualHint } from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";
import { cn } from "@/lib/utils";
import {
  YoCardVisual,
  YoFlashcardTropicalBg,
  YoHeroTropicalArt,
  YoUnlockTravelStamp,
} from "@/components/yo/YoVisuals";

type YoImageVisualVariant = "hero" | "card" | "panel" | "flashcard" | "unlock";

export interface YoImageVisualProps {
  imagePath?: string | null;
  alt: YoLocalizedString;
  locale: YoLocale;
  fallbackKind?: YoVisualHint;
  variant?: YoImageVisualVariant;
  priority?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<YoImageVisualVariant, string> = {
  hero: "aspect-[4/3] min-h-[300px] sm:aspect-[16/11] sm:min-h-[380px] lg:min-h-[480px]",
  card: "aspect-[16/10] min-h-[190px]",
  panel: "aspect-[16/8] min-h-[230px] sm:min-h-[300px]",
  flashcard: "absolute inset-0 min-h-full",
  unlock: "aspect-[4/3] min-h-[250px] lg:min-h-[330px]",
};

const IMAGE_SIZES: Record<YoImageVisualVariant, string> = {
  hero: "(min-width: 1024px) 50vw, 100vw",
  card: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  panel: "(min-width: 1024px) 960px, 100vw",
  flashcard: "(min-width: 1024px) 700px, 100vw",
  unlock: "(min-width: 1024px) 360px, 100vw",
};

export function YoImageVisual({
  imagePath,
  alt,
  locale,
  fallbackKind,
  variant = "card",
  priority = false,
  className,
}: YoImageVisualProps) {
  const altText = t(alt, locale);
  const [imageFailed, setImageFailed] = useState(false);
  const shouldRenderImage = Boolean(imagePath) && !imageFailed;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[1.75rem] border border-teal-100 bg-[#f6fbf7] shadow-[0_16px_38px_rgba(15,58,52,0.12)]",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0">
        <FallbackVisual kind={fallbackKind} locale={locale} variant={variant} />
      </div>

      {shouldRenderImage && imagePath ? (
        <Image
          src={imagePath}
          alt={altText}
          fill
          preload={priority}
          sizes={IMAGE_SIZES[variant]}
          className="z-10 object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(5,36,31,0.04)_0%,rgba(5,36,31,0.1)_45%,rgba(5,36,31,0.35)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-[linear-gradient(120deg,rgba(29,158,117,0.24),rgba(255,255,255,0.08),rgba(206,31,47,0.12))]"
      />
      <div
        aria-hidden
        className="absolute right-4 top-4 z-30 flex overflow-hidden rounded-full border border-white/70 shadow-sm"
      >
        <span className="h-3 w-5 bg-[#002d62]" />
        <span className="h-3 w-5 bg-white" />
        <span className="h-3 w-5 bg-[#ce1126]" />
      </div>
    </div>
  );
}

function FallbackVisual({
  kind,
  locale,
  variant,
}: {
  kind?: YoVisualHint;
  locale: YoLocale;
  variant: YoImageVisualVariant;
}) {
  if (kind === "hero-tropical") {
    return (
      <div className="h-full [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
        <YoHeroTropicalArt />
      </div>
    );
  }

  if (kind === "tropical-flashcard") {
    return (
      <div className="h-full bg-gradient-to-br from-[#d9f3e6] via-[#fff4d7] to-[#dcefff]">
        <YoFlashcardTropicalBg />
      </div>
    );
  }

  if (kind === "unlock-stamp") {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#fffaf0] via-[#fff4e2] to-[#e3f2e8] p-6">
        <YoUnlockTravelStamp locale={locale} />
      </div>
    );
  }

  if (kind) {
    return (
      <div className="h-full [&>div]:h-full [&>div]:rounded-none [&>div]:border-0">
        <YoCardVisual hint={kind} locale={locale} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full bg-[radial-gradient(circle_at_15%_20%,rgba(29,158,117,0.24),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(255,204,92,0.32),transparent_26%),linear-gradient(135deg,#e8f7ed,#fff8e7_55%,#dcefff)]",
        variant === "flashcard" && "bg-[linear-gradient(135deg,#e5f6ec,#fff4d8,#e3f2ff)]",
      )}
    />
  );
}
