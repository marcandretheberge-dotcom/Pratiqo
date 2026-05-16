"use client";

import { useCallback, useEffect, useState } from "react";
import type { Teacher } from "@/types";
import type { MapBounds } from "@/components/SearchMapView";

export function useMarketplaceMapState({
  initialViewMode = "list",
  trackDesktopMap = false,
}: {
  initialViewMode?: "list" | "map";
  trackDesktopMap?: boolean;
} = {}) {
  const [viewMode, setViewMode] = useState<"list" | "map">(initialViewMode);
  const [mapLoaded, setMapLoaded] = useState(initialViewMode === "map");
  const [desktopMapEnabled, setDesktopMapEnabled] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedMapTeacher, setSelectedMapTeacher] = useState<Teacher | null>(null);
  const [highlightedTeacherId, setHighlightedTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!trackDesktopMap || typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setDesktopMapEnabled(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [trackDesktopMap]);

  const clearMapBounds = useCallback(() => {
    setMapBounds(null);
  }, []);

  const showMap = useCallback(() => {
    setViewMode("map");
    setMapLoaded(true);
  }, []);

  return {
    viewMode,
    setViewMode,
    mapLoaded,
    setMapLoaded,
    desktopMapEnabled,
    mapBounds,
    setMapBounds,
    clearMapBounds,
    selectedMapTeacher,
    setSelectedMapTeacher,
    highlightedTeacherId,
    setHighlightedTeacherId,
    showMap,
  };
}
