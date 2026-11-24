import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { t } from "@/lib/i18n/server";
import { fetchIndexableDiscoveryTeachers, toDiscoveryCard } from "@/lib/seo/localTeacherDiscoveryPages";
import { filterPublicTeachers, publicSearchFilters } from "@/lib/search/publicTeacherSearch";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeacherListingCapabilities } from "@/lib/teachers/listingBookability";
import { teacherBookingActionKey } from "@/lib/teachers/bookingCapability";

export async function PublicTeacherResults({ filters, locale }: { filters: ReturnType<typeof publicSearchFilters>; locale: Locale }) {
  let teachers;
  try {
    const rows = filterPublicTeachers(await fetchIndexableDiscoveryTeachers(), filters);
    const capabilities = rows.length ? await getTeacherListingCapabilities(getSupabaseAdmin(), rows.map(row => row.id)) : {};
    teachers = rows.map(row => ({
      ...toDiscoveryCard({ row, distanceKm: null, isOnlineFallback: false }),
      city: row.city,
      bookingAction: capabilities[row.id]?.action,
    })).sort((a, b) => Number(b.bookingAction === "book") - Number(a.bookingAction === "book") ||
      a.displayName.localeCompare(b.displayName, locale));
  } catch {
    return <p role="status">{t(locale, "landingHomepageLoadErrorTitle")}</p>;
  }
  if (!teachers.length) return <p role="status">{t(locale, "noTeachersFound")}</p>;

  const money = new Intl.NumberFormat(locale + "-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {teachers.map(teacher => (
        <li key={teacher.id}>
          <Link href={teacher.profilePath} className="block h-full rounded-2xl border border-[#DCEAE3] bg-white p-5 text-slate-800 hover:border-teal-600 focus-visible:outline-teal-700">
            <strong>{teacher.displayName}</strong>
            <p className="mt-1 text-sm">{[teacher.discipline, teacher.city].filter(Boolean).join(" · ")}</p>
            {teacher.pricePerLesson !== null && <p className="mt-2 text-sm">{money.format(teacher.pricePerLesson)} {t(locale, "perHourSuffix")}</p>}
            <span className="mt-3 block text-sm font-semibold text-teal-700">{t(locale, teacherBookingActionKey(teacher.bookingAction))}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
