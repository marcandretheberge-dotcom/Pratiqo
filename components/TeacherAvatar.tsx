"use client";

import { useState } from "react";
import Image from "next/image";
import type { Discipline } from "@/types";
import { cn } from "@/lib/utils";
import { getTeacherImageUrl, shouldUseUnoptimizedImage } from "@/lib/images";
import { useLocale } from "@/lib/locale-context";

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("") || "?";
}

function avatarBgClass(category: Discipline) {
  if (category === "Musique") return "bg-teal-500/15 text-teal-800";
  if (category === "Arts Martiaux") return "bg-[rgba(255,153,102,0.18)] text-[#C2462E]";
  if (category === "Langues") return "bg-[rgba(146,106,255,0.16)] text-[#5B3EC8]";
  return "bg-teal-500/15 text-teal-800";
}

export function TeacherAvatar({
  name,
  category,
  imageUrl,
  size = 44,
  className,
  ringClassName,
}: {
  name: string;
  category: Discipline;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  /** e.g. ring for profile modal header */
  ringClassName?: string;
}) {
  const { t } = useLocale();
  const [imageFailed, setImageFailed] = useState(false);
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const optimizedUrl = getTeacherImageUrl(url, {
    width: Math.max(96, size * 2),
    height: Math.max(96, size * 2),
    quality: 75,
    format: "webp",
  });
  const initials = initialsFor(name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full flex items-center justify-center font-bold",
        !url && avatarBgClass(category),
        ringClassName,
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.32)) }}
    >
      {url && !imageFailed ? (
        <Image
          src={optimizedUrl}
          alt={t("imageAltTeacherProfile").replace("{name}", name)}
          width={size}
          height={size}
          sizes={`${size}px`}
          loading="lazy"
          className="h-full w-full object-cover"
          unoptimized={shouldUseUnoptimizedImage(optimizedUrl)}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-label={name}>{initials}</span>
      )}
    </div>
  );
}
