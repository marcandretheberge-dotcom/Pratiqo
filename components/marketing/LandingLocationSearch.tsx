"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { CITIES, type City } from "@/lib/cities";
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

function contains(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
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
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value.trim()), 200);
    return () => clearTimeout(id);
  }, [value]);

  const cities = useMemo(() => {
    const q = debounced.toLowerCase();
    if (q.length < 1) return [];
    return CITIES.filter((c) => contains(c.name, q) || (c.province && contains(c.province, q)))
      .map((city) => ({
        city,
        distanceKm: geo ? Math.round(haversineDistance(geo.lat, geo.lng, city.lat, city.lng)) : null,
      }))
      .sort((a, b) =>
        a.distanceKm != null && b.distanceKm != null ? a.distanceKm - b.distanceKm : 0,
      )
      .slice(0, 6);
  }, [debounced, geo]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCity = useCallback(
    (c: City) => {
      onChange("");
      onSelectCity(c);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange, onSelectCity],
  );

  const isOpen = open && cities.length > 0 && debounced.length >= 1;
  const ph = t(placeholderKey);

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex h-full items-center gap-2 rounded-2xl border border-[#E8E6DF] bg-white px-4 py-3 text-[#2C2C2A] shadow-sm",
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
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (debounced.length >= 1 && cities.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
            if (e.key === "Enter" && cities[0]?.city) {
              e.preventDefault();
              selectCity(cities[0]!.city);
            }
          }}
          placeholder={ph}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500",
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
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[220px] overflow-auto rounded-2xl border border-[#E8E6DF] bg-white py-1 shadow-xl"
        >
          {cities.map(({ city, distanceKm }) => (
            <button
              key={city.name}
              type="button"
              role="option"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F9F8F5]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectCity(city)}
            >
              <MapPin size={14} className="shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1 font-semibold text-[#2C2C2A]">
                {city.name}
                {city.province ? (
                  <span className="font-normal text-neutral-700">, {city.province}</span>
                ) : null}
              </span>
              {distanceKm != null ? (
                <span className="shrink-0 text-xs text-neutral-700">
                  {distanceKm} {t("searchKmFromYou")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
