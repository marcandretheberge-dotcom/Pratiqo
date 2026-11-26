"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Mail, ShieldCheck } from "lucide-react";
import type { YoLocale } from "@/lib/yo/types";

type Pair = "fr-to-es" | "es-to-fr" | "both";
const EMAIL = "info@pratiqo.ca";

const TEXT = {
  fr: {
    title: "Manifestons notre intérêt",
    description: "Réponds à ces deux questions et prépare un courriel. Aucune inscription n'est envoyée automatiquement.",
    pairLabel: "Ton échange",
    options: {
      "fr-to-es": "Je parle français et je pratique l'espagnol",
      "es-to-fr": "Hablo español y practico francés",
      both: "Je peux aider dans les deux langues",
    },
    whenLabel: "Ta disponibilité probable",
    when: {
      weekdays: "Soirs de semaine (heure du Québec)",
      weekend: "Fin de semaine",
      flexible: "Flexible / à discuter",
    },
    adult: "J'ai 18 ans ou plus.",
    rules: "J'ai lu les règles du café et j'accepte de les respecter.",
    action: "Préparer mon courriel",
    note: "Ton application courriel s'ouvrira. Il faudra envoyer le message toi-même. Aucune place n'est réservée ou confirmée ici.",
    after: "Si ton application courriel ne s'ouvre pas, écris directement à ",
    message: "Je souhaite être informé(e) des premiers cafés français–espagnol.\n\nMa pratique : ",
    availability: "\nDisponibilité : ",
    yes: "\nJ'ai au moins 18 ans et j'ai lu les règles.\n\nMerci de m'envoyer les prochaines informations concernant ce pilote uniquement.",
    subject: "Café des langues — intérêt pour le pilote gratuit",
    status: "Le courriel est prêt dans ton application si elle prend en charge les liens de messagerie. Tu dois toujours cliquer sur Envoyer.",
  },
  en: {
    title: "Express your interest",
    description: "Answer two quick questions to prepare an email. Nothing is submitted automatically.",
    pairLabel: "Your exchange",
    options: {
      "fr-to-es": "I speak French and practise Spanish",
      "es-to-fr": "I speak Spanish and practise French",
      both: "I can help with both languages",
    },
    whenLabel: "Your likely availability",
    when: {
      weekdays: "Weekday evenings (Québec time)",
      weekend: "Weekends",
      flexible: "Flexible / to be discussed",
    },
    adult: "I am 18 years or older.",
    rules: "I have read the café rules and agree to follow them.",
    action: "Prepare my email",
    note: "Your email app will open. You must send the message yourself. This does not reserve or confirm a spot.",
    after: "If your email app doesn't open, write directly to ",
    message: "I'd like to hear about the first free French–Spanish cafés.\n\nMy exchange: ",
    availability: "\nAvailability: ",
    yes: "\nI'm at least 18 and have read the community rules.\n\nPlease contact me only about this pilot.",
    subject: "Language Café — interest in free pilot",
    status: "An email draft should have opened if your device supports email links. You still need to press Send.",
  },
  es: {
    title: "Expresa tu interés",
    description: "Contesta dos preguntas y prepara un correo. No se envía nada automáticamente.",
    pairLabel: "Tu intercambio",
    options: {
      "fr-to-es": "Hablo francés y practico español",
      "es-to-fr": "Hablo español y practico francés",
      both: "Puedo ayudar con los dos idiomas",
    },
    whenLabel: "Tu disponibilidad probable",
    when: {
      weekdays: "Noches de lunes a viernes (hora de Quebec)",
      weekend: "Fin de semana",
      flexible: "Flexible / por confirmar",
    },
    adult: "Tengo 18 años o más.",
    rules: "He leído las normas del café y me comprometo a respetarlas.",
    action: "Preparar mi correo",
    note: "Se abrirá tu aplicación de correo. Debes enviar el mensaje tú mismo. No se confirma ninguna plaza aquí.",
    after: "Si no se abre tu correo, escribe directamente a ",
    message: "Quisiera informarme sobre los primeros cafés gratuitos de francés–español.\n\nMi intercambio: ",
    availability: "\nDisponibilidad: ",
    yes: "\nTengo al menos 18 años y he leído las normas.\n\nPor favor, contáctenme solo sobre este piloto.",
    subject: "Café de los idiomas — interés en el piloto gratuito",
    status: "Si tu dispositivo admite enlaces de correo, se habrá abierto un borrador. Todavía debes pulsar Enviar.",
  },
} as const;

