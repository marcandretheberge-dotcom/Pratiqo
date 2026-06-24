"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { LocalTeacherDiscoveryPageBundle } from "@/lib/seo/localTeacherDiscoveryPages";
import { discoveryCardsToMapTeachers } from "@/lib/seo/localTeacherDiscoveryPages";
import type { Teacher } from "@/types";

const SearchMapView = dynamic(
  () => import("../SearchMapView").then((m) => m.SearchMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl bg-[#F1EFE8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
      </div>
    ),
  },
);

type Props = {
  bundle: LocalTeacherDiscoveryPageBundle;
};

export function LocalTeacherDiscoveryMap({ bundle }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Teacher | null>(null);

  const mapTeachers = discoveryCardsToMapTeachers(bundle.teachers);
  if (mapTeachers.length === 0) {
    return (
      <div
        className="rounded-2xl overflow-hidden border border-[#E8E6DF] shadow-sm flex items-center justify-center bg-[#F1EFE8] text-sm text-[#6B6760]"
        style={{ height: 280 }}
      >
        Carte centrée sur {bundle.city.name} — localisation approximative non disponible pour les profils listés.
      </div>
    );
  }

  const teachersForMap: Teacher[] = mapTeachers.map((t) => ({
    id: t.id,
    name: t.name,
    discipline: t.discipline,
    category: t.category as Teacher["category"],
    rating: t.rating,
    reviews: t.reviews,
    distance: 0,
    pricePerLesson: t.pricePerLesson,
    bio: "",
    imageUrl: t.imageUrl ?? "",
    availability: [],
    location: t.location,
    isVerified: false,
    teachingMode: t.teachingMode as Teacher["teachingMode"],
    languages: [],
    levels: [],
  }));

  const profilePathById = new Map(mapTeachers.map((t) => [t.id, t.profilePath]));

  return (
    <div
      className="rounded-2xl overflow-hidden border border-[#E8E6DF] shadow-sm"
      style={{ height: 420 }}
      aria-label={`Carte des professeurs à ${bundle.city.name}`}
    >
      <SearchMapView
        teachers={teachersForMap}
        userLat={bundle.mapCenter.lat}
        userLng={bundle.mapCenter.lng}
        selectedTeacher={selected}
        onTeacherSelect={setSelected}
        onViewProfile={(teacher) => {
          const path = profilePathById.get(teacher.id);
          router.push(path ?? `/trouver-un-prof`);
        }}
        onCloseSelected={() => setSelected(null)}
        mapHeight="420px"
        initialZoom={bundle.mapCenter.zoom}
      />
    </div>
  );
}
