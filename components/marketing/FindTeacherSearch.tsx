"use client";

/**
 * FindTeacherSearch — segmented search island used by the public
 * `/trouver-un-prof` marketing page.
 *
 * Mirrors the segmented architecture of `LandingDiscoverySearch`
 * (subject / place / format) but stays self-contained so the
 * marketing page does not need to load the entire teacher index just
 * to render the hero. The local state is intentionally minimal —
 * three independent slots — so the historical "selecting a city
 * silently overwrites the subject" bug cannot regress.
 *
 * Submit behaviour:
 *   - Pushes the user to the canonical search route `/student/search`
 *     with `q=<subject>` (the contract that surface already reads).
 *   - Echoes the place + format selections as additional query
 *     params (`place=<city>` / `format=<online|in_person|hybrid|all>`)
 *     so the URL captures full intent for analytics / sharing without
 *     forcing a search-engine internals change.
 *
 * Reuses, never reimplements:
 *   - `LandingLocationSearch` for the place autocomplete (Canadian
 *     places dataset). Its `disableCitySuggestions`-equivalent
 *     contract is enforced by routing all subject text through the
 *     plain `<input>` for "Quoi", which has no autocomplete at all.
 *   - i18n via `useLocale`. Every label and placeholder reads from
 *     the new `findTeacher*` translation keys; the component is
 *     fully FR/EN/ES-ready.
 *
 * Out-of-scope guarantees (no code in this file may reference
 * them): Stripe, Supabase RLS, payments, migrations, search engine
 * internals, booking, Membre Pro, legal pages, YoPratiqo audio.
 */

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { City } from "@/lib/cities";
import { LandingLocationSearch } from "@/components/marketing/LandingLocationSearch";
import { cn } from "@/lib/utils";

/** Keep the `format` param identical to the values `/student/search` already understands. */
type FindTeacherFormat = "all" | "online" | "in_person" | "hybrid";

export function FindTeacherSearch({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const formatId = useId();

  const [subject, setSubject] = useState("");
  const [place, setPlace] = useState("");
  const [format, setFormat] = useState<FindTeacherFormat>("all");

  const formatOptions = useMemo(
    () =>
      [
        { value: "all" as const, label: t("findTeacherSearchFormatAny") },
        { value: "online" as const, label: t("teachingFormatOnline") },
        { value: "in_person" as const, label: t("teachingFormatInPerson") },
        { value: "hybrid" as const, label: t("teachingFormatHybrid") },
      ],
    [t],
  );

  const onSelectCity = (city: City) => {
    // Subject/place independence: never touch the subject when a
    // place is picked. Echo the formatted "City, PROV" label back
    // into the place field so the user can see which place is now
    // selected.
    setPlace(city.province ? `${city.name}, ${city.province}` : city.name);
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    const trimmedSubject = subject.trim();
    const trimmedPlace = place.trim();
    if (trimmedSubject) params.set("q", trimmedSubject);
    if (trimmedPlace) params.set("place", trimmedPlace);
    if (format !== "all") params.set("format", format);
    const qs = params.toString();
    router.push(qs ? `/student/search?${qs}` : "/student/search");
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={cn(
        "rounded-3xl border border-[#E4E2DA] bg-white p-3 text-left shadow-[0_8px_32px_rgba(15,110,86,0.08)] sm:p-4",
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1.25fr_1fr_auto] lg:items-end">
        {/* Quoi */}
        <div className="min-w-0">
          <label
            htmlFor={`${formatId}-subject`}
            className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B6258]"
          >
            {t("findTeacherSearchWhatLabel")}
          </label>
          <input
            id={`${formatId}-subject`}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("findTeacherSearchWhatPlaceholder")}
            autoComplete="off"
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-[#2C2C2A] shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 sm:text-lg"
          />
        </div>

        {/* Où */}
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B6258]">
            {t("findTeacherSearchWhereLabel")}
          </p>
          <LandingLocationSearch
            value={place}
            onChange={setPlace}
            geo={null}
            onSelectCity={onSelectCity}
            placeholderKey="findTeacherSearchWherePlaceholder"
            shellClassName="h-14 min-h-[56px] border-slate-200 py-0 shadow-sm [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-teal-700"
            inputClassName="text-base sm:text-lg placeholder:text-slate-500"
          />
        </div>

        {/* Format */}
        <div className="min-w-0">
          <label
            htmlFor={`${formatId}-format`}
            className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B6258]"
          >
            {t("findTeacherSearchFormatLabel")}
          </label>
          <select
            id={`${formatId}-format`}
            value={format}
            onChange={(e) => setFormat(e.target.value as FindTeacherFormat)}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-[#2C2C2A] shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 sm:text-lg"
          >
            {formatOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <div className="lg:flex lg:items-end">
          <button
            type="submit"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-7 text-base font-semibold text-white shadow-[0_10px_24px_rgba(15,110,86,0.22)] transition-colors hover:bg-[#0B5F4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 sm:text-lg lg:w-auto"
          >
            <Search className="h-5 w-5" aria-hidden />
            {t("findTeacherSearchSubmit")}
          </button>
        </div>
      </div>
    </form>
  );
}
