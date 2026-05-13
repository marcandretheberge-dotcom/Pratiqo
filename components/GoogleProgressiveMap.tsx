"use client";

import React, { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Lock } from "lucide-react";
import { blurCoordinates } from "../lib/maps";

const MAP_MINIMAL_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
];

type LatLng = { lat: number; lng: number };

type Props = {
  /** Stable key so blur cache resets when entity changes */
  mapKey: string;
  exactLat: number;
  exactLng: number;
  locked: boolean;
  neighborhood?: string | null;
  /** Full address when unlocked (directions + display) */
  fullAddress?: string | null;
  lockedMessage: string;
};

export function GoogleProgressiveMap({ mapKey, exactLat, exactLng, locked, neighborhood, fullAddress, lockedMessage }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const blurCacheRef = useRef<{ key: string; point: LatLng } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    const el = containerRef.current;
    let cancelled = false;

    const run = async () => {
      setLoadError(null);
      try {
        setOptions({ key: apiKey, v: "weekly" });
        await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
        ]);
        if (cancelled || !containerRef.current) return;

        const blurKey = `${mapKey}|${exactLat}|${exactLng}|locked`;
        if (locked) {
          if (!blurCacheRef.current || blurCacheRef.current.key !== blurKey) {
            blurCacheRef.current = { key: blurKey, point: blurCoordinates(exactLat, exactLng) };
          }
        }
        const center: LatLng = locked ? blurCacheRef.current!.point : { lat: exactLat, lng: exactLng };

        const map = new google.maps.Map(el, {
          center,
          zoom: locked ? 14 : 16,
          disableDefaultUI: true,
          zoomControl: !locked,
          gestureHandling: "greedy",
          styles: MAP_MINIMAL_STYLES,
        });
        mapInstanceRef.current = map;

        circleRef.current?.setMap(null);
        markerRef.current?.setMap(null);
        circleRef.current = null;
        markerRef.current = null;

        if (locked) {
          circleRef.current = new google.maps.Circle({
            map,
            center,
            radius: 500,
            strokeColor: "#50BEB2",
            strokeOpacity: 0.85,
            strokeWeight: 2,
            fillColor: "#50BEB2",
            fillOpacity: 0.12,
          });
        } else {
          markerRef.current = new google.maps.Marker({
            map,
            position: { lat: exactLat, lng: exactLng },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#50BEB2",
              fillOpacity: 1,
              strokeColor: "#0d7a5a",
              strokeWeight: 2,
              scale: 9,
            },
          });
        }

        setMapsReady(true);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Carte indisponible");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      circleRef.current?.setMap(null);
      markerRef.current?.setMap(null);
      mapInstanceRef.current = null;
      circleRef.current = null;
      markerRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      setMapsReady(false);
    };
  }, [apiKey, mapKey, exactLat, exactLng, locked]);

  if (!apiKey) {
    return (
      <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
        Configure <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> pour afficher la carte.
      </p>
    );
  }

  if (loadError) {
    return <p className="text-sm text-rose-600 rounded-xl border border-rose-100 bg-rose-50 p-4">{loadError}</p>;
  }

  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${exactLat},${exactLng}`)}`;

  return (
    <div className="space-y-2">
      <div className="relative h-[250px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <div ref={containerRef} className="h-full w-full" />

        {locked && mapsReady ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/55 px-4 text-center backdrop-blur-[2px]">
            <Lock className="text-teal-700" size={28} strokeWidth={2.2} />
            <p className="max-w-[280px] text-xs font-semibold leading-snug text-slate-800">{lockedMessage}</p>
          </div>
        ) : null}
      </div>

      {neighborhood ? (
        <p className="text-[13px] font-medium text-slate-600">
          <span className="text-slate-600">Quartier : </span>
          {neighborhood}
        </p>
      ) : null}

      {!locked ? (
        <div className="space-y-2">
          {fullAddress ? <p className="text-sm font-medium text-slate-800">{fullAddress}</p> : null}
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full bg-teal-600 px-5 text-sm font-semibold text-white hover:brightness-[0.98]"
          >
            Obtenir l&apos;itinéraire
          </a>
        </div>
      ) : null}
    </div>
  );
}
