"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { CITIES, type City } from "@/lib/cities";
import {
  CANADIAN_PLACES,
  searchCanadianPlaces,
  type CanadianPlace,
} from "@/lib/search/canadianPlaces";
import { haversineDistance } from "@/lib/geo";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/translations";

type Props = {
  value: string;
  onChange: (v: string) => void;
  geo: { lat: number; lng: number } | null;
  onSelectCity: (city: City) => void;
  className?: string;
  placeholderKey?: TranslationKey;
  /** Optional class overrides for the outer input shell (landing/student hero sizing). */
  shellClassName?: string;
  /** Optional class overrides for the text input element. */
  inputClassName?: string;
};

/**
 * Map a CanadianPlace from the canonical dataset to the legacy `City` shape
 * the rest of the app already consumes. This keeps the existing
 * `onSelectCity` contract intact while we migrate callers to the richer
 * `CanadianPlace` type.
 */
function placeToLegacyCity(place: CanadianPlace): City {
  return {
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    province: place.provinceCode,
    country: "CA",
  };
}

export function LandingLocationSearch({
  value,
  onChange,
  geo,
  onSelectCity,
  className,
  placeholderKey = "marketplaceLocationPlaceholder",
  shellClassName,
  inputClassName,
}: Props) {
  const { t } = useLocale();
  const uid = useId();
  const inputId = `${uid}-loc-input`;
  const listId = `${uid}-loc-list`;
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value.trim()), 200);
    return () => clearTimeout(id);
  }, [value]);

  // Reset hover/keyboard highlight when the result list changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  // Canada-aware accent-insensitive matcher. Up to 8 results, sorted by
  // prefix > population > distance. We keep the result count tight (the
  // dropdown only shows ~6) so the UI stays scannable.
  const places = useMemo(() => {
    if (debounced.length < 1) return [];
    const matches = searchCanadianPlaces(debounced, { limit: 8, geo });
    return matches.map((place) => ({
      place,
      city: placeToLegacyCity(place),
      distanceKm: geo
        ? Math.round(haversineDistance(geo.lat, geo.lng, place.lat, place.lng))
        : null,
    }));
  }, [debounced, geo]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPlace = useCallback(
    (entry: { place: CanadianPlace; city: City }) => {
      // Clear our local input — the parent owns the selected-place state and
      // can render a pill or update the geo. We never write to the parent's
      // subject query: that field is fully independent.
      onChange("");
      onSelectCity(entry.city);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onSelectCity],
  );

  const isOpen = open && places.length > 0 && debounced.length >= 1;
  const ph = t(placeholderKey);

  // Total entries in the canonical dataset, surfaced as a soft hint at the
  // bottom of the dropdown (e.g. "Searching across 150+ Canadian places").
  const placeCount = CANADIAN_PLACES.length;

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          // Strong focus ring so the active segment is unmistakable in the
          // segmented hero. Border + ring keep the field clearly framed
          // even on light hero gradients.
          "flex h-full items-center gap-2 rounded-2xl border border-[#E0DED5] bg-white px-4 py-3 text-[#2C2C2A] shadow-sm transition-colors",
          "focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/30",
          shellClassName,
        )}
      >
        <MapPin size={18} className="shrink-0 text-teal-800" aria-hidden />
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={value}
          aria-label={ph}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${uid}-loc-option-${activeIndex}` : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (debounced.length >= 1 && places.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
              inputRef.current?.blur();
              return;
            }
            if (!isOpen) {
              if (e.key === "ArrowDown" && places.length > 0) {
                e.preventDefault();
                setOpen(true);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % places.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => (i - 1 + places.length) % places.length);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const target = activeIndex >= 0 ? places[activeIndex] : places[0];
              if (target) selectPlace(target);
            }
          }}
          placeholder={ph}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            // `caret-teal-700` makes the blinking caret visible against the
            // white field — the prior near-invisible caret was the most
            // visible piece of the segmented-search regression.
            "min-w-0 flex-1 bg-transparent text-sm text-[#1F2A24] caret-teal-700 outline-none placeholder:text-slate-500",
            inputClassName,
          )}
        />
        {value ? (
          <button
            type="button"
            className="shrink-0 text-slate-500 hover:text-slate-700"
            aria-label={t("clearInput")}
            onClick={() => {
              onChange("");
              setOpen(false);
              setActiveIndex(-1);
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div
          id={listId}
          role="listbox"
          aria-label={ph}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[260px] overflow-auto rounded-2xl border border-[#E8E6DF] bg-white py-1 shadow-xl"
        >
          {places.map((entry, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${entry.place.name}-${entry.place.provinceCode}`}
                id={`${uid}-loc-option-${idx}`}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(-1)}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                  isActive ? "bg-teal-500/12" : "hover:bg-[#F9F8F5]",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPlace(entry)}
              >
                <MapPin size={14} className="shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 font-semibold text-[#2C2C2A]">
                  {entry.place.name}
                  <span className="font-normal text-neutral-700">, {entry.place.provinceCode}</span>
                </span>
                {entry.distanceKm != null ? (
                  <span className="shrink-0 text-xs text-neutral-700">
                    {entry.distanceKm} {t("searchKmFromYou")}
                  </span>
                ) : null}
              </button>
            );
          })}
          {/* Lightweight footer: keeps the surface honest about coverage. */}
          <div className="px-4 py-1 text-[10px] text-neutral-500">
            {placeCount}+ {t("landingPlacesCanadaHint")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
