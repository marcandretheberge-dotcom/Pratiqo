import type { YoLocale } from "../types";
import { interestIds, type InterestId, type InterestLanguage } from "./preferences";

export type Direction = "left" | "right" | "straight";
type Copy = Record<YoLocale, string>;
type Line = { text: string; reading?: string };
type Venue = { noun: string; question: Line; meaning: Copy };
export type InterestCorpus = {
  speechLocale: string; venues: Record<InterestId, Venue>; directions: Record<Direction, Line>;
  exit: Line; thanks: Line; repeat: Line;
};
const c = (fr: string, en: string, es: string): Copy => ({ fr, en, es });
const line = (text: string, reading?: string): Line => ({ text, ...(reading ? { reading } : {}) });
const venueMeanings: Record<InterestId, Copy> = {
  music: c("la salle de concert", "the concert hall", "la sala de conciertos"),
  art: c("la galerie d’art", "the art gallery", "la galería de arte"),
  history: c("le musée", "the museum", "el museo"),
  sport: c("le stade", "the stadium", "el estadio"),
  food: c("le marché", "the market", "el mercado"),
  nature: c("le parc", "the park", "el parque"),
};
function venues(values: Record<InterestId, [string, string, string?]>): Record<InterestId, Venue> {
  return Object.fromEntries(interestIds.map(id => [id, { noun: values[id][0], question: line(values[id][1], values[id][2]), meaning: venueMeanings[id] }])) as Record<InterestId, Venue>;
}
/** Original, bounded A1 practice. No regional-voice or CEFR certification claims. */
export const interestCorpus: Record<InterestLanguage, InterestCorpus> = {
  it: {
    speechLocale: "it-IT",
    venues: venues({
      music: ["sala da concerto", "Scusi, dov’è la sala da concerto?"],
      art: ["galleria d’arte", "Scusi, dov’è la galleria d’arte?"],
      history: ["museo", "Scusi, dov’è il museo?"],
      sport: ["stadio", "Scusi, dov’è lo stadio?"],
      food: ["mercato", "Scusi, dov’è il mercato?"],
      nature: ["parco", "Scusi, dov’è il parco?"],
    }),
    directions: { left: line("Giri a sinistra."), right: line("Giri a destra."), straight: line("Vada sempre dritto.") },
    exit: line("Scusi, dov’è l’uscita?"), thanks: line("Grazie mille!"), repeat: line("Può ripetere, per favore?"),
  },
  en: {
    speechLocale: "en-CA",
    venues: venues({
      music: ["concert hall", "Excuse me, where is the concert hall?"],
      art: ["art gallery", "Excuse me, where is the art gallery?"],
      history: ["museum", "Excuse me, where is the museum?"],
      sport: ["stadium", "Excuse me, where is the stadium?"],
      food: ["market", "Excuse me, where is the market?"],
      nature: ["park", "Excuse me, where is the park?"],
    }),
    directions: { left: line("Turn left."), right: line("Turn right."), straight: line("Go straight ahead.") },
    exit: line("Excuse me, where is the exit?"), thanks: line("Thank you very much!"), repeat: line("Could you repeat that, please?"),
  },
  "fr-CA": {
    speechLocale: "fr-CA",
    venues: venues({
      music: ["salle de concert", "Excusez-moi, où est la salle de concert ?"],
      art: ["galerie d’art", "Excusez-moi, où est la galerie d’art ?"],
      history: ["musée", "Excusez-moi, où est le musée ?"],
      sport: ["stade", "Excusez-moi, où est le stade ?"],
      food: ["marché", "Excusez-moi, où est le marché ?"],
      nature: ["parc", "Excusez-moi, où est le parc ?"],
    }),
    directions: { left: line("Tournez à gauche."), right: line("Tournez à droite."), straight: line("Allez tout droit.") },
    exit: line("Excusez-moi, où est la sortie ?"), thanks: line("Merci beaucoup !"), repeat: line("Pouvez-vous répéter, s’il vous plaît ?"),
  },
  es: {
    speechLocale: "es-419",
    venues: venues({
      music: ["sala de conciertos", "Disculpe, ¿dónde está la sala de conciertos?"],
      art: ["galería de arte", "Disculpe, ¿dónde está la galería de arte?"],
      history: ["museo", "Disculpe, ¿dónde está el museo?"],
      sport: ["estadio", "Disculpe, ¿dónde está el estadio?"],
      food: ["mercado", "Disculpe, ¿dónde está el mercado?"],
      nature: ["parque", "Disculpe, ¿dónde está el parque?"],
    }),
    directions: { left: line("Gire a la izquierda."), right: line("Gire a la derecha."), straight: line("Siga todo recto.") },
    exit: line("Disculpe, ¿dónde está la salida?"), thanks: line("¡Muchas gracias!"), repeat: line("¿Puede repetir, por favor?"),
  },
  de: {
    speechLocale: "de-DE",
    venues: venues({
      music: ["Konzertsaal", "Entschuldigung, wo ist der Konzertsaal?"],
      art: ["Kunstgalerie", "Entschuldigung, wo ist die Kunstgalerie?"],
      history: ["Museum", "Entschuldigung, wo ist das Museum?"],
      sport: ["Stadion", "Entschuldigung, wo ist das Stadion?"],
      food: ["Markt", "Entschuldigung, wo ist der Markt?"],
      nature: ["Park", "Entschuldigung, wo ist der Park?"],
    }),
    directions: { left: line("Gehen Sie nach links."), right: line("Gehen Sie nach rechts."), straight: line("Gehen Sie geradeaus.") },
    exit: line("Entschuldigung, wo ist der Ausgang?"), thanks: line("Vielen Dank!"), repeat: line("Können Sie das bitte wiederholen?"),
  },
  "pt-BR": {
    speechLocale: "pt-BR",
    venues: venues({
      music: ["sala de concertos", "Com licença, onde fica a sala de concertos?"],
      art: ["galeria de arte", "Com licença, onde fica a galeria de arte?"],
      history: ["museu", "Com licença, onde fica o museu?"],
      sport: ["estádio", "Com licença, onde fica o estádio?"],
      food: ["mercado", "Com licença, onde fica o mercado?"],
      nature: ["parque", "Com licença, onde fica o parque?"],
    }),
    directions: { left: line("Vire à esquerda."), right: line("Vire à direita."), straight: line("Siga em frente.") },
    exit: line("Com licença, onde fica a saída?"), thanks: line("Muito obrigado!"), repeat: line("Pode repetir, por favor?"),
  },
  ja: {
    speechLocale: "ja-JP",
    venues: venues({
      music: ["コンサートホール", "すみません、コンサートホールはどこですか。", "Sumimasen, konsāto hōru wa doko desu ka."],
      art: ["美術館", "すみません、美術館はどこですか。", "Sumimasen, bijutsukan wa doko desu ka."],
      history: ["博物館", "すみません、博物館はどこですか。", "Sumimasen, hakubutsukan wa doko desu ka."],
      sport: ["スタジアム", "すみません、スタジアムはどこですか。", "Sumimasen, sutajiamu wa doko desu ka."],
      food: ["市場", "すみません、市場はどこですか。", "Sumimasen, ichiba wa doko desu ka."],
      nature: ["公園", "すみません、公園はどこですか。", "Sumimasen, kōen wa doko desu ka."],
    }),
    directions: { left: line("左に曲がってください。", "Hidari ni magatte kudasai."), right: line("右に曲がってください。", "Migi ni magatte kudasai."), straight: line("まっすぐ進んでください。", "Massugu susunde kudasai.") },
    exit: line("すみません、出口はどこですか。", "Sumimasen, deguchi wa doko desu ka."), thanks: line("ありがとうございます。", "Arigatō gozaimasu."), repeat: line("もう一度お願いします。", "Mō ichido onegaishimasu."),
  },
  "zh-CN": {
    speechLocale: "zh-CN",
    venues: venues({
      music: ["音乐厅", "不好意思，音乐厅在哪里？", "Bù hǎoyìsi, yīnyuètīng zài nǎlǐ?"],
      art: ["画廊", "不好意思，画廊在哪里？", "Bù hǎoyìsi, huàláng zài nǎlǐ?"],
      history: ["博物馆", "不好意思，博物馆在哪里？", "Bù hǎoyìsi, bówùguǎn zài nǎlǐ?"],
      sport: ["体育场", "不好意思，体育场在哪里？", "Bù hǎoyìsi, tǐyùchǎng zài nǎlǐ?"],
      food: ["市场", "不好意思，市场在哪里？", "Bù hǎoyìsi, shìchǎng zài nǎlǐ?"],
      nature: ["公园", "不好意思，公园在哪里？", "Bù hǎoyìsi, gōngyuán zài nǎlǐ?"],
    }),
    directions: { left: line("请向左转。", "Qǐng xiàng zuǒ zhuǎn."), right: line("请向右转。", "Qǐng xiàng yòu zhuǎn."), straight: line("请一直走。", "Qǐng yìzhí zǒu.") },
    exit: line("不好意思，出口在哪里？", "Bù hǎoyìsi, chūkǒu zài nǎlǐ?"), thanks: line("谢谢！", "Xièxie!"), repeat: line("请再说一遍。", "Qǐng zài shuō yí biàn."),
  },
};
// 美術館 denotes an art museum, not a commercial gallery.
interestCorpus.ja.venues.art.meaning = c("le musée d’art", "the art museum", "el museo de arte");
export const directionMeaning: Record<Direction, Copy> = {
  left: c("Tourne à gauche", "Turn left", "Gira a la izquierda"),
  right: c("Tourne à droite", "Turn right", "Gira a la derecha"),
  straight: c("Continue tout droit", "Go straight ahead", "Sigue recto"),
};
export const directions: Direction[] = ["left", "right", "straight"];
export function practiceDirections(interest: InterestId, attempt: number): { first: Direction; transfer: Direction } {
  const index = (interestIds.indexOf(interest) + Math.max(0, Math.trunc(attempt))) % directions.length;
  return { first: directions[index], transfer: directions[(index + 1) % directions.length] };
}
export function practiceOptions(interest: InterestId, attempt: number): InterestId[] {
  const start = interestIds.indexOf(interest);
  const choices = [interest, interestIds[(start + 1) % interestIds.length], interestIds[(start + 3) % interestIds.length]];
  const offset = Math.max(0, Math.trunc(attempt)) % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
/** Punctuation/case tolerance only; accents, characters and words remain significant. */
export function normalizeRecall(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?。！？¿¡]/g, "").replace(/\s+/g, " ").trim();
}
export function correctRecall(answer: string, expected: string): boolean {
  return normalizeRecall(answer) === normalizeRecall(expected);
}
