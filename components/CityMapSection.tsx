"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Teacher } from "../types";

// Lazy-loaded to avoid bundling the Google Maps SDK in the initial JS chunk.
const SearchMapView = dynamic(
  () => import("./SearchMapView").then((m) => m.SearchMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl bg-[#F1EFE8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F6E56] border-t-transparent" />
      </div>
    ),
  },
);

type Props = {
  teachers: Teacher[];
  cityLat: number;
  cityLng: number;
  cityName: string;
  /** Passed through to SearchMapView. Barrio pages use 14–15; city pages default to 12. */
  initialZoom?: number;
};

/**
 * Client wrapper rendered on city landing pages.
 *
 * - Centers the map on the city's coordinates (passed as userLat/userLng).
 * - Clicking a teacher pin shows the mini-card; "Voir le profil" navigates
 *   to the full profile page without a modal.
 * - onBoundsSearch is intentionally omitted — these are static SEO pages.
 */
export function CityMapSection({ teachers, cityLat, cityLng, cityName, initialZoom }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Teacher | null>(null);

  return (
    <div
      className="rounded-2xl overflow-hidden border border-[#E8E6DF] shadow-sm"
      style={{ height: 420 }}
      aria-label={`Carte des tuteurs à ${cityName}`}
    >
      <SearchMapView
        teachers={teachers}
        userLat={cityLat}
        userLng={cityLng}
        selectedTeacher={selected}
        onTeacherSelect={setSelected}
        onViewProfile={(t) => router.push(`/teacher/profile/${encodeURIComponent(t.id)}`)}
        onCloseSelected={() => setSelected(null)}
        mapHeight="420px"
        initialZoom={initialZoom}
      />
    </div>
  );
}
