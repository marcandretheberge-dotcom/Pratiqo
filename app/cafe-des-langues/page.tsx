import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Check, ChevronRight, Coffee, Globe2,
  Headphones, HeartHandshake, Mail, MicOff, ShieldCheck, Users, VideoOff,
} from "lucide-react";
import { CafePilotInterest } from "@/components/cafe/CafePilotInterest";
import { getYoLocale } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

export const metadata: Metadata = {
  title: "Le Café des langues — pratique gratuite | Pratiqo",
  description: "Pratique le français et l'espagnol en petit groupe. Conversations de 30 minutes, sans pression, caméra facultative. Projet pilote Pratiqo.",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };

const copy = {
  fr: {
    back: "Pratiqo", language: "Langue de la page", eyebrow: "Une initiative Pratiqo · Pilote 18+",
    heading: "Une langue se pratique", accent: "ensemble.",
    intro: "Pas besoin d'être parfait. Viens parler, écouter et rencontrer des personnes qui apprennent comme toi. Sans pression, et sans obligation d'activer ta caméra.",
    cta: "Découvrir les cafés", secondCta: "Comment ça marche",
    trust1: "100 % gratuit", trust2: "Caméra facultative", trust3: "Animé et respectueux",
    availability: "Le premier café est en préparation. Aucune date ni réservation n'est encore ouverte.",
    upcoming: "Les conversations", upcomingSub: "Choisis la formule qui te convient. On commence petit, avec un groupe français–espagnol.",
    group: "En groupe", groupDescription: "Une conversation animée, des échanges simples et la liberté d'écouter avant de parler.",
    pair: "Français ↔ Espagnol", pilot: "Premier groupe en préparation", duration: "30 minutes", capacity: "5 à 8 adultes",
    noDate: "Date à annoncer", interest: "Être informé du lancement",
    duo: "À deux", duoDescription: "Une conversation plus personnelle, à ton rythme. Cette formule n'est pas encore disponible.",
    coming: "À venir", duoDuration: "20 minutes envisagées", preview: "Pas encore de réservation",
    how: "Comment ça marche", howSub: "Pas de restaurant virtuel. Juste des gens, des langues et une conversation.",
    steps: [
      ["01", "Choisis une conversation", "Consulte les rencontres proposées et leurs horaires lorsqu'ils seront confirmés."],
      ["02", "Rejoins-la sur Pratiqo", "À terme, tu réserveras gratuitement avec ton compte Pratiqo, puis entreras dans la salle depuis le site."],
      ["03", "Parle… ou écoute", "Le micro et la caméra sont fermés au départ. Tu décides quand participer."],
    ],
    cameraTitle: "Tu n'as pas à montrer ton visage.", cameraText: "Caméra fermée par défaut. Personne ne t'oblige à l'allumer. Tu peux aussi commencer en écoutant simplement.",
    cameraOff: "Caméra désactivée", micOff: "Micro désactivé", safeTitle: "Un espace pour apprendre, pas pour se faire solliciter.",
    safeText: "Rencontres pour adultes, animées et sans enregistrement. Aucun flirt, harcèlement ou démarchage. Un problème? Contacte l'organisateur.",
    rulesTitle: "Des règles simples pour tous", rules: [
      "Réservé aux personnes de 18 ans ou plus.",
      "Respecte les accents, les niveaux et le droit de passer son tour.",
      "Aucun enregistrement, aucune transcription et aucune obligation de caméra.",
      "Pas de flirt, de sollicitation commerciale ni de partage de coordonnées privées.",
      "L'animateur peut intervenir ou retirer une personne; signale tout incident.",
    ],
    joinTitle: "Une conversation, ça commence ici.", joinText: "La réservation intégrée arrive avec le calendrier. Pour l'instant, indique ton intérêt par courriel : ce n'est pas une réservation.",
    explore: "Continuer à apprendre avec YoPratiqo", footer: "Le Café des langues est un pilote de Cours Pratiqo Inc. Aucun créneau n'est encore confirmé.",
    status: "En préparation", email: "Signaler un problème",
  },
  en: {
    back: "Pratiqo", language: "Page language", eyebrow: "A Pratiqo initiative · 18+ pilot",
    heading: "Languages are better", accent: "together.",
    intro: "You don't have to speak perfectly. Come talk, listen, and meet people learning just like you. No pressure, and no need to turn on your camera.",
    cta: "Explore the cafés", secondCta: "How it works",
    trust1: "Completely free", trust2: "Camera optional", trust3: "Hosted and respectful",
    availability: "The first café is being prepared. No dates or bookings are available yet.",
    upcoming: "Conversations", upcomingSub: "Choose a format you feel comfortable with. We'll begin with one French–Spanish group.",
    group: "In a group", groupDescription: "A hosted conversation with simple prompts, and the freedom to listen before speaking.",
    pair: "French ↔ Spanish", pilot: "First group in preparation", duration: "30 minutes", capacity: "5 to 8 adults",
    noDate: "Date to be announced", interest: "Keep me updated",
    duo: "One-to-one", duoDescription: "A more personal conversation at your pace. This option isn't available yet.",
    coming: "Coming later", duoDuration: "20 minutes proposed", preview: "Not open for booking",
    how: "How it works", howSub: "No virtual restaurant. Just people, languages, and conversation.",
    steps: [
      ["01", "Choose a conversation", "See upcoming meetings and times once they have been confirmed."],
      ["02", "Join inside Pratiqo", "Eventually, book for free with your Pratiqo account and enter the room without leaving the site."],
      ["03", "Speak… or listen", "Your microphone and camera start off. You decide when to take part."],
    ],
    cameraTitle: "You don't have to show your face.", cameraText: "Camera off by default. Nobody will pressure you to turn it on. You're also welcome to listen first.",
    cameraOff: "Camera off", micOff: "Microphone off", safeTitle: "A place to learn, not to be solicited.",
    safeText: "Adult-only, hosted conversations without recording. No flirting, harassment or sales pitches. Contact the organizer about any concern.",
    rulesTitle: "Simple rules for everyone", rules: [
      "Only for people aged 18 or older.",
      "Respect accents, levels and the right to pass a turn.",
      "No recording, transcription or requirement to use a camera.",
      "No flirting, sales pitches or requests for private contact details.",
      "The host may intervene or remove someone; report any concern.",
    ],
    joinTitle: "Every conversation starts somewhere.", joinText: "Native booking is coming with the calendar. For now, express your interest by email; this is not a reservation.",
    explore: "Keep learning with YoPratiqo", footer: "Language Café is a Cours Pratiqo Inc. pilot. No session is confirmed yet.",
    status: "In preparation", email: "Report a concern",
  },
  es: {
    back: "Pratiqo", language: "Idioma de la página", eyebrow: "Una iniciativa Pratiqo · Piloto 18+",
    heading: "Los idiomas se practican", accent: "en compañía.",
    intro: "No tienes que hablar perfectamente. Ven a conversar, escuchar y conocer a personas que también están aprendiendo. Sin presión y sin necesidad de encender la cámara.",
    cta: "Descubrir los cafés", secondCta: "Cómo funciona",
    trust1: "Totalmente gratis", trust2: "Cámara opcional", trust3: "Encuentros guiados y respetuosos",
    availability: "El primer café está en preparación. Aún no hay fechas ni reservas disponibles.",
    upcoming: "Las conversaciones", upcomingSub: "Elige la modalidad que prefieras. Empezaremos con un grupo de francés y español.",
    group: "En grupo", groupDescription: "Una conversación guiada, preguntas sencillas y la libertad de escuchar antes de hablar.",
    pair: "Francés ↔ Español", pilot: "Primer grupo en preparación", duration: "30 minutos", capacity: "5 a 8 adultos",
    noDate: "Fecha por anunciar", interest: "Quiero recibir noticias",
    duo: "De a dos", duoDescription: "Una conversación más personal, a tu ritmo. Esta modalidad todavía no está disponible.",
    coming: "Próximamente", duoDuration: "20 minutos previstos", preview: "Reservas aún no disponibles",
    how: "Cómo funciona", howSub: "Nada de restaurantes virtuales. Solo personas, idiomas y conversación.",
    steps: [
      ["01", "Elige una conversación", "Consulta los encuentros y horarios cuando estén confirmados."],
      ["02", "Entra desde Pratiqo", "Más adelante podrás reservar gratis con tu cuenta y entrar a la sala sin salir del sitio."],
      ["03", "Habla… o escucha", "El micrófono y la cámara empiezan apagados. Tú decides cuándo participar."],
    ],
    cameraTitle: "No tienes que mostrar tu cara.", cameraText: "Cámara apagada por defecto. Nadie te pedirá que la enciendas. También puedes empezar escuchando.",
    cameraOff: "Cámara apagada", micOff: "Micrófono apagado", safeTitle: "Un espacio para aprender, no para recibir publicidad.",
    safeText: "Conversaciones guiadas solo para adultos, sin grabación. No se permite coqueteo, acoso ni venta de servicios. Contacta al organizador ante cualquier problema.",
    rulesTitle: "Reglas sencillas para todos", rules: [
      "Solo para mayores de 18 años.",
      "Respeta los acentos, niveles y el derecho a pasar turno.",
      "Sin grabaciones, transcripciones ni obligación de usar cámara.",
      "Sin coqueteo, publicidad ni solicitudes de datos de contacto privados.",
      "El anfitrión puede intervenir o retirar a alguien; informa sobre cualquier incidente.",
    ],
    joinTitle: "Toda conversación empieza aquí.", joinText: "Las reservas integradas llegarán con el calendario. Por ahora, expresa tu interés por correo: no es una reserva.",
    explore: "Sigue aprendiendo con YoPratiqo", footer: "El Café de los idiomas es un piloto de Cours Pratiqo Inc. Aún no hay reuniones confirmadas.",
    status: "En preparación", email: "Informar de un problema",
  },
} as const;

