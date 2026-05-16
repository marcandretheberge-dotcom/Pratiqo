"use client";

import Link from "next/link";
import { CheckCircle2, DollarSign, Calendar, Globe, ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import type { Locale } from "@/lib/i18n/types";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";
import { TeacherEarningsCalculator } from "@/components/marketing/TeacherEarningsCalculator";

// ── Locale-keyed copy ─────────────────────────────────────────────────────────

const COPY: Record<Locale, {
  badge: string;
  h1: string;
  h1sub: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  benefitsTitle: string;
  benefits: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; body: string }[];
  howTitle: string;
  steps: { n: string; title: string; desc: string }[];
  testimonialsTitle: string;
  testimonials: { name: string; role: string; quote: string }[];
  finalH2: string;
  finalSub: string;
  finalCta: string;
  disclaimerFooter: string;
}> = {
  fr: {
    badge: "Travailleur autonome · Québec, Canada & Uruguay",
    h1: "Devenez Enseignant ou Tuteur",
    h1sub: "Partagez votre passion.",
    sub: "Fixez vos propres tarifs, gérez votre horaire et enseignez ce que vous aimez. Pratiqo s'occupe des paiements, des réservations et de votre visibilité.",
    ctaPrimary: "Rejoindre gratuitement",
    ctaSecondary: "Voir la plateforme",
    benefitsTitle: "Pourquoi rejoindre Pratiqo?",
    benefits: [
      {
        icon: DollarSign,
        title: "Fixez vos propres tarifs (USD / CAD)",
        body: "Vous décidez du prix par cours. Pas de tarif imposé, pas de mise en concurrence forcée. La valeur de votre expertise, c'est vous qui la définissez.",
      },
      {
        icon: Calendar,
        title: "Gérez votre horaire à votre guise",
        body: "Mettez à jour vos disponibilités en temps réel. Acceptez ou refusez des réservations. Prenez des vacances sans demander la permission.",
      },
      {
        icon: Globe,
        title: "Touchez des élèves à Montréal et au-delà",
        body: "Votre profil est indexé sur Google et visible dans notre moteur de recherche géolocalisé. En ligne ou en présentiel, vous choisissez.",
      },
    ],
    howTitle: "Comment démarrer",
    steps: [
      { n: "1", title: "Créez votre profil en 5 minutes", desc: "Photo, discipline, tarif, disponibilités. Notre wizard vous guide étape par étape." },
      { n: "2", title: "Les élèves vous trouvent", desc: "Géolocalisation, recherche par discipline et réservation automatique — sans friction." },
      { n: "3", title: "Recevez vos paiements", desc: "Virement automatique via Stripe dans les 7 jours ouvrables. Zéro gestion administrative." },
    ],
    testimonialsTitle: "Ce que disent nos profs",
    testimonials: [
      { name: "Sophie M.", role: "Piano · Montréal", quote: "J'ai doublé mes élèves en 3 mois. La visibilité est incroyable." },
      { name: "Karim L.", role: "Arts Martiaux · Québec", quote: "Les paiements automatiques m'ont sauvé des heures de gestion." },
      { name: "Elena R.", role: "Danse · Laval", quote: "La commission dégressive m'a vraiment motivée à développer ma clientèle." },
    ],
    finalH2: "Prêt à enseigner sur Pratiqo?",
    finalSub: "Créez votre compte, publiez votre profil, commencez à enseigner.",
    finalCta: "Rejoindre gratuitement →",
    disclaimerFooter: "Estimations indicatives. Vous êtes travailleur autonome — vos gains dépendent de votre activité.",
  },
  en: {
    badge: "Freelance · Québec, Canada & Uruguay",
    h1: "Become a Teacher or Tutor",
    h1sub: "Share your passion.",
    sub: "Set your own rates, manage your own schedule, and teach what you love. Pratiqo handles payments, bookings, and your visibility.",
    ctaPrimary: "Join for free",
    ctaSecondary: "See the platform",
    benefitsTitle: "Why join Pratiqo?",
    benefits: [
      {
        icon: DollarSign,
        title: "Set your own rates (USD / CAD)",
        body: "You decide the price per lesson. No imposed rates, no forced competition. The value of your expertise is yours to define.",
      },
      {
        icon: Calendar,
        title: "Manage your own schedule",
        body: "Update your availability in real time. Accept or decline bookings. Take vacations without asking anyone's permission.",
      },
      {
        icon: Globe,
        title: "Reach students in Québec and beyond",
        body: "Your profile is indexed on Google and visible in our geo-based search engine. Online or in-person — your choice.",
      },
    ],
    howTitle: "How to get started",
    steps: [
      { n: "1", title: "Create your profile in 5 minutes", desc: "Photo, discipline, rate, availability. Our onboarding wizard guides you step by step." },
      { n: "2", title: "Students find you", desc: "Geolocation, discipline search and automatic booking — frictionless." },
      { n: "3", title: "Get paid automatically", desc: "Automatic Stripe payouts within 7 business days. Zero admin." },
    ],
    testimonialsTitle: "What our teachers say",
    testimonials: [
      { name: "Sophie M.", role: "Piano · Montréal", quote: "I doubled my students in 3 months. The visibility is incredible." },
      { name: "Karim L.", role: "Martial Arts · Québec", quote: "Automatic payments saved me hours of admin work." },
      { name: "Elena R.", role: "Dance · Laval", quote: "The sliding commission really motivated me to grow my client base." },
    ],
    finalH2: "Ready to teach on Pratiqo?",
    finalSub: "Create your account, publish your profile, start teaching.",
    finalCta: "Join for free →",
    disclaimerFooter: "Indicative estimates only. You are an independent contractor — your earnings depend on your activity.",
  },
  es: {
    badge: "Trabajador independiente · Montevideo, Uruguay & Canadá",
    h1: "Convertite en Maestro o Profesor",
    h1sub: "Ganá dinero enseñando.",
    sub: "Fijá tus propios precios, manejá tu horario y enseñá lo que amás. Pratiqo se encarga de los pagos, las reservas y tu visibilidad.",
    ctaPrimary: "Unirme gratis",
    ctaSecondary: "Ver la plataforma",
    benefitsTitle: "¿Por qué unirte a Pratiqo?",
    benefits: [
      {
        icon: DollarSign,
        title: "Fijá tus propios precios (USD)",
        body: "Vos decidís el precio por clase. Sin tarifas impuestas ni competencia forzada. El valor de tu expertise lo definís vos.",
      },
      {
        icon: Calendar,
        title: "Manejá tu propio horario",
        body: "Actualizá tu disponibilidad en tiempo real. Aceptá o rechazá reservas. Tomate vacaciones sin pedirle permiso a nadie.",
      },
      {
        icon: Globe,
        title: "Llegá a estudiantes en Montevideo y más",
        body: "Tu perfil está indexado en Google y visible en nuestro buscador geolocalizado. En línea o presencial — vos elegís.",
      },
    ],
    howTitle: "Cómo empezar",
    steps: [
      { n: "1", title: "Creá tu perfil en 5 minutos", desc: "Foto, disciplina, tarifa, disponibilidad. Nuestro asistente te guía paso a paso." },
      { n: "2", title: "Los estudiantes te encuentran", desc: "Geolocalización, búsqueda por disciplina y reserva automática — sin fricción." },
      { n: "3", title: "Recibí tus pagos", desc: "Transferencia automática vía Stripe en 7 días hábiles. Cero administración." },
    ],
    testimonialsTitle: "Lo que dicen nuestros profesores",
    testimonials: [
      { name: "Sebastián R.", role: "Piano · Pocitos, Montevideo", quote: "Dupliqué mis alumnos en 3 meses. La visibilidad es increíble." },
      { name: "Valentina M.", role: "Idiomas · Punta Carretas", quote: "Los pagos automáticos me ahorraron horas de gestión." },
      { name: "Lucas P.", role: "Música · Carrasco", quote: "Poder fijar mis propios precios en USD fue un cambio total." },
    ],
    finalH2: "¿Listo para enseñar en Pratiqo?",
    finalSub: "Creá tu cuenta, publicá tu perfil, empezá a enseñar.",
    finalCta: "Unirme gratis →",
    disclaimerFooter: "Estimaciones indicativas. Sos trabajador independiente — tus ingresos dependen de tu actividad.",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DevenirEnseignantContent() {
  const { locale, t } = useLocale();
  const { user } = useAuth();
  const studentSearchHref = user ? "/student/search" : "/login?next=/student/search";
  const c = COPY[locale] ?? COPY["fr"];

  return (
    <div className="min-h-[100dvh] bg-[#0f0f0f] text-white">

      <MarketingHeader />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="bg-[#2C2C2A]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-block mb-5 px-3 py-1 rounded-full bg-teal-600/20 text-[#7FE0C3] text-xs font-bold uppercase tracking-widest">
              {c.badge}
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
              {c.h1}
            </h1>
            <p className="text-3xl sm:text-4xl font-bold text-white/55 mt-1">
              {c.h1sub}
            </p>
            <p className="mt-5 text-white/75 text-base sm:text-lg leading-relaxed max-w-xl">
              {c.sub}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?role=teacher"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-7 text-sm font-bold text-white hover:brightness-105 transition-all"
              >
                {c.ctaPrimary}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={studentSearchHref}
                prefetch={false}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
              >
                {c.ctaSecondary}
              </Link>
              <Link
                href="#calculateur-revenus"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-teal-500/30 bg-teal-600/10 px-7 text-sm font-semibold text-[#B8F5DC] hover:bg-teal-600/20 transition-colors sm:col-span-1"
              >
                {t("teacherEarnCalcScrollCta")}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-widest text-white/45">
              <span>2 400+ {locale === "es" ? "profesores" : "profs"}</span>
              <span className="text-white/20">·</span>
              <span>{locale === "es" ? "Pagos automáticos" : locale === "en" ? "Automatic payments" : "Paiements automatiques"}</span>
              <span className="text-white/20">·</span>
              <span>{locale === "es" ? "Sin exclusividad" : locale === "en" ? "No exclusivity" : "Aucune exclusivité"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── "WHY JOIN US" BENEFITS ─────────────────────────────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">{c.benefitsTitle}</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {c.benefits.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/10 bg-white/4 p-6 flex flex-col gap-4 hover:border-teal-500/40 transition-colors"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600/15 text-[#7FE0C3]">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{title}</h3>
                  <p className="mt-2 text-sm text-white/65 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">{c.howTitle}</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.steps.map(({ n, title, desc }) => (
              <div key={n} className="rounded-3xl border border-white/10 bg-white/4 p-6">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-600 text-sm font-extrabold text-white">
                  {n}
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS QUICK SUMMARY ────────────────────────────────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              {
                emoji: "🎯",
                label: locale === "es" ? "Gratis hasta 5 alumnos" : locale === "en" ? "Free up to 5 students" : "Gratuit jusqu'à 5 élèves",
                sub: locale === "es" ? "10% de comisión" : locale === "en" ? "10% commission" : "10% commission",
              },
              {
                emoji: "🚀",
                label: locale === "es" ? "Pro — CA$ 29.99 /mes" : locale === "en" ? "Pro — CA$ 29.99 /mo" : "Pro — 29,99 $/mois",
                sub: locale === "es" ? "5% comisión, alumnos ilimitados" : locale === "en" ? "5% commission, unlimited students" : "5% commission, élèves illimités",
              },
              {
                emoji: "💎",
                label: locale === "es" ? "Comisión decreciente" : locale === "en" ? "Sliding commission" : "Commission dégressive",
                sub: locale === "es" ? "Cuanto más enseñás, menos pagás" : locale === "en" ? "The more you teach, the less you pay" : "Plus tu enseignes, moins tu paies",
              },
            ].map(({ emoji, label, sub }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/3 px-5 py-6">
                <p className="text-3xl">{emoji}</p>
                <p className="mt-3 font-bold text-white text-sm">{label}</p>
                <p className="mt-1 text-xs text-white/55">{sub}</p>
              </div>
            ))}
          </div>
          <TeacherEarningsCalculator className="mt-10 border-t border-white/10 pt-10 sm:pt-12" />

          <div className="mt-8 flex justify-center">
            <Link
              href={withLocaleHref("/tarifs", locale)}
              className="text-sm text-[#7FE0C3] underline underline-offset-4 hover:text-[#B8F5DC]"
            >
              {t("teacherEarnCalcSeeAllPlans")}
            </Link>
          </div>
        </div>
      </section>

      {/* Guides (internal linking) */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
          <h2 className="text-lg font-bold text-white sm:text-xl">{t("seoTeacherGuidesTitle")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/blog/donner-cours-prives-quebec" className="font-semibold text-[#7FE0C3] hover:underline">
                {t("seoGuideLinkDonnerCoursQuebec")}
              </Link>
            </li>
            <li>
              <Link href="/blog/combien-charger-cours-prive-quebec" className="font-semibold text-[#7FE0C3] hover:underline">
                {t("seoGuideLinkCombienCharger")}
              </Link>
            </li>
            <li>
              <Link href="/blog/creer-profil-professeur-attirer-eleves" className="font-semibold text-[#7FE0C3] hover:underline">
                {t("seoGuideLinkCreerProfil")}
              </Link>
            </li>
            <li>
              <Link href="/blog/donner-cours-prives-side-hustle-etudiants" className="font-semibold text-[#7FE0C3] hover:underline">
                {t("seoGuideLinkSideHustleStudent")}
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section className="bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <h2 className="text-2xl sm:text-3xl font-bold">{c.testimonialsTitle}</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.testimonials.map(({ name, role, quote }) => (
              <div key={name} className="rounded-3xl border border-white/10 bg-white/4 p-6">
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} viewBox="0 0 12 12" fill="#F59E0B" className="w-3 h-3">
                      <path d="M6 1l1.4 2.8L11 4.2l-2.5 2.4.6 3.4L6 8.6l-3.1 1.4.6-3.4L1 4.2l3.6-.4L6 1z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-white/80 leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <p className="mt-4 text-sm font-bold text-white">{name}</p>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHECKLIST / WHAT YOU NEED ──────────────────────────────────── */}
      <section className="bg-[#121212] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                {locale === "es" ? "¿Qué necesitás para empezar?" : locale === "en" ? "What do you need to start?" : "Ce qu'il vous faut pour démarrer"}
              </h2>
              <ul className="mt-6 space-y-3">
                {(locale === "es"
                  ? ["Una disciplina que domines y amés enseñar", "Una conexión a internet y un dispositivo", "Disponibilidad regular (mínimo 2 h/semana)", "Una cuenta bancaria para los pagos (Stripe)"]
                  : locale === "en"
                  ? ["A discipline you master and love to teach", "An internet connection and a device", "Regular availability (minimum 2 h/week)", "A bank account for payouts (Stripe)"]
                  : ["Une discipline que vous maîtrisez et aimez enseigner", "Une connexion internet et un appareil", "Des disponibilités régulières (minimum 2 h/semaine)", "Un compte bancaire pour les virements (Stripe)"]
                ).map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                    <CheckCircle2 size={17} className="text-teal-700 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border-2 border-teal-500/40 bg-teal-600/6 p-6 sm:p-8 space-y-5">
              <p className="text-lg font-bold text-white">
                {locale === "es" ? "Empezá ahora — es gratis" : locale === "en" ? "Start now — it's free" : "Commencez maintenant — c'est gratuit"}
              </p>
              <p className="text-sm text-white/65 leading-relaxed">
                {locale === "es"
                  ? "Creá tu cuenta en menos de 2 minutos. Publicá tu perfil y recibí tu primera reserva."
                  : locale === "en"
                  ? "Create your account in under 2 minutes. Publish your profile and receive your first booking."
                  : "Créez votre compte en moins de 2 minutes. Publiez votre profil et recevez votre première réservation."}
              </p>
              <Link
                href="/login?role=teacher"
                className="inline-flex w-full h-12 items-center justify-center gap-2 rounded-2xl bg-teal-600 text-sm font-bold text-white hover:brightness-105 transition-all"
              >
                {c.ctaPrimary}
                <ArrowRight size={16} />
              </Link>
              <p className="text-[11px] text-white/35 text-center">{c.disclaimerFooter}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BAND ─────────────────────────────────────────────── */}
      <section className="bg-teal-600">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{c.finalH2}</h2>
            <p className="mt-2 text-white/85 text-sm">{c.finalSub}</p>
          </div>
          <Link
            href="/login?role=teacher"
            className="shrink-0 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-8 text-sm font-bold text-teal-700 hover:bg-white/95 transition-colors"
          >
            {c.finalCta}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
