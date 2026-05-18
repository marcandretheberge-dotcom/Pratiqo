"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-14 w-14 rounded-2xl",
  md: "h-20 w-20 rounded-3xl",
  lg: "h-28 w-28 rounded-[2rem]",
} as const;

export function CompanionArtwork({
  src,
  alt,
  locked = false,
  size = "md",
  accent = "#1D9E75",
  className,
}: {
  src: string;
  alt: string;
  locked?: boolean;
  size?: keyof typeof SIZE_CLASSES;
  accent?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-white/55 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_34px_rgba(15,23,42,0.12)]",
        SIZE_CLASSES[size],
        locked && "opacity-60 grayscale",
        className,
      )}
    >
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={size === "lg" ? "112px" : size === "md" ? "80px" : "56px"}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),rgba(255,255,255,0.35)_32%,transparent_33%),linear-gradient(135deg,var(--companion-accent),#F6C177)]"
          style={{ "--companion-accent": accent } as CSSProperties}
        >
          <span className="h-1/2 w-1/2 rounded-full border border-white/55 bg-white/30 shadow-[0_0_35px_rgba(255,255,255,0.45)]" />
        </div>
      )}
      <span className="pointer-events-none absolute inset-x-2 bottom-2 h-1/5 rounded-full bg-white/20 blur-md" />
    </div>
  );
}
