"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, Users } from "lucide-react";
import type { Teacher } from "@/types";
import { haversineDistance } from "@/lib/geo";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/cities";
import { CITIES } from "@/lib/cities";
import { publicFirstNameWithInitial } from "@/lib/identity/displayName";
import type { TranslationKey } from "@/lib/translations";
import {
  GENERAL_DISCIPLINE_BUCKET_IDS,
  searchSubjectBuckets,
  type LocalizedSubjectMatch,
} from "@/lib/search/subjectBuckets";

// ─── Types ───────────────────────────────────────────────────────────────────

type SubjectSuggestion = { kind: "subject"; match: LocalizedSubjectMatch };
type TeacherSuggestion = { kind: "teacher"; teacher: Teacher };
type CitySuggestion    = { kind: "city";    city: City; distanceKm: number | null };
type Suggestion        = SubjectSuggestion | TeacherSuggestion | CitySuggestion;

type Section = {
  // "disciplines" is preserved as the section key so existing i18n
  // (`searchSectionDisciplines`) and dropdown styling remain unchanged.
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
  /**
   * Optional. When omitted, city suggestions are suppressed entirely — useful
   * in segmented "Quoi" inputs where places live in a separate field. The
   * legacy single-bar surface still passes a handler so cities remain
   * suggestable there.
   */
  onSelectCity?: (city: City) => void;
  /** Defaults to `searchInputPlaceholder`. */
  inputPlaceholderKey?: TranslationKey;
  className?: string;
  /** Optional class overrides for the outer input shell (landing/student hero sizing). */
  shellClassName?: string;
  /** Optional class overrides for the text input element. */
  inputClassName?: string;
  /**
   * Force-hide city suggestions even if `onSelectCity` is provided. Set this
   * when the input is the "Quoi" segment of a segmented search bar so place
   * matches never surface alongside subjects/teachers.
   */
  disableCitySuggestions?: boolean;
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
  disableCitySuggestions,
}: SmartSearchInputProps) {
  const citySuggestionsEnabled = !disableCitySuggestions && Boolean(onSelectCity);
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

  // ── Compute suggestions ──────────────────────────────────────────────────
  const sections = useMemo<Section[]>(() => {
    const q = debouncedQuery.toLowerCase();
    if (q.length < 2) return [];

    // 1. Subjects — the rich autosuggest vocabulary (instruments, languages,
    //    academic subjects, etc.) from `lib/search/subjectBuckets.ts`. The
    //    matcher is accent-insensitive and alias-aware, so typing "pi" finds
    //    Piano, "esp" finds Espagnol, "ukulele" finds Ukulélé, "math" finds
    //    Mathématiques. Broad categories (Langues, Musique, Tuteurs
    //    académiques) are surfaced through the `*_general` buckets, which
    //    preserves the original 3-discipline dropdown behavior as a subset.
    const subjectMatches = searchSubjectBuckets(debouncedQuery, { locale, limit: 6 });
    const subjectItems: SubjectSuggestion[] = subjectMatches.map((match) => ({
      kind: "subject",
      match,
    }));

    // 2. Teachers — match name, discipline or bio
    const teacherItems: TeacherSuggestion[] = teachers
      .filter((tt) =>
        contains(tt.name, q) || contains(tt.discipline, q) || contains(tt.bio, q),
      )
      .slice(0, 2)
      .map((tt) => ({ kind: "teacher", teacher: tt }));

    // 3. Cities — match name; sort by distance when geo available.
    //    Suppressed entirely in segmented mode (Quoi-only) so place matches
    //    never bleed into the subject autocomplete.
    const cityItems: CitySuggestion[] = citySuggestionsEnabled
      ? CITIES
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
          .slice(0, 3)
      : [];

    const result: Section[] = [];
    // The section key stays "disciplines" so the existing i18n header
    // (`searchSectionDisciplines`) and dropdown styling don't change.
    if (subjectItems.length) result.push({ key: "disciplines", labelKey: "searchSectionDisciplines", items: subjectItems });
    if (teacherItems.length) result.push({ key: "teachers",    labelKey: "searchSectionTeachers",    items: teacherItems });
    if (cityItems.length)    result.push({ key: "cities",      labelKey: "searchSectionNearby",      items: cityItems });
    return result;
  }, [debouncedQuery, locale, teachers, geo, citySuggestionsEnabled]);

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
      if (item.kind === "subject") {
        const { bucket, displayLabel } = item.match;
        if (GENERAL_DISCIPLINE_BUCKET_IDS.has(bucket.canonicalId)) {
          // Broad-category buckets keep the legacy behavior: route through
          // `onSelectDiscipline` so the parent's existing category-chip
          // filter activates. The French label is intentional — the parent
          // matches `activeCat` against the canonical French discipline
          // label from `lib/disciplines.ts` regardless of UI locale.
          onChange("");
          onSelectDiscipline(bucket.labels.fr);
        } else {
          // Specific subjects: populate the input with the localized label
          // and let the parent's existing text-driven teacher filter take
          // over. No new callback contract — typing "Piano" already filters
          // teachers whose discipline / bio matches.
          onChange(displayLabel);
        }
      } else if (item.kind === "teacher") {
        onChange(item.teacher.name);
        onSelectTeacher(item.teacher);
      } else if (citySuggestionsEnabled && onSelectCity) {
        onChange(item.city.name);
        onSelectCity(item.city);
      }
    },
    [onChange, onSelectDiscipline, onSelectTeacher, onSelectCity, citySuggestionsEnabled],
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
          // The focus-within ring + visible border keeps the active segment
          // unmistakably highlighted on the segmented hero (premium look,
          // accessible). `caret-teal-700` ensures a strong blinking caret
          // even on white backgrounds (the prior dark-on-light caret was
          // barely visible on some browsers).
          "flex items-center gap-2 rounded-2xl border border-[#E0DED5] bg-white px-4 py-3 text-[#2C2C2A] shadow-sm transition-colors",
          "focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/30",
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
            "min-w-0 flex-1 bg-transparent text-sm text-[#1F2A24] caret-teal-700 outline-none placeholder:text-slate-500",
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
                      item.kind === "subject" ? `subject:${item.match.bucket.canonicalId}`
                      : item.kind === "teacher" ? item.teacher.id
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
                    {item.kind === "subject" && (
                      <>
                        {item.match.bucket.emoji ? (
                          <span className="text-lg leading-none shrink-0">{item.match.bucket.emoji}</span>
                        ) : (
                          <span className="w-[18px] shrink-0" aria-hidden />
                        )}
                        <span className="text-sm font-semibold text-[#2C2C2A]">
                          <Highlight text={item.match.displayLabel} query={debouncedQuery} />
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
