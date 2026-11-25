import type { AdventureWorld } from "@/lib/yo/adventure";
import { approvedRoad, type MapRoad, type Point } from "./roadGeometry";

function road(points: readonly Point[]): MapRoad {
  return { width: 480, height: 600, segments: points.slice(0, -1).map((start, i) => {
    const end = points[i + 1];
    return [start, [start[0], start[1] + 72], [end[0], end[1] - 65], end];
  }) };
}
// Paths weave around each world's landmarks. Labels and feet share these points.
export const worldRoads: Record<AdventureWorld, MapRoad> = {
  italian: approvedRoad,
  german: road([[125, 150], [340, 275], [130, 398], [340, 516]]),
  portuguese: road([[140, 150], [310, 270], [130, 390], [320, 516]]),
  japanese: road([[125, 150], [335, 270], [145, 395], [340, 516]]),
  mandarin: road([[140, 150], [340, 270], [135, 395], [325, 516]]),
  french: road([[140, 150], [335, 275], [140, 398], [325, 516]]),
  english: road([[135, 150], [340, 270], [140, 395], [335, 516]]),
  spanish: road([[140, 150], [330, 270], [145, 395], [330, 516]]),
};
