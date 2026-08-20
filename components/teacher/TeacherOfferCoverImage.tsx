"use client";

import React, { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl: string | null | undefined;
  title: string;
  alt: string;
  className?: string;
  aspectClassName?: string;
};

/**
 * Shared offer cover display with premium neutral fallback.
 * Does not use the Pratiqo logo as a cover stand-in.
 */
export function TeacherOfferCoverImage({
  imageUrl,
  title,
  alt,
  className,
  aspectClassName = "aspect-[16/9]",
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 via-slate-50 to-emerald-50",
        aspectClassName,
        className,
      )}
      data-testid="teacher-offer-cover"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
          <ImageIcon className="text-teal-700/50" size={28} aria-hidden />
          <p className="line-clamp-2 text-xs font-semibold text-slate-600">{title}</p>
        </div>
      )}
    </div>
  );
}
