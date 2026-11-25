import assert from "node:assert/strict";
import type { Teacher, TeacherTeachingZone } from "../../types";
import { teachersInLandingMapArea } from "../../lib/landingTeacherMap";
import { getTeacherMapCoords } from "../../lib/teacherTeachingZones";

const zone = (id: string, lat: number, lng: number, isPrimary = false): TeacherTeachingZone => ({
  id, teacherId: "fixture", city: id, labelPublic: id, countryCode: "CA", lat, lng,
  radiusKm: 10, zoneKind: "service_area", isPrimary, isActive: true, sortOrder: 0,
  supportsAtTeacherPlace: true, supportsAtStudentPlace: false, supportsPublicPlace: false,
});
const teacher = { id: "fixture", teachingMode: "both", location: { lat: 45, lng: -73 }, teachingZones: [] } as unknown as Teacher;
const bounds = { ne: { lat: 47, lng: -70 }, sw: { lat: 46, lng: -71 } };
const inside = zone("real-second-zone", 46.5, -70.5);
const outside = zone("old-selected-city", 45, -73, true);
const multi = { ...teacher, teachingZones: [outside, inside], matchedTeachingZone: outside };
const rows = teachersInLandingMapArea([multi], bounds);
assert.equal(rows.length, 1, "A real secondary zone is not hidden by the previous city");
assert.equal(rows[0].teacher.matchedTeachingZone?.id, inside.id);
assert.deepEqual(getTeacherMapCoords(rows[0].teacher), { lat: 46.5, lng: -70.5 });
assert.equal(rows[0].teacher.teachingZones?.length, 2, "Keep complete profile data");
const offCenter = { ...multi, teachingZones: [zone("off-centre", 46.1, -70.9)] };
const ranked = teachersInLandingMapArea([offCenter], bounds)[0];
assert.ok(ranked.distanceKm != null && ranked.distanceKm > 0, "Keep map-centre proximity for ranking");
assert.equal(ranked.teacher.distance, 0, "Do not label map-centre distance as distance from the learner");
const legacyFallback = { ...teacher, location: { lat: 46.2, lng: -70.8, neighborhood: "Fixture" }, teachingZones: [{ ...inside, lat: null, lng: null }] };
assert.equal(teachersInLandingMapArea([legacyFallback], bounds).length, 1, "Coordinate-less zones preserve the real public legacy pin");
assert.equal(teachersInLandingMapArea([{ ...multi, teachingMode: "online" }], bounds).length, 0);
assert.equal(teachersInLandingMapArea([{ ...multi, teachingZones: [outside] }], bounds).length, 0);
assert.equal(teachersInLandingMapArea([{ ...teacher, location: { lat: 46, lng: -71, neighborhood: "Fixture" } }], bounds).length, 1);
assert.equal(teachersInLandingMapArea([{ ...teacher, location: { lat: 0, lng: 0, neighborhood: "Unknown" } }], bounds).length, 0);
const wrap = { ne: { lat: 10, lng: -170 }, sw: { lat: -10, lng: 170 } };
assert.equal(teachersInLandingMapArea([{ ...teacher, teachingZones: [zone("dateline", 0, 179)] }], wrap).length, 1);
console.log("PASS homepage map area: secondary zone, retained profile, online exclusion, bounds edge, missing coordinates, antimeridian");
