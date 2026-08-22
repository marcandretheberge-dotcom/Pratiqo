"use client";

import React from "react";
import Link from "next/link";
import { Package } from "lucide-react";

export function PlannedPackageEmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
  testId,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-2xl border border-dashed border-[#DCEAE3] bg-[#F3FAF6]/60 px-5 py-10 text-center"
      data-testid={testId}
    >
      <Package className="mx-auto text-teal-700/70" size={36} aria-hidden />
      <p className="mt-3 text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      <Link
        href={ctaHref}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
