"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Globe2,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  Music2,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";

import { CITIES } from "@/lib/cities";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type FinderOutcome = "local_match" | "online_match" | "waitlist";

type FinderResponse = {
  ok: boolean;
  outcome?: FinderOutcome;
  matchCount?: number;
  searchUrl?: string | null;
  recruitShareUrl?: string;
  city?: string;
  region?: string | null;
  error?: string;
};

const SUBJECTS = [
  { value: "Mathématiques", labels: { fr: "Mathématiques", en: "Mathematics", es: "Matemáticas" }, icon: GraduationCap },
  { value: "Français", labels: { fr: "Français", en: "French", es: "Francés" }, icon: BookOpen },
  { value: "Anglais", labels: { fr: "Anglais", en: "English", es: "Inglés" }, icon: Languages },
  { value: "Espagnol", labels: { fr: "Espagnol", en: "Spanish", es: "Español" }, icon: Languages },
  { value: "Piano", labels: { fr: "Piano", en: "Piano", es: "Piano" }, icon: Music2 },
  { value: "Guitare", labels: { fr: "Guitare", en: "Guitar", es: "Guitarra" }, icon: Music2 },
  { value: "Chant", labels: { fr: "Chant", en: "Singing", es: "Canto" }, icon: Music2 },
] as const;

