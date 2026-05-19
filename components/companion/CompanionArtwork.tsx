"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: {
    shell: "h-14 w-14 rounded-2xl",
    emoji: "text-3xl",
  },
  md: {
    shell: "h-20 w-20 rounded-3xl",
    emoji: "text-5xl",
  },
  lg: {
    shell: "h-28 w-28 rounded-[2rem]",
    emoji: "text-6xl",
  },
} as const;

export function CompanionArtwork({
  emoji,
  alt,
  locked = false,
  size = "md",
  accent = "#1D9E75",
  className,
}: {
  emoji: string;
  alt: string;
  locked?: boolean;
  size?: keyof typeof SIZE_CLASSES;
  accent?: string;
  className?: string;
}) {
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-white/60 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_14px_34px_rgba(15,23,42,0.12)]",
        sizeClass.shell,
        locked && "opacity-60 grayscale",
        className,
      )}
      style={{ "--companion-accent": accent } as CSSProperties}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.95),rgba(255,255,255,0.35)_32%,transparent_33%),linear-gradient(135deg,var(--companion-accent),#F6C177)] opacity-90" />
      <span className="absolute inset-1 rounded-[inherit] bg-white/18 ring-1 ring-white/35" />
      <span className="pointer-events-none absolute inset-x-2 bottom-2 h-1/5 rounded-full bg-white/25 blur-md" />
      <span
        role="img"
        aria-label={alt}
        className={cn("relative z-10 leading-none drop-shadow-[0_8px_14px_rgba(15,23,42,0.16)]", sizeClass.emoji)}
      >
        {emoji}
      </span>
    </div>
  );
}
