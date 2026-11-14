export const CAFE_HERO_POSTER_SRC = "/images/yo/mandarin/cafe.webp";
export const CAFE_WORLD_VIDEO_SRC = "/videos/cafe-world-journey.mp4";

/** Approved 706-frame silent loop, served with the application rather than a provider URL. */
export const cafeHeroMedia: { readonly videoSrc: string | null; readonly posterSrc: string } = {
  videoSrc: CAFE_WORLD_VIDEO_SRC,
  posterSrc: CAFE_HERO_POSTER_SRC,
};

/** Final export time, after the 0.625-second loop overlap. Text stays outside the video pixels. */
export const cafeHeroInvitations = [
  { id: "japan", text: "一緒にコーヒーでもどうですか？", lang: "ja", dir: "ltr", start: 1.375, end: 5.875 },
  { id: "marrakech", text: "أجي نشربو قهوة", lang: "ary", dir: "rtl", start: 11.375, end: 15.875 },
  { id: "paris", text: "On prend un café ensemble ?", lang: "fr", dir: "ltr", start: 21.875, end: 25.075 },
  { id: "welcome", text: "Ta place t’attend.", lang: "fr", dir: "ltr", start: 25.575, end: 28.625 },
] as const;

export const cafeHeroInvitationCopy = {
  fr: { coffee: "On prend un café ensemble ?", seat: "Ta place t’attend.", description: "Une invitation à partager un café au Japon, à Marrakech et à Paris. Ta place t’attend." },
  en: { coffee: "Shall we have a coffee together?", seat: "Your seat is waiting.", description: "An invitation to share a coffee in Japan, Marrakech and Paris. Your seat is waiting." },
  es: { coffee: "¿Tomamos un café juntos?", seat: "Tu sitio te espera.", description: "Una invitación a compartir un café en Japón, Marrakech y París. Tu sitio te espera." },
} as const;

export function cafeHeroInvitationOpacity(time: number, start: number, end: number): number {
  if (!Number.isFinite(time) || time < start || time >= end) return 0;
  return Math.max(0, Math.min(1, (time - start) / 0.4, (end - time) / 0.4));
}