const COPY = {
  fr: {
    eyebrow: "On s'occupe de la recherche",
    title: "Trouve ton prof en 20 secondes.",
    subtitle: "Dis-nous simplement ce que tu veux apprendre et où tu es. S'il y a déjà un bon match, on te le montre. Sinon, on cherche pour toi.",
    fast: "20 secondes",
    free: "Gratuit",
    account: "Sans compte requis",
    step: "Étape",
    of: "sur",
    subjectTitle: "Qu'est-ce que tu veux apprendre?",
    subjectHint: "Choisis une option ou écris exactement ce que tu cherches.",
    subjectPlaceholder: "Ex. piano, maths secondaire, espagnol…",
    continue: "Continuer",
    locationTitle: "Où veux-tu apprendre?",
    locationHint: "Ta ville suffit. Pas besoin de nous donner ton adresse.",
    city: "Ville ou municipalité",
    cityPlaceholder: "Ex. Saint-Georges, QC",
    online: "Les cours en ligne me conviennent aussi",
    onlineHint: "Ça augmente tes chances de trouver rapidement le bon prof.",
    back: "Retour",
    emailTitle: "Où veux-tu recevoir tes résultats?",
    emailHint: "Ton courriel nous permet de te prévenir si le bon prof n'est pas encore disponible aujourd'hui.",
    email: "Courriel",
    emailPlaceholder: "toi@exemple.com",
    privacyPrefix: "On utilisera ton courriel pour t'envoyer tes résultats et t'aviser lorsqu'un professeur correspondant à ta recherche devient disponible.",
    privacyLink: "Politique de confidentialité",
    submit: "Trouver mon prof",
    searching: "On cherche ton meilleur match…",
    error: "On n'a pas pu enregistrer ta recherche pour le moment. Réessaie dans quelques instants.",
    localTitle: "Bonne nouvelle — on a trouvé des profs pour toi. 🎉",
    localBody: (n: number, subject: string, city: string) => `${n} profil${n > 1 ? "s" : ""} correspond${n > 1 ? "ent" : ""} à ta recherche « ${subject} » près de ${city}.`,
    localCta: "Voir mes profs",
    onlineTitle: "On a trouvé une option dès maintenant. 💻",
    onlineBody: (n: number, subject: string, city: string) => `Pas encore le bon prof local pour « ${subject} » à ${city}, mais ${n} prof${n > 1 ? "s" : ""} peu${n > 1 ? "vent" : "t"} t'enseigner en ligne. Ta demande locale reste enregistrée.`,
    onlineCta: "Voir les profs en ligne",
    waitTitle: "On cherche le bon prof pour toi. 💚",
    waitBody: "Ta demande est enregistrée. Dès qu'un professeur correspondant devient disponible, on pourra t'aviser.",
    saved: "Demande enregistrée",
    onlineYes: "En ligne accepté",
    onlineNo: "En personne seulement",
    shareTitle: "Tu connais quelqu'un qui pourrait enseigner ça?",
    shareBody: "Envoie-lui Pratiqo. Ton partage peut faire arriver le bon prof plus vite.",
    share: "Partager",
    copied: "Lien copié!",
    restart: "Faire une autre recherche",
  },
  en: {
    eyebrow: "We'll do the searching",
    title: "Find your teacher in 20 seconds.",
    subtitle: "Tell us what you want to learn and where you are. If a great match is already available, we'll show you. If not, we'll keep looking.",
    fast: "20 seconds",
    free: "Free",
    account: "No account required",
    step: "Step",
    of: "of",
    subjectTitle: "What do you want to learn?",
    subjectHint: "Choose an option or tell us exactly what you're looking for.",
    subjectPlaceholder: "E.g. piano, high-school math, Spanish…",
    continue: "Continue",
    locationTitle: "Where do you want to learn?",
    locationHint: "Your city is enough. We don't need your street address.",
    city: "City or municipality",
    cityPlaceholder: "E.g. Lévis, QC",
    online: "Online lessons work for me too",
    onlineHint: "This increases your chances of finding a great teacher quickly.",
    back: "Back",
    emailTitle: "Where should we send your results?",
    emailHint: "Your email lets us tell you if the right teacher isn't available today but joins later.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    privacyPrefix: "We'll use your email to send your results and notify you when a teacher matching this request becomes available.",
    privacyLink: "Privacy policy",
    submit: "Find my teacher",
    searching: "Finding your best match…",
    error: "We couldn't save your search right now. Please try again in a moment.",
    localTitle: "Good news — we found teachers for you. 🎉",
    localBody: (n: number, subject: string, city: string) => `${n} profile${n > 1 ? "s" : ""} match${n === 1 ? "es" : ""} “${subject}” near ${city}.`,
    localCta: "See my teachers",
    onlineTitle: "We found an option you can start with now. 💻",
    onlineBody: (n: number, subject: string, city: string) => `No local “${subject}” match in ${city} yet, but ${n} teacher${n > 1 ? "s" : ""} can teach you online. Your local request stays saved.`,
    onlineCta: "See online teachers",
    waitTitle: "We're looking for the right teacher for you. 💚",
    waitBody: "Your request is saved. When a matching teacher becomes available, we can let you know.",
    saved: "Request saved",
    onlineYes: "Online is okay",
    onlineNo: "In person only",
    shareTitle: "Know someone who could teach this?",
    shareBody: "Send them Pratiqo. Your share could help the right teacher arrive sooner.",
    share: "Share",
    copied: "Link copied!",
    restart: "Start another search",
  },
  es: {
    eyebrow: "Nosotros hacemos la búsqueda",
    title: "Encuentra tu profe en 20 segundos.",
    subtitle: "Dinos qué quieres aprender y dónde estás. Si ya existe una buena opción, te la mostramos. Si no, seguimos buscando por ti.",
    fast: "20 segundos",
    free: "Gratis",
    account: "Sin cuenta",
    step: "Paso",
    of: "de",
    subjectTitle: "¿Qué quieres aprender?",
    subjectHint: "Elige una opción o escribe exactamente lo que buscas.",
    subjectPlaceholder: "Ej. piano, matemáticas, español…",
    continue: "Continuar",
    locationTitle: "¿Dónde quieres aprender?",
    locationHint: "Con tu ciudad es suficiente. No necesitamos tu dirección.",
    city: "Ciudad o municipio",
    cityPlaceholder: "Ej. Montréal, QC",
    online: "También me sirven las clases en línea",
    onlineHint: "Así aumentan tus posibilidades de encontrar un buen profe rápidamente.",
    back: "Volver",
    emailTitle: "¿Dónde quieres recibir tus resultados?",
    emailHint: "Tu correo nos permite avisarte si el profe ideal todavía no está disponible hoy.",
    email: "Correo electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    privacyPrefix: "Usaremos tu correo para enviarte los resultados y avisarte cuando haya un profesor que corresponda a tu búsqueda.",
    privacyLink: "Política de privacidad",
    submit: "Encontrar mi profe",
    searching: "Buscando tu mejor opción…",
    error: "No pudimos guardar tu búsqueda por el momento. Inténtalo de nuevo en unos instantes.",
    localTitle: "Buenas noticias — encontramos profes para ti. 🎉",
    localBody: (n: number, subject: string, city: string) => `${n} perfil${n > 1 ? "es" : ""} corresponde${n > 1 ? "n" : ""} a “${subject}” cerca de ${city}.`,
    localCta: "Ver mis profes",
    onlineTitle: "Encontramos una opción para empezar ahora. 💻",
    onlineBody: (n: number, subject: string, city: string) => `Todavía no hay un profe local para “${subject}” en ${city}, pero ${n} profe${n > 1 ? "s" : ""} puede${n > 1 ? "n" : ""} enseñarte en línea. Tu búsqueda local queda guardada.`,
    onlineCta: "Ver profes en línea",
    waitTitle: "Estamos buscando el profe ideal para ti. 💚",
    waitBody: "Tu solicitud quedó guardada. Cuando aparezca un profesor que corresponda, podremos avisarte.",
    saved: "Solicitud guardada",
    onlineYes: "Acepto clases en línea",
    onlineNo: "Solo presencial",
    shareTitle: "¿Conoces a alguien que podría enseñar esto?",
    shareBody: "Envíale Pratiqo. Tu recomendación puede hacer que llegue el profe ideal más rápido.",
    share: "Compartir",
    copied: "¡Enlace copiado!",
    restart: "Hacer otra búsqueda",
  },
} as const;

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LearnerTeacherFinder() {
  const { locale } = useLocale();
  const lang = locale === "en" || locale === "es" ? locale : "fr";
  const c = COPY[lang];
  const [step, setStep] = useState<Step>(1);
  const [subject, setSubject] = useState("");
  const [city, setCity] = useState("");
  const [acceptsOnline, setAcceptsOnline] = useState(true);
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("teacher_finder");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinderResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subjectParam = params.get("subject") || params.get("matiere") || params.get("q");
    const cityParam = params.get("city") || params.get("ville");
    const campaign = params.get("utm_campaign") || params.get("source");
    if (subjectParam?.trim()) setSubject(subjectParam.trim());
    if (cityParam?.trim()) setCity(cityParam.trim());
    if (params.get("online") === "0") setAcceptsOnline(false);
    if (campaign?.trim()) setSource(campaign.trim().slice(0, 100));
  }, []);

  const cityOptions = useMemo(() => {
    const seen = new Set<string>();
    return CITIES.map((item) => `${item.name}${item.province ? `, ${item.province}` : ""}`).filter((label) => {
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  }, []);

  const progress = Math.round((step / 3) * 100);
  const canContinueSubject = subject.trim().length > 0;
  const canContinueCity = city.trim().length > 0;
  const canSubmit = validEmail(email) && canContinueSubject && canContinueCity;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/learner-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          city: city.trim(),
          acceptsOnline,
          email: email.trim(),
          locale: lang,
          source,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as FinderResponse;
      if (!response.ok || !body.ok || !body.outcome) throw new Error(body.error || "request_failed");
      setResult(body);
    } catch {
      setError(c.error);
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setStep(1);
    setSubject("");
    setCity("");
    setAcceptsOnline(true);
    setEmail("");
    setResult(null);
    setError(null);
    setCopied(false);
  };

  const shareRecruitment = async () => {
    if (!result?.recruitShareUrl) return;
    const absolute = new URL(result.recruitShareUrl, window.location.origin).toString();
    const text = lang === "fr"
      ? `Je cherche un prof de ${subject} à ${result.city ?? city}. Tu connais quelqu'un?`
      : lang === "es"
        ? `Busco un profe de ${subject} en ${result.city ?? city}. ¿Conoces a alguien?`
        : `I'm looking for a ${subject} teacher in ${result.city ?? city}. Know someone?`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Pratiqo", text, url: absolute });
        return;
      }
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      // Sharing is optional; a cancelled native share is not an error state.
    }
  };

  if (result?.outcome) {
    const isLocal = result.outcome === "local_match";
    const isOnline = result.outcome === "online_match";
    const count = result.matchCount ?? 0;
    const resolvedCity = result.city ?? city;

    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-[#DCEAE3] bg-white p-5 shadow-[0_28px_90px_rgba(15,110,86,0.12)] sm:p-8 lg:p-10">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F7F1] text-[#0F6E56]">
            {result.outcome === "waitlist" ? <Sparkles size={28} /> : <CheckCircle2 size={30} />}
          </div>
          <h2 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-[#142235] sm:text-4xl">
            {isLocal ? c.localTitle : isOnline ? c.onlineTitle : c.waitTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#56616A] sm:text-lg">
            {isLocal
              ? c.localBody(count, subject, resolvedCity)
              : isOnline
                ? c.onlineBody(count, subject, resolvedCity)
                : c.waitBody}
          </p>

          <div className="mt-7 grid gap-3 rounded-3xl border border-[#DCEAE3] bg-[#F7FBF9] p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718079]">{lang === "fr" ? "À apprendre" : lang === "es" ? "Aprender" : "Learn"}</p>
              <p className="mt-1 font-bold text-[#21322C]">{subject}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718079]">{lang === "fr" ? "Lieu" : lang === "es" ? "Lugar" : "Location"}</p>
              <p className="mt-1 font-bold text-[#21322C]">{resolvedCity}{result.region ? `, ${result.region}` : ""}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718079]">Format</p>
              <p className="mt-1 font-bold text-[#21322C]">{acceptsOnline ? c.onlineYes : c.onlineNo}</p>
            </div>
          </div>

          {(isLocal || isOnline) && result.searchUrl ? (
            <a
              href={result.searchUrl}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F6E56] px-6 py-3 text-base font-bold text-white shadow-[0_14px_35px_rgba(15,110,86,0.22)] transition hover:bg-[#0B5F4A] sm:w-auto"
            >
              {isLocal ? c.localCta : c.onlineCta}
              <ArrowRight size={19} />
            </a>
          ) : null}

          {result.outcome === "waitlist" ? (
            <>
              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                <Check className="mt-0.5 shrink-0" size={20} />
                <div>
                  <p className="font-bold">{c.saved}</p>
                  <p className="mt-1 text-sm leading-relaxed">{email}</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-[#142235] p-5 text-white sm:p-6">
                <p className="font-bold">{c.shareTitle}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/75">{c.shareBody}</p>
                <button
                  type="button"
                  onClick={() => void shareRecruitment()}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#142235] hover:bg-[#F3FAF6]"
                >
                  <Share2 size={17} />
                  {copied ? c.copied : c.share}
                </button>
              </div>
            </>
          ) : null}

          <button type="button" onClick={restart} className="mt-6 text-sm font-semibold text-[#0F6E56] hover:underline">
            {c.restart}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[#DCEAE3] bg-white p-5 shadow-[0_28px_90px_rgba(15,110,86,0.12)] sm:p-8 lg:p-10">
      <div className="flex flex-wrap gap-2">
        {[c.fast, c.free, c.account].map((label) => (
          <span key={label} className="rounded-full bg-[#E8F7F1] px-3 py-1.5 text-xs font-bold text-[#0F6E56]">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#718079]">
          <span>{c.step} {step} {c.of} 3</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E7EFEA]">
          <div className="h-full rounded-full bg-[#1D9E75] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 1 ? (
        <div className="mt-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#142235] sm:text-3xl">{c.subjectTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#66716B]">{c.subjectHint}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUBJECTS.map((item) => {
              const Icon = item.icon;
              const active = subject === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSubject(item.value)}
                  className={cn(
                    "flex min-h-20 flex-col items-start justify-between rounded-2xl border p-3 text-left transition",
                    active
                      ? "border-[#1D9E75] bg-[#E8F7F1] text-[#0F6E56] ring-2 ring-[#1D9E75]/10"
                      : "border-[#DCEAE3] bg-white text-[#29342F] hover:border-[#9BD1BE] hover:bg-[#F7FBF9]",
                  )}
                >
                  <Icon size={20} />
                  <span className="mt-2 text-sm font-bold">{item.labels[lang]}</span>
                </button>
              );
            })}
          </div>
          <label className="mt-5 block text-sm font-bold text-[#29342F]" htmlFor="finder-subject">
            {lang === "fr" ? "Ou écris ta recherche" : lang === "es" ? "O escribe tu búsqueda" : "Or type your search"}
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#718079]" size={20} />
            <input
              id="finder-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canContinueSubject) setStep(2);
              }}
              placeholder={c.subjectPlaceholder}
              autoComplete="off"
              className="h-14 w-full rounded-2xl border border-[#DCEAE3] bg-white pl-12 pr-4 text-base text-[#142235] outline-none transition placeholder:text-[#98A19C] focus:border-[#1D9E75] focus:ring-4 focus:ring-[#1D9E75]/10"
            />
          </div>
          <button
            type="button"
            disabled={!canContinueSubject}
            onClick={() => setStep(2)}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F6E56] px-5 py-3 font-bold text-white transition hover:bg-[#0B5F4A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {c.continue}<ArrowRight size={18} />
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#142235] sm:text-3xl">{c.locationTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#66716B]">{c.locationHint}</p>
          <label className="mt-6 block text-sm font-bold text-[#29342F]" htmlFor="finder-city">{c.city}</label>
          <div className="relative mt-2">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#718079]" size={20} />
            <input
              id="finder-city"
              list="finder-cities"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canContinueCity) setStep(3);
              }}
              placeholder={c.cityPlaceholder}
              autoComplete="address-level2"
              className="h-14 w-full rounded-2xl border border-[#DCEAE3] bg-white pl-12 pr-4 text-base text-[#142235] outline-none transition placeholder:text-[#98A19C] focus:border-[#1D9E75] focus:ring-4 focus:ring-[#1D9E75]/10"
            />
            <datalist id="finder-cities">
              {cityOptions.map((label) => <option key={label} value={label} />)}
            </datalist>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={acceptsOnline}
            onClick={() => setAcceptsOnline((value) => !value)}
            className="mt-5 flex w-full items-center justify-between gap-4 rounded-2xl border border-[#DCEAE3] bg-[#F7FBF9] p-4 text-left"
          >
            <span className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0F6E56] shadow-sm"><Globe2 size={20} /></span>
              <span>
                <span className="block text-sm font-bold text-[#29342F]">{c.online}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#718079]">{c.onlineHint}</span>
              </span>
            </span>
            <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition", acceptsOnline ? "bg-[#1D9E75]" : "bg-[#CCD5D0]")}> 
              <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition", acceptsOnline ? "left-6" : "left-1")} />
            </span>
          </button>

          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[#DCEAE3] bg-white px-4 font-bold text-[#46514B] hover:bg-[#F7FBF9]">
              <ArrowLeft size={18} />{c.back}
            </button>
            <button type="button" disabled={!canContinueCity} onClick={() => setStep(3)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0F6E56] px-5 font-bold text-white hover:bg-[#0B5F4A] disabled:cursor-not-allowed disabled:opacity-40">
              {c.continue}<ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#142235] sm:text-3xl">{c.emailTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#66716B]">{c.emailHint}</p>

          <div className="mt-6 rounded-2xl border border-[#DCEAE3] bg-[#F7FBF9] p-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#39463F]">
              <span className="font-bold">{subject}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{city}</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 size={15} />{acceptsOnline ? c.onlineYes : c.onlineNo}</span>
            </div>
          </div>

          <label className="mt-5 block text-sm font-bold text-[#29342F]" htmlFor="finder-email">{c.email}</label>
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#718079]" size={20} />
            <input
              id="finder-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSubmit) void submit();
              }}
              placeholder={c.emailPlaceholder}
              autoComplete="email"
              className="h-14 w-full rounded-2xl border border-[#DCEAE3] bg-white pl-12 pr-4 text-base text-[#142235] outline-none transition placeholder:text-[#98A19C] focus:border-[#1D9E75] focus:ring-4 focus:ring-[#1D9E75]/10"
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#718079]">
            {c.privacyPrefix} {" "}
            <Link href="/legal/confidentialite" className="font-semibold text-[#0F6E56] underline underline-offset-2">{c.privacyLink}</Link>.
          </p>
          {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[#DCEAE3] bg-white px-4 font-bold text-[#46514B] hover:bg-[#F7FBF9]">
              <ArrowLeft size={18} />{c.back}
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => void submit()}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0F6E56] px-5 font-bold text-white shadow-[0_14px_35px_rgba(15,110,86,0.20)] hover:bg-[#0B5F4A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? c.searching : c.submit}
              {!submitting ? <Sparkles size={18} /> : null}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
