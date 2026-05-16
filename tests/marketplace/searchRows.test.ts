import assert from "node:assert/strict";
import { applyMapBoundsFilter } from "@/features/marketplace/searchRows";
import type { Teacher } from "@/types";
import type { TeacherSearchRow } from "@/lib/teacherSearchEngine";

function row(id: string, lat: number | null, lng: number | null): TeacherSearchRow {
  return {
    teacher: {
      id,
      location:
        typeof lat === "number" && typeof lng === "number"
          ? { lat, lng }
          : null,
    } as Teacher,
    distanceKm: null,
  };
}

const rows = [
  row("inside", 45.5, -73.6),
  row("north", 46.1, -73.6),
  row("west", 45.5, -74.2),
  row("missing", null, null),
];

const montrealBounds = {
  ne: { lat: 45.7, lng: -73.3 },
  sw: { lat: 45.3, lng: -73.9 },
};

assert.deepEqual(
  applyMapBoundsFilter(rows, montrealBounds).map((x) => x.teacher.id),
  ["inside"],
);

const antimeridianRows = [
  row("east", 0, 179.5),
  row("west", 0, -179.5),
  row("outside", 0, 170),
];

const antimeridianBounds = {
  ne: { lat: 1, lng: -178 },
  sw: { lat: -1, lng: 178 },
};

assert.deepEqual(
  applyMapBoundsFilter(antimeridianRows, antimeridianBounds).map((x) => x.teacher.id),
  ["east", "west"],
);

assert.equal(applyMapBoundsFilter(rows, null), rows);

console.log("[marketplace:test] ok - filters teacher rows by map bounds");
