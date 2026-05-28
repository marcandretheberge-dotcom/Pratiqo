import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Shield, MessageCircle, ArrowRight } from "lucide-react";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

import { SITE_URL } from "@/lib/seo/site";

const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Cours de francisation au Québec — Trouver un professeur | Pratiqo",
  description:
    "Trouvez un professeur de francisation au Québec. Cours de français adaptés aux nouveaux arrivants — conversation, vie quotidienne, intégration. Professeurs vérifiés, cours en ligne ou en présentiel.",
  keywords: [
    "cours francisation québec",
    "professeur français nouveaux arrivants",
    "apprendre français québec",
    "francisation montréal",
    "cours français immigrants québec",
  ],
  openGraph: {
    title: "Cours de francisation au Québec | Pratiqo",
    description:
      "Des professeurs de français expérimentés pour les nouveaux arrivants au Québec. Conversation, intégration, vie quotidienne. Cours en ligne ou près de chez vous.",
    url: `${BASE_URL}/francisation`,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cours de francisation au Québec | Pratiqo",
    description:
      "Professeurs de français pour nouveaux arrivants — conversation et intégration au Québec.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${BASE_URL}/francisation`,
  },
};

const FAQ_ITEMS = [
  {
    question: "Quelle est la différence entre les cours gouvernementaux et les cours particuliers?",
    answer:
      "Les programmes du MIFI (ministère de l'Immigration) sont gratuits et se donnent en groupe. Les cours particuliers sur Pratiqo sont payants mais offrent un suivi personnalisé, un rythme adapté et un contenu ciblé sur vos besoins réels. Les deux approches sont complémentaires.",
  },
  {
    question: "En combien de temps peut-on parler français au quotidien?",
    answer:
      "Cela dépend de votre langue d'origine. Les locuteurs de langues romanes (espagnol, portugais, roumain) progressent souvent en quelques mois. Pour d'autres langues, comptez 6 à 18 mois pour un niveau conversationnel confortable avec une pratique régulière.",
  },
  {
    question: "Les cours de francisation en ligne sont-ils efficaces?",
    answer:
      "Oui, surtout pour la conversation. Un professeur en vidéoconférence peut travailler votre prononciation, votre vocabulaire et vos structures de phrases de façon personnalisée. Beaucoup de nouveaux arrivants combinent cours en ligne et sorties en français pour progresser plus vite.",
  },
  {
    question: "Est-ce que je peux apprendre le français québécois spécifiquement?",
    answer:
      "Oui. Précisez cet objectif à votre professeur. Le français québécois a ses propres expressions, son accent et ses registres informels qui ne sont pas couverts par les méthodes standard.",
  },
];

const CITIES_FRANCISATION = [
  { label: "Montréal", slug: "montreal" },
  { label: "Laval", slug: "laval" },
  { label: "Québec", slug: "quebec" },
  { label: "Longueuil", slug: "longueuil" },
  { label: "Gatineau", slug: "gatineau" },
  { label: "Sherbrooke", slug: "sherbrooke" },
];

export default function FrancisationPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Accueil", href: "/" },
          { name: "Francisation", href: "/francisation" },
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

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="bg-teal-700 text-white py-16 sm:py-20 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-5">
              <Globe size={12} aria-hidden />
              Francisation · Québec
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Apprenez le français,<br />
              <span className="text-[#7FE0C3]">à votre rythme</span>
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
              Des professeurs de français expérimentés, adaptés aux nouveaux arrivants au Québec. Cours en ligne ou en présentiel, selon votre horaire.
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex h-13 items-center gap-2 rounded-2xl bg-white px-8 py-3 text-base font-bold text-teal-700 hover:brightness-95 shadow-lg"
              >
                Trouver un professeur de français <ArrowRight size={18} />
              </Link>
              <p className="mt-3 text-xs text-white/55">Inscription gratuite · Aucun engagement</p>
            </div>
          </div>
        </section>

        {/* ── BENEFITS ───────────────────────────────────────────────────── */}
        <section className="bg-white border-b border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: MessageCircle,
                title: "Conversation pratique",
                desc: "Apprenez le français utilisé au quotidien — à l'épicerie, au travail, avec vos voisins.",
              },
              {
                icon: Shield,
                title: "Professeurs vérifiés",
                desc: "Chaque professeur vérifie son identité sur Pratiqo. Lisez les avis d'autres apprenants avant de choisir.",
              },
              {
                icon: Globe,
                title: "En ligne ou en présentiel",
                desc: "Choisissez le format qui vous convient. De nombreux cours se donnent en ligne depuis chez vous.",
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col gap-2 p-4">
                <item.icon size={20} className="text-teal-600" />
                <p className="font-bold text-sm text-[#2C2C2A]">{item.title}</p>
                <p className="text-xs text-[#6B6760] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHAT IS COVERED ────────────────────────────────────────────── */}
        <section className="py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-4">
              Ce que vous apprendrez
            </h2>
            <ul className="space-y-3">
              {[
                "La conversation quotidienne — épicerie, pharmacie, garderie, voisins",
                "Le français québécois — expressions locales, accent, registres informels",
                "Les démarches administratives — formulaires, rendez-vous médicaux, école",
                "Le vocabulaire professionnel — si vous travaillez ou cherchez un emploi",
                "La rédaction — emails, lettres, messages formels",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#4A4845]">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-teal-500/20 text-teal-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── CITIES ─────────────────────────────────────────────────────── */}
        <section className="bg-white border-t border-[#E8E6DF] py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-2">
              Cours de francisation par ville
            </h2>
            <p className="text-sm text-[#6B6760] mb-5">
              Trouvez un professeur de français dans votre ville ou en ligne depuis partout au Québec.
            </p>
            <div className="flex flex-wrap gap-2">
              {CITIES_FRANCISATION.map((c) => (
                <Link
                  key={c.slug}
                  href={`/cours/francisation/${c.slug}`}
                  className="rounded-full border border-[#D3D1C7] bg-white px-4 py-2 text-sm font-medium text-[#2C2C2A] hover:border-teal-500 hover:text-teal-700 transition-colors"
                >
                  Francisation à {c.label}
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
            <h2 className="text-2xl font-bold mb-3">Commencez dès aujourd&apos;hui</h2>
            <p className="text-white/75 text-sm mb-6">
              Votre premier cours est à quelques clics. Inscription gratuite, aucun engagement.
            </p>
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-7 text-sm font-bold text-teal-700 hover:brightness-95 shadow"
            >
              Trouver un professeur de français <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-xs text-white/55">
              Pour les programmes gouvernementaux gratuits, consultez le{" "}
              <span className="underline">MIFI (mifi.gouv.qc.ca)</span>.
            </p>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B6760]">
            <Link href="/legal/cgu" className="hover:underline">CGU</Link>
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/legal/confidentialite" className="hover:underline">Confidentialité</Link>
            <span className="text-[#D3D1C7]">·</span>
            <Link href="/" className="font-semibold text-teal-700 hover:underline">Pratiqo</Link>
            <span className="text-[#D3D1C7]">·</span>
            <span>© 2026 Cours Pratiqo Inc.</span>
          </div>
        </footer>

      </div>
    </>
  );
}
