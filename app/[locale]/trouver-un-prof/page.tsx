import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Star, Clock, ArrowRight } from "lucide-react";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { TrouverUnProfMotionHero } from "@/components/marketing/TrouverUnProfMotionHero";

import { SITE_URL } from "@/lib/seo/site";

const BASE_URL = SITE_URL;

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
  { label: "Mathématiques", slug: "mathematiques" },
  { label: "Français", slug: "francais" },
  { label: "Anglais", slug: "anglais" },
  { label: "Sciences", slug: "sciences" },
  { label: "Piano", slug: "piano" },
  { label: "Guitare", slug: "guitare" },
  { label: "Espagnol", slug: "espagnol" },
  { label: "Francisation", slug: "francisation" },
];

const CITIES = [
  { label: "Montréal", slug: "montreal" },
  { label: "Québec", slug: "quebec" },
  { label: "Laval", slug: "laval" },
  { label: "Longueuil", slug: "longueuil" },
  { label: "Sherbrooke", slug: "sherbrooke" },
  { label: "Gatineau", slug: "gatineau" },
];

export default function TrouverUnProfPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: "/" },
          { name: "Trouver un prof", href: "/trouver-un-prof" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      <div className="min-h-[100dvh] bg-[#FAFAF8]">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
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
              S&apos;inscrire
            </Link>
          </div>
        </header>

        <TrouverUnProfMotionHero />

        {/* ── TRUST BAR ──────────────────────────────────────────────────── */}
        <section className="bg-white border-b border-[#E8E6DF] py-6 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              { icon: Shield, title: "Identité vérifiée", desc: "Tous les professeurs vérifient leur identité avant d'enseigner." },
              { icon: Star, title: "Avis authentiques", desc: "Des avis laissés par de vraies familles après chaque cours." },
              { icon: Clock, title: "Réservation instantanée", desc: "Choisissez un créneau et réservez directement en ligne." },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-2 p-4">
                <item.icon size={20} className="text-teal-600" />
                <p className="font-bold text-sm text-[#2C2C2A]">{item.title}</p>
                <p className="text-xs text-[#6B6760] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DISCIPLINES ────────────────────────────────────────────────── */}
        <section className="py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-2">
              Toutes les matières
            </h2>
            <p className="text-sm text-[#6B6760] mb-6">
              Musique, langues, matières scolaires et plus — trouvez votre spécialité.
            </p>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map((d) => (
                <Link
                  key={d.slug}
                  href={`/cours/${d.slug}/montreal`}
                  className="rounded-full border border-[#D3D1C7] bg-white px-4 py-2 text-sm font-medium text-[#2C2C2A] hover:border-teal-500 hover:text-teal-700 transition-colors"
                >
                  {d.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CITIES ─────────────────────────────────────────────────────── */}
        <section className="bg-white border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-2">
              Professeurs près de chez vous
            </h2>
            <p className="text-sm text-[#6B6760] mb-6">
              Cours en présentiel ou à domicile dans les principales villes du Québec.
            </p>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/tuteurs-prive/${c.slug}`}
                  className="rounded-full border border-[#D3D1C7] bg-white px-4 py-2 text-sm font-medium text-[#2C2C2A] hover:border-teal-500 hover:text-teal-700 transition-colors"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section className="py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-6">Questions fréquentes</h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="rounded-xl border border-[#E8E6DF] bg-white p-5">
                  <p className="font-semibold text-sm text-[#2C2C2A] mb-2">{item.question}</p>
                  <p className="text-sm text-[#6B6760] leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-3">Prêt à commencer?</h2>
            <p className="text-white/75 text-sm mb-6">
              Créez un compte gratuit et trouvez votre professeur en moins de 5 minutes.
            </p>
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-7 text-sm font-bold text-teal-700 hover:brightness-95 shadow"
            >
              Trouver mon professeur <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B6760]">
            <Link href="/cgu" className="hover:underline">CGU</Link>
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/" className="font-semibold text-teal-700 hover:underline">Pratiqo</Link>
            <span className="text-[#D3D1C7]">·</span>
            <span>© 2026 Pratiqo inc.</span>
          </div>
        </footer>

      </div>
    </>
  );
}
