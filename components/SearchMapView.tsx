"use client";

/**
 * Future enhancement: sync visible teacher results with current map bounds.
 * (Debounced bounds → parent list filter beyond the current “Search this area” tap.)
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Renderer } from "@googlemaps/markerclusterer";
import type { Teacher } from "../types";
import { cn } from "../lib/utils";
import { useLocale } from "../lib/locale-context";
import { Star } from "lucide-react";
import { PriceDisplay } from "@/components/PriceDisplay";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";

// ── Public types ──────────────────────────────────────────────────────────────

export type MapBounds = {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
};

type Props = {
  teachers: Teacher[];
  userLat: number | null;
  userLng: number | null;
  onTeacherSelect: (teacher: Teacher) => void;
  onViewProfile: (teacher: Teacher) => void;
  selectedTeacher: Teacher | null;
  onCloseSelected: () => void;
  /** Called when the user clicks "Search this area". Parent should filter
   *  its teacher list to those whose coords fall inside the given bounds. */
  onBoundsSearch?: (bounds: MapBounds) => void;
  /** Override the map container height. Defaults to "calc(100vh - 200px)". */
  mapHeight?: string;
  /**
   * Override the initial Google Maps zoom level.
   * City-wide pages: 12 (default). Barrio / neighbourhood pages: 14–15.
   */
  initialZoom?: number;
  /** Emphasizes the marker matching this teacher id (e.g. list hover). */
  highlightedTeacherId?: string | null;
};

const MAP_MINIMAL_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// Fallback center: Montréal, QC
const FALLBACK_CENTER = { lat: 45.5017, lng: -73.5673 } as const;

// ── Pratiqo-branded cluster renderer ─────────────────────────────────────────
//
// Called lazily by MarkerClusterer after the Maps API is loaded, so using
// google.maps.* at call time (not at module-parse time) is safe.
const pratiqoClusterRenderer: Renderer = {
  render({ count, position }) {
    const svg = window.btoa(
      `<svg fill="#50BEB2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">` +
        `<circle cx="120" cy="120" opacity=".9" r="68"/>` +
        `<circle cx="120" cy="120" opacity=".35" r="92"/>` +
        `<circle cx="120" cy="120" opacity=".18" r="116"/>` +
        `</svg>`,
    );
    return new google.maps.Marker({
      position,
      icon: {
        url: `data:image/svg+xml;base64,${svg}`,
        scaledSize: new google.maps.Size(52, 52),
      },
      label: {
        text: String(count),
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: "700",
      },
      zIndex: 1000 + count,
    });
  },
};