function LocaleLinks({ locale, label }: { locale: YoLocale; label: string }) {
  return <nav aria-label={label} className="flex items-center gap-1 rounded-full border border-white/25 p-1">
    {(["fr", "en", "es"] as const).map(value => <Link key={value} href={`/cafe-des-langues?lang=${value}`} aria-current={locale === value ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${locale === value ? "bg-white text-[#12443f]" : "text-white/80 hover:bg-white/15"}`}>{value.toUpperCase()}</Link>)}
  </nav>;
}

export default async function CafeDesLanguesPage({ searchParams }: PageProps) {
  const locale = getYoLocale((await searchParams).lang);
  const c = copy[locale];

  return <div lang={locale} data-cafe-pilot-page className="min-h-screen bg-[#f9faf7] text-[#153d39]" style={{ colorScheme: "light" }}>
    <header className="bg-[#103e3a] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="text-xl font-extrabold tracking-tight" aria-label={c.back}>Pra<span className="text-[#71ddd0]">tiqo</span></Link>
        <LocaleLinks locale={locale} label={c.language}/>
      </div>
    </header>

    <main>
      <section className="relative overflow-hidden bg-[#103e3a] px-5 pb-16 pt-12 text-white sm:px-8 sm:pb-24 sm:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute right-[-90px] top-[-180px] h-[440px] w-[440px] rounded-full border-[75px] border-[#226259]/50"/>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-[#dbf5ef]"><Coffee size={15} aria-hidden/>{c.eyebrow}</span>
            <h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[1.09] tracking-tight sm:text-6xl lg:text-7xl">{c.heading} <span className="text-[#9be5d5]">{c.accent}</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#e0f0eb]">{c.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#cafes" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#9ce6d6] px-6 py-3 font-bold text-[#103e3a] transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">{c.cta}<ArrowRight size={18} aria-hidden/></a>
              <a href="#fonctionnement" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">{c.secondCta}<ChevronRight size={18} aria-hidden/></a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#e6f5f0]">
              <span className="inline-flex items-center gap-2"><Check size={17} aria-hidden/>{c.trust1}</span>
              <span className="inline-flex items-center gap-2"><VideoOff size={17} aria-hidden/>{c.trust2}</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={17} aria-hidden/>{c.trust3}</span>
            </div>
          </div>
          <div data-cafe-concept-scene className="relative rounded-[30px] border border-white/20 bg-[#174b46] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#e2f5f0]">{c.group}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[#e1f4ee]">{c.duration}</span>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {["A", "M", "S"].map((initial, index) => <div key={initial} className={`flex aspect-[.85] flex-col items-center justify-center rounded-2xl border border-white/10 ${index === 1 ? "bg-[#275d57]" : "bg-[#20544e]"}`}>
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#bde9dc] text-lg font-semibold text-[#194d47]">{initial}</div>
                <span className="mt-3 flex items-center gap-1 text-xs text-[#dcf2ed]"><MicOff size={12} aria-hidden/> {index === 0 ? "FR" : index === 1 ? "ES" : "FR"}</span>
              </div>)}
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#0d332f]/70 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-white"><Headphones size={18} aria-hidden/>{c.cameraOff}</div>
              <div className="flex gap-2 text-[#d9f4eb]"><MicOff size={18} aria-hidden/><VideoOff size={18} aria-hidden/></div>
            </div>
            <p className="mt-4 text-center text-xs text-[#d4eee7]">{c.status} · {c.noDate}</p>
          </div>
        </div>
      </section>

      <section id="cafes" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#377b70]">{c.status}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{c.upcoming}</h2>
          <p className="mt-3 text-base text-[#566d66]">{c.upcomingSub}</p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="flex flex-col rounded-[26px] border border-[#c9dfd7] bg-white p-6 shadow-[0_15px_45px_rgba(18,62,58,.06)] sm:p-8">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d9f2e8] text-[#126050]"><Users size={24} aria-hidden/></span>
              <span className="rounded-full bg-[#e5f5ec] px-3 py-1.5 text-xs font-semibold text-[#1b6752]">{c.pilot}</span>
            </div>
            <h3 className="mt-6 text-2xl font-semibold">{c.group}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[#576f68]">{c.groupDescription}</p>
            <div className="mt-6 rounded-2xl bg-[#f3f8f5] p-5">
              <p className="text-xl font-semibold">{c.pair}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#47645b]">
                <span className="inline-flex items-center gap-2"><CalendarDays size={15} aria-hidden/>{c.noDate}</span>
                <span>{c.duration}</span><span>{c.capacity}</span>
              </div>
            </div>
            <a href="#participer" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176e62] px-5 py-3 font-semibold text-white transition hover:bg-[#11574e]">{c.interest}<ArrowRight size={17} aria-hidden/></a>
          </article>
          <article className="flex flex-col rounded-[26px] border border-[#dce7e2] bg-[#f1f5f2] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#356b62]"><Headphones size={24} aria-hidden/></span>
              <span className="rounded-full border border-[#d2ded7] bg-white px-3 py-1.5 text-xs font-semibold text-[#4b6a60]">{c.coming}</span>
            </div>
            <h3 className="mt-6 text-2xl font-semibold">{c.duo}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[#576f68]">{c.duoDescription}</p>
            <div className="mt-6 rounded-2xl border border-dashed border-[#bdd2c7] p-5">
              <p className="text-xl font-semibold">{c.pair}</p>
              <p className="mt-3 text-sm text-[#55746a]">{c.duoDuration}</p>
            </div>
            <span aria-disabled="true" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d0dbd5] px-5 py-3 font-semibold text-[#527167]">{c.preview}</span>
          </article>
        </div>
        <p role="status" className="mt-5 flex items-start gap-2 rounded-2xl border border-[#e4e8dc] bg-[#fffdf5] px-4 py-3 text-sm text-[#646657]"><CalendarDays size={18} className="mt-0.5 shrink-0" aria-hidden/>{c.availability}</p>
      </section>

      <section id="fonctionnement" className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">{c.how}</h2>
          <p className="mt-3 max-w-2xl text-[#60766d]">{c.howSub}</p>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {c.steps.map(([number, title, detail]) => <div key={number} className="border-t-2 border-[#8bd5c4] pt-5">
              <span className="text-sm font-semibold text-[#3f857a]">{number}</span>
              <h3 className="mt-3 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#5c7169]">{detail}</p>
            </div>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-9 rounded-[30px] bg-[#e4f3ec] p-7 sm:p-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#175d51]"><VideoOff size={23} aria-hidden/></div>
            <h2 className="text-3xl font-semibold sm:text-4xl">{c.cameraTitle}</h2>
            <p className="mt-4 text-base leading-8 text-[#45665a]">{c.cameraText}</p>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-5"><VideoOff size={23} className="text-[#267e6d]" aria-hidden/><span className="font-semibold">{c.cameraOff}</span><Check size={20} className="ml-auto text-[#288775]" aria-hidden/></div>
            <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-5"><MicOff size={23} className="text-[#267e6d]" aria-hidden/><span className="font-semibold">{c.micOff}</span><Check size={20} className="ml-auto text-[#288775]" aria-hidden/></div>
          </div>
        </div>
      </section>

      <section id="regles" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5f3ed] text-[#176757]"><HeartHandshake size={24} aria-hidden/></span>
            <h2 className="mt-5 text-3xl font-semibold">{c.safeTitle}</h2>
            <p className="mt-4 text-base leading-7 text-[#567166]">{c.safeText}</p>
            <a href="mailto:info@pratiqo.ca" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#176e62] underline underline-offset-4"><Mail size={17} aria-hidden/>{c.email}</a>
          </div>
          <div className="rounded-[25px] border border-[#d9e8df] bg-white p-6 sm:p-8">
            <h3 className="text-xl font-semibold">{c.rulesTitle}</h3>
            <ul className="mt-5 space-y-4">
              {c.rules.map(rule => <li key={rule} className="flex gap-3 text-sm leading-6 text-[#50695e]"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#25816b]" aria-hidden/>{rule}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section id="participer" className="scroll-mt-8 bg-[#eff6f1] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[.82fr_1.18fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2b7667]">{c.status}</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{c.joinTitle}</h2>
            <p className="mt-5 text-base leading-8 text-[#587368]">{c.joinText}</p>
            <Link href="/yo/langues" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#176e62] hover:underline">{c.explore}<ArrowRight size={17} aria-hidden/></Link>
          </div>
          <CafePilotInterest locale={locale}/>
        </div>
      </section>
    </main>

    <footer className="bg-[#103e3a] px-5 py-7 text-center text-xs text-white/75 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><span>{c.footer}</span><span className="inline-flex items-center gap-1"><Globe2 size={14} aria-hidden/> Pratiqo</span></div>
    </footer>
  </div>;
}
