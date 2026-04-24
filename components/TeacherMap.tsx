"use client";

import React from "react";
import type { Teacher } from "../types";
import { GoogleProgressiveMap } from "./GoogleProgressiveMap";

/**
 * Carte Google (progressive) — réservée au plan **Entreprise**.
 * Avant réservation confirmée : centre flouté + cercle 500 m + message.
 */
export function TeacherMap({
  teacher,
  isBooked,
  isEnterprise,
}: {
  teacher: Teacher;
  isBooked: boolean;
  isEnterprise: boolean;
}) {
  if (!isEnterprise) return null;
  const { lat, lng } = teacher.location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2">
      <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 text-sm uppercase tracking-wider">
        Studio sur la carte
      </h3>
      <GoogleProgressiveMap
        mapKey={`teacher-${teacher.id}`}
        exactLat={lat}
        exactLng={lng}
        locked={!isBooked}
        neighborhood={teacher.location.neighborhood ?? null}
        fullAddress={teacher.location.address ?? null}
        lockedMessage="Adresse exacte révélée après réservation"
      />
    </div>
  );
}
