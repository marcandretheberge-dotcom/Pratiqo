import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  discoveryCardsToMapTeachers,
  type LocalTeacherDiscoveryPageBundle,
} from "@/lib/seo/localTeacherDiscoveryPages";
import { LocalTeacherDiscoveryCards } from "@/components/seo/LocalTeacherDiscoveryCards";
import { LocalTeacherDiscoveryMap } from "@/components/seo/LocalTeacherDiscoveryMap";
import { LegalFooterLinks } from "@/components/LegalFooterLinks";
import { LocalSupplyCityLinks } from "@/components/seo/LocalSupplyCityLinks";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { MarketingResourceBlock } from "@/components/seo/MarketingResourceBlock";
import { getDictionary } from "@/lib/i18n/server";
import {
  getCitySeoGuideLinks,
  getDisciplineCitySeoGuideLinks,
} from "@/lib/seo/internalLinks";
import type { Locale } from "@/lib/i18n/types";
import { getTeacherListingCapabilities } from "@/lib/teachers/listingBookability";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Props = {
  bundle: LocalTeacherDiscoveryPageBundle;
  locale: Locale;
};

function buildCityFaq(cityName: string) {
  return [
    {
      question: `Comment trouver un professeur à ${cityName}?`,
      answer: `Comparez les profils locaux et les alternatives indiquées séparément. Un profil public ne garantit pas un créneau disponible; consultez ses disponibilités avant de réserver.`,
    },
    {
      question: `Les cours particuliers sont-ils disponibles en ligne à ${cityName}?`,
      answer: `Le format est indiqué sur chaque profil. Une option en ligne n'est pas comptée comme une offre locale en présentiel à ${cityName}.`,
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
      answer: `Comparez les profils correspondant à cette matière. Les alternatives en ligne ou dans une autre ville sont indiquées séparément de l'offre locale.`,
    },
    {
      question: `Quel est le tarif des cours à ${cityName}?`,
      answer: "Chaque professeur fixe son tarif. Consultez le prix et la durée affichés sur son profil, puis les détails de la réservation. Aucun tarif moyen local n'est présumé.",
    },
    {
      question: "Comment vérifier les spécialités et les disponibilités?",
      answer: "Consultez les matières et l'approche décrites par le professeur. Une préparation à un examen ou une spécialité n'est proposée que si le profil la mentionne. Les créneaux se vérifient dans le parcours de réservation.",
    },
  ];
}

export async function LocalTeacherDiscoveryView({ bundle: cachedBundle }: Props) {
  const capabilities = await getTeacherListingCapabilities(getSupabaseAdmin(), cachedBundle.teachers.map(teacher => teacher.id));
  const bundle = { ...cachedBundle, teachers: cachedBundle.teachers.map(teacher => ({ ...teacher, bookingAction: capabilities[teacher.id]?.action ?? null })) };
  // These canonical local routes currently have French editorial content, not locale URLs.
  const dict = getDictionary("fr");
  const faqItems =
    bundle.pageType === "city_hub" ? buildCityFaq(bundle.city.name) : buildSubjectFaq(bundle);

  const guideLinks =
    bundle.pageType === "city_hub"
      ? getCitySeoGuideLinks(bundle.city.slug, "fr")
      : getDisciplineCitySeoGuideLinks(bundle.discipline!.slug, bundle.city.slug, "fr");

  const countLabel =
    bundle.localTeacherCount === 0
      ? "Aucun profil local publié"
      : `${bundle.localTeacherCount} profil${bundle.localTeacherCount > 1 ? "s" : ""} avec une offre locale`;

  return (
    <>
      <BreadcrumbSchema items={buildBreadcrumbItems(bundle)} />
      <FAQSchema items={faqItems} />

      <div lang="fr" className="min-h-[100dvh] flex flex-col bg-[#FAFCFB]">
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
              <LocalTeacherDiscoveryMap cityName={bundle.city.name} mapCenter={bundle.mapCenter} mapTeachers={discoveryCardsToMapTeachers(bundle.teachers)} />
            </div>
          </section>
        ) : null}

        <section className="flex-1 bg-[#F1EFE8] py-6 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6760]">{countLabel}</p>
              {bundle.isNearby && bundle.teachers.length > 0 ? (
                <span className="rounded-full bg-[#FFF7E6] border border-[#F6C96E] px-2 py-0.5 text-[10px] font-semibold text-[#92600A]">
                  Autres options : en ligne ou dans une autre ville
                </span>
              ) : null}
            </div>

            {bundle.localTeacherCount === 0 ? (
              <p className="mb-5 text-sm text-[#6B6760]">
                Aucun cours local correspondant n&apos;est présenté pour le moment. <Link className="text-teal-700 underline" href={`/trouver-mon-prof?${new URLSearchParams({ city: bundle.city.name, subject: bundle.discipline?.name ?? "", online: "0" })}`}>Précisez votre recherche</Link>.
              </p>
            ) : null}
            {[
              { title: `Professeurs proposant des cours à ${bundle.city.name}`, teachers: bundle.teachers.filter((teacher) => teacher.isLocalSupply) },
              { title: "D'autres options en ligne", teachers: bundle.teachers.filter((teacher) => !teacher.isLocalSupply && teacher.isOnlineFallback) },
              { title: "Dans une autre ville", teachers: bundle.teachers.filter((teacher) => !teacher.isLocalSupply && !teacher.isOnlineFallback) },
            ].filter((group) => group.teachers.length > 0).map((group) => (
              <section key={group.title} className="mb-6">
                <h2 className="mb-3 text-lg font-semibold">{group.title}</h2>
                <LocalTeacherDiscoveryCards bundle={{ ...bundle, teachers: group.teachers }} />
              </section>
            ))}

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
                  desc: `Comparez les matières, formats et tarifs affichés. Distinguez l'offre locale à ${bundle.city.name} des autres options.`,
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

        <LocalSupplyCityLinks />

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
    { name: bundle.discipline!.name, href: bundle.broadSubjectPath! },
    { name: bundle.city.name, href: bundle.canonicalPath },
  ];
}
