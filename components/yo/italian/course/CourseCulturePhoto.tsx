import Image from "next/image";
import type { CourseCultureStop, CoursePhoto } from "@/lib/yo/italian/course/courseTypes";
import type { YoLocale } from "@/lib/yo/types";

const COPY = {
  fr: { source: "Source de la photo", edit: "Redimensionnée et compressée, sans recadrage", observe: "Avec Yoppo, observe et essaie", sourceFact: "En savoir plus" },
  en: { source: "Photo source", edit: "Resized and compressed, not cropped", observe: "With Yoppo, notice and try", sourceFact: "Learn more" },
  es: { source: "Fuente de la foto", edit: "Redimensionada y comprimida, sin recorte", observe: "Con Yoppo, observa y prueba", sourceFact: "Saber más" },
};

export function CourseCulturePhoto({ photo, locale, reveal = true, onSource, compact = false }: { photo: CoursePhoto; locale: YoLocale; reveal?: boolean; onSource?: () => void; compact?: boolean }) {
  const copy = COPY[locale];
  return <figure className={compact ? "min-w-0" : "my-5 min-w-0"}>
    <Image src={photo.src} alt={photo.alt[locale]} width={photo.width} height={photo.height} sizes="(max-width: 768px) 100vw, 800px" className="h-auto w-full rounded-lg" />
    <figcaption className="mt-2 break-words text-xs leading-relaxed text-gray-600">
      {reveal ? <span className="mb-1 block font-semibold text-gray-800">{photo.caption[locale]}</span> : null}
      {photo.author} · <a href={photo.sourceUrl} onClick={onSource} target="_blank" rel="noopener noreferrer" className="underline">{copy.source}</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a>
      <span className="block">{copy.edit}</span>
    </figcaption>
  </figure>;
}

export function CourseCultureEncounter({ stop, locale }: { stop: CourseCultureStop; locale: YoLocale }) {
  return <section className="mt-7 border-t border-emerald-100 pt-5" aria-label={stop.title[locale]}>
    <h4 className="font-serif text-xl text-emerald-900">{stop.title[locale]}</h4>
    <CourseCulturePhoto photo={stop.photo} locale={locale} />
    <p className="text-sm leading-7">{stop.body[locale]}</p>
    <p className="mt-4 text-xs font-bold text-emerald-800">{COPY[locale].observe}</p>
    <p className="mt-2 text-sm leading-relaxed">{stop.observation[locale]}</p>
    <p lang="it" className="mt-4 font-serif text-2xl">{stop.phrase.it}</p>
    <p className="mt-1 text-sm text-gray-600">{stop.phrase.meaning[locale]}</p>
    <a href={stop.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-xs text-emerald-800 underline">{COPY[locale].sourceFact} · {stop.source.publisher}</a>
  </section>;
}
