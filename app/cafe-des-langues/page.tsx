import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown, ArrowRight, BookOpen, CheckCircle2, Coffee, Globe2, HeartHandshake,
  Languages, LockKeyhole, MessageCircle, Mic2, ShieldCheck, Sparkles, Users, Volume2,
} from "lucide-react";
import { CafePilotInterest } from "@/components/cafe/CafePilotInterest";
import { getYoLocale } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

export const metadata: Metadata = {
  title: "Le Café des langues — conversations gratuites | Pratiqo",
  description: "Un café de conversation français–espagnol entre adultes, animé et gratuit. Projet pilote sur invitation : participe à de vraies rencontres linguistiques, sans application de rencontres.",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };

const copy = {
  fr: {
    top: "Une initiative de Pratiqo",
    home: "Retour à Pratiqo",
    languageLabel: "Langue de la page",
    badge: "Projet pilote · français + espagnol · 18+",
    title1: "Parle avec",
    title2: "le monde.",
    sub: "Partage ta langue. Découvre d'autres cultures. Pratique avec de vraies personnes, dans de petits cafés de conversation animés.",
    free: "Gratuit pour les échanges entre pairs",
    voice: "Tu peux écouter avant de parler",
    hosted: "Rencontres animées, sans messages privés imposés",
    mainCta: "Je souhaite participer",
    howCta: "Découvrir le fonctionnement",
    preview: "Pilote en préparation · dates annoncées après confirmation",
    sceneTitle: "Un petit café. Deux langues. De vraies conversations.",
    sceneFrench: "15 minutes en français",
    sceneSpanish: "15 minutos en español",
    sceneWelcome: "Bienvenue ! ¡Bienvenidos!",
    sceneTime: "45 min",
    sceneSeats: "5 à 8 personnes",
    stepsTitle: "Comment ça marche ?",
    stepsIntro: "Pas besoin de chercher des profils pendant des heures. On fait connaissance en groupe, naturellement.",
    steps: [
      ["01", "Choisis ton café", "Manifeste ton intérêt pour un groupe français–espagnol. L'animateur confirme les places par courriel."],
      ["02", "Viens comme tu es", "Rejoins une petite rencontre de 45 minutes. Tu peux écouter, passer ton tour et parler à ton rythme."],
      ["03", "Reviens pratiquer", "Après une rencontre, choisis simplement de participer au prochain café. Les échanges privés ne font pas partie du pilote."],
    ],
    scheduleTitle: "Un café, pas un cours magistral",
    scheduleSub: "Chaque personne a sa place. L'animateur guide la conversation; les deux langues sont pratiquées équitablement.",
    parts: [
      ["5 min", "Accueil et règles de la rencontre"],
      ["15 min", "On discute en français"],
      ["15 min", "Conversamos en español"],
      ["8 min", "Petite discussion culturelle"],
      ["2 min", "On se retrouve la prochaine fois ?"],
    ],
    topicLabel: "Premier thème envisagé",
    topic: "On fait connaissance / Nos conocemos",
    topicSub: "Parle de tes passe-temps, d'une expression de ta région ou d'un plat que tu aimerais faire découvrir.",
    none: "Aucune date, place ou réunion n'est encore confirmée.",
    principlesTitle: "Un espace pour apprendre, pas pour se faire solliciter",
    principles: [
      ["18 ans et plus", "Le pilote est réservé aux adultes."],
      ["Pas de rencontres amoureuses", "Pas de flirt, de harcèlement, de discrimination ou de propos déplacés."],
      ["Pas de vente de cours", "Les cafés sont des échanges gratuits entre pairs, distincts des cours payants avec des professeurs."],
      ["Respect de la vie privée", "Pas d'enregistrement, de partage d'informations personnelles ou de lien public vers les réunions."],
      ["Personne n'est forcé de parler", "Il est toujours permis d'écouter ou de passer son tour."],
    ],
    report: "Pour signaler un problème : ",
    contact: "Contacter l'organisateur",
    rulesTitle: "Les règles du café",
    rulesIntro: "L'animateur peut interrompre une conversation ou retirer un participant qui ne respecte pas ces règles.",
    rules: [
      "Respecte les participants, leur accent et leur niveau. Laisse du temps aux deux langues.",
      "Ne demande pas de coordonnées privées ou de photos. Ne publie rien sur les autres personnes sans leur accord.",
      "Aucun enregistrement ni transcription des participants pendant le pilote. Caméra facultative.",
      "Aucun démarchage commercial, recrutement de clients ou proposition insistante de cours.",
      "Respecte la modération. Signale immédiatement tout comportement inapproprié.",
    ],
    joinTitle: "Une place autour de la table ?",
    joinIntro: "Nous préparons un premier petit groupe. Indique simplement ton intérêt par courriel; l'organisateur transmettra les détails après validation de la confidentialité et du calendrier.",
    privacy: "Cette prévisualisation n'enregistre aucune inscription. Le bouton prépare un courriel à envoyer toi-même. Un éventuel courriel reçu sera traité selon les règles de confidentialité applicables; la participation exige une confirmation personnelle.",
    why: "Pourquoi Pratiqo ?",
    identity: "Pratiqo réunit des gens qui veulent apprendre; YoPratiqo leur permet d'étudier à leur rythme. Le Café des langues ajoute l'étape essentielle : parler pour vrai.",
    teachers: "Les cours avec des professeurs restent un service distinct. Aucun paiement ni Pass YoPratiqo n'est requis pour les cafés.",
    learner: "Explorer YoPratiqo",
    footer: "Cours Pratiqo Inc. · Le Café des langues est un concept pilote en préparation.",
  },
  en: {
    top: "A Pratiqo initiative",
    home: "Back to Pratiqo",
    languageLabel: "Page language",
    badge: "Pilot · French + Spanish · 18+",
    title1: "Speak with",
    title2: "the world.",
    sub: "Share your language. Discover cultures. Practise with real people in small, hosted conversation cafés.",
    free: "Free peer-to-peer language exchange",
    voice: "Listen before speaking if you prefer",
    hosted: "Hosted gatherings, no unsolicited private messages",
    mainCta: "I'd like to join",
    howCta: "How it works",
    preview: "Pilot in preparation · dates announced after confirmation",
    sceneTitle: "A small café. Two languages. Real conversations.",
    sceneFrench: "15 minutes in French",
    sceneSpanish: "15 minutos en español",
    sceneWelcome: "Bienvenue ! ¡Bienvenidos!",
    sceneTime: "45 min",
    sceneSeats: "5 to 8 people",
    stepsTitle: "How it works",
    stepsIntro: "No endless profile searching. Meet people naturally in a small group.",
    steps: [
      ["01", "Choose your café", "Express interest in a French–Spanish café. The host confirms places by email."],
      ["02", "Come as you are", "Join a friendly, 45-minute hosted conversation. Listening or passing a turn is always okay."],
      ["03", "Practise again", "After the café, choose to return next week. Private messaging is not part of the pilot."],
    ],
    scheduleTitle: "A café, not a lecture",
    scheduleSub: "Everyone has a chance to speak, and the host keeps both languages balanced.",
    parts: [
      ["5 min", "Welcome and café rules"],
      ["15 min", "French conversation"],
      ["15 min", "Conversamos en español"],
      ["8 min", "Cultural conversation"],
      ["2 min", "Want to join again?"],
    ],
    topicLabel: "Proposed first topic",
    topic: "On fait connaissance / Nos conocemos",
    topicSub: "Share your hobbies, a local expression, or a dish you'd love someone else to try.",
    none: "No dates, places or meetings have been confirmed.",
    principlesTitle: "Here to learn, not to be solicited",
    principles: [
      ["Adults 18+", "The pilot is for adults only."],
      ["Not a dating space", "No flirting, harassment, discrimination or sexual comments."],
      ["No teacher sales", "Cafés are free peer exchanges, separate from paid lessons with teachers."],
      ["Respect privacy", "No recording, personal-data sharing or public meeting links."],
      ["Speaking is optional", "You can listen or pass a turn at any time."],
    ],
    report: "Report a concern to ",
    contact: "Contact the organizer",
    rulesTitle: "Café rules",
    rulesIntro: "The host may interrupt or remove anyone who doesn't respect these rules.",
    rules: [
      "Respect everyone's accent and level. Make room for both languages.",
      "Don't ask for personal contact details or photos or share others' information.",
      "No recording or transcription of participants during the pilot. Video is optional.",
      "No sales pitches, customer solicitation, or pressure to buy lessons.",
      "Follow moderation instructions and report inappropriate behaviour.",
    ],
    joinTitle: "A seat at the table?",
    joinIntro: "We're preparing the first small group. Express interest by email; the host will send details after the privacy and scheduling review.",
    privacy: "This preview does not record sign-ups. The button prepares an email you send yourself. Messages received will be handled according to applicable privacy rules; attendance needs personal confirmation.",
    why: "Why Pratiqo?",
    identity: "Pratiqo connects people who want to learn; YoPratiqo helps them study independently. Language Café adds the essential step: speaking with real people.",
    teachers: "Lessons with professional teachers are a separate service. No payments or YoPratiqo Passes are required to join cafés.",
    learner: "Explore YoPratiqo",
    footer: "Cours Pratiqo Inc. · The Language Café pilot is in preparation.",
  },
  es: {
    top: "Una iniciativa de Pratiqo",
    home: "Volver a Pratiqo",
    languageLabel: "Idioma de la página",
    badge: "Proyecto piloto · francés + español · 18+",
    title1: "Habla con",
    title2: "el mundo.",
    sub: "Comparte tu idioma. Descubre otras culturas. Practica con personas reales en pequeños cafés de conversación guiados.",
    free: "Intercambios gratuitos entre participantes",
    voice: "Puedes escuchar antes de hablar",
    hosted: "Encuentros con anfitrión, sin mensajes privados no solicitados",
    mainCta: "Quiero participar",
    howCta: "Cómo funciona",
    preview: "Piloto en preparación · fechas pendientes de confirmación",
    sceneTitle: "Un café pequeño. Dos idiomas. Conversaciones reales.",
    sceneFrench: "15 minutes en français",
    sceneSpanish: "15 minutos en español",
    sceneWelcome: "Bienvenue ! ¡Bienvenidos!",
    sceneTime: "45 min",
    sceneSeats: "5 a 8 personas",
    stepsTitle: "¿Cómo funciona?",
    stepsIntro: "No hace falta buscar perfiles durante horas. Conoce gente de forma natural en un grupo pequeño.",
    steps: [
      ["01", "Elige tu café", "Expresa interés en un encuentro francés–español. El anfitrión confirma las plazas por correo."],
      ["02", "Participa a tu ritmo", "Únete a una conversación guiada de 45 minutos. Puedes escuchar o pasar tu turno."],
      ["03", "Sigue practicando", "Después de cada café, puedes volver al siguiente. No hay mensajes privados en el piloto."],
    ],
    scheduleTitle: "Un café, no una clase magistral",
    scheduleSub: "Todas las personas pueden participar. El anfitrión equilibra el tiempo de ambos idiomas.",
    parts: [
      ["5 min", "Bienvenida y normas"],
      ["15 min", "Hablamos en francés"],
      ["15 min", "Conversamos en español"],
      ["8 min", "Conversación cultural"],
      ["2 min", "¿Nos vemos la próxima vez?"],
    ],
    topicLabel: "Primer tema propuesto",
    topic: "On fait connaissance / Nos conocemos",
    topicSub: "Comparte tus pasatiempos, una expresión regional o una comida de tu país.",
    none: "Todavía no se han confirmado fechas, plazas ni reuniones.",
    principlesTitle: "Un espacio para aprender, no para vender",
    principles: [
      ["Solo mayores de 18 años", "El piloto es solo para adultos."],
      ["No es una app de citas", "No se permite coqueteo, acoso, discriminación ni comentarios sexuales."],
      ["Sin venta de clases", "Los cafés son intercambios gratuitos, distintos de las clases pagadas con profesores."],
      ["Privacidad", "Sin grabaciones, intercambio de datos personales ni enlaces públicos."],
      ["Hablar es opcional", "Puedes escuchar o pasar tu turno cuando quieras."],
    ],
    report: "Para informar sobre un problema: ",
    contact: "Contactar al organizador",
    rulesTitle: "Normas del café",
    rulesIntro: "El anfitrión puede interrumpir una conversación o retirar a quien no respete las normas.",
    rules: [
      "Respeta los acentos y niveles de todos. Da espacio a ambos idiomas.",
      "No pidas datos personales, fotos ni publiques información sobre otras personas.",
      "Sin grabaciones ni transcripciones durante el piloto. La cámara es opcional.",
      "Sin propuestas comerciales, captación de alumnos ni presión para contratar clases.",
      "Sigue las instrucciones del anfitrión e informa sobre conductas inapropiadas.",
    ],
    joinTitle: "¿Un lugar en la mesa?",
    joinIntro: "Preparamos el primer grupo pequeño. Expresa tu interés por correo; el anfitrión enviará los detalles tras revisar la privacidad y el calendario.",
    privacy: "Esta vista previa no registra inscripciones. El botón prepara un correo que envías tú. Los mensajes recibidos se tratarán según las normas de privacidad; la participación necesita confirmación personal.",
    why: "¿Por qué Pratiqo?",
    identity: "Pratiqo conecta a quienes quieren aprender; YoPratiqo les permite estudiar a su ritmo. El Café añade lo esencial: hablar con otras personas.",
    teachers: "Las clases con profesores son un servicio aparte. Los cafés no requieren pago ni pases de YoPratiqo.",
    learner: "Explorar YoPratiqo",
    footer: "Cours Pratiqo Inc. · El Café de los idiomas está en preparación.",
  },
} as const;

