"use client";

import React, { useMemo } from "react";
import { googleMapsEmbedSrc } from "../lib/googleMapsEmbed";
import { TeacherMap } from "./TeacherMap";

type Props = {
  teachingMode: string;
  location?: string | null;
  /** Studio coordinates when available */
  lat?: number;
  lng?: number;
  className?: string;
};

/**
 * Carte pour une séance de groupe (contexte toujours autorisé dans {@link TeacherMap}).
 * En ligne : pas de carte Google (pas de lieu physique).
 */
export function GroupSessionMap({ teachingMode, location, lat, lng, className }: Props) {
  const embedSrc = useMemo(
    () => googleMapsEmbedSrc({ lat, lng, placeQuery: location }),
    [lat, lng, location],
  );

  if (teachingMode === "online") {
    return (
      <section className={className}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">Carte</h2>
        <p className="text-sm text-[var(--p-text-muted)] rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-4">
          Cette séance a lieu en ligne — pas de lieu sur la carte.
        </p>
      </section>
    );
  }

  return (
    <section className={className}>
      {embedSrc ? (
        <TeacherMap
          context="group_session"
          lat={lat}
          lng={lng}
          placeQuery={location}
          title="Carte du lieu"
          className="space-y-2"
        />
      ) : (
        <>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">Carte du lieu</h2>
          <p className="text-sm text-[var(--p-text-muted)] rounded-2xl border border-dashed border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-4">
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              ? "Ajoute NEXT_PUBLIC_GOOGLE_MAPS_API_KEY pour activer Google Maps."
              : "Ajoute une adresse précise sur la séance pour afficher la carte."}
          </p>
        </>
      )}
    </section>
  );
}