/** Intentionally only local React state; this control hands off to the visitor's mail client. */
export function CafePilotInterest({ locale }: { locale: YoLocale }) {
  const c = TEXT[locale];
  const [pair, setPair] = useState<Pair>("fr-to-es");
  const [availability, setAvailability] = useState<"weekdays" | "weekend" | "flexible">("flexible");
  const [adult, setAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [prepared, setPrepared] = useState(false);

  function compose() {
    if (!adult || !accepted) return;
    const subject = encodeURIComponent(c.subject);
    const body = encodeURIComponent(
      c.message + c.options[pair] + c.availability + c.when[availability] + c.yes,
    );
    // This is a compose action, NOT a server-side signup or successful send.
    setPrepared(true);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
  }

  return <section data-cafe-interest className="rounded-[30px] border border-[#c7e3d7] bg-white p-5 text-[#183e37] shadow-[0_20px_60px_rgba(14,63,52,.08)] sm:p-8">
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e5f4ec] text-[#145746]"><Mail size={23} aria-hidden/></span>
      <div>
        <h2 className="text-2xl font-black tracking-tight">{c.title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#526b64]">{c.description}</p>
      </div>
    </div>
    <form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); compose(); }}>
      <div className="space-y-2">
        <label htmlFor="cafe-pair" className="text-sm font-bold">{c.pairLabel}</label>
        <select id="cafe-pair" value={pair} onChange={event => { setPair(event.target.value as Pair); setPrepared(false); }}
          className="min-h-12 w-full rounded-xl border-2 border-[#b7d5c9] bg-[#fffdf9] px-4 text-sm text-[#183e37] outline-offset-2 focus-visible:outline-[#136d55]">
          {(["fr-to-es", "es-to-fr", "both"] as const).map(option => <option key={option} value={option}>{c.options[option]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="cafe-when" className="text-sm font-bold">{c.whenLabel}</label>
        <select id="cafe-when" value={availability} onChange={event => { setAvailability(event.target.value as "weekdays" | "weekend" | "flexible"); setPrepared(false); }}
          className="min-h-12 w-full rounded-xl border-2 border-[#b7d5c9] bg-[#fffdf9] px-4 text-sm text-[#183e37] outline-offset-2 focus-visible:outline-[#136d55]">
          {(["weekdays", "weekend", "flexible"] as const).map(option => <option key={option} value={option}>{c.when[option]}</option>)}
        </select>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
        <input type="checkbox" required checked={adult} onChange={event => { setAdult(event.target.checked); setPrepared(false); }}
          className="mt-1 h-5 w-5 shrink-0 accent-emerald-800"/>
        <span>{c.adult}</span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
        <input type="checkbox" required checked={accepted} onChange={event => { setAccepted(event.target.checked); setPrepared(false); }}
          className="mt-1 h-5 w-5 shrink-0 accent-emerald-800"/>
        <span>{c.rules} <a href="#regles" className="font-bold text-[#17664c] underline">↗</a></span>
      </label>
      <button type="submit" disabled={!adult || !accepted}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#075b47] px-5 py-3 text-base font-bold text-white shadow-[0_5px_0_#064131] transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
        {c.action}<ArrowUpRight size={20} aria-hidden/>
      </button>
    </form>
    <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#526b64]"><ShieldCheck size={18} aria-hidden className="mt-1 shrink-0"/>{c.note}</p>
    <p className="mt-2 text-xs leading-6 text-[#526b64]">{c.after}<a href={`mailto:${EMAIL}`} className="font-bold text-[#075b47] underline">{EMAIL}</a>.</p>
    {prepared ? <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-[#e9f4e8] p-3 text-sm font-semibold text-[#164536]"><Check size={18} aria-hidden className="shrink-0"/>{c.status}</p> : null}
  </section>;
}
