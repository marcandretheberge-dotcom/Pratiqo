import type { Metadata } from "next";
import { CheckCircle2, HeartHandshake, SearchCheck } from "lucide-react";

import { LandingFooter } from "@/components/marketing/LandingFooter";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingSkipLink } from "@/components/marketing/LandingSkipLink";
import { LearnerTeacherFinder } from "@/components/marketing/LearnerTeacherFinder";
import { LearnerFinderLocalizedText } from "@/components/marketing/LearnerFinderLocalizedText";
import { getLocale } from "@/lib/i18n/server";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Trouve ton prof en 20 secondes | Pratiqo",
  description:
    "Dis-nous ce que tu veux apprendre et ta ville. Découvre les professeurs correspondant à ta recherche ou inscris-toi à une alerte avec ton consentement.",
  alternates: { canonical: `${SITE_URL}/trouver-mon-prof` },
  openGraph: {
    title: "Trouve ton prof en 20 secondes | Pratiqo",
    description: "Musique, langues, tutorat et plus. Consulte les profils correspondants ou choisis de recevoir une alerte lorsqu'un cours correspond.",
    url: `${SITE_URL}/trouver-mon-prof`,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

const PAGE_COPY = {
  fr: {
    eyebrow: "D'ici, pour ici.",
    titleA: "Tu veux apprendre quelque chose?",
    titleB: "On trouve la bonne personne.",
    body: "Musique, langues, tutorat ou autre chose : précise ta recherche. Découvre les profils correspondants. Sans cours adapté, tu peux choisir d'enregistrer ta demande et de recevoir une alerte.",
    promise1: "Un vrai match, pas une liste au hasard",
    promise2: "Aucun compte requis pour commencer",
    promise3: "Pas de résultat? Inscris-toi à une alerte",
    demandTitle: "Une recherche qui ne finit jamais dans une impasse.",
    demandBody: "Le prof n'est pas encore là? C'est quand même utile. Ta demande nous indique ce que les élèves d'ici cherchent et nous aide à faire venir les bons professeurs dans les bonnes régions.",
  },
  en: {
    eyebrow: "Local people. Local learning.",
    titleA: "Want to learn something?",
    titleB: "We'll find the right person.",
    body: "Music, languages, tutoring or something else: tell us what you need and explore matching profiles. If no course fits, you can choose to save your request and receive an alert.",
    promise1: "A real match, not a random list",
    promise2: "No account required to start",
    promise3: "No result? Choose to receive an alert",
    demandTitle: "A search that never ends in a dead end.",
    demandBody: "No teacher yet? Your request still matters. It tells us what learners are looking for and helps us bring the right teachers to the right communities.",
  },
  es: {
    eyebrow: "De aquí, para aquí.",
    titleA: "¿Quieres aprender algo?",
    titleB: "Encontramos a la persona ideal.",
    body: "Música, idiomas, apoyo académico u otra cosa: dinos qué necesitas y descubre los perfiles correspondientes. Si no hay una clase adecuada, puedes guardar tu solicitud y elegir recibir una alerta.",
    promise1: "Una coincidencia real, no una lista al azar",
    promise2: "No necesitas una cuenta para empezar",
    promise3: "¿Sin resultado? Elige recibir una alerta",
    demandTitle: "Una búsqueda que nunca termina en un callejón sin salida.",
    demandBody: "¿Todavía no hay profe? Tu solicitud sigue siendo útil. Nos dice qué buscan los alumnos y nos ayuda a atraer los profesores adecuados a cada comunidad.",
  },
} as const;

export default async function TrouverMonProfPage() {
  const locale = await getLocale();
  const lang = locale === "en" || locale === "es" ? locale : "fr";
  const copy = (key: keyof typeof PAGE_COPY.fr) => <LearnerFinderLocalizedText initialLocale={lang}
    values={{fr:PAGE_COPY.fr[key],en:PAGE_COPY.en[key],es:PAGE_COPY.es[key]}} />;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#F7FBF9]">
      <LandingHeader />
      <LandingSkipLink locale={locale} />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pb-18 sm:pt-14 lg:px-8 lg:pt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 15%, rgba(93,202,165,0.20), transparent 30%), radial-gradient(circle at 85% 20%, rgba(29,158,117,0.12), transparent 28%)",
            }}
          />
          <div className="relative mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
            <div>
              <p className="inline-flex rounded-full border border-[#CDE8DD] bg-white px-4 py-1.5 text-xs font-bold text-[#0F6E56] shadow-sm">
                {copy("eyebrow")}
              </p>
              <h1 className="mt-5 max-w-[650px] text-balance text-[38px] font-extrabold leading-[1.03] tracking-[-0.035em] text-[#142235] sm:text-[48px] lg:text-[62px]">
                {copy("titleA")}
                <span className="mt-2 block text-[#1D9E75]">{copy("titleB")}</span>
              </h1>
              <p className="mt-5 max-w-[610px] text-base leading-relaxed text-[#56616A] sm:text-lg">
                {copy("body")}
              </p>

              <div className="mt-7 space-y-3">
                {([
                  [SearchCheck, "promise1"],
                  [CheckCircle2, "promise2"],
                  [HeartHandshake, "promise3"],
                ] as const).map(([Icon, label]) => {
                  const ItemIcon = Icon as typeof SearchCheck;
                  return (
                    <div key={String(label)} className="flex items-center gap-3 text-sm font-semibold text-[#35443D] sm:text-base">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0F6E56] shadow-sm ring-1 ring-[#DCEAE3]">
                        <ItemIcon size={18} aria-hidden />
                      </span>
                      <span>{copy(label)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <LearnerTeacherFinder />
          </div>
        </section>

        <section className="border-y border-[#DCEAE3] bg-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[900px] text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#1D9E75]">Pratiqo</p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-[#142235] sm:text-4xl">
              {copy("demandTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-[720px] text-base leading-relaxed text-[#66716B] sm:text-lg">
              {copy("demandBody")}
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
