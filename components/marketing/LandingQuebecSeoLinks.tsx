import Link from "next/link";
import { withLocale } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/types";

type SeoLink = { path: string; labelFr: string; labelEn: string; labelEs: string };

const SEO_LINKS: SeoLink[] = [
  { path: "/cours/piano/montreal", labelFr: "Cours de piano à Montréal", labelEn: "Piano lessons in Montreal", labelEs: "Clases de piano en Montreal" },
  { path: "/cours/piano/quebec", labelFr: "Cours de piano à Québec", labelEn: "Piano lessons in Quebec City", labelEs: "Clases de piano en Quebec" },
  { path: "/cours/guitare/montreal", labelFr: "Cours de guitare à Montréal", labelEn: "Guitar lessons in Montreal", labelEs: "Clases de guitarra en Montreal" },
  { path: "/cours/guitare/quebec", labelFr: "Cours de guitare à Québec", labelEn: "Guitar lessons in Quebec City", labelEs: "Clases de guitarra en Quebec" },
  { path: "/cours/mathematiques/montreal", labelFr: "Tuteur en mathématiques à Montréal", labelEn: "Math tutoring in Montreal", labelEs: "Tutor de matemáticas en Montreal" },
  { path: "/cours/mathematiques/quebec", labelFr: "Tuteur en mathématiques à Québec", labelEn: "Math tutoring in Quebec City", labelEs: "Tutor de matemáticas en Quebec" },
  { path: "/cours/mathematiques/laval", labelFr: "Tuteur en mathématiques à Laval", labelEn: "Math tutoring in Laval", labelEs: "Tutor de matemáticas en Laval" },
  { path: "/cours/francais/montreal", labelFr: "Cours de français à Montréal", labelEn: "French lessons in Montreal", labelEs: "Clases de francés en Montreal" },
  { path: "/cours/anglais/laval", labelFr: "Cours d’anglais à Laval", labelEn: "English lessons in Laval", labelEs: "Clases de inglés en Laval" },
  { path: "/cours/francisation/montreal", labelFr: "Francisation à Montréal", labelEn: "Francisation in Montreal", labelEs: "Francización en Montreal" },
  { path: "/cours/aide-aux-devoirs/sherbrooke", labelFr: "Aide aux devoirs à Sherbrooke", labelEn: "Homework help in Sherbrooke", labelEs: "Ayuda con deberes en Sherbrooke" },
  { path: "/cours/programmation/montreal", labelFr: "Programmation à Montréal", labelEn: "Programming tutoring in Montreal", labelEs: "Programación en Montreal" },
  { path: "/tuteurs-prive/montreal", labelFr: "Tuteurs privés à Montréal", labelEn: "Private tutors in Montreal", labelEs: "Tutores privados en Montreal" },
  { path: "/tuteurs-prive/quebec", labelFr: "Tuteurs privés à Québec", labelEn: "Private tutors in Quebec City", labelEs: "Tutores privados en Quebec" },
  { path: "/tuteurs-prive/saint-georges", labelFr: "Tuteurs privés à Saint-Georges", labelEn: "Private tutors in Saint-Georges", labelEs: "Tutores privados en Saint-Georges" },
];

export function LandingQuebecSeoLinks({ locale }: { locale: Locale }) {
  const title = locale === "fr" ? "Cours populaires au Québec" : locale === "es" ? "Cursos populares en Québec" : "Popular courses in Quebec";
  const intro =
    locale === "fr"
      ? "Pages locales indexables pour trouver un prof près de chez vous."
      : locale === "es"
        ? "Páginas locales indexables para encontrar un profesor cerca de ti."
        : "Indexable local pages to find a teacher near you.";

  const label = (row: SeoLink) =>
    locale === "fr" ? row.labelFr : locale === "es" ? row.labelEs : row.labelEn;

  return (
    <section className="border-t border-[#E8E6DF] bg-white py-12 px-4 sm:px-6" aria-labelledby="qc-seo-links-heading">
      <div className="mx-auto max-w-5xl">
        <h2 id="qc-seo-links-heading" className="text-lg font-bold text-[#2C2C2A]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[#6B6760] max-w-2xl">{intro}</p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {SEO_LINKS.map((item) => (
            <li key={item.path}>
              <Link href={withLocale(item.path, locale)} className="text-teal-700 font-semibold hover:underline">
                {label(item)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
