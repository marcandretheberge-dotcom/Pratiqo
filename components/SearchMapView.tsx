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
import { Drawer } from "vaul";

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

function createPratiqoClusterRenderer(MarkerClass: typeof google.maps.Marker, SizeClass: typeof google.maps.Size): Renderer {
  return {
    render({ count, position }) {
      const svg = window.btoa(
        `<svg fill="#50BEB2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">` +
          `<circle cx="120" cy="120" opacity=".9" r="68"/>` +
          `<circle cx="120" cy="120" opacity=".35" r="92"/>` +
          `<circle cx="120" cy="120" opacity=".18" r="116"/>` +
          `</svg>`,
      );
      return new MarkerClass({
        position,
        icon: {
          url: `data:image/svg+xml;base64,${svg}`,
          scaledSize: new SizeClass(52, 52),
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
}

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
  const { t, formatPrice } = useLocale();

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

  // Current visible bounds — updated by the idle listener, read on button click.
  const boundsRef = useRef<MapBounds | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [googleCore, setGoogleCore] = useState<google.maps.CoreLibrary | null>(null);
  const [googleMaps, setGoogleMaps] = useState<google.maps.MapsLibrary | null>(null);
  const [googleMarker, setGoogleMarker] = useState<google.maps.MarkerLibrary | null>(null);
  
  const mapsReady = !!googleCore && !!googleMaps && !!googleMarker;

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
        const [coreResult, mapsResult, markerResult] = await Promise.all([
          importLibrary("core") as Promise<google.maps.CoreLibrary>,
          importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
        ]);
        if (cancelled || !mapRef.current) return;

        setGoogleCore(coreResult);
        setGoogleMaps(mapsResult);
        setGoogleMarker(markerResult);

        // Determine initial centre (priority: props → browser geo → fallback).
        let center: { lat: number; lng: number };
        if (userLatRef.current && userLngRef.current) {
          center = { lat: userLatRef.current, lng: userLngRef.current };
          centeredOnUserRef.current = true;
        } else {
          center = await new Promise<{ lat: number; lng: number }>((resolve) => {
            if (!("geolocation" in navigator)) {
              resolve(FALLBACK_CENTER);
              return;
            }
            // Enforce a strict fallback timeout in case the browser swallows the permission prompt or hangs
            const fallbackTimeout = setTimeout(() => {
              resolve(FALLBACK_CENTER);
            }, 3000);
            
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(fallbackTimeout);
                centeredOnUserRef.current = true;
                resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              },
              () => {
                clearTimeout(fallbackTimeout);
                resolve(FALLBACK_CENTER);
              },
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 300_000 },
            );
          });
        }

        if (cancelled) return;

        const map = new mapsResult.Map(el, {
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
          renderer: createPratiqoClusterRenderer(markerResult.Marker, coreResult.Size),
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
      boundsRef.current = null;
      if (mapRef.current) mapRef.current.innerHTML = "";
      setShowSearchButton(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]); // ← only apiKey: the map must NOT reinitialise on any other change

  // ── Effect 2: "You are here" marker — no map re-creation ─────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapsReady || !googleMarker || !googleCore) return;

    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;

    if (userLat && userLng) {
      if (!centeredOnUserRef.current) {
        map.panTo({ lat: userLat, lng: userLng });
        centeredOnUserRef.current = true;
      }
      userMarkerRef.current = new googleMarker.Marker({
        position: { lat: userLat, lng: userLng },
        map,
        icon: {
          path: googleCore.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#50BEB2",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
        title: t("youAreHere"),
      });
    }
  }, [mapsReady, googleMarker, googleCore, userLat, userLng, t]);

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
    if (!clusterer || !mapsReady || !googleMarker || !googleCore) return;

    // Remove previous set of markers from the clusterer (and thus from the map).
    clusterer.clearMarkers();
    markersRef.current = [];

    const newMarkers: google.maps.Marker[] = [];

    const getMarkerColor = (discipline: string, isHighlight: boolean) => {
      if (isHighlight) return "#2D7B72"; // Highlighted
      const d = discipline.toLowerCase();
      // Languages
      if (d.includes("anglais") || d.includes("espagnol") || d.includes("francais") || d.includes("langue") || d.includes("francisation")) {
        return "#9CAF88"; 
      }
      // Academic/Sciences
      if (d.includes("math") || d.includes("physique") || d.includes("science") || d.includes("scolaire") || d.includes("aide") || d.includes("chimie") || d.includes("biologie")) {
        return "#FF6B35"; 
      }
      // Default (Music, Arts, etc.)
      return "#50BEB2"; 
    };

    for (const teacher of teachersWithCoords) {
      const label = `${Math.round(Number(teacher.pricePerLesson || 0)) || "?"}$`;
      const isHighlight = highlightedTeacherId != null && teacher.id === highlightedTeacherId;
      const markerColor = getMarkerColor(teacher.discipline || "", isHighlight);
      
      // NOTE: no `map` prop — the clusterer controls placement on the map.
      const marker = new googleMarker.Marker({
        position: { lat: teacher.location.lat, lng: teacher.location.lng },
        label: {
          text: label,
          color: "white",
          fontSize: isHighlight ? "12px" : "11px",
          fontWeight: "600",
        },
        icon: {
          path: googleCore.SymbolPath.CIRCLE,
          scale: isHighlight ? 23 : 20,
          fillColor: markerColor,
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
  }, [mapsReady, googleMarker, googleCore, teachersWithCoords, highlightedTeacherId]); // onTeacherSelect deliberately excluded

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

      {/* Teacher mini-card overlay using Vaul for native bottom sheet feel */}
      <Drawer.Root open={!!selectedTeacher} onOpenChange={(open) => !open && onCloseSelected()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[50]" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-3xl fixed bottom-0 left-0 right-0 z-[55] outline-none shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
            <Drawer.Title className="sr-only">Teacher Details</Drawer.Title>
            <Drawer.Description className="sr-only">Details for the selected teacher.</Drawer.Description>
            {selectedTeacher && (
              <div className="p-6 pb-8 mx-auto w-full max-w-3xl relative">
                {/* Drag handle */}
                <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-200 mb-6" />
                
                <button
                  type="button"
                  onClick={onCloseSelected}
                  aria-label={t("accessibilityCloseDialog")}
                  className="absolute top-6 right-6 shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                <div className="flex items-start justify-between gap-4 pr-12">
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-bold text-slate-900">{selectedTeacher.name}</p>
                    <p className="truncate text-base text-slate-600">{selectedTeacher.discipline}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Star size={16} className="text-teal-500" fill="currentColor" />
                        {selectedTeacher.rating}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-teal-700">
                        {formatPrice(Number(selectedTeacher.pricePerLesson))}/h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => onViewProfile(selectedTeacher)}
                    className="w-full flex-1 rounded-2xl bg-teal-600 px-4 py-3.5 text-center text-sm font-bold text-white hover:bg-teal-700 transition-colors"
                  >
                    {t("viewProfile")}
                  </button>
                  <button
                    type="button"
                    onClick={onCloseSelected}
                    className="w-full flex-none sm:w-auto rounded-2xl border-2 border-slate-200 bg-white px-6 py-3.5 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
