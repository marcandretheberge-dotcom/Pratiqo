export type Point = readonly [number, number];
export type RoadSegment = readonly [Point, Point, Point, Point];
export type MapRoad = { width: number; height: number; segments: readonly RoadSegment[] };

// The approved Italian geometry. Renderer and traveler read the same curves.
export const approvedRoad: MapRoad = {
  width: 480, height: 600,
  segments: [
    [[120, 150], [120, 210], [390, 190], [350, 270]],
    [[350, 270], [310, 350], [110, 300], [130, 396]],
    [[130, 396], [150, 492], [385, 440], [350, 516]],
  ],
};

export function roadPath(road: MapRoad) {
  return `M${road.segments[0][0].join(" ")} ` + road.segments.map(([, b, c, d]) =>
    `C${b.join(" ")} ${c.join(" ")} ${d.join(" ")}`).join(" ");
}

/** Fractional destination position is cosmetic, not course progress. */
export function roadPoint(position: number, road: MapRoad = approvedRoad): [number, number] {
  const safe = Math.max(0, Math.min(road.segments.length, position));
  const segment = Math.min(road.segments.length - 1, Math.floor(safe)), t = safe - segment, u = 1 - t;
  const [a, b, c, d] = road.segments[segment];
  return [0, 1].map(axis => u ** 3 * a[axis] + 3 * u * u * t * b[axis]
    + 3 * u * t * t * c[axis] + t ** 3 * d[axis]) as [number, number];
}

export function roadRoute(from: number, to: number, road: MapRoad = approvedRoad): [number, number][] {
  const steps = Math.max(1, Math.ceil(Math.abs(to - from) * 40));
  const low = Math.min(from, to), high = Math.max(from, to);
  const points = Array.from({ length: steps + 1 }, (_, i) => roadPoint(low + (high - low) * i / steps, road));
  return from > to ? points.reverse() : points;
}
