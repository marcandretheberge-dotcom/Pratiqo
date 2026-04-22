"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { TEACHERS } from "../constants";
import type { Teacher } from "../types";
import Logo from "../components/ui/Logo";

const POPULAR_TAGS = ["Piano", "Anglais", "Karaté", "Salsa", "Violon", "Business"];

export default function Home() {
  const [query, setQuery] = useState("");
  const cards = useMemo(() => TEACHERS.slice(0, 3), []);

  return (
    <div>
      <header className="bg-white border-b border-[var(--p-border-light)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/dashboard" className="ds-btn-secondary text-sm">
              Tableau de bord
            </Link>
            <Link href="/student/search" className="ds-btn-primary text-sm">
              Trouver un professeur
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 sm:px-10">
        <section className="py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center ds-pill">
              <span className="ds-label text-[var(--p-dark-teal)]">#1 plateforme</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-[40px] sm:text-[52px] leading-[1.05]">
                <span className="text-[var(--p-text)]">Apprenez plus vite,</span>
                <br />
                <span className="text-[var(--p-primary)]">avec le bon professeur.</span>
              </h1>
              <p className="text-[16px] text-[var(--p-text-muted)] max-w-[560px]">
                Musique, langues, sports, arts martiaux — trouvez un mentor vérifié près de vous et
                réservez en quelques secondes.
              </p>
            </div>

            <div className={cn("ds-search w-full flex items-center px-4 gap-3")}>
              <MapPin size={18} className="text-[var(--p-text-subtle)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Discipline, professeur, ville…"
                className="flex-1 bg-transparent outline-none text-[14px] text-[var(--p-text)] placeholder:text-[var(--p-text-subtle)]"
              />
              <Link
                href={query ? `/student/search?q=${encodeURIComponent(query)}` : "/student/search"}
                className="ds-btn-primary text-sm h-9 px-5 flex items-center gap-2"
              >
                <Search size={16} />
                Rechercher
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map((t) => (
                <Link key={t} href={`/student/search?q=${encodeURIComponent(t)}`} className="ds-pill">
                  {t}
                </Link>
              ))}
            </div>

            <p className="text-[14px] text-[var(--p-text-muted)]">
              <span className="text-[var(--p-text)] font-medium">+ 2 400</span> professeurs vérifiés
            </p>
          </div>

          <div className="relative min-h-[420px]">
            <FloatingTeacherCard teacher={cards[0]} className="absolute left-0 top-6 rotate-[-2deg]" variant="music" />
            <FloatingTeacherCard teacher={cards[1]} className="absolute right-0 top-28 rotate-[2deg]" variant="martial" />
            <FloatingTeacherCard teacher={cards[2]} className="absolute left-10 top-60 rotate-[-1deg]" variant="languages" />
          </div>
        </section>
      </main>
    </div>
  );
}

function FloatingTeacherCard({
  teacher,
  className,
  variant,
}: {
  teacher: Teacher;
  className?: string;
  variant: "music" | "martial" | "languages";
}) {
  const initials = teacher.name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const ratingColor =
    variant === "music"
      ? "bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)]"
      : variant === "martial"
        ? "bg-[#FFE7E1] text-[#C2462E]"
        : "bg-[#EFE8FF] text-[#5B3EC8]";

  const avatarBg =
    variant === "music"
      ? "bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)]"
      : variant === "martial"
        ? "bg-[#FFE7E1] text-[#C2462E]"
        : "bg-[#EFE8FF] text-[#5B3EC8]";

  return (
    <div className={cn("ds-card w-[360px] p-4 shadow-[0_18px_60px_rgba(15,110,86,0.18)]", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-11 h-11 rounded-full flex items-center justify-center font-medium", avatarBg)}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[var(--p-text)] truncate">{teacher.name}</p>
            <p className="text-[12px] text-[var(--p-text-muted)] truncate">
              {teacher.discipline} · Montréal
            </p>
          </div>
        </div>
        <span className={cn("px-3 py-1 rounded-[10px] text-[11px] font-medium", ratingColor)}>
          ★ {teacher.rating}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className="space-y-1">
          <p className="ds-label text-[var(--p-text-subtle)]">Prochain cours disponible</p>
          <span className="ds-pill inline-flex">Aujourd’hui 18:30</span>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-medium text-[var(--p-text)]">${teacher.pricePerLesson}</p>
          <p className="text-[12px] text-[var(--p-text-muted)]">/ heure</p>
        </div>
      </div>
    </div>
  );
}

