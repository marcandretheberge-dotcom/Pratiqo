import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { YoAppHeader } from "./YoAppHeader";
import { YoDocumentLanguage } from "./YoDocumentLanguage";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { buildYoLocaleHref, lstr, t } from "@/lib/yo/localize";
import { isYoPublicLanguageIndexable, yoPublicCatalog } from "@/lib/yo/publicCatalog";
import { yopratiqoProductConfig } from "@/lib/yo/yopratiqoProductConfig";
import { germanCourseUnits } from "@/lib/yo/german/courseData";
import { germanCultureStops } from "@/lib/yo/german/courseCulture";
import { portugueseCourseUnits } from "@/lib/yo/portuguese/courseData";
import { portugueseCultureStops } from "@/lib/yo/portuguese/courseCulture";
import { mandarinUnits } from "@/lib/yo/mandarin/course";
import mandarinPhotos from "@/lib/yo/mandarin/imageAssets.json";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import type { YoLocale } from "@/lib/yo/types";

export function YoCourseOverview({ slug, locale }: {
  slug: "allemand" | "portugais-bresil" | "mandarin"; locale: YoLocale;
}) {
  const course = yoPublicCatalog.find(entry => entry.slug === slug)!;
  const units = slug === "mandarin"
    ? mandarinUnits.map(unit => ({ id: unit.id, title: unit.title, objectives: unit.goals }))
    : (slug === "allemand" ? germanCourseUnits : portugueseCourseUnits);
  const coursePhoto = slug === "allemand" ? germanCultureStops.u01.photo : portugueseCultureStops.u01.photo;
  const photo = slug === "mandarin" ? {
    ...mandarinPhotos.park, author: mandarinPhotos.park.credit, sourceUrl: mandarinPhotos.park.source,
    alt: lstr("Parc Chaoyang à Beijing", "Chaoyang Park in Beijing", "Parque Chaoyang en Beijing"),
  } : coursePhoto;
  const title = t(course.name, locale);
  const level = t(lstr("Fondations pour débutants", "Beginner foundations", "Fundamentos para principiantes"), locale);
  const schema = buildYopratiqoCourseSchema({
    name: title + " · YoPratiqo", description: t(course.description, locale),
    url: buildYoLocaleHref(course.landingRoute, locale), inLanguage: course.inLanguage,
    educationalLevel: level, isAccessibleForFree: true,
    teaches: units.flatMap(unit => unit.objectives.map(objective => t(objective, locale))),
  });
  return <div lang={locale} className="min-h-screen bg-[#FAFCFB] text-emerald-950">
    <YoDocumentLanguage locale={locale} />
    <YoAppHeader locale={locale} title={title} selectorPath={course.landingRoute} backHref={buildYoLocaleHref("/yo/langues", locale)}
      backLabel={t(lstr("Langues", "Languages", "Idiomas"), locale)} availableLocales={course.presentationLocales} />
    {yopratiqoProductConfig.courseSchemaEnabled && isYoPublicLanguageIndexable(slug) ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} /> : null}
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex items-start gap-4">
        <CompanionAvatar visualId="travel" state="map" locale={locale} size="sm" compact />
        <div className="min-w-0">
          <p className="text-sm text-emerald-800">{level} · {t(lstr("Accès gratuit", "Free access", "Acceso gratis"), locale)}</p>
          <h1 className="mt-2 text-3xl font-bold">{title} {t(lstr("avec Yoppo", "with Yoppo", "con Yoppo"), locale)}</h1>
          <p className="mt-3 text-base leading-relaxed">{t(course.description, locale)}</p>
          <Link href={buildYoLocaleHref(course.path, locale)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900">
            {t(lstr("Commencer le parcours", "Start the course", "Empezar el curso"), locale)}<ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </div>
      <section className="mt-8 border-t border-emerald-100 pt-6">
        <h2 className="text-xl font-bold">{t(lstr("Le programme", "The program", "El programa"), locale)}</h2>
        <ol className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {units.map((unit, index) => <li key={unit.id}>
            <h3 className="font-semibold">{index + 1}. {t(unit.title, locale)}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">{unit.objectives.map(objective => <li key={objective.fr}>{t(objective, locale)}</li>)}</ul>
          </li>)}
        </ol>
      </section>
      <section className="mt-8 border-t border-emerald-100 pt-6">
        <h2 className="text-xl font-bold">{t(lstr("Écouter, pratiquer, découvrir", "Listen, practise, discover", "Escuchar, practicar, descubrir"), locale)}</h2>
        <p className="mt-3 text-sm leading-relaxed">{t(lstr("Dialogues à écouter, vocabulaire à retrouver, phrases à construire et mises en situation. Yoppo accompagne la pratique et les pauses culturelles, jusqu’à la mission finale.", "Listen to dialogues, recall vocabulary, build sentences and practise situations. Yoppo accompanies practice and cultural breaks through to the final mission.", "Escucha diálogos, recuerda vocabulario, construye frases y practica situaciones. Yoppo acompaña la práctica y las pausas culturales hasta la misión final."), locale)}</p>
        <p className="mt-2 text-sm text-gray-600">{t(lstr("Les voix de pratique sont synthétiques. Le parcours ne délivre ni certification ni garantie de niveau.", "Practice voices are synthetic. The course does not award certification or guarantee a proficiency level.", "Las voces de práctica son sintéticas. El curso no otorga certificación ni garantiza un nivel."), locale)}</p>
        <figure className="mt-4">
          <Image src={photo.src} alt={t(photo.alt, locale)} width={photo.width} height={photo.height} sizes="(max-width: 768px) 100vw, 832px" className="max-h-80 w-full rounded-lg object-cover" />
          <figcaption className="mt-2 text-xs text-gray-600">{t(photo.alt, locale)} · <a href={photo.sourceUrl} className="underline">{photo.author}</a> · <a href={photo.licenseUrl} className="underline">{photo.license}</a></figcaption>
        </figure>
      </section>
      <Link href={buildYoLocaleHref("/yo/langues", locale)} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">{t(lstr("Explorer les autres langues", "Explore other languages", "Explorar otros idiomas"), locale)}</Link>
    </main>
  </div>;
}
