import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  LOCAL_CITY_HUB_PATH_PREFIX,
  type LocalTeacherDiscoveryPageBundle,
} from "@/lib/seo/localTeacherDiscoveryPages";
import { LocalTeacherDiscoveryCards } from "@/components/seo/LocalTeacherDiscoveryCards";
import { LocalTeacherDiscoveryMap } from "@/components/seo/LocalTeacherDiscoveryMap";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { CityLinksFooter } from "@/components/CityLinksFooter";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { MarketingResourceBlock } from "@/components/seo/MarketingResourceBlock";
import { getDictionary } from "@/lib/i18n/server";
import {
  getCitySeoGuideLinks,
  getDisciplineCitySeoGuideLinks,
} from "@/lib/seo/internalLinks";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  bundle: LocalTeacherDiscoveryPageBundle;
  locale: Locale;
};

function buildCityFaq(cityName: string) {
  return [
    {
      question: `Comment trouver un professeur à ${cityName}?`,
      answer: `Recherchez sur Pratiqo en filtrant par matière, disponibilité et format de cours. Les profils listés sur cette page sont publics et correspondent à des professeurs réellement disponibles sur la plateforme.`,
    },
    {
      question: `Les cours particuliers sont-ils disponibles en ligne à ${cityName}?`,
      answer: `Oui, selon le professeur. Plusieurs profils proposent des cours en ligne en plus des options en présentiel ou à domicile lorsque le professeur l'offre.`,
    },
    {
      question: `Comment contacter ou réserver un professeur?`,
      answer: `Consultez le profil public du professeur pour voir ses options. Selon son profil, vous pourrez envoyer un message ou réserver lorsque la réservation en ligne est activée.`,
    },
    {
      question: `L'adresse exacte du professeur est-elle affichée?`,
      answer: `Non. Pratiqo n'affiche qu'une localisation approximative sur la carte pour protéger la vie privée. L'adresse exacte n'est jamais publiée sur cette page.`,
    },
  ];
}

function buildSubjectFaq(bundle: LocalTeacherDiscoveryPageBundle) {
  const subject = bundle.discipline?.name.toLowerCase() ?? "cette matière";
  const cityName = bundle.city.name;
  return [
    {
      question: `Comment trouver un professeur de ${subject} à ${cityName}?`,
      answer: `Parcourez les profils listés sur cette page. Chaque professeur affiché enseigne ${subject} et a choisi d'apparaître publiquement sur Pratiqo.`,
    },
    ...(bundle.discipline?.faq.map((item) => ({
      question: item.question.replace("{city}", cityName),
      answer: item.answer,
    })) ?? []),
  ];
}

