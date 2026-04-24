"use client";

import React, { useEffect, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { GoogleProgressiveMap } from "./GoogleProgressiveMap";

type Props = {
  sessionId: string;
  teachingMode: string;
  location: string | null | undefined;
  /** Student has paid confirmed registration */
  isRegistered: boolean;
  className?: string;
};

/**
 * Carte groupe : toujours proposée en présentiel (hors ligne).
 * Avant inscription confirmée : vue approximative + cercle ; après : lieu exact.
 */
export function GroupSessionMap({ sessionId, teachingMode, location, isRegistered, className }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (teachingMode === "online") {
      setCoords(null);
      setGeoError(null);
      return;
    }
    const addr = location?.trim();
    if (!addr) {
      setCoords(null);
      setGeoError(null);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setGeoError("no_key");
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setOptions({ key: apiKey, v: "weekly" });
        const { Geocoder } = await importLibrary("geocoding");
        if (cancelled) return;
        const geocoder = new Geocoder();
        geocoder.geocode({ address: addr }, (results, status) => {
          if (cancelled) return;
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const p = results[0].geometry.location;
            setCoords({ lat: p.lat(), lng: p.lng() });
            setGeoError(null);
          } else {
            setCoords(null);
            setGeoError("geocode");
          }
        });
      } catch {
        if (!cancelled) setGeoError("load");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [location, teachingMode]);

  if (teachingMode === "online") {
    return (
      <section className={className}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-2">Carte</h2>
        <p className="text-sm text-[var(--p-text-muted)] rounded-xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-4">
          Cette séance a lieu en ligne — pas de lieu sur la carte.
        </p>
      </section>
    );
  }

  const trimmed = location?.trim() ?? "";
  const neighborhoodTeaser = trimmed.includes(",") ? trimmed.split(",")[0]!.trim() : trimmed || null;

  return (
    <section className={className}>
      <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">Carte du lieu</h2>
      {!trimmed ? (
        <p className="text-sm text-[var(--p-text-muted)] rounded-xl border border-dashed border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-4">
          Aucune adresse renseignée pour cette séance.
        </p>
      ) : geoError === "no_key" ? (
        <p className="text-sm text-[var(--p-text-muted)] rounded-xl border border-dashed border-[var(--p-border-light)] p-4">
          Ajoute <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> pour activer la carte.
        </p>
      ) : !coords ? (
        <p className="text-sm text-[var(--p-text-muted)] rounded-xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-4">
          {geoError ? "Impossible de localiser cette adresse sur la carte." : "Chargement de la carte…"}
        </p>
      ) : (
        <GoogleProgressiveMap
          mapKey={`group-${sessionId}`}
          exactLat={coords.lat}
          exactLng={coords.lng}
          locked={!isRegistered}
          neighborhood={isRegistered ? null : neighborhoodTeaser}
          fullAddress={isRegistered ? trimmed : null}
          lockedMessage="Lieu exact communiqué après inscription"
        />
      )}
    </section>
  );
}
