"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { useLocale } from "../lib/locale-context";
import { Star } from "lucide-react";

type Props = {
  teachers: Teacher[];
  userLat: number | null;
  userLng: number | null;
  onTeacherSelect: (teacher: Teacher) => void;
  onViewProfile: (teacher: Teacher) => void;
  selectedTeacher: Teacher | null;
  onCloseSelected: () => void;
};

const MAP_MINIMAL_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

function hasCoords(t: Teacher) {
  const lat = t?.location?.lat;
  const lng = t?.location?.lng;
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

export function SearchMapView({
  teachers,
  userLat,
  userLng,
  onTeacherSelect,
  onViewProfile,
  selectedTeacher,
  onCloseSelected,
}: Props) {
  const { t, formatPrice } = useLocale();
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const teachersWithCoords = useMemo(() => teachers.filter(hasCoords), [teachers]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    let cancelled = false;
    const el = mapRef.current;

    const run = async () => {
      setLoadError(null);
      try {
        setOptions({ key: apiKey, v: "weekly" });
        await importLibrary("maps");
        if (cancelled || !mapRef.current) return;

        const center =
          userLat && userLng ? ({ lat: userLat, lng: userLng } as const) : ({ lat: 45.5017, lng: -73.5673 } as const);

        const map = new google.maps.Map(el, {
          center,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          styles: MAP_MINIMAL_STYLES,
        });
        mapInstanceRef.current = map;

        // Cleanup old markers
        for (const m of markersRef.current) m.setMap(null);
        markersRef.current = [];

        // User position marker
        if (userLat && userLng) {
          const userMarker = new google.maps.Marker({
            position: { lat: userLat, lng: userLng },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#1D9E75",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 3,
            },
            title: t("youAreHere"),
          });
          markersRef.current.push(userMarker);
        }

        // Teacher price pins
        for (const teacher of teachersWithCoords) {
          const label = `${Math.round(Number(teacher.pricePerLesson || 0)) || "?"}$`;
          const marker = new google.maps.Marker({
            position: { lat: teacher.location.lat, lng: teacher.location.lng },
            map,
            label: {
              text: label,
              color: "white",
              fontSize: "11px",
              fontWeight: "600",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: "#1D9E75",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            },
            title: teacher.name,
          });
          marker.addListener("click", () => {
            onTeacherSelect(teacher);
          });
          markersRef.current.push(marker);
        }

        setMapsReady(true);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t("noCoordinates"));
      }
    };

    void run();

    return () => {
      cancelled = true;
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
      mapInstanceRef.current = null;
      if (mapRef.current) mapRef.current.innerHTML = "";
      setMapsReady(false);
    };
  }, [apiKey, userLat, userLng, teachersWithCoords, t, onTeacherSelect]);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8E6DF] bg-white p-4 text-sm text-[#888780]">
        {t("noCoordinates")} — <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
      </div>
    );
  }

  if (loadError) {
    return <div className="rounded-xl border border-[#F3D0D0] bg-[#FFF5F5] p-4 text-sm text-[#B42318]">{loadError}</div>;
  }

  return (
    <div className="relative">
      {!mapsReady ? (
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0F6E56]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
          {t("loading")} {/** fallback; page shows specific copy too */}
        </div>
      ) : null}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "calc(100vh - 200px)",
          borderRadius: 12,
          overflow: "hidden",
        }}
        className="border border-[#E8E6DF] bg-[#F4F4F3]"
      />

      {selectedTeacher ? (
        <div
          className={cn(
            "fixed left-0 right-0 z-[55] px-4 sm:px-6",
            // above mobile bottom tabs
            "bottom-20 md:bottom-6",
          )}
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-[#1D9E75] bg-white p-4 shadow-[0_20px_60px_rgba(44,44,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#2C2C2A]">{selectedTeacher.name}</p>
                <p className="truncate text-xs text-[#888780]">{selectedTeacher.discipline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#888780]">
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="text-[#1D9E75]" /> {selectedTeacher.rating}
                  </span>
                  <span className="text-[#D3D1C7]">·</span>
                  <span className="font-bold text-[#1D9E75]">{formatPrice(Number(selectedTeacher.pricePerLesson))}/h</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseSelected}
                className="shrink-0 rounded-full border border-[#E8E6DF] bg-white px-3 py-1 text-xs font-semibold text-[#2C2C2A] hover:bg-[#FAFCFB]"
              >
                ×
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onViewProfile(selectedTeacher)}
                className="rounded-full bg-[#1D9E75] px-4 py-2 text-xs font-bold text-white hover:brightness-[0.98]"
              >
                {t("viewProfile")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

