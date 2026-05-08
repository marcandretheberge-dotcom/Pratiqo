"use client";

/**
 * Social proof: illustrative adult portraits in `public/images/testimonials/*.webp`.
 * They are warm stock-style images for layout only — not verified reviewer identities.
 * If files are missing or fail to load, `TestimonialPortrait` falls back to initials (build-safe).
 */

import Image from "next/image";
import { useState } from "react";
import { Star } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";

function StarRow() {
  return (
    <div className="flex gap-0.5 text-amber-400" role="presentation" aria-hidden>
      {[0, 1, 2, 3, 4].map((k) => (
        <Star key={k} size={13} strokeWidth={0} fill="currentColor" className="opacity-95" />
      ))}
    </div>
  );
}

function TestimonialPortrait({
  src,
  altText,
  fallbackLetter,
}: {
  src: string;
  altText: string;
  fallbackLetter: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E9F6F1] to-[#D4EFE5] text-sm font-bold text-teal-800"
        aria-hidden
      >
        {fallbackLetter}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={altText}
      width={40}
      height={40}
      sizes="40px"
      loading="lazy"
      fetchPriority="low"
      unoptimized
      className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-[#EFECE6]"
      onError={() => setFailed(true)}
    />
  );
}

export function SocialProofTestimonials({ className }: { className?: string }) {
  const { t } = useLocale();
  const cards: {
    quote: TranslationKey;
    author: TranslationKey;
    altKey: TranslationKey;
    src: string;
    fallbackLetter: string;
  }[] = [
    {
      quote: "socialProofTestimonial1Body",
      author: "socialProofTestimonial1Author",
      altKey: "testimonialParentAlt",
      src: "/images/testimonials/testimonial-parent.webp",
      fallbackLetter: "P",
    },
    {
      quote: "socialProofTestimonial2Body",
      author: "socialProofTestimonial2Author",
      altKey: "testimonialLanguageStudentAlt",
      src: "/images/testimonials/testimonial-language-student.webp",
      fallbackLetter: "L",
    },
    {
      quote: "socialProofTestimonial3Body",
      author: "socialProofTestimonial3Author",
      altKey: "testimonialAcademicStudentAlt",
      src: "/images/testimonials/testimonial-academic-student.webp",
      fallbackLetter: "A",
    },
  ];

  return (
    <section className={className}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-neutral-700">
          {t("socialProofEarlyFeedbackLabel")}
        </p>
        <h2 className="mx-auto mt-2 max-w-2xl text-center text-2xl font-bold tracking-tight text-[#2C2C2A] sm:text-3xl">
          {t("socialProofSectionTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[15px] leading-relaxed text-neutral-700">{t("socialProofSectionSubtitle")}</p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li
              key={c.quote}
              className="flex h-full flex-col rounded-3xl border border-[#E8E6DF] bg-white p-5 shadow-[0_8px_32px_rgba(44,44,42,0.05)]"
            >
              <StarRow />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-[#374038]">{t(c.quote)}</blockquote>
              <div className="mt-6 flex items-center gap-3 border-t border-[#EFECE6] pt-4">
                <TestimonialPortrait src={c.src} altText={t(c.altKey)} fallbackLetter={c.fallbackLetter} />
                <p className="text-sm font-semibold text-[#2C2C2A]">{t(c.author)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
