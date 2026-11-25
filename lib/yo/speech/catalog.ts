import type { YoLocale } from "@/lib/yo/types";

export type SpeechLanguage = "it" | "ja" | "es" | "fr" | "en" | "de" | "pt" | "zh";
export type SpeechScenarioId = "cafe" | "directions" | "hotel" | "introduction" | "workplace";
type Text = Record<YoLocale, string>;
const text = (fr: string, en: string, es: string): Text => ({ fr, en, es });

export const SPEECH_LANGUAGES: Record<SpeechLanguage, { name: Text; locale: string; instruction: string }> = {
  it: { name: text("italien", "Italian", "italiano"), locale: "it-IT", instruction: "Italian as spoken in Italy; natural, polite everyday Italian." },
  ja: { name: text("japonais", "Japanese", "japonés"), locale: "ja-JP", instruction: "Japanese as spoken in Japan, beginner-friendly polite desu/masu register. Do not exaggerate an accent." },
  es: { name: text("espagnol latino-américain", "Latin American Spanish", "español latinoamericano"), locale: "es-419", instruction: "Clear, neutral Latin American Spanish. Follow the explicit scenario context without imposing a country. Use natural full words, without forced regional slang, a stylized regional accent or artificially dropped consonants." },
  fr: { name: text("français québécois", "Quebec French", "francés quebequense"), locale: "fr-CA", instruction: "Natural Quebec French, clear everyday language. Avoid caricature, forced slang and France-only expressions." },
  en: { name: text("anglais", "English", "inglés"), locale: "en-CA", instruction: "Natural Canadian English, clear and friendly." },
  de: { name: text("allemand", "German", "alemán"), locale: "de-DE", instruction: "Standard German as spoken in Germany, with polite Sie in customer interactions." },
  pt: { name: text("portugais du Brésil", "Brazilian Portuguese", "portugués de Brasil"), locale: "pt-BR", instruction: "Brazilian Portuguese, never European Portuguese; natural voce register and clear beginner-friendly pace." },
  zh: { name: text("mandarin", "Mandarin", "mandarín"), locale: "zh-CN", instruction: "Standard Mandarin (Putonghua), with natural tones and tone sandhi. Use simplified characters in transcripts. Do not claim to measure the learner's tones." },
};

export const SPEECH_SCENARIOS: Record<SpeechScenarioId, { title: Text; goal: Text; role: string }> = {
  introduction: { title: text("Faire connaissance", "Meeting someone", "Conocer a alguien"), goal: text("Salue une personne et présente-toi avec un prénom inventé.", "Greet someone and introduce yourself with a made-up first name.", "Saluda a alguien y preséntate con un nombre inventado."), role: "You are a friendly fellow traveller meeting the learner for the first time. Practise greetings, a fictional first name and a simple interest. Never solicit real identity or contact information." },
  workplace: { title: text("Au travail", "At work", "En el trabajo"), goal: text("Pose une question polie pour clarifier une consigne.", "Ask a polite question to clarify an instruction.", "Haz una pregunta educada para aclarar una instrucción."), role: "You are a friendly colleague in a fictional workplace. Practise politely asking for clarification, a meeting time or where an ordinary item is. No real company information, personnel details or professional advice." },
  cafe: { title: text("Au café", "At the café", "En el café"), goal: text("Commande une boisson et pose une petite question.", "Order a drink and ask a short question.", "Pide una bebida y haz una pregunta breve."), role: "You are the friendly server in a local cafe. Help the learner order a drink, ask its price or choose a table. Prices and orders are fictional practice only." },
  directions: { title: text("Trouver son chemin", "Finding your way", "Encontrar el camino"), goal: text("Demande où se trouve la gare ou un lieu à visiter.", "Ask where the station or a place to visit is.", "Pregunta dónde está la estación o un lugar para visitar."), role: "You are a friendly passerby helping a visitor find a station or landmark. Use simple fictional directions, not real-world navigation advice." },
  hotel: { title: text("À l’hôtel", "At the hotel", "En el hotel"), goal: text("Présente-toi et demande un renseignement à la réception.", "Introduce yourself and ask the receptionist a question.", "Preséntate y pide información en recepción."), role: "You are a hotel receptionist. Practise a fictional check-in, breakfast times or a simple room request. Never ask for a real passport number, address, card or other private information." },
};

export const isSpeechLanguage = (value: unknown): value is SpeechLanguage => typeof value === "string" && Object.hasOwn(SPEECH_LANGUAGES, value);
export const isSpeechScenario = (value: unknown): value is SpeechScenarioId => typeof value === "string" && Object.hasOwn(SPEECH_SCENARIOS, value);
