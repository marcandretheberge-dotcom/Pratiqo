import { ITALIAN_WORLDS } from "./italian/worlds";

export type TravelPlace = { country: string; city: string };
export type TravelMode = "flight" | "train" | "car" | "taxi";
export type TravelLeg = { from: TravelPlace | null; to: TravelPlace; mode: TravelMode };

const countries: Record<string, string> = {
  en: "CA", "fr-CA": "CA", de: "DE", es: "UY", ja: "JP", "pt-BR": "BR", "zh-Hans": "CN",
};
export function introPlace(language: string, city: string): TravelPlace | null {
  const country = countries[language];
  return country ? { country, city } : null;
}
const italy = ITALIAN_WORLDS.flatMap(world => world.cities);
export function italianPlace(unitId: string): TravelPlace | null {
  const city = italy.find(item => item.unitId === unitId);
  return city ? { country: "IT", city: city.name } : null;
}

// These are narrative choices for the authored routes, in either direction.
const italianRoads: Record<string, TravelMode> = {
  "Firenze/Siena": "car",
  "Modena/Parma": "car",
  "Bologna/Modena": "taxi",
};
export function planTravel(from: TravelPlace | null, to: TravelPlace): TravelLeg | null {
  if (!from || from.country !== to.country) return { from, to, mode: "flight" };
  if (from.city === to.city) return null;
  const pair = [from.city, to.city].sort().join("/");
  return { from, to, mode: (to.country === "IT" && italianRoads[pair]) || "train" };
}

const travelFilms: Record<TravelMode, { src: string; poster: string }> = {
  flight: { src: "/companion/travel/films/departure.mp4", poster: "/companion/travel/films/departure.webp" },
  train: { src: "/companion/travel/films/rail.mp4", poster: "/companion/travel/films/rail.webp" },
  car: { src: "/companion/travel/films/road.mp4", poster: "/companion/travel/films/road.webp" },
  taxi: { src: "/companion/travel/animations/yoppo-taxi-approved.mp4", poster: "/companion/travel/animations/yoppo-taxi-approved.jpg" },
};

export function filmForLeg(leg: TravelLeg) {
  if (leg.mode === "train" && leg.to.country === "CA") {
    return { src: "/companion/travel/films/rail-canada.mp4", poster: "/companion/travel/films/rail-canada.webp" };
  }
  return travelFilms[leg.mode];
}

export const travelLocationKey = "yo.travel.last-place.v1";
const inMemory = new Map<string, TravelPlace>();
export function lastPlace(key = travelLocationKey): TravelPlace | null {
  if (inMemory.has(key)) return inMemory.get(key)!;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value?.country === "string" && /^[A-Z]{2}$/.test(value.country)
      && typeof value.city === "string" && value.city.length > 0 && value.city.length <= 80) {
      return { country: value.country, city: value.city };
    }
    return null;
  } catch { return inMemory.get(key) ?? null; }
}
export function rememberPlace(place: TravelPlace, key = travelLocationKey) {
  try { window.localStorage.setItem(key, JSON.stringify(place)); inMemory.delete(key); }
  catch { inMemory.set(key, place); }
}
