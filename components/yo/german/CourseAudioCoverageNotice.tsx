import type { YoLocale } from "@/lib/yo/types";

export type CourseAudioCoverage = { total: number; recorded: number; missing: number };

/** The course supplies published-path coverage; a planned recording is never counted. */
export function CourseAudioCoverageNotice({ coverage, locale }: { coverage: CourseAudioCoverage; locale: YoLocale }) {
  const { total, recorded, missing } = coverage;
  const summary = {
    fr: `Enregistrements : ${recorded} sur ${total}.`,
    en: `Recordings: ${recorded} of ${total}.`,
    es: `Grabaciones: ${recorded} de ${total}.`,
  };
  const remaining = {
    fr: `${missing} extraits restent à enregistrer. Tu peux continuer la pratique écrite.`,
    en: `${missing} clips still need a recording. You can continue written practice.`,
    es: `Faltan ${missing} grabaciones. Puedes continuar con la práctica escrita.`,
  };
  return (
    <p role="status" className="my-5 border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-950">
      {summary[locale]}{missing > 0 ? ` ${remaining[locale]}` : ""}
    </p>
  );
}
