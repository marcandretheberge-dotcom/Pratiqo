"use client";

import Image from "next/image";
import type { Discipline } from "@/types";
import { cn } from "@/lib/utils";

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("") || "?";
}

function avatarBgClass(category: Discipline) {
  if (category === "Musique") return "bg-[rgba(29,158,117,0.14)] text-[#085041]";
  if (category === "Arts Martiaux") return "bg-[rgba(255,153,102,0.18)] text-[#C2462E]";
  if (category === "Langues") return "bg-[rgba(146,106,255,0.16)] text-[#5B3EC8]";
  return "bg-[rgba(29,158,117,0.14)] text-[#085041]";
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
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
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
      {url ? (
        <Image
          src={url}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </div>
  );
}
