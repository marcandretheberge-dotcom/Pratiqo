import { ITALIAN_WORLDS } from "./italian/worlds";

export type TravelPlace = { country: string; city: string };
export type TravelMode = "flight" | "train" | "car" | "taxi";
export type TravelLeg = { from: TravelPlace | null; to: TravelPlace; mode: TravelMode };
export type CinemaFilmAsset = { src: string | null; poster: string; aspectRatio?: number };
export type MissionCinemaKind = "mission-start" | "mission-success" | "artifact";
/** Presentation only. This identifier is never evidence of learning or an entitlement. */
export type MissionCinemaScene = { id: string; kind: MissionCinemaKind; title: string; detail?: string; scope?: string };

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

// Each independent, nonverbal mission film has been rendered and visually reviewed.
// Keep the real posters available for reduced motion, offline and media errors.
const missionFilms: Record<MissionCinemaKind, CinemaFilmAsset> = {
  "mission-start": { src: "/companion/travel/films/mission-ready.mp4", poster: "/companion/travel/films/mission-ready.webp", aspectRatio: 16 / 9 },
  "mission-success": { src: "/companion/travel/films/mission-success.mp4", poster: "/companion/travel/films/mission-success.webp", aspectRatio: 16 / 9 },
  artifact: { src: "/companion/travel/films/artifact-reveal.mp4", poster: "/companion/travel/films/artifact-reveal.webp", aspectRatio: 16 / 9 },
};
export function filmForMission(kind: MissionCinemaKind): CinemaFilmAsset { return missionFilms[kind]; }

export type MissionCinemaState = { seen: string[]; queue: MissionCinemaScene[] };
const cinemaMemory = new Map<string, MissionCinemaState>();
const SCENE_KINDS: readonly string[] = ["mission-start", "mission-success", "artifact"];
const MAX_SEEN = 512, MAX_PENDING = 6, PENDING_AGE_MS = 24 * 60 * 60 * 1000;
export const missionSceneKey = (scene: MissionCinemaScene) => `${scene.kind}:${scene.id}`;

function cleanScene(value: unknown): MissionCinemaScene | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id.trim() || item.id.length > 240
    || typeof item.kind !== "string" || !SCENE_KINDS.includes(item.kind)
    || typeof item.title !== "string" || !item.title.trim() || item.title.length > 180) return null;
  return { id: item.id, kind: item.kind as MissionCinemaKind, title: item.title.trim(),
    ...(typeof item.scope === "string" && item.scope.length <= 240 ? { scope: item.scope } : {}),
    ...(typeof item.detail === "string" && item.detail.trim() ? { detail: item.detail.trim().slice(0, 240) } : {}) };
}

/** Bounded, validated cosmetic state. Curriculum and rewards remain owned by their existing stores. */
export function parseMissionCinemaState(seenRaw: string | null, pendingRaw: string | null, now = Date.now()): MissionCinemaState {
  let seen: string[] = [];
  const queue: MissionCinemaScene[] = [];
  try {
    const data = JSON.parse(seenRaw ?? "null");
    if (data?.version === 1 && Array.isArray(data.seen)) seen = [...new Set<string>(
      data.seen.filter((id: unknown): id is string => typeof id === "string" && id.length <= 260),
    )].slice(-MAX_SEEN);
  } catch { /* Damaged presentation preferences do not affect a lesson. */ }
  try {
    const data = JSON.parse(pendingRaw ?? "null");
    if (data?.version === 1 && Number.isFinite(data.at) && data.at <= now && now - data.at < PENDING_AGE_MS && Array.isArray(data.queue)) {
      const keys = new Set(seen);
      for (const value of data.queue.slice(0, MAX_PENDING)) {
        const scene = cleanScene(value);
        if (scene && !keys.has(missionSceneKey(scene))) { keys.add(missionSceneKey(scene)); queue.push(scene); }
      }
    }
  } catch { /* An interrupted or unavailable film never resets learning. */ }
  return { seen, queue };
}

export function queueMissionScene(state: MissionCinemaState, value: MissionCinemaScene): MissionCinemaState {
  const scene = cleanScene(value);
  if (!scene || state.seen.includes(missionSceneKey(scene)) || state.queue.some(item => missionSceneKey(item) === missionSceneKey(scene))) return state;
  // Keep the visible scene and the latest moments if a caller produces a burst.
  const queue = state.queue.length < MAX_PENDING ? state.queue : [state.queue[0], ...state.queue.slice(-(MAX_PENDING - 2))];
  return { seen: state.seen, queue: [...queue, scene] };
}

export function finishMissionScene(state: MissionCinemaState, key: string): MissionCinemaState {
  if (!state.queue[0] || missionSceneKey(state.queue[0]) !== key) return state;
  return { seen: [...new Set([...state.seen, key])].slice(-MAX_SEEN), queue: state.queue.slice(1) };
}

function cinemaKeys(namespace: string) {
  const key = `yo.cinema.v1.${encodeURIComponent(namespace)}`;
  return { seen: `${key}.seen`, pending: `${key}.pending` };
}
export function readMissionCinema(namespace: string): MissionCinemaState {
  if (typeof window === "undefined") return { seen: [], queue: [] };
  const cached = cinemaMemory.get(namespace);
  if (cached) return cached;
  const keys = cinemaKeys(namespace);
  let seen = null, pending = null;
  try { seen = window.localStorage.getItem(keys.seen); } catch { /* Memory is sufficient for cosmetic state. */ }
  try { pending = window.sessionStorage.getItem(keys.pending); } catch { /* No browser storage required. */ }
  const state = parseMissionCinemaState(seen, pending);
  cinemaMemory.set(namespace, state);
  return state;
}
export function writeMissionCinema(namespace: string, state: MissionCinemaState) {
  if (typeof window === "undefined") return;
  cinemaMemory.set(namespace, state);
  const keys = cinemaKeys(namespace);
  try { window.localStorage.setItem(keys.seen, JSON.stringify({ version: 1, seen: state.seen })); } catch { /* Never block a mission. */ }
  try {
    if (state.queue.length) window.sessionStorage.setItem(keys.pending, JSON.stringify({ version: 1, at: Date.now(), queue: state.queue }));
    else window.sessionStorage.removeItem(keys.pending);
  } catch { /* Never block a mission. */ }
}
