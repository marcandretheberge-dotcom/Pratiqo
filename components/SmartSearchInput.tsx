"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, Users } from "lucide-react";
import type { Teacher } from "@/types";
import type { Discipline } from "@/lib/disciplines";
import { getEnabledDisciplines } from "@/lib/disciplines";
import { haversineDistance } from "@/lib/geo";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/cities";
import { CITIES } from "@/lib/cities";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";
import type { TranslationKey } from "@/lib/translations";

// ─── Types ───────────────────────────────────────────────────────────────────

type DisciplineSuggestion = { kind: "discipline"; discipline: Discipline; matchedLabel: string };
type TeacherSuggestion    = { kind: "teacher";    teacher: Teacher };
type CitySuggestion       = { kind: "city";       city: City; distanceKm: number | null };
type Suggestion           = DisciplineSuggestion | TeacherSuggestion | CitySuggestion;

type Section = {
  key: "disciplines" | "teachers" | "cities";
  labelKey: TranslationKey;
  items: Suggestion[];
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  teachers: Teacher[];
  geo: { lat: number; lng: number } | null;
  onSelectTeacher: (teacher: Teacher) => void;
  onSelectDiscipline: (label: string) => void;
  onSelectCity: (city: City) => void;
  /** Defaults to `searchInputPlaceholder`. */
  inputPlaceholderKey?: TranslationKey;
  className?: string;
  /** Optional class overrides for the outer input shell (landing/student hero sizing). */
  shellClassName?: string;
  /** Optional class overrides for the text input element. */
  inputClassName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function contains(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle);
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-teal-500/20 text-teal-700 not-italic font-semibold rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SmartSearchInput({
  value,
  onChange,
  teachers,
  geo,
  onSelectTeacher,
  onSelectDiscipline,
  onSelectCity,
  inputPlaceholderKey = "searchInputPlaceholder",
  className,
  shellClassName,
  inputClassName,
}: SmartSearchInputProps) {
  const { t, locale } = useLocale();
  const ph = t(inputPlaceholderKey);
  const uid = useId();
  const inputId = `${uid}-search-input`;
  const listboxId = `${uid}-search-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const [open, setOpen]               = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 200 ms debounce for suggestion computation
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(value.trim()), 200);
    return () => clearTimeout(id);
  }, [value]);

  // Reset active index when suggestions change
  useEffect(() => { setActiveIndex(-1); }, [debouncedQuery]);

  // Click-outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const disciplineLabel = useCallback(
    (d: Discipline) => {
      if (locale === "en") return d.labelEn ?? d.label;
      if (locale === "es")    return d.labelEs ?? d.label;
      return d.label;
    },
    [locale],
  );

  const enabledDisciplines = useMemo(() => getEnabledDisciplines(), []);

  // ── Compute suggestions ──────────────────────────────────────────────────
  const sections = useMemo<Section[]>(() => {
    const q = debouncedQuery.toLowerCase();
    if (q.length < 2) return [];

    // 1. Disciplines — match any locale label
    const disciplineItems: DisciplineSuggestion[] = enabledDisciplines
      .filter((d) =>
        contains(d.label, q) || contains(d.labelEn, q) || contains(d.labelEs, q),
      )
      .slice(0, 3)
      .map((d) => ({ kind: "discipline", discipline: d, matchedLabel: disciplineLabel(d) }));

    // 2. Teachers — match name, discipline or bio
    const teacherItems: TeacherSuggestion[] = teachers
      .filter((tt) =>
        contains(tt.name, q) || contains(tt.discipline, q) || contains(tt.bio, q),
      )
      .slice(0, 2)
      .map((tt) => ({ kind: "teacher", teacher: tt }));

    // 3. Cities — match name; sort by distance when geo available
    const cityItems: CitySuggestion[] = CITIES
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({
        kind: "city" as const,
        city: c,
        distanceKm: geo
          ? Math.round(haversineDistance(geo.lat, geo.lng, c.lat, c.lng))
          : null,
      }))
      .sort((a, b) =>
        a.distanceKm != null && b.distanceKm != null ? a.distanceKm - b.distanceKm : 0,
      )
      .slice(0, 3);

    const result: Section[] = [];
    if (disciplineItems.length) result.push({ key: "disciplines", labelKey: "searchSectionDisciplines", items: disciplineItems });
    if (teacherItems.length)    result.push({ key: "teachers",    labelKey: "searchSectionTeachers",    items: teacherItems });
    if (cityItems.length)       result.push({ key: "cities",      labelKey: "searchSectionNearby",      items: cityItems });
    return result;
  }, [debouncedQuery, enabledDisciplines, teachers, geo, disciplineLabel]);

  // Flat list for keyboard nav
  const flatItems = useMemo<Suggestion[]>(
    () => sections.flatMap((s) => s.items),
    [sections],
  );

  const isOpen = open && flatItems.length > 0;

  // ── Selection ────────────────────────────────────────────────────────────
  const select = useCallback(
    (item: Suggestion) => {
      setOpen(false);
      if (item.kind === "discipline") {
        onChange("");
        onSelectDiscipline(item.discipline.label);
      } else if (item.kind === "teacher") {
        onChange(item.teacher.name);
        onSelectTeacher(item.teacher);
      } else {
        onChange(item.city.name);
        onSelectCity(item.city);
      }
    },
    [onChange, onSelectDiscipline, onSelectTeacher, onSelectCity],
  );

  // ── Keyboard ─────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") { setOpen(true); return; }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        select(flatItems[activeIndex]!);
      } else {
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  // ── Render flat index across sections ────────────────────────────────────
  let flatIdx = 0;

  return (
    <div ref={containerRef} className={cn("relative min-w-0 flex-1", className)}>
      {/* Input */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[#2C2C2A] shadow-sm",
          shellClassName,
        )}
      >
        <Search size={18} className="shrink-0 text-slate-600" aria-hidden />
        <input
          id={inputId}
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { if (debouncedQuery.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={ph}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600",
            inputClassName,
          )}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${uid}-search-option-${activeIndex}` : undefined}
          aria-label={ph}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="shrink-0 text-slate-500 hover:text-slate-700 transition-colors text-lg leading-none"
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={inputId}
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1.5",
            "rounded-2xl border border-[#E8E6DF] bg-white shadow-xl overflow-hidden",
          )}
        >
          {sections.map((section) => (
            <div key={section.key}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6760]">
                  {section.key === "disciplines" && "📚 "}
                  {section.key === "teachers"    && "👨‍🏫 "}
                  {section.key === "cities"      && "📍 "}
                  {t(section.labelKey)}
                </p>
              </div>
              {section.items.map((item) => {
                const idx = flatIdx++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={
                      item.kind === "discipline" ? item.discipline.id
                      : item.kind === "teacher"  ? item.teacher.id
                      : item.city.name
                    }
                    id={`${uid}-search-option-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    onClick={() => select(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isActive ? "bg-teal-500/10" : "hover:bg-[#F9F8F5]",
                    )}
                  >
                    {item.kind === "discipline" && (
                      <>
                        <span className="text-lg leading-none shrink-0">{item.discipline.emoji}</span>
                        <span className="text-sm font-semibold text-[#2C2C2A]">
                          <Highlight text={item.matchedLabel} query={debouncedQuery} />
                        </span>
                      </>
                    )}

                    {item.kind === "teacher" && (
                      <>
                        <div className="shrink-0 h-8 w-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold">
                          {initials(item.teacher.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#2C2C2A] truncate">
                            <Highlight text={publicFirstNameWithInitial(item.teacher.name)} query={debouncedQuery} />
                          </p>
                          <p className="text-xs text-[#6B6760] truncate">
                            {item.teacher.discipline}
                            {item.teacher.location?.neighborhood
                              ? ` · ${item.teacher.location.neighborhood}`
                              : ""}
                          </p>
                        </div>
                        <Users size={14} className="shrink-0 text-[#D3D1C7]" />
                      </>
                    )}

                    {item.kind === "city" && (
                      <>
                        <MapPin size={16} className="shrink-0 text-[#6B6760]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#2C2C2A]">
                            <Highlight text={item.city.name} query={debouncedQuery} />
                            {item.city.province ? (
                              <span className="font-normal text-[#6B6760]">, {item.city.province}</span>
                            ) : null}
                          </p>
                        </div>
                        {item.distanceKm != null && (
                          <span className="shrink-0 text-xs text-[#6B6760] font-medium">
                            {item.distanceKm} {t("searchKmFromYou")}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {/* bottom padding */}
          <div className="h-1.5" />
        </div>
      )}
    </div>
  );
}