function hasCoords(t: Teacher) {
  const lat = t?.location?.lat;
  const lng = t?.location?.lng;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

export function SearchMapView({
  teachers,
  userLat,
  userLng,
  onTeacherSelect,
  onViewProfile,
  selectedTeacher,
  onCloseSelected,
  onBoundsSearch,
  mapHeight = "calc(100vh - 200px)",
  initialZoom = 12,
  highlightedTeacherId = null,
}: Props) {
  const { t, formatDisplayPrice } = useLocale();

  // ── Stable DOM / instance refs ────────────────────────────────────────────
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // ── Always-current copies of props ───────────────────────────────────────
  // Assigned synchronously during render so effects never read stale values.
  const userLatRef = useRef(userLat);
  const userLngRef = useRef(userLng);
  const onTeacherSelectRef = useRef(onTeacherSelect);
  const onBoundsSearchRef = useRef(onBoundsSearch);
  userLatRef.current = userLat;
  userLngRef.current = userLng;
  onTeacherSelectRef.current = onTeacherSelect;
  onBoundsSearchRef.current = onBoundsSearch;

  // Whether the map's initial view has been centred on the user's real coords.
  const centeredOnUserRef = useRef(false);
  // Last user coordinate we auto-panned to. When the parent passes a *new*
  // saved learner origin we recenter once; when the same value is rebroadcast
  // we leave the map alone so manual panning between updates is respected.
  const lastAppliedUserLatLng = useRef<{ lat: number; lng: number } | null>(null);

  // Current visible bounds — updated by the idle listener, read on button click.
  const boundsRef = useRef<MapBounds | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  // True only after the user has interacted with the map (drag / zoom).
  // Resets to false when the "Search this area" button is clicked.
  const [showSearchButton, setShowSearchButton] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const teachersWithCoords = useMemo(() => teachers.filter(hasCoords), [teachers]);

  // ── Effect 1: Initialize the map ONCE ────────────────────────────────────
  //
  // Depends ONLY on `apiKey`.  All prop / state changes that should NOT
  // cause a map rebuild are handled by separate effects below.
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

        // Determine initial centre (priority: props → browser geo → fallback).
        let center: { lat: number; lng: number };
        if (userLatRef.current && userLngRef.current) {
          center = { lat: userLatRef.current, lng: userLngRef.current };
          centeredOnUserRef.current = true;
          lastAppliedUserLatLng.current = { lat: center.lat, lng: center.lng };
        } else {
          center = await new Promise<{ lat: number; lng: number }>((resolve) => {
            if (!("geolocation" in navigator)) {
              resolve(FALLBACK_CENTER);
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                centeredOnUserRef.current = true;
                resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              },
              () => resolve(FALLBACK_CENTER),
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 300_000 },
            );
          });
        }

        if (cancelled) return;

        const map = new google.maps.Map(el, {
          center,
          zoom: initialZoom,
          disableDefaultUI: true,
          zoomControl: true,
          styles: MAP_MINIMAL_STYLES,
        });
        mapInstanceRef.current = map;

        // ── Marker clusterer — initialized once with the map ──────────────
        clustererRef.current = new MarkerClusterer({
          map,
          renderer: pratiqoClusterRenderer,
        });

        // ── "Search this area" — idle-based listener ─────────────────────
        //
        // Strategy:
        //   • The map fires `idle` once immediately after creation.
        //     We skip that first event so we don't show the button on load.
        //   • Every subsequent `idle` (after a user drag or zoom) updates
        //     `boundsRef` and reveals the floating button.
        //   • `setShowSearchButton` is a stable React setter — safe to call
        //     inside a listener without invalidating anything.
        let initialIdleFired = false;

        map.addListener("idle", () => {
          const b = map.getBounds();
          if (b) {
            const ne = b.getNorthEast();
            const sw = b.getSouthWest();
            boundsRef.current = {
              ne: { lat: ne.lat(), lng: ne.lng() },
              sw: { lat: sw.lat(), lng: sw.lng() },
            };
          }
          if (!initialIdleFired) {
            initialIdleFired = true; // skip the post-load idle
          } else {
            // User has moved the map — reveal the "Search this area" button.
            setShowSearchButton(true);
          }
        });

        setMapsReady(true);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t("noCoordinates"));
      }
    };

    void run();

    return () => {
      cancelled = true;
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      clustererRef.current?.clearMarkers();
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
      markersRef.current = [];
      mapInstanceRef.current = null;
      centeredOnUserRef.current = false;
      lastAppliedUserLatLng.current = null;
      boundsRef.current = null;
      if (mapRef.current) mapRef.current.innerHTML = "";
      setMapsReady(false);
      setShowSearchButton(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]); // ← only apiKey: the map must NOT reinitialise on any other change

  // ── Effect 2: "You are here" marker + recenter on origin change ──────────
  //
  // Recentering policy:
  //   • First time we see real user coords (initial mount or first prop set)
  //     → pan to them.
  //   • A new tuple from the parent (e.g. the student just saved a different
  //     address) → pan once to the new origin.
  //   • Same tuple replayed (re-render with unchanged props) → do NOT pan,
  //     so the user's manual map drags are preserved between updates.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapsReady) return;

    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;

    if (userLat != null && userLng != null) {
      const last = lastAppliedUserLatLng.current;
      const changed = !last || last.lat !== userLat || last.lng !== userLng;
      if (changed) {
        map.panTo({ lat: userLat, lng: userLng });
        centeredOnUserRef.current = true;
        lastAppliedUserLatLng.current = { lat: userLat, lng: userLng };
      }
      userMarkerRef.current = new google.maps.Marker({
        position: { lat: userLat, lng: userLng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#50BEB2",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
        title: t("youAreHere"),
      });
    } else {
      lastAppliedUserLatLng.current = null;
    }
  }, [mapsReady, userLat, userLng, t]);

  // ── Effect 3: Teacher price-pin markers — no map re-creation ─────────────
  //
  // Runs when the filtered teacher list changes (including after a bounds
  // search in the parent).  `onTeacherSelect` is read via ref so it is
  // never in the dep array — opening a profile does not re-run this effect.
  //
  // Markers are managed by the MarkerClusterer rather than being added
  // directly to the map; this keeps the "Free Roaming" and "Search this area"
  // behaviours fully intact because the idle listener and boundsRef live in
  // Effect 1 and are never touched here.
  useEffect(() => {
    const clusterer = clustererRef.current;
    if (!clusterer || !mapsReady) return;

    // Remove previous set of markers from the clusterer (and thus from the map).
    clusterer.clearMarkers();
    markersRef.current = [];

    const newMarkers: google.maps.Marker[] = [];

    for (const teacher of teachersWithCoords) {
      const amount = Number(teacher.pricePerLesson || 0);
      const display =
        Number.isFinite(amount) && amount > 0
          ? formatDisplayPrice(amount, teacher.currency ?? "CAD").primary.replace(/\s+/g, " ")
          : "?";
      const label = display.length > 10 ? display.replace(/^≈\s*/, "") : display;
      const isHighlight = highlightedTeacherId != null && teacher.id === highlightedTeacherId;
      // NOTE: no `map` prop — the clusterer controls placement on the map.
      const marker = new google.maps.Marker({
        position: { lat: teacher.location.lat, lng: teacher.location.lng },
        label: {
          text: label,
          color: "white",
          fontSize: isHighlight ? "12px" : "11px",
          fontWeight: "600",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isHighlight ? 23 : 20,
          fillColor: isHighlight ? "#2D7B72" : "#50BEB2",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: isHighlight ? 3 : 2,
        },
        title: teacher.name,
      });
      marker.addListener("click", () => {
        onTeacherSelectRef.current(teacher);
      });
      newMarkers.push(marker);
    }

    markersRef.current = newMarkers;
    // Hand all markers to the clusterer at once — a single render pass is
    // more efficient than adding them one-by-one.
    clusterer.addMarkers(newMarkers);
  }, [mapsReady, teachersWithCoords, highlightedTeacherId, formatDisplayPrice]); // onTeacherSelect deliberately excluded

  // ── Early returns ─────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8E6DF] bg-white p-4 text-sm text-[#6B6A65]">
        {t("noCoordinates")} — <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-[#F3D0D0] bg-[#FFF5F5] p-4 text-sm text-[#B42318]">
        {loadError}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {!mapsReady ? (
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-700">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          {t("loadingMap")}
        </div>
      ) : null}

      {/* Map container — never unmounted while the view is visible */}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: mapHeight,
          borderRadius: 12,
          overflow: "hidden",
        }}
        className="border border-[#E8E6DF] bg-[#F4F4F3]"
      />

      {/* ── "Search this area" button ──────────────────────────────────────
           Floats at the top-centre of the map.
           Appears after the user drags or zooms (post-first-idle).
           Disappears when clicked; reappears on the next pan/zoom.
           Lives outside the map container so Google Maps events don't
           interfere with pointer events on the button.               */}
      {mapsReady && showSearchButton && onBoundsSearch ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
          <button
            type="button"
            className={cn(
              "pointer-events-auto",
              "flex items-center gap-1.5 rounded-full border border-teal-500",
              "bg-white px-4 py-2 text-xs font-bold text-teal-700",
              "shadow-[0_4px_16px_rgba(44,44,42,0.14)] hover:bg-[#FAFCFB]",
              "transition-all duration-150 active:scale-95",
            )}
            onClick={() => {
              if (!boundsRef.current) return;
              setShowSearchButton(false);
              onBoundsSearchRef.current?.(boundsRef.current);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {t("searchAreaButton")}
          </button>
        </div>
      ) : null}

      {/* "Recentrer sur moi" — visible only when the user has saved/provided a location */}
      {mapsReady && userLat && userLng ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10">
          <button
            type="button"
            className={cn(
              "pointer-events-auto",
              "flex items-center gap-1.5 rounded-full border border-teal-500",
              "bg-white px-3 py-1.5 text-xs font-bold text-teal-700",
              "shadow-[0_4px_16px_rgba(44,44,42,0.14)] hover:bg-[#FAFCFB]",
              "transition-all duration-150 active:scale-95",
            )}
            onClick={() => {
              const map = mapInstanceRef.current;
              if (!map || !userLat || !userLng) return;
              map.panTo({ lat: userLat, lng: userLng });
            }}
          >
            📍 {t("mapRecenterOnMe")}
          </button>
        </div>
      ) : null}

      {/* Teacher mini-card overlay — completely decoupled from map state */}
      {selectedTeacher ? (
        <div
          className={cn(
            "fixed left-0 right-0 z-[55] px-4 sm:px-6",
            "bottom-20 md:bottom-6",
          )}
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-teal-500 bg-white p-4 shadow-[0_20px_60px_rgba(44,44,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#2C2C2A]">{publicFirstNameWithInitial(selectedTeacher.name)}</p>
                <p className="truncate text-xs text-[#6B6A65]">{selectedTeacher.discipline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6B6A65]">
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="text-teal-700" />
                    {selectedTeacher.rating}
                  </span>
                  <span className="text-[#D3D1C7]">·</span>
                  <span className="font-bold text-teal-700">
                    <PriceDisplay
                      amount={Number(selectedTeacher.pricePerLesson)}
                      sourceCurrency={selectedTeacher.currency ?? "CAD"}
                      perHour
                      primaryClassName="font-bold text-teal-700"
                      secondaryClassName="block w-full text-[9px] font-semibold text-slate-500"
                    />
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseSelected}
                aria-label={t("accessibilityCloseDialog")}
                className="shrink-0 rounded-full border border-[#E8E6DF] bg-white px-3 py-1 text-xs font-semibold text-[#2C2C2A] hover:bg-[#FAFCFB]"
              >
                ×
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onViewProfile(selectedTeacher)}
                className="rounded-full bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:brightness-[0.98]"
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
