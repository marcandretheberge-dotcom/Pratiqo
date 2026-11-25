/**
 * Shared atlas geometry. Visual-only: these values never grant course access.
 * The normalized reveal stops approximate the route position of the four city nodes.
 */
export const ITALIAN_PORTRAIT_ROAD_PATH =
  "M119 133 C119 213 376 204 347 295 C321 366 135 325 131 444 C125 521 382 490 350 601 C325 681 219 657 244 748";

export const ITALIAN_WIDE_ROAD_PATH =
  "M240 130 C255 190 558 177 701 237 C776 296 303 264 259 365 C217 450 693 381 701 486 C711 557 511 531 480 590";

export const ITALIAN_CITY_PATH_STOPS = [0.08, 0.34, 0.61, 0.86] as const;

/** The illustrated maps share a 4:5 canvas on every device. */
import { approvedRoad, roadPath, roadPoint, roadRoute } from "../../journey/map/roadGeometry";

// Reflected controls of the original SVG's S commands, shared with the traveler.
export const ITALIAN_ILLUSTRATED_ROAD = approvedRoad.segments;
export const ITALIAN_ILLUSTRATED_ROAD_PATH = roadPath(approvedRoad);

/** Fractional city index, not earned progress. Safe to retarget mid-curve. */
export function italianRoadPoint(position: number): [number, number] {
  return roadPoint(position);
}

export function companionRoute(from: number, to: number): [number, number][] {
  return roadRoute(from, to);
}
