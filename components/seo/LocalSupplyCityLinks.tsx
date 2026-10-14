import Link from "next/link";
import { QC_CITIES } from "@/lib/constants/cities";
import { fetchIndexableDiscoveryTeachers, teacherHasLocalDiscoverySupply } from "@/lib/seo/localTeacherDiscoveryPages";

export async function LocalSupplyCityLinks() {
  const teachers = await fetchIndexableDiscoveryTeachers();
  const priority = ["saint-georges", "levis", "quebec"];
  const cities = QC_CITIES.filter((city) => teachers.some((teacher) => teacherHasLocalDiscoverySupply(teacher, city)))
    .sort((a, b) => {
      const rank = (slug: string) => priority.includes(slug) ? priority.indexOf(slug) : priority.length;
      return rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name, "fr");
    }).slice(0, 6);
  if (!cities.length) return null;
  return (
    <nav lang="fr" aria-label="Offre locale publiée" className="border-t border-[#E8E6DF] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-3 text-lg font-semibold">Explorer les profils locaux</h2>
        <ul className="flex flex-wrap gap-4">
          {cities.map((city) => <li key={city.slug}><Link className="inline-flex min-h-11 items-center text-teal-700 underline underline-offset-4" href={`/tuteurs/${city.slug}`}>Professeurs à {city.name}</Link></li>)}
        </ul>
      </div>
    </nav>
  );
}
