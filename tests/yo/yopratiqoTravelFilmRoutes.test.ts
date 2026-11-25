import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { introCourses } from "../../lib/yo/shared/course";
import { filmForLeg, introPlace, italianPlace, planTravel, type TravelPlace } from "../../lib/yo/travelCinema";

const bologna = italianPlace("u01")!, parma = italianPlace("u02")!, modena = italianPlace("u03")!;
const toronto = introPlace("en", "Toronto")!, montreal = introPlace("fr-CA", "Montréal")!;
function route(from: TravelPlace | null, to: TravelPlace) {
  const leg = planTravel(from, to);
  assert.ok(leg);
  const film = filmForLeg(leg);
  assert.ok(existsSync("public" + film.poster));
  assert.equal(readFileSync("public" + film.src).toString("ascii", 4, 8), "ftyp");
  return { mode: leg.mode, src: film.src };
}
for (const course of introCourses) {
  const to = introPlace(course.language, course.city);
  assert.ok(to);
  assert.equal(route(null, to).mode, "flight");
  assert.equal(planTravel(to, to), null);
}
assert.equal(route(toronto, bologna).mode, "flight");
assert.equal(route(bologna, parma).mode, "train");
assert.equal(route(montreal, toronto).mode, "train");
assert.notEqual(route(montreal, toronto).src, route(bologna, parma).src);
assert.equal(route(italianPlace("u06")!, italianPlace("u07")!).mode, "car");
assert.equal(route(parma, modena).mode, "car");
assert.equal(route(modena, bologna).mode, "taxi");
assert.equal(route(bologna, modena).mode, "taxi");
assert.equal(planTravel(bologna, bologna), null);
assert.equal(italianPlace("u99"), null);
console.log("PASS: eight entries, borders, same city, Canadian rail, Italian rail, car, taxi and all shipped films");
