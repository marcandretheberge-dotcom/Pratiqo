import type { Metadata } from "next";
import { ArrowRight, CalendarDays, CheckCircle2, GraduationCap, Mail, MapPin, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import PratiqoLogo from "@/components/PratiqoLogo";
import {
  TeacherRecruitmentAnalytics,
  TeacherRecruitmentCtaLink,
} from "@/components/marketing/TeacherRecruitmentAnalytics";
import { SITE_URL } from "@/lib/seo/site";

type Search = Record<string, string | string[] | undefined>;
type Vertical = "academique" | "musique" | "langues" | "general";

type VerticalCopy = {
  headline: string;
  subheadline: string;
  cta: string;
  disciplines: string[];
};

const SUPPORTED_VERTICALS = new Set<Vertical>(["academique", "musique", "langues", "general"]);
const TRACKING_KEYS = ["vertical", "source", "utm_source", "utm_medium", "utm_campaign"] as const;

const VERTICAL_COPY: Record<Vertical, VerticalCopy> = {
  academique: {
    headline: "Tu enseignes le soutien scolaire ?",
    subheadline:
      "Mathématiques, français, sciences, anglais scolaire, aide aux devoirs ou préparation aux examens : rejoins les professeurs fondateurs Pratiqo.",
    cta: "Créer mon profil tuteur",
    disciplines: [
      "Mathématiques",
      "Sciences",
      "Français",
      "Anglais scolaire",
      "Aide aux devoirs",
      "Préparation aux examens",
    ],
  },
  musique: {
    headline: "Tu enseignes la musique ?",
    subheadline:
      "Piano, guitare, chant, batterie, violon, ukulélé ou théorie musicale : trouve des élèves près de chez toi.",
    cta: "Créer mon profil professeur",
    disciplines: ["Piano", "Guitare", "Chant", "Batterie", "Violon", "Ukulélé", "Théorie musicale"],
  },
  langues: {
    headline: "Tu enseignes une langue ?",
    subheadline:
      "Anglais, espagnol, français langue seconde, japonais, coréen, mandarin ou allemand : rejoins les professeurs fondateurs Pratiqo.",
    cta: "Créer mon profil professeur",
    disciplines: ["Anglais", "Espagnol", "Français langue seconde", "Japonais", "Coréen", "Mandarin", "Allemand"],
  },
  general: {
    headline: "Donne des cours privés, on t’aide à trouver tes élèves.",
    subheadline: "Pratiqo recrute ses professeurs fondateurs en soutien scolaire, musique et langues.",
    cta: "Créer mon profil professeur",
    disciplines: ["Soutien scolaire", "Musique", "Langues"],
  },
};

const BENEFITS = [
  "5 % de commission pendant 6 mois pour les professeurs fondateurs",
  "Profil mis en avant au lancement",
  "Tu choisis ton tarif, ton horaire et ton format",
  "Cours en ligne, à domicile ou chez l’élève",
  "Après les 6 mois : taux standard (à partir de 15 %), sauf si tu choisis Membre Pro",
];

const HOW_IT_WORKS = [
  ["1", "Crée ton profil", "Ajoute ta discipline, ton tarif, ta photo et une courte présentation."],
  ["2", "Choisis tes disponibilités", "Définis ton horaire, tes formats de cours et ta zone d’enseignement."],
  ["3", "Reçois des demandes d’élèves", "Ton profil devient visible dans la recherche Pratiqo au lancement."],
  [
    "4",
    "Enseigne avec une commission promotionnelle de 5 %",
    "Profite de l’offre fondateur pendant 6 mois. Le taux standard s’applique ensuite, sauf si tu choisis Membre Pro.",
  ],
] as const;

const TRUST_ITEMS = [
  ["Plateforme québécoise basée en Beauce", MapPin],
  ["Profils vérifiés", ShieldCheck],
  ["Paiements sécurisés", WalletCards],
  ["Cours en ligne ou en personne", CalendarDays],
] as const;

export const metadata: Metadata = {
  title: "Devenir professeur sur Pratiqo | Professeurs fondateurs recherchés",
  description:
    "Rejoignez Pratiqo comme professeur fondateur. Donnez des cours privés en soutien scolaire, musique ou langues, choisissez votre horaire et profitez de 5 % de commission pendant 6 mois.",
  alternates: {
    canonical: `${SITE_URL}/devenir-professeur`,
  },
  openGraph: {
    title: "Devenir professeur sur Pratiqo | Professeurs fondateurs recherchés",
    description:
      "Donnez des cours privés en soutien scolaire, musique ou langues. 5 % de commission pendant 6 mois pour les professeurs fondateurs.",
    url: `${SITE_URL}/devenir-professeur`,
    siteName: "Pratiqo",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
};

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function normalizeVertical(value: string | string[] | undefined): Vertical {
  const raw = firstParam(value)?.toLowerCase();
  return raw && SUPPORTED_VERTICALS.has(raw as Vertical) ? (raw as Vertical) : "general";
}

function buildQuery(params: Search, vertical: Vertical): URLSearchParams {
  const query = new URLSearchParams();
  query.set("vertical", vertical);
  for (const key of TRACKING_KEYS) {
    if (key === "vertical") continue;
    const value = firstParam(params[key]);
    if (value) query.set(key, value.slice(0, 160));
  }
  return query;
}

function buildTeacherSignupHref(params: Search, vertical: Vertical): string {
  const campaign = buildQuery(params, vertical);
  const onboardingPath = `/onboarding/teacher?${campaign.toString()}`;
  const login = new URLSearchParams();
  login.set("role", "teacher");
  login.set("next", onboardingPath);
  for (const [key, value] of campaign.entries()) {
    login.set(key, value);
  }
  return `/login?${login.toString()}`;
}

export default async function DevenirProfesseurPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const vertical = normalizeVertical(params.vertical);
  const source = firstParam(params.source);
  const copy = VERTICAL_COPY[vertical];
  const ctaHref = buildTeacherSignupHref(params, vertical);
  const pagePath = `/devenir-professeur${buildQuery(params, vertical).toString() ? `?${buildQuery(params, vertical).toString()}` : ""}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#FAFCFB] text-[#16362F]">
      <TeacherRecruitmentAnalytics vertical={vertical} source={source} path={pagePath} locale="fr" />

      <header className="border-b border-emerald-900/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center">
            <PratiqoLogo variant="full" size="sm" priority={false} />
          </a>
          <a
            href="mailto:marc-andre.theberge@pratiqo.ca"
            className="hidden rounded-full border border-emerald-900/10 px-4 py-2 text-sm font-semibold text-[#0F6E56] hover:bg-emerald-50 sm:inline-flex"
          >
            Nous écrire
          </a>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(29,158,117,0.18),transparent_32%),linear-gradient(180deg,#FFFFFF_0%,#F2FBF6_100%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#0F6E56] shadow-sm">
              <Sparkles size={14} aria-hidden />
              Professeurs fondateurs recherchés
            </div>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-[#1D9E75]">
              Deviens professeur fondateur sur Pratiqo
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-[#143D34] sm:text-5xl lg:text-6xl">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-[#4F655F]">
              {copy.subheadline}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#59706A]">
              Donne des cours privés en soutien scolaire, musique ou langues. Choisis ton tarif, ton horaire et ton format.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TeacherRecruitmentCtaLink
                href={ctaHref}
                label={copy.cta}
                vertical={vertical}
                source={source}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1D9E75] px-6 py-3 text-sm font-black text-white shadow-[0_18px_44px_rgba(29,158,117,0.24)] transition hover:bg-[#178663]"
              >
                {copy.cta}
                <ArrowRight size={18} aria-hidden />
              </TeacherRecruitmentCtaLink>
              <a
                href="#comment-ca-marche"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-emerald-900/10 bg-white px-6 py-3 text-sm font-bold text-[#0F6E56] shadow-sm transition hover:bg-emerald-50"
              >
                Voir comment ça marche
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-900/10 bg-white p-5 shadow-[0_26px_80px_rgba(20,61,52,0.12)] sm:p-6">
            <div className="rounded-[1.5rem] bg-[#F4FBF7] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">
                Offre fondateur
              </p>
              <div className="mt-4 grid gap-3">
                {BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[#1D9E75]" size={20} aria-hidden />
                    <p className="text-sm font-bold leading-6 text-[#243F38]">{benefit}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-2xl border border-emerald-900/10 bg-white px-4 py-3 text-xs font-semibold leading-5 text-[#59706A]">
                Offre limitée réservée aux premiers professeurs fondateurs admissibles, activée par l’équipe Pratiqo. Après la période promotionnelle de 6 mois, le taux standard s’applique selon les règles de commission en vigueur, sauf si tu choisis Membre Pro.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[2rem] border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-[#1D9E75]" size={24} aria-hidden />
            <h2 className="text-xl font-black text-[#143D34]">Disciplines recherchées</h2>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {copy.disciplines.map((discipline) => (
              <span
                key={discipline}
                className="rounded-full border border-emerald-900/10 bg-[#F3FAF6] px-4 py-2 text-sm font-bold text-[#0F6E56]"
              >
                {discipline}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#1D9E75]">Comment ça marche</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#143D34]">
            Un profil clair, des demandes qualifiées, moins d’administration.
          </h2>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {HOW_IT_WORKS.map(([step, title, description]) => (
            <article key={step} className="rounded-[1.5rem] border border-emerald-900/10 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D9E75] text-sm font-black text-white">
                {step}
              </div>
              <h3 className="mt-4 text-base font-black text-[#143D34]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5D706B]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[2rem] bg-[#123C33] p-6 text-white shadow-[0_24px_70px_rgba(18,60,51,0.18)] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-200">Confiance</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map(([label, Icon]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <Icon size={22} className="text-emerald-200" aria-hidden />
                <p className="mt-3 text-sm font-bold leading-6">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-5 rounded-[2rem] border border-emerald-900/10 bg-white p-6 shadow-[0_22px_70px_rgba(20,61,52,0.08)] md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[#143D34]">
              Prêt à devenir professeur fondateur ?
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#5D706B]">
              Crée ton profil maintenant. Nous t’aiderons à préparer ta page avant le lancement public.
            </p>
          </div>
          <TeacherRecruitmentCtaLink
            href={ctaHref}
            label={copy.cta}
            vertical={vertical}
            source={source}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1D9E75] px-6 py-3 text-sm font-black text-white transition hover:bg-[#178663]"
          >
            {copy.cta}
            <ArrowRight size={18} aria-hidden />
          </TeacherRecruitmentCtaLink>
        </div>
      </section>

      <footer className="border-t border-emerald-900/10 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm font-medium text-[#5D706B] sm:flex-row sm:items-center sm:justify-between">
          <p>Questions sur le recrutement professeur ?</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <a className="inline-flex items-center gap-2 hover:text-[#0F6E56]" href="mailto:marc-andre.theberge@pratiqo.ca">
              <Mail size={16} aria-hidden />
              marc-andre.theberge@pratiqo.ca
            </a>
            <a className="inline-flex items-center gap-2 hover:text-[#0F6E56]" href="mailto:info@pratiqo.ca">
              <Mail size={16} aria-hidden />
              info@pratiqo.ca
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