function LangLink({ locale, value, label }: { locale: YoLocale; value: YoLocale; label: string }) {
  return <Link href={`/cafe-des-langues?lang=${value}`} aria-current={locale === value ? "page" : undefined}
    className={`rounded-full px-3 py-2 text-xs font-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c975] ${locale === value ? "bg-amber-200 text-emerald-950" : "text-white/80 hover:bg-white/15"}`}>{label}</Link>;
}

export default async function CafeDesLanguesPage({ searchParams }: PageProps) {
  const locale = getYoLocale((await searchParams).lang);
  const c = copy[locale];
  return <div lang={locale} data-cafe-pilot-page className="min-h-screen bg-[#fbfaf6] text-[#1b382f]" style={{ colorScheme: "light" }}>
    <header className="border-b border-[#dbe7df] bg-[#103d35] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-black tracking-tight" aria-label={c.home}>Pra<span className="text-[#ffbf79]">tiqo</span></Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-xs font-semibold text-white/70 sm:inline">{c.languageLabel}</span>
          <nav aria-label={c.languageLabel} className="flex items-center gap-1 rounded-full border border-white/20 p-1">
            <LangLink locale={locale} value="fr" label="FR"/><LangLink locale={locale} value="en" label="EN"/><LangLink locale={locale} value="es" label="ES"/>
          </nav>
        </div>
      </div>
    </header>

    <main>
      <section className="relative overflow-hidden bg-[#103d35] px-4 pb-16 pt-14 text-white sm:px-6 sm:pb-24 sm:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-64 h-[700px] w-[700px] rounded-full border-[100px] border-[#1b7362]/50"/>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#b5e0cb]/25 bg-white/10 px-4 py-2 text-xs font-bold tracking-wide text-[#d3f5df]"><Globe2 size={16} aria-hidden/>{c.badge}</p>
            <h1 className="mt-7 font-serif text-5xl font-black leading-[1.07] tracking-tight sm:text-6xl lg:text-7xl">{c.title1}<span className="mt-1 block text-[#ffc987]">{c.title2}</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#e7f4eb]">{c.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#participer" className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#ffc987] px-5 py-3 font-black text-[#123e31] shadow-[0_5px_0_#d59755] hover:bg-[#ffe2af] focus-visible:outline-4 focus-visible:outline-white">{c.mainCta}<ArrowRight size={19} aria-hidden/></a>
              <a href="#fonctionnement" className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-white/35 px-5 py-3 font-semibold text-white hover:bg-white/10">{c.howCta}<ArrowDown size={17} aria-hidden/></a>
            </div>
            <p className="mt-5 text-xs font-medium text-[#cfead9]">{c.preview}</p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#e8f5ed]">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-[#b7f4b8]" aria-hidden/>{c.free}</span>
              <span className="inline-flex items-center gap-2"><Volume2 size={17} className="text-[#b7f4b8]" aria-hidden/>{c.voice}</span>
            </div>
          </div>
          <div data-cafe-concept-scene className="relative overflow-hidden rounded-[34px] border-2 border-[#6ba792]/60 bg-[#f9edd4] p-5 text-[#173a32] shadow-[0_25px_70px_rgba(0,0,0,.25)] sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#ffd48c]/70"/>
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-black shadow-sm"><Coffee size={19} aria-hidden/> Le Café des langues</span>
                <span className="rounded-full bg-[#165845] px-3 py-1.5 text-xs font-black text-white">{c.sceneTime}</span>
              </div>
              <div className="mt-8 flex justify-center gap-3">
                <span className="grid h-24 w-24 place-items-center rounded-full border-[7px] border-[#f9bd78] bg-white text-4xl shadow-[0_10px_0_#d9985b]" aria-hidden>☕</span>
                <span className="grid h-24 w-24 place-items-center rounded-full border-[7px] border-[#aed7be] bg-white text-4xl shadow-[0_10px_0_#79ae92]" aria-hidden>🌎</span>
                <span className="grid h-24 w-24 place-items-center rounded-full border-[7px] border-[#f1cd90] bg-white text-4xl shadow-[0_10px_0_#d2a96a]" aria-hidden>💬</span>
              </div>
              <p className="mt-9 text-center font-serif text-3xl font-black leading-10">{c.sceneWelcome}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#b9d8c5] bg-white/90 p-4 text-center font-bold"><Languages size={22} className="mx-auto mb-2 text-[#167054]" aria-hidden/>{c.sceneFrench}</div>
                <div className="rounded-2xl border border-[#efd2a3] bg-white/90 p-4 text-center font-bold"><MessageCircle size={22} className="mx-auto mb-2 text-[#a96b32]" aria-hidden/>{c.sceneSpanish}</div>
              </div>
              <p className="mt-5 text-center text-sm font-semibold text-[#396858]"><Users size={16} className="mr-2 inline" aria-hidden/>{c.sceneSeats}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl"><p className="text-sm font-black uppercase tracking-widest text-[#176c57]">{c.top}</p><h2 className="mt-3 font-serif text-4xl font-black sm:text-5xl">{c.stepsTitle}</h2><p className="mt-4 text-base leading-8 text-[#4b645b]">{c.stepsIntro}</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {c.steps.map(([number, title, detail]) => <article key={number} className="rounded-[26px] border border-[#d5e3d7] bg-white p-6 shadow-sm">
              <span className="text-3xl font-black text-[#c98a4e]">{number}</span>
              <h3 className="mt-4 text-xl font-black text-[#153e34]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#4b645b]">{detail}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="bg-[#e9f3e9] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-[#1a6b52]"><Mic2 size={17} aria-hidden/>{c.sceneSeats}</span>
            <h2 className="mt-5 font-serif text-4xl font-black">{c.scheduleTitle}</h2>
            <p className="mt-4 text-base leading-8 text-[#476258]">{c.scheduleSub}</p>
            <div className="mt-6 rounded-2xl border border-[#cae4cf] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#21745c]">{c.topicLabel}</p>
              <h3 className="mt-2 text-xl font-black">{c.topic}</h3>
              <p className="mt-2 text-sm leading-7 text-[#546a60]">{c.topicSub}</p>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#c6dfce] bg-white p-5 shadow-sm sm:p-8">
            {c.parts.map(([minutes, activity], index) => <div key={index} className={`flex items-start gap-4 py-4 ${index > 0 ? "border-t border-stone-100" : ""}`}>
              <div className="w-16 shrink-0 rounded-xl bg-[#eff7ef] px-2 py-2 text-center text-sm font-black text-[#15664e]">{minutes}</div>
              <div className="pt-1 font-semibold leading-7">{activity}</div>
            </div>)}
            <p className="mt-5 rounded-xl bg-[#fff3e0] p-3 text-sm font-semibold text-[#805325]">{c.none}</p>
          </div>
        </div>
      </section>

      <section id="regles" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#eaf5ed] px-3 py-1 text-xs font-black text-[#1c7156]"><ShieldCheck size={16} aria-hidden/>{c.hosted}</p>
            <h2 className="mt-5 font-serif text-4xl font-black">{c.principlesTitle}</h2>
            <div className="mt-6 space-y-3">{c.principles.map(([title, detail]) => <div key={title} className="flex items-start gap-3">
              <CheckCircle2 size={20} aria-hidden className="mt-1 shrink-0 text-[#267c59]"/>
              <p className="text-sm leading-7"><strong className="font-black">{title}.</strong> <span className="text-[#53695e]">{detail}</span></p>
            </div>)}</div>
          </div>
          <div className="rounded-[30px] border border-[#d2e2d4] bg-white p-6 shadow-sm sm:p-8">
            <h3 className="flex items-center gap-2 text-2xl font-black"><LockKeyhole size={22} aria-hidden/>{c.rulesTitle}</h3>
            <p className="mt-3 text-sm leading-7 text-[#576b60]">{c.rulesIntro}</p>
            <ol className="mt-5 space-y-4">{c.rules.map((rule, i) => <li key={rule} className="flex gap-3 text-sm leading-7"><span className="font-black text-[#167155]">{i + 1}.</span>{rule}</li>)}</ol>
            <p className="mt-6 text-xs leading-6 text-[#576b60]">{c.report}<a href="mailto:info@pratiqo.ca" className="font-bold text-[#125b46] underline">info@pratiqo.ca</a>.</p>
          </div>
        </div>
      </section>

      <section id="participer" className="bg-[#f3f0e7] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[.88fr_1.12fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#26765c]">Le Café des langues</p>
            <h2 className="mt-3 font-serif text-4xl font-black sm:text-5xl">{c.joinTitle}</h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-[#4b6658]">{c.joinIntro}</p>
            <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#667569]"><ShieldCheck size={18} className="mt-1 shrink-0" aria-hidden/>{c.privacy}</p>
          </div>
          <CafePilotInterest locale={locale}/>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-[32px] bg-[#123e35] p-7 text-white sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#bdeacc]"><HeartHandshake size={19} aria-hidden/>{c.why}</p>
            <h2 className="mt-3 font-serif text-3xl font-black">{c.sceneTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#e4f0e9]">{c.identity}</p>
            <p className="mt-3 text-xs leading-6 text-[#c5ded0]">{c.teachers}</p>
          </div>
          <Link href="/yo/langues" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#ffc987] px-5 py-3 font-black text-[#123e31] hover:bg-[#ffdcab]">
            <BookOpen size={19} aria-hidden/>{c.learner}<ArrowRight size={18} aria-hidden/>
          </Link>
        </div>
      </section>
    </main>
    <footer className="border-t border-[#d2e0d6] px-4 py-6 text-center text-xs leading-6 text-[#62746b]">{c.footer}</footer>
  </div>;
}
