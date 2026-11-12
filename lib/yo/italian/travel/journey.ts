import type { MapRoad, Point } from "@/components/yo/journey/map/roadGeometry";
import type { CourseProgress } from "../course/courseProgress";
import type { CourseUnit } from "../course/courseTypes";
import { canPlayItalianTrivia } from "../trivia";
import { ITALIAN_WORLDS } from "../worlds";

// City centres, WGS84 longitude/latitude. Not a route planner or a street address.
export const CITY_COORDINATES: Record<string, Point> = {
  u01: [11.3426, 44.4949], u02: [10.3279, 44.8015], u03: [10.9252, 44.6471],
  u04: [10.9916, 45.4384], u05: [14.2681, 40.8518], u06: [11.2558, 43.7696],
  u07: [11.3308, 43.3188], u08: [12.3155, 45.4408], u09: [8.9463, 44.4056],
  u10: [7.6869, 45.0703], u11: [12.4964, 41.9028], u12: [13.3614, 38.1157],
};
export type Bounds = readonly [number, number, number, number];
export const WORLD_BOUNDS: readonly Bounds[] = [
  [9.4, 43.85, 12.3, 46.1], [9.3, 39.6, 16.3, 46.6], [6.4, 36.6, 17.3, 46.8],
];
/** Equirectangular regional projection. Coastline, pins and road share this transform. */
export function project(point: Point, bounds: Bounds): [number, number] {
  const [west, south, east, north] = bounds;
  return [(point[0] - west) / (east - west) * 480, (north - point[1]) / (north - south) * 600];
}
export function geographicRoad(world: number): MapRoad {
  const points = ITALIAN_WORLDS[world].cities.map(c => project(CITY_COORDINATES[c.unitId], WORLD_BOUNDS[world]));
  return { width: 480, height: 600, segments: points.slice(1).map((to, i) => {
    const from = points[i];
    return [from, [from[0] + (to[0] - from[0]) / 3, from[1] + (to[1] - from[1]) / 3],
      [from[0] + (to[0] - from[0]) * 2 / 3, from[1] + (to[1] - from[1]) * 2 / 3], to];
  }) };
}
export const GEOGRAPHIC_ROADS = ITALIAN_WORLDS.map((_, i) => geographicRoad(i));
export type TravelMemory = {
  version: 1; arrived: boolean; discovered: boolean; cultureComplete: boolean;
  equipped: boolean; selected: string; positions: Record<string, number>;
};
export const newTravelMemory = (): TravelMemory => ({
  version: 1, arrived: false, discovered: false, cultureComplete: false,
  equipped: false, selected: "", positions: {},
});
export function parseTravelMemory(raw: string | null): TravelMemory {
  const empty = newTravelMemory();
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== 1) return empty;
    return { ...empty, arrived: value.arrived === true, discovered: value.discovered === true,
      cultureComplete: value.cultureComplete === true, equipped: value.equipped === true,
      selected: Object.hasOwn(CITY_COORDINATES, value.selected) ? value.selected : "",
      positions: Object.fromEntries(ITALIAN_WORLDS.filter(w => Number.isFinite(value.positions?.[w.id]))
        .map(w => [w.id, Math.max(0, Math.min(3, value.positions[w.id]))])) };
  } catch { return empty; }
}
/** Reuses the existing midpoint: every activity in the first half of u06, or its
 * independently passed final. Cosmetic equipment never writes an assessment. */
export function scooterEarned(florence: CourseUnit, progress: CourseProgress) {
  return florence.id === "u06" && canPlayItalianTrivia(florence, progress);
}
