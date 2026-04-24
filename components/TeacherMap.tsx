"use client";

import React, { useMemo } from "react";
import { googleMapsEmbedSrc } from "../lib/googleMapsEmbed";

export type TeacherMapContext = "teacher_profile" | "group_session";

function mapAllowed(context: TeacherMapContext, teacherPlan: string | null | undefined): boolean {
  if (context === "group_session") return true;
  return String(teacherPlan || "").toLowerCase() === "enterprise";
}

/**
 * Google Maps (Embed API) — visible only for Enterprise teachers in profile context,
 * or always when {@link TeacherMapContext} is `group_session`.
 */
export function TeacherMap({
  context,
  teacherPlan,
  lat,
  lng,
  placeQuery,
  title = "Carte",
  className,
}: {
  context: TeacherMapContext;
  teacherPlan?: string | null;
  lat?: number;
  lng?: number;
  placeQuery?: string | null;
  title?: string;
  className?: string;
}) {
  if (!mapAllowed(context, teacherPlan)) {
    return null;
  }

  const src = useMemo(() => googleMapsEmbedSrc({ lat, lng, placeQuery }), [lat, lng, placeQuery]);
  if (!src) {
    return (
      <div className={className}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
        <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
          Ajoute la variable d&apos;environnement NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Embed API) pour afficher la carte.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-[16/10]">
        <iframe title={title} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={src} allowFullScreen />
      </div>
    </div>
  );
}