export function LocalTeacherDiscoveryView({ bundle, locale }: Props) {
  const dict = getDictionary(locale);
  const faqItems =
    bundle.pageType === "city_hub" ? buildCityFaq(bundle.city.name) : buildSubjectFaq(bundle);

  const guideLinks =
    bundle.pageType === "city_hub"
      ? getCitySeoGuideLinks(bundle.city.slug, locale)
      : getDisciplineCitySeoGuideLinks(bundle.discipline!.slug, bundle.city.slug, locale);

  const countLabel =
    bundle.teachers.length === 0
      ? "Aucun professeur disponible"
      : bundle.teachers.length === 1
        ? "1 professeur disponible"
        : `${bundle.teachers.length} professeurs disponibles`;

  return (
    <>
      <BreadcrumbSchema items={buildBreadcrumbItems(bundle)} />
      <FAQSchema items={faqItems} />

      <div className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
        <header className="sticky top-0 z-50 h-14 flex items-center justify-between bg-white border-b border-[#D3D1C7] px-4 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight text-teal-700">
            Pratiqo
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-teal-700 hover:underline">
              Connexion
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:brightness-105"
            >
              Créer un compte
            </Link>
          </div>
        </header>

        {bundle.pageType === "subject_city" ? (
          <nav aria-label="Fil d'Ariane" className="bg-white border-b border-[#E8E6DF] px-4 sm:px-6 py-2">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[#6B6760] max-w-5xl mx-auto">
              <li>
                <Link href="/" className="hover:text-teal-700">
                  Pratiqo
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={bundle.cityHubPath} className="hover:text-teal-700">
                  {bundle.city.name}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={bundle.broadSubjectPath!} className="hover:text-teal-700">
                  {bundle.discipline!.name}
                </Link>
              </li>
            </ol>
          </nav>
        ) : null}

        <section className="bg-teal-700 text-white py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-4">
              <MapPin size={12} aria-hidden />
              {bundle.city.region}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{bundle.h1}</h1>
            <p className="mt-3 text-base text-white/80 max-w-xl mx-auto">{bundle.heroDescription}</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/trouver-un-prof"
                className="inline-flex h-11 items-center rounded-2xl bg-white px-6 text-sm font-bold text-teal-700 hover:brightness-95 shadow"
              >
                Voir les professeurs disponibles →
              </Link>
              <Link
                href="/devenir-professeur"
                className="inline-flex h-11 items-center rounded-2xl border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
                {bundle.pageType === "subject_city"
                  ? `Enseigner ${bundle.discipline!.name.toLowerCase()}`
                  : "Enseigner sur Pratiqo"}
              </Link>
            </div>
          </div>
        </section>

        {bundle.teachers.length > 0 ? (
          <section className="bg-[#F1EFE8] px-4 sm:px-6 pt-6">
            <div className="mx-auto max-w-5xl">
              <p className="mb-2 text-xs text-[#6B6760]">
                Adresse exacte confidentielle; affichage approximatif sur la carte uniquement.
              </p>
              <LocalTeacherDiscoveryMap bundle={bundle} />
            </div>
          </section>
        ) : null}

        <section className="flex-1 bg-[#F1EFE8] py-6 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">{countLabel}</p>
              {bundle.isNearby && bundle.teachers.length > 0 ? (
                <span className="rounded-full bg-[#FFF7E6] border border-[#F6C96E] px-2 py-0.5 text-[10px] font-semibold text-[#92600A]">
                  {bundle.teachers.some((t) => t.isOnlineFallback)
                    ? `professeurs en ligne ou proches de ${bundle.city.name}`
                    : `proches de ${bundle.city.name}`}
                </span>
              ) : null}
            </div>

            <LocalTeacherDiscoveryCards bundle={bundle} />

            {bundle.pageType === "city_hub" && bundle.subjectCityLinks.length > 0 ? (
              <div className="mt-10 rounded-2xl border border-[#E8E6DF] bg-white p-5">
                <h2 className="text-sm font-bold text-[#2C2C2A] mb-3">Par matière à {bundle.city.name}</h2>
                <ul className="flex flex-wrap gap-2">
                  {bundle.subjectCityLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex rounded-full border border-[#E8E6DF] bg-[#FAFCFB] px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {bundle.pageType === "subject_city" && bundle.broadSubjectPath ? (
              <div className="mt-8 text-center text-sm text-[#6B6760]">
                <Link href={bundle.broadSubjectPath} className="font-semibold text-teal-700 hover:underline">
                  Voir tous les cours de {bundle.discipline!.name.toLowerCase()} au Québec →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section className="bg-white border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#6B6760] mb-8">
              Comment ça marche
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  n: "1",
                  title: "Explorez les profils",
                  desc: `Parcourez les professeurs disponibles à ${bundle.city.name} et comparez matières, formats et tarifs affichés.`,
                },
                {
                  n: "2",
                  title: "Contactez ou réservez",
                  desc: "Contactez ou réservez selon les options du professeur. La réservation en ligne dépend des paramètres de chaque profil.",
                },
                {
                  n: "3",
                  title: "Apprenez à votre rythme",
                  desc: "Cours en ligne ou en présentiel, selon ce que le professeur propose et ce qui vous convient.",
                },
              ].map((step) => (
                <div key={step.n} className="rounded-2xl border border-[#E8E6DF] bg-[#FAFCFB] p-5">
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-700">
                    {step.n}
                  </div>
                  <p className="font-bold text-sm text-[#2C2C2A]">{step.title}</p>
                  <p className="mt-1 text-xs text-[#6B6760] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white border-t border-[#E8E6DF] py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <MarketingResourceBlock
              id="local-discovery-seo-guides"
              title={dict.seoLocalGuidesTitle}
              links={guideLinks}
              className="border-[#E8E6DF] bg-[#FAFAF8]"
            />
          </div>
        </section>

        <section className="bg-[#FAFAF8] border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-lg font-bold text-[#2C2C2A] mb-6">
              Questions fréquentes — {bundle.pageType === "city_hub" ? `cours à ${bundle.city.name}` : `${bundle.discipline!.name} à ${bundle.city.name}`}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {faqItems.map((item, i) => (
                <div key={i} className="rounded-xl border border-[#E8E6DF] bg-white p-5">
                  <p className="font-semibold text-sm text-[#2C2C2A] mb-2">{item.question}</p>
                  <p className="text-sm text-[#6B6760] leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CityLinksFooter currentSlug={bundle.city.slug} cityHubPathPrefix={LOCAL_CITY_HUB_PATH_PREFIX} />

        <footer className="bg-white border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B6760]">
            <LegalFooterLinks />
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/" className="font-semibold text-teal-700 hover:underline">
              Pratiqo
            </Link>
            <span className="text-[#D3D1C7]">·</span>
            <span>© 2026 Cours Pratiqo Inc.</span>
          </div>
        </footer>
      </div>
    </>
  );
}

function buildBreadcrumbItems(bundle: LocalTeacherDiscoveryPageBundle) {
  if (bundle.pageType === "city_hub") {
    return [
      { name: "Accueil", href: "/" },
      { name: "Tuteurs", href: "/trouver-un-prof" },
      { name: bundle.city.name, href: bundle.canonicalPath },
    ];
  }
  return [
    { name: "Accueil", href: "/" },
    { name: bundle.discipline!.name, href: `/cours/${bundle.discipline!.slug}` },
    { name: bundle.city.name, href: bundle.canonicalPath },
  ];
}
