import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, GraduationCap, MapPin, ShieldCheck } from "lucide-react";

import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { LandingSkipLink } from "@/components/marketing/LandingSkipLink";
import { FindTeacherSearch } from "@/components/marketing/FindTeacherSearch";
import { FindTeacherTrustStrip } from "@/components/marketing/FindTeacherTrustStrip";
import { SITE_URL } from "@/lib/seo/site";
import { getLocale, t } from "@/lib/i18n/server";

const BASE_URL = SITE_URL;

/**
 * `/trouver-un-prof` — public marketing landing for the find-a-teacher
 * funnel. This is the canonical route referenced by:
 *   - the marketing sitemap (`app/sitemap.ts`)
 *   - every YoPratiqo language module CTA ("Pratique avec un vrai prof")
 *   - inbound SEO links built from `lib/seo/internalLinks.ts`
 *
 * Hard guarantees enforced by `tests/marketing/trouverUnProfPage.test.ts`:
 *   - reuses the shared marketing header (`LandingHeader`) so the logo,
 *     locale switcher (FR/EN/ES), currency selector (CAD-default), and
 *     "Tarifs / Ressources / Devenir professeur / Se connecter" links
 *     stay in sync with the homepage
 *   - never reintroduces the legacy text-only "Pratiqo" header
 *   - all hero / search / trust copy reads from `findTeacher*` keys in
 *     `lib/i18n/locales/{fr,en,es}.json` (no hardcoded French)
 *   - the hero is white/mint, not the old full-teal layout
 *   - search reuses existing components (`LandingLocationSearch` for
 *     the place autocomplete) so the historical "selecting a city
 *     overwrites the subject" bug cannot regress
 *
 * Out-of-scope (no edits in this file may touch them):
 *   Stripe, payments, Supabase RLS, migrations, booking logic, search
 *   engine internals beyond reusing existing search components,
 *   Membre Pro, legal pages, YoPratiqo lesson data/audio, generated
 *   MP3 files.
 */

export const metadata: Metadata = {
  title: "Trouver un prof particulier au Québec | Pratiqo",
  description:
    "Trouvez un professeur particulier ou un tuteur vérifié au Québec en quelques minutes. Mathématiques, musique, langues, sciences — en ligne ou à domicile. Réservation simple sur Pratiqo.",
  keywords: [
    "trouver un prof particulier québec",
    "tuteur privé québec",
    "cours particuliers québec",
    "professeur à domicile montréal",
    "tuteur en ligne québec",
  ],
  openGraph: {
    title: "Trouver un prof particulier au Québec | Pratiqo",
    description:
      "Des centaines de professeurs vérifiés pour toutes les matières et tous les niveaux. Réservez votre premier cours en ligne.",
    url: `${BASE_URL}/trouver-un-prof`,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trouver un prof particulier au Québec | Pratiqo",
    description:
      "Recherchez un tuteur vérifié près de chez vous ou en ligne — matières scolaires, musique, langues.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${BASE_URL}/trouver-un-prof`,
  },
};

const FAQ_ITEMS = [
  {
    question: "Comment fonctionne la recherche de tuteur sur Pratiqo?",
    answer:
      "Entrez la matière, votre ville et votre disponibilité. Vous verrez les profils des professeurs disponibles avec leurs tarifs, avis et niveau de vérification. Réservez directement en ligne.",
  },
  {
    question: "Les professeurs sont-ils vérifiés?",
    answer:
      "Oui. Tous les professeurs sur Pratiqo vérifient leur identité. Certains ont aussi fait valider leurs diplômes. Vous pouvez filtrer par niveau de vérification dans la recherche.",
  },
  {
    question: "Quel est le coût d'un cours particulier?",
    answer:
      "Les tarifs varient selon la matière et le professeur — généralement entre 25 $ et 75 $/heure. Chaque profil affiche clairement le prix. Aucune frais de plateforme pour les étudiants.",
  },
  {
    question: "Puis-je prendre des cours en ligne?",
    answer:
      "Oui. De nombreux professeurs proposent les cours en ligne via vidéoconférence. Filtrez par mode d'enseignement pour trouver les cours en ligne, à domicile ou les deux.",
  },
];

const DISCIPLINES = [
  { label: "Mathématiques", href: "/cours/mathematiques/montreal" },
  { label: "Français", href: "/cours/francais/montreal" },
  { label: "Anglais", href: "/cours/anglais/montreal" },
  { label: "Piano", href: "/cours/piano/montreal" },
  { label: "Guitare", href: "/cours/guitare/montreal" },
  { label: "Espagnol", href: "/cours/espagnol/montreal" },
  { label: "Francisation", href: "/cours/francisation/montreal" },
  { label: "Coach / entraîneur", href: "/cours/coach-entraineur" },
  { label: "Cuisine", href: "/cours/cuisine" },
  { label: "Arts martiaux", href: "/cours/arts-martiaux" },
  { label: "Danse", href: "/cours/danse" },
  { label: "Photographie", href: "/cours/photographie" },
];

const CITIES = [
  { label: "Montréal", slug: "montreal" },
  { label: "Québec", slug: "quebec" },
  { label: "Laval", slug: "laval" },
  { label: "Longueuil", slug: "longueuil" },
  { label: "Sherbrooke", slug: "sherbrooke" },
  { label: "Gatineau", slug: "gatineau" },
];

export default async function TrouverUnProfPage() {
  // Server-rendered hero copy ensures the H1 and CTA labels ship in
  // the initial HTML, regardless of whether JS hydrates. Mirrors the
  // homepage's `LandingHeroStatic` strategy — see `app/page.tsx`.
  const locale = await getLocale();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: "/" },
          { name: "Trouver un prof", href: "/trouver-un-prof" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      <div className="relative flex min-h-[100dvh] flex-col bg-[#FAFCFB]">
        <LandingHeader />
        <LandingSkipLink locale={locale} />

        <main id="main-content" className="flex-1">
          {/* ── HERO ────────────────────────────────────────────────────── */}
          <section className="relative overflow-hidden bg-gradient-to-b from-[#F3FAF6] via-white to-[#F3FAF6] px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-10 lg:pt-20">
            {/* Decorative dot pattern, no remote images. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(15,110,86,0.10) 1px, transparent 0)",
                backgroundSize: "26px 26px",
              }}
            />
            <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              {/* Left: pill, headline, copy, CTAs */}
              <div className="text-left">
                <p className="inline-flex items-center rounded-full border border-[#CDE8DD] bg-white/80 px-4 py-1.5 text-[12px] font-semibold text-teal-800 shadow-sm">
                  {t(locale, "findTeacherEyebrow")}
                </p>
                <h1 className="mt-6 text-balance text-[34px] font-extrabold leading-[1.06] tracking-tight text-[#142235] sm:text-[40px] lg:text-[54px]">
                  {t(locale, "findTeacherHeroTitle")}
                </h1>
                <p className="mt-5 max-w-[560px] text-base leading-relaxed text-[#4A5560] sm:text-lg">
                  {t(locale, "findTeacherHeroSubtitle")}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/student/search"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,110,86,0.18)] transition-colors hover:bg-[#0B5F4A] sm:text-base"
                  >
                    {t(locale, "findTeacherPrimaryCta")}
                    <ArrowRight size={18} aria-hidden />
                  </Link>
                  <Link
                    href="/devenir-enseignant"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-teal-700 bg-white px-6 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 sm:text-base"
                  >
                    {t(locale, "findTeacherSecondaryCta")}
                    <GraduationCap size={18} aria-hidden />
                  </Link>
                </div>
              </div>

              {/* Right: CSS/illustration hero panel with floating cards. No remote images. */}
              <div className="relative hidden h-[420px] w-full lg:block">
                <div
                  aria-hidden
                  className="absolute inset-0 overflow-hidden rounded-[36px] border border-white/60 bg-gradient-to-br from-[#E9F6F1] via-[#F3FAF6] to-[#DCEFE6] shadow-[0_30px_80px_rgba(15,110,86,0.16)]"
                >
                  {/* Soft glow blobs */}
                  <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-teal-300/35 blur-3xl" />
                  <div className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-emerald-200/40 blur-3xl" />
                  {/* Education / tech motif: graduation cap centerpiece */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white/80 shadow-[0_20px_50px_rgba(15,110,86,0.18)] ring-1 ring-white">
                      <GraduationCap className="h-16 w-16 text-teal-700" aria-hidden />
                    </div>
                  </div>
                  {/* Concentric rings */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-50"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at center, rgba(15,110,86,0.08) 0 1px, transparent 1px 100%)",
                      backgroundSize: "60px 60px",
                    }}
                  />
                </div>

                {/* Floating card: Profs locaux */}
                <div className="absolute left-3 top-12 w-[210px] rounded-2xl border border-white bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,110,86,0.14)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9F6F1] text-teal-700">
                      <MapPin size={18} aria-hidden />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-[#1a1f1d]">
                        {t(locale, "findTeacherTrustLocalTeachersTitle")}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-700">
                        {t(locale, "findTeacherFloatLocalTeachersHint")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating card: Profils clairs */}
                <div className="absolute right-2 top-3 w-[220px] rounded-2xl border border-white bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,110,86,0.14)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9F6F1] text-teal-700">
                      <BadgeCheck size={18} aria-hidden />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-[#1a1f1d]">
                        {t(locale, "findTeacherTrustClearProfilesTitle")}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-700">
                        {t(locale, "findTeacherFloatClearProfilesHint")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating card: Paiements sécurisés */}
                <div className="absolute bottom-6 right-6 w-[230px] rounded-2xl border border-white bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,110,86,0.14)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E9F6F1] text-teal-700">
                      <ShieldCheck size={18} aria-hidden />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-[#1a1f1d]">
                        {t(locale, "findTeacherTrustSecurePaymentsTitle")}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-700">
                        {t(locale, "findTeacherFloatSecurePaymentsHint")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── SEARCH MODULE (overlapping hero) ─────────────────────────── */}
          <section className="relative -mt-2 px-4 sm:px-6 lg:-mt-6 lg:px-8">
            <div className="mx-auto max-w-[1200px]">
              <FindTeacherSearch />
            </div>
          </section>

          {/* ── TRUST STRIP ────────────────────────────────────────────── */}
          <section className="px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-16">
            <div className="mx-auto max-w-[1200px]">
              <FindTeacherTrustStrip />
            </div>
          </section>

          {/* ── DISCIPLINES (SEO chips) ────────────────────────────────── */}
          <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1200px]">
              <h2 className="text-xl font-bold text-[#1a1f1d] sm:text-2xl">
                Toutes les matières
              </h2>
              <p className="mt-2 text-sm text-[#4A5560] sm:text-base">
                Musique, langues, matières scolaires et plus — trouvez votre spécialité.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {DISCIPLINES.map((d) => (
                  <Link
                    key={d.href}
                    href={d.href}
                    className="rounded-full border border-[#DCEAE3] bg-white px-4 py-2 text-sm font-semibold text-[#2C2C2A] transition-colors hover:border-teal-500 hover:text-teal-700"
                  >
                    {d.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── CITIES (SEO chips) ─────────────────────────────────────── */}
          <section className="bg-[#F3FAF6] px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1200px]">
              <h2 className="text-xl font-bold text-[#1a1f1d] sm:text-2xl">
                Professeurs près de chez vous
              </h2>
              <p className="mt-2 text-sm text-[#4A5560] sm:text-base">
                Cours en présentiel ou à domicile dans les principales villes du Québec.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/tuteurs-prive/${c.slug}`}
                    className="rounded-full border border-[#DCEAE3] bg-white px-4 py-2 text-sm font-semibold text-[#2C2C2A] transition-colors hover:border-teal-500 hover:text-teal-700"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ ────────────────────────────────────────────────────── */}
          <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[900px]">
              <h2 className="text-xl font-bold text-[#1a1f1d] sm:text-2xl">
                Questions fréquentes
              </h2>
              <div className="mt-6 space-y-4">
                {FAQ_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#E8E6DF] bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm font-bold text-[#1a1f1d]">{item.question}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A5560]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
